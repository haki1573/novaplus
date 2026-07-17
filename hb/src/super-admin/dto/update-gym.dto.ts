import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { GymSubscriptionPlan } from '../../gym/gym.entity';

export class UpdateGymDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerName?: string | null;

  @ValidateIf(
    (_object, value) =>
      value !== undefined &&
      value !== null &&
      value !== '',
  )
  @IsEmail(
    {},
    {
      message:
        'Geçerli bir salon e-posta adresi girin.',
    },
  )
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @IsOptional()
  @IsEnum(GymSubscriptionPlan, {
    message:
      'Geçerli bir abonelik paketi seçin.',
  })
  subscriptionPlan?: GymSubscriptionPlan;

  @ValidateIf(
    (_object, value) =>
      value !== undefined &&
      value !== null &&
      value !== '',
  )
  @IsString()
  licenseStartDate?: string | null;

  @ValidateIf(
    (_object, value) =>
      value !== undefined &&
      value !== null &&
      value !== '',
  )
  @IsString()
  licenseEndDate?: string | null;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;
}