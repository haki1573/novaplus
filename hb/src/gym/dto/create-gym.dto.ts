import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateGymDto {
  @ApiProperty({
    example: 'HB Fitness',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'hb-fitness',
  })
  @IsString()
  slug: string;
}