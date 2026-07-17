import { Body, Controller, Get, Post } from '@nestjs/common';
import { GymService } from './gym.service';
import { CreateGymDto } from './dto/create-gym.dto';

@Controller('gyms')
export class GymController {
  constructor(private readonly gymService: GymService) {}

  @Post()
  create(@Body() dto: CreateGymDto) {
    return this.gymService.createGym(dto.name, dto.slug);
  }

  @Get()
  findAll() {
    return this.gymService.findAll();
  }
}