import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from './package.entity';

@Injectable()
export class PackageService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
  ) {}

  async createPackage(data: Partial<Package>, gymId: string) {
    const newPackage = this.packageRepository.create({
      name: data.name || '',
      price: Number(data.price) || 0,
      durationMonths: Number(data.durationMonths) || 1,
      description: data.description || '',
      status: data.status || 'Aktif',
      gymId,
    });

    return this.packageRepository.save(newPackage);
  }

  async getPackagesByGym(gymId: string) {
    return this.packageRepository.find({
      where: { gymId },
      order: { createdAt: 'DESC' },
    });
  }

  async updatePackage(id: string, gymId: string, data: Partial<Package>) {
    const packageItem = await this.packageRepository.findOne({
      where: { id, gymId },
    });

    if (!packageItem) {
      throw new NotFoundException('Paket bulunamadı.');
    }

    packageItem.name = data.name ?? packageItem.name;
    packageItem.price =
      data.price !== undefined ? Number(data.price) : packageItem.price;
    packageItem.durationMonths =
      data.durationMonths !== undefined
        ? Number(data.durationMonths)
        : packageItem.durationMonths;
    packageItem.description = data.description ?? packageItem.description;
    packageItem.status = data.status ?? packageItem.status;

    return this.packageRepository.save(packageItem);
  }

  async deletePackage(id: string, gymId: string) {
    const result = await this.packageRepository.delete({ id, gymId });

    if (result.affected === 0) {
      throw new NotFoundException('Paket bulunamadı.');
    }

    return { message: 'Paket silindi.' };
  }
}