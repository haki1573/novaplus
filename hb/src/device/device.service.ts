import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Gym } from '../gym/gym.entity';
import {
  NotificationSeverity,
} from '../notification/notification.entity';
import { NotificationService } from '../notification/notification.service';
import {
  DeviceEventSeverity,
  DeviceEventType,
} from '../device-event/device-event.entity';
import { DeviceEventService } from '../device-event/device-event.service';

import {
  Device,
  DeviceStatus,
  DeviceType,
} from './device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository:
      Repository<Device>,

    @InjectRepository(Gym)
    private readonly gymRepository:
      Repository<Gym>,

    private readonly deviceEventService:
      DeviceEventService,

    private readonly notificationService:
      NotificationService,
  ) {}

  private async getGym(
    gymId: string,
  ): Promise<Gym> {
    const gym =
      await this.gymRepository.findOne({
        where: { id: gymId },
      });

    if (!gym) {
      throw new NotFoundException(
        'Spor salonu bulunamadı.',
      );
    }

    return gym;
  }

  async create(
    gymId: string,
    dto: CreateDeviceDto,
  ): Promise<Device> {
    const gym =
      await this.getGym(gymId);

    const existingDevice =
      await this.deviceRepository.findOne({
        where: {
          gymId,
          serialNumber:
            dto.serialNumber,
        },
      });

    if (existingDevice) {
      throw new BadRequestException(
        'Bu seri numarasına sahip cihaz zaten kayıtlı.',
      );
    }

    const device =
      this.deviceRepository.create({
        ...dto,
        gymId,
        organizationId:
          gym.organizationId,
        installedAt:
          dto.installedAt
            ? new Date(
                dto.installedAt,
              )
            : new Date(),
        status:
          dto.status ??
          DeviceStatus.OFFLINE,
        isActive:
          dto.isActive ?? true,
      });

    const saved =
      await this.deviceRepository.save(
        device,
      );

    await this.deviceEventService.create({
      gymId,
      organizationId:
        saved.organizationId,
      deviceId: saved.id,
      deviceName: saved.name,
      deviceType: saved.type,
      eventType:
        DeviceEventType.CREATED,
      title: 'Cihaz eklendi',
      description:
        `${saved.name} Device Center'a eklendi.`,
      currentValue:
        saved.status,
    });

    return saved;
  }

  async findAll(
    gymId: string,
    type?: DeviceType,
    status?: DeviceStatus,
  ): Promise<Device[]> {
    const query =
      this.deviceRepository
        .createQueryBuilder(
          'device',
        );

    query.where(
      'device.gymId = :gymId',
      { gymId },
    );

    if (type) {
      query.andWhere(
        'device.type = :type',
        { type },
      );
    }

    if (status) {
      query.andWhere(
        'device.status = :status',
        { status },
      );
    }

    return query
      .orderBy(
        'device.createdAt',
        'DESC',
      )
      .getMany();
  }

  async findOne(
    gymId: string,
    id: string,
  ): Promise<Device> {
    const device =
      await this.deviceRepository.findOne({
        where: {
          id,
          gymId,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Cihaz bulunamadı.',
      );
    }

    return device;
  }

  async update(
    gymId: string,
    id: string,
    dto: UpdateDeviceDto,
  ): Promise<Device> {
    const device =
      await this.findOne(
        gymId,
        id,
      );

    if (
      dto.serialNumber &&
      dto.serialNumber !==
        device.serialNumber
    ) {
      const serialExists =
        await this.deviceRepository.findOne({
          where: {
            gymId,
            serialNumber:
              dto.serialNumber,
          },
        });

      if (serialExists) {
        throw new BadRequestException(
          'Bu seri numarası başka bir cihazda kullanılıyor.',
        );
      }
    }

    const oldFirmware =
      device.firmwareVersion;

    const installedAt =
      dto.installedAt
        ? new Date(dto.installedAt)
        : device.installedAt;

    Object.assign(
      device,
      dto,
      { installedAt },
    );

    const saved =
      await this.deviceRepository.save(
        device,
      );

    await this.deviceEventService.create({
      gymId,
      organizationId:
        saved.organizationId,
      deviceId: saved.id,
      deviceName: saved.name,
      deviceType: saved.type,
      eventType:
        oldFirmware !==
          saved.firmwareVersion
          ? DeviceEventType.FIRMWARE_CHANGED
          : DeviceEventType.UPDATED,
      title:
        oldFirmware !==
          saved.firmwareVersion
          ? 'Firmware bilgisi değişti'
          : 'Cihaz güncellendi',
      description:
        oldFirmware !==
          saved.firmwareVersion
          ? `${saved.name} firmware sürümü güncellendi.`
          : `${saved.name} bilgileri güncellendi.`,
      previousValue:
        oldFirmware,
      currentValue:
        saved.firmwareVersion,
    });

    await this.syncFirmwareAlert(
      saved,
    );

    return saved;
  }

  async remove(
    gymId: string,
    id: string,
  ): Promise<{
    message: string;
  }> {
    const device =
      await this.findOne(
        gymId,
        id,
      );

    await this.deviceEventService.create({
      gymId,
      organizationId:
        device.organizationId,
      deviceId: device.id,
      deviceName:
        device.name,
      deviceType:
        device.type,
      eventType:
        DeviceEventType.DELETED,
      severity:
        DeviceEventSeverity.WARNING,
      title: 'Cihaz silindi',
      description:
        `${device.name} Device Center'dan silindi.`,
      previousValue:
        device.status,
    });

    await Promise.all([
      this.notificationService.resolveDeviceAlert(
        gymId,
        id,
        'OFFLINE',
      ),
      this.notificationService.resolveDeviceAlert(
        gymId,
        id,
        'ERROR',
      ),
      this.notificationService.resolveDeviceAlert(
        gymId,
        id,
        'FIRMWARE',
      ),
    ]);

    await this.deviceRepository.remove(
      device,
    );

    return {
      message:
        'Cihaz başarıyla silindi.',
    };
  }

  async updateStatus(
    gymId: string,
    id: string,
    status: DeviceStatus,
  ): Promise<Device> {
    const device =
      await this.findOne(
        gymId,
        id,
      );

    const previousStatus =
      device.status;

    device.status = status;

    if (
      status ===
      DeviceStatus.ONLINE
    ) {
      device.lastSeen =
        new Date();
    }

    const saved =
      await this.deviceRepository.save(
        device,
      );

    await this.recordStatusChange(
      saved,
      previousStatus,
      status,
    );

    await this.syncStatusAlerts(
      saved,
    );

    return saved;
  }

  async heartbeat(
    gymId: string,
    id: string,
    dto: DeviceHeartbeatDto,
  ): Promise<Device> {
    const device =
      await this.findOne(
        gymId,
        id,
      );

    const previousStatus =
      device.status;
    const previousError =
      device.lastError;
    const previousFirmware =
      device.firmwareVersion;

    device.status =
      dto.lastError
        ? DeviceStatus.ERROR
        : DeviceStatus.ONLINE;

    device.lastSeen =
      new Date();

    if (
      dto.firmwareVersion !==
      undefined
    ) {
      device.firmwareVersion =
        dto.firmwareVersion;
    }

    if (
      dto.ipAddress !==
      undefined
    ) {
      device.ipAddress =
        dto.ipAddress;
    }

    if (
      dto.connectionType !==
      undefined
    ) {
      device.connectionType =
        dto.connectionType;
    }

    if (
      dto.latencyMs !==
      undefined
    ) {
      device.latencyMs =
        dto.latencyMs;
    }

    if (
      dto.uptimeSeconds !==
      undefined
    ) {
      device.uptimeSeconds =
        dto.uptimeSeconds;
    }

    if (
      dto.lastError !==
      undefined
    ) {
      device.lastError =
        dto.lastError || null;

      device.lastErrorAt =
        dto.lastError
          ? new Date()
          : device.lastErrorAt;
    }

    if (
      dto.metadata !==
      undefined
    ) {
      device.metadata = {
        ...(device.metadata ??
          {}),
        ...dto.metadata,
      };
    }

    const saved =
      await this.deviceRepository.save(
        device,
      );

    if (
      previousStatus !==
      saved.status
    ) {
      await this.recordStatusChange(
        saved,
        previousStatus,
        saved.status,
      );
    }

    if (
      previousError !==
        saved.lastError
    ) {
      await this.deviceEventService.create({
        gymId,
        organizationId:
          saved.organizationId,
        deviceId: saved.id,
        deviceName:
          saved.name,
        deviceType:
          saved.type,
        eventType:
          saved.lastError
            ? DeviceEventType.ERROR
            : DeviceEventType.ERROR_CLEARED,
        severity:
          saved.lastError
            ? DeviceEventSeverity.CRITICAL
            : DeviceEventSeverity.INFO,
        title:
          saved.lastError
            ? 'Cihaz hatası'
            : 'Cihaz hatası giderildi',
        description:
          saved.lastError
            ? `${saved.name}: ${saved.lastError}`
            : `${saved.name} normal çalışmaya döndü.`,
        previousValue:
          previousError,
        currentValue:
          saved.lastError,
      });
    }

    if (
      previousFirmware !==
      saved.firmwareVersion
    ) {
      await this.deviceEventService.create({
        gymId,
        organizationId:
          saved.organizationId,
        deviceId: saved.id,
        deviceName:
          saved.name,
        deviceType:
          saved.type,
        eventType:
          DeviceEventType.FIRMWARE_CHANGED,
        title:
          'Firmware sürümü değişti',
        description:
          `${saved.name} firmware sürümünü bildirdi.`,
        previousValue:
          previousFirmware,
        currentValue:
          saved.firmwareVersion,
      });
    }

    await this.syncStatusAlerts(
      saved,
    );

    await this.syncFirmwareAlert(
      saved,
    );

    return saved;
  }

  async getDeviceAlarms(
    gymId: string,
  ) {
    return this.notificationService
      .listDeviceAlerts(gymId);
  }

  async getDashboardStats(
    gymId: string,
  ) {
    const devices =
      await this.findAll(gymId);

    const last24Hours =
      new Date(
        Date.now() -
          24 * 60 * 60 * 1000,
      );

    return {
      totalDevices:
        devices.length,
      onlineDevices:
        devices.filter(
          (device) =>
            device.status ===
            DeviceStatus.ONLINE,
        ).length,
      offlineDevices:
        devices.filter(
          (device) =>
            device.status ===
            DeviceStatus.OFFLINE,
        ).length,
      maintenanceDevices:
        devices.filter(
          (device) =>
            device.status ===
            DeviceStatus.MAINTENANCE,
        ).length,
      errorDevices:
        devices.filter(
          (device) =>
            device.status ===
            DeviceStatus.ERROR,
        ).length,
      errorsLast24Hours:
        devices.filter(
          (device) =>
            device.lastErrorAt !==
              null &&
            device.lastErrorAt >=
              last24Hours,
        ).length,
      updatePendingDevices:
        devices.filter(
          (device) =>
            Boolean(
              device.latestFirmwareVersion,
            ) &&
            device.latestFirmwareVersion !==
              device.firmwareVersion,
        ).length,
      devicesByType:
        (Object.values(DeviceType) as DeviceType[]).reduce<
          Record<DeviceType, number>
        >(
          (result, type) => {
            result[type] = devices.filter(
              (device) => device.type === type,
            ).length;

            return result;
          },
          {} as Record<DeviceType, number>,
        ),
      recentDevices:
        [...devices]
          .sort(
            (
              first,
              second,
            ) =>
              (second.lastSeen?.getTime() ??
                0) -
              (first.lastSeen?.getTime() ??
                0),
          )
          .slice(0, 10),
    };
  }

  private async recordStatusChange(
    device: Device,
    previousStatus:
      DeviceStatus,
    currentStatus:
      DeviceStatus,
  ) {
    await this.deviceEventService.create({
      gymId: device.gymId,
      organizationId:
        device.organizationId,
      deviceId: device.id,
      deviceName:
        device.name,
      deviceType:
        device.type,
      eventType:
        currentStatus ===
        DeviceStatus.ONLINE
          ? DeviceEventType.ONLINE
          : currentStatus ===
              DeviceStatus.OFFLINE
            ? DeviceEventType.OFFLINE
            : DeviceEventType.STATUS_CHANGED,
      severity:
        currentStatus ===
          DeviceStatus.ERROR ||
        currentStatus ===
          DeviceStatus.OFFLINE
          ? DeviceEventSeverity.CRITICAL
          : currentStatus ===
              DeviceStatus.MAINTENANCE
            ? DeviceEventSeverity.WARNING
            : DeviceEventSeverity.INFO,
      title:
        'Cihaz durumu değişti',
      description:
        `${device.name}: ${previousStatus} → ${currentStatus}`,
      previousValue:
        previousStatus,
      currentValue:
        currentStatus,
    });
  }

  private async syncStatusAlerts(
    device: Device,
  ) {
    if (
      device.status ===
      DeviceStatus.OFFLINE
    ) {
      await this.notificationService.upsertDeviceAlert({
        gymId: device.gymId,
        deviceId: device.id,
        deviceName: device.name,
        alertType:
          'OFFLINE',
        title:
          `${device.name} çevrimdışı`,
        description:
          `${device.name} cihazıyla bağlantı kurulamıyor.`,
        severity:
          NotificationSeverity.CRITICAL,
      });
    } else {
      await this.notificationService.resolveDeviceAlert(
        device.gymId,
        device.id,
        'OFFLINE',
      );
    }

    if (
      device.status ===
        DeviceStatus.ERROR ||
      device.lastError
    ) {
      await this.notificationService.upsertDeviceAlert({
        gymId: device.gymId,
        deviceId: device.id,
        deviceName: device.name,
        alertType: 'ERROR',
        title:
          `${device.name} hata verdi`,
        description:
          device.lastError ||
          `${device.name} hata durumunda.`,
        severity:
          NotificationSeverity.CRITICAL,
      });
    } else {
      await this.notificationService.resolveDeviceAlert(
        device.gymId,
        device.id,
        'ERROR',
      );
    }
  }

  private async syncFirmwareAlert(
    device: Device,
  ) {
    const updatePending =
      Boolean(
        device.latestFirmwareVersion,
      ) &&
      device.latestFirmwareVersion !==
        device.firmwareVersion;

    if (updatePending) {
      await this.notificationService.upsertDeviceAlert({
        gymId: device.gymId,
        deviceId: device.id,
        deviceName:
          device.name,
        alertType:
          'FIRMWARE',
        title:
          `${device.name} güncelleme bekliyor`,
        description:
          `Mevcut: ${device.firmwareVersion || 'bilinmiyor'} · Güncel: ${device.latestFirmwareVersion}`,
        severity:
          NotificationSeverity.WARNING,
      });
    } else {
      await this.notificationService.resolveDeviceAlert(
        device.gymId,
        device.id,
        'FIRMWARE',
      );
    }
  }
}
