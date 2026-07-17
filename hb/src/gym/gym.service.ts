import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gym } from './gym.entity';

@Injectable()
export class GymService {
  constructor(
    @InjectRepository(Gym)
    private readonly gymRepository: Repository<Gym>,
  ) {}

  async createGym(name: string, slug: string): Promise<Gym> {
    const existingGym = await this.gymRepository.findOne({ where: { slug } });
    if (existingGym) {
      throw new ConflictException('Bu salon takma adı (slug) zaten kullanımda.');
    }

    const gym = this.gymRepository.create({ name, slug });
    return this.gymRepository.save(gym);
  }

  async findAll(): Promise<Gym[]> {
    return this.gymRepository.find();
  }
}