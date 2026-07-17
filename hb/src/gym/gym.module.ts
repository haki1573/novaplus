import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymService } from './gym.service';
import { GymController } from './gym.controller';
import { Gym } from './gym.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Gym])],
  providers: [GymService],
  controllers: [GymController],
  exports: [GymService],
})
export class GymModule {}