import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import AdmZip from 'adm-zip';
import { access, mkdir, readdir, rm, stat, statfs, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { AuditAction, AuditLog, AuditModule } from '../audit-log/audit-log.entity';

export type BackupTrigger = 'AUTO' | 'MANUAL' | 'BEFORE_RESTORE' | 'NIGHTLY';
export type BackupHealth = 'VALID' | 'INVALID';

type BackupMetadata = {
  format: 'NOVAPLUS_BACKUP';
  formatVersion: 1;
  appVersion: string;
  trigger: BackupTrigger;
  createdAt: string;
  databaseSizeBytes: number;
  includesUploads: boolean;
};

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);
  private readonly databasePath = resolve(process.cwd(), process.env.DATABASE_PATH || 'database.db');
  private readonly backupDirectory = resolve(process.cwd(), process.env.BACKUP_DIRECTORY || 'backups');
  private readonly uploadsDirectory = resolve(process.cwd(), process.env.UPLOADS_DIRECTORY || 'uploads');
  private readonly intervalMs = Math.max(60000, Number(process.env.BACKUP_INTERVAL_MS || 300000));
  private readonly retentionCount = Math.max(1, Number(process.env.BACKUP_RETENTION_COUNT || 30));
  private readonly appVersion = process.env.APP_VERSION || '4.0.0';
  private intervalHandle: NodeJS.Timeout | null = null;
  private maintenanceHandle: NodeJS.Timeout | null = null;
  private running = false;
  private lastFailure: { at: Date; message: string } | null = null;
  private lastMaintenanceDate: string | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AuditLog) private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async onModuleInit() {
    await mkdir(this.backupDirectory, { recursive: true });
    this.intervalHandle = setInterval(() => {
      void this.createBackup('AUTO').catch((error) => this.recordFailure(error));
    }, this.intervalMs);
    this.intervalHandle.unref();
    this.maintenanceHandle = setInterval(() => void this.runNightlyMaintenanceIfDue(), 30 * 60 * 1000);
    this.maintenanceHandle.unref();
    this.logger.log(`Backup 4.0 aktif: ${Math.round(this.intervalMs / 60000)} dakika.`);
  }

  onModuleDestroy() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    if (this.maintenanceHandle) clearInterval(this.maintenanceHandle);
  }

  private recordFailure(error: unknown) {
    this.lastFailure = { at: new Date(), message: error instanceof Error ? error.message : String(error) };
  }

  private createFilename(trigger: BackupTrigger) {
    return `NovaPlus_${trigger}_${new Date().toISOString().replace(/[:.]/g, '-')}.npbackup`;
  }

  private assertFilename(filename: string) {
    const safe = basename(filename);
    if (safe !== filename || !safe.startsWith('NovaPlus_') || !safe.endsWith('.npbackup')) {
      throw new BadRequestException('Geçersiz yedek dosyası.');
    }
    return safe;
  }

  private async exists(path: string) {
    try { await access(path, constants.F_OK); return true; } catch { return false; }
  }

  private async checkpoint() {
    if (!this.dataSource.isInitialized) return;
    try { await this.dataSource.query('PRAGMA wal_checkpoint(FULL)'); } catch {}
  }

  private async writeAudit(action: AuditAction, description: string, result: 'SUCCESS'|'FAILED', metadata?: Record<string, unknown>) {
    try {
      await this.auditRepository.save(this.auditRepository.create({
        gymId: 'SYSTEM', userId: null, userName: 'NovaPlus Backup', module: AuditModule.SYSTEM,
        action, description, entityType: 'Backup', entityId: metadata?.filename ? String(metadata.filename) : null,
        amount: null, ipAddress: null, userAgent: null, result,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      }));
    } catch (error) {
      this.logger.warn(`Audit kaydı yazılamadı: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createBackup(trigger: BackupTrigger = 'MANUAL') {
    if (this.running) throw new BadRequestException('Başka bir yedekleme işlemi devam ediyor.');
    this.running = true;
    try {
      await mkdir(this.backupDirectory, { recursive: true });
      const dbStat = await stat(this.databasePath).catch(() => { throw new NotFoundException('database.db bulunamadı.'); });
      await this.checkpoint();
      const filename = this.createFilename(trigger);
      const destination = join(this.backupDirectory, filename);
      const zip = new AdmZip();
      zip.addLocalFile(this.databasePath, '', 'database.db');
      const includesUploads = await this.exists(this.uploadsDirectory);
      if (includesUploads) zip.addLocalFolder(this.uploadsDirectory, 'uploads');
      const metadata: BackupMetadata = {
        format: 'NOVAPLUS_BACKUP', formatVersion: 1, appVersion: this.appVersion, trigger,
        createdAt: new Date().toISOString(), databaseSizeBytes: dbStat.size, includesUploads,
      };
      zip.addFile('backup-info.json', Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8'));
      zip.addFile('version.json', Buffer.from(JSON.stringify({ app: 'NovaPlus+', version: this.appVersion, backupFormat: 1 }, null, 2), 'utf-8'));
      zip.writeZip(destination);
      const validation = await this.validateBackup(filename);
      if (validation.health !== 'VALID') throw new BadRequestException(validation.message);
      await this.cleanupOldBackups();
      const fileStat = await stat(destination);
      await this.writeAudit(AuditAction.CREATE, `${trigger} yedek oluşturuldu.`, 'SUCCESS', { filename, sizeBytes: fileStat.size });
      return { message: 'Yedek oluşturuldu ve doğrulandı.', backup: { filename, trigger, sizeBytes: fileStat.size, createdAt: fileStat.birthtime, health: 'VALID', databaseSizeBytes: dbStat.size, includesUploads, version: this.appVersion } };
    } catch (error) {
      this.recordFailure(error);
      await this.writeAudit(AuditAction.CREATE, `${trigger} yedek oluşturulamadı.`, 'FAILED', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally { this.running = false; }
  }

  async validateBackup(filename: string) {
    const safe = this.assertFilename(filename);
    try {
      const target = join(this.backupDirectory, safe);
      const fileStat = await stat(target);
      if (fileStat.size <= 0) return { health: 'INVALID' as const, message: 'Yedek dosyası boş.' };
      const zip = new AdmZip(target);
      const db = zip.getEntry('database.db');
      const info = zip.getEntry('backup-info.json');
      if (!db || !info) return { health: 'INVALID' as const, message: 'Yedek içeriği eksik.' };
      const data = db.getData();
      if (data.length < 100 || data.subarray(0,16).toString('utf-8') !== 'SQLite format 3\u0000') {
        return { health: 'INVALID' as const, message: 'SQLite veritabanı doğrulanamadı.' };
      }
      const metadata = JSON.parse(info.getData().toString('utf-8')) as BackupMetadata;
      if (metadata.format !== 'NOVAPLUS_BACKUP' || metadata.formatVersion !== 1) {
        return { health: 'INVALID' as const, message: 'Yedek formatı desteklenmiyor.' };
      }
      return { health: 'VALID' as const, message: 'Yedek doğrulandı.', metadata };
    } catch (error) {
      return { health: 'INVALID' as const, message: error instanceof Error ? error.message : 'Yedek doğrulanamadı.' };
    }
  }

  async listBackups() {
    await mkdir(this.backupDirectory, { recursive: true });
    const names = await readdir(this.backupDirectory);
    const items = await Promise.all(names.filter(n => n.startsWith('NovaPlus_') && n.endsWith('.npbackup')).map(async filename => {
      const fileStat = await stat(join(this.backupDirectory, filename));
      const validation = await this.validateBackup(filename);
      const metadata = validation.health === 'VALID' ? validation.metadata : null;
      return {
        filename,
        trigger: metadata?.trigger || 'AUTO',
        sizeBytes: fileStat.size,
        createdAt: metadata?.createdAt ? new Date(metadata.createdAt) : fileStat.birthtime,
        health: validation.health,
        databaseSizeBytes: metadata?.databaseSizeBytes || 0,
        includesUploads: metadata?.includesUploads || false,
        version: metadata?.appVersion || 'Bilinmiyor',
      };
    }));
    return items.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getOverview() {
    const backups = await this.listBackups();
    const valid = backups.filter(x => x.health === 'VALID');
    let freeDiskBytes = 0;
    try { const disk = await statfs(this.backupDirectory); freeDiskBytes = Number(disk.bavail) * Number(disk.bsize); } catch {}
    return {
      automaticEnabled: true, intervalMinutes: Math.round(this.intervalMs / 60000), retentionCount: this.retentionCount,
      backupCount: backups.length, validBackupCount: valid.length, invalidBackupCount: backups.length-valid.length,
      totalSizeBytes: backups.reduce((s,x) => s+x.sizeBytes,0), latestBackup: backups[0] || null,
      latestValidBackup: valid[0] || null, lastFailure: this.lastFailure, freeDiskBytes,
      databasePath: basename(this.databasePath), health: valid[0] ? 'HEALTHY' : 'WARNING', maintenanceTime: '03:00',
    };
  }

  async deleteBackup(filename: string) {
    const safe = this.assertFilename(filename);
    const target = join(this.backupDirectory, safe);
    await stat(target).catch(() => { throw new NotFoundException('Yedek bulunamadı.'); });
    await rm(target);
    await this.writeAudit(AuditAction.DELETE, 'Yedek silindi.', 'SUCCESS', { filename: safe });
    return { message: 'Yedek silindi.' };
  }

  async restoreBackup(filename: string) {
    if (this.running) throw new BadRequestException('Başka bir yedekleme işlemi devam ediyor.');
    const safe = this.assertFilename(filename);
    const source = join(this.backupDirectory, safe);
    await stat(source).catch(() => { throw new NotFoundException('Yedek bulunamadı.'); });
    const validation = await this.validateBackup(safe);
    if (validation.health !== 'VALID') throw new BadRequestException(`Yedek geri yüklenemedi: ${validation.message}`);
    await this.createBackup('BEFORE_RESTORE');
    this.running = true;
    try {
      const zip = new AdmZip(source);
      const db = zip.getEntry('database.db');
      if (!db) throw new BadRequestException('Yedekte database.db bulunamadı.');
      const temp = `${this.databasePath}.restore.tmp`;
      await writeFile(temp, db.getData());
      if (this.dataSource.isInitialized) await this.dataSource.destroy();
      await writeFile(this.databasePath, await (await import('node:fs/promises')).readFile(temp));
      await rm(temp, { force: true });
      const hasUploads = zip.getEntries().some(e => e.entryName.startsWith('uploads/'));
      if (hasUploads) {
        await rm(this.uploadsDirectory, { recursive: true, force: true });
        zip.extractEntryTo('uploads/', process.cwd(), true, true);
      }
      await this.writeAudit(AuditAction.UPDATE, 'Yedek geri yüklendi.', 'SUCCESS', { filename: safe });
      setTimeout(() => process.exit(0), 1500).unref();
      return { message: 'Yedek geri yüklendi. Backend yeniden başlatılıyor.', restarting: true };
    } catch (error) {
      this.recordFailure(error);
      await this.writeAudit(AuditAction.UPDATE, 'Yedek geri yükleme başarısız.', 'FAILED', { filename: safe, error: error instanceof Error ? error.message : String(error) });
      this.running = false;
      throw error;
    }
  }

  private async cleanupOldBackups() {
    const backups = await this.listBackups();
    const safety = backups.filter(x => x.trigger === 'BEFORE_RESTORE');
    const normal = backups.filter(x => x.trigger !== 'BEFORE_RESTORE');
    await Promise.all(normal.slice(this.retentionCount).map(x => rm(join(this.backupDirectory, x.filename), { force: true })));
    await Promise.all(safety.slice(5).map(x => rm(join(this.backupDirectory, x.filename), { force: true })));
  }

  private async runNightlyMaintenanceIfDue() {
    const now = new Date();
    const dateKey = now.toISOString().slice(0,10);
    if (now.getHours() !== 3 || this.lastMaintenanceDate === dateKey || this.running) return;
    this.lastMaintenanceDate = dateKey;
    try {
      this.running = true;
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('PRAGMA wal_checkpoint(FULL)');
        await this.dataSource.query('PRAGMA optimize');
        await this.dataSource.query('ANALYZE');
      }
      this.running = false;
      await this.createBackup('NIGHTLY');
    } catch (error) { this.running = false; this.recordFailure(error); }
  }
}
