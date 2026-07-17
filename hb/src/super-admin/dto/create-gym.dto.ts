import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { GymSubscriptionPlan } from '../../gym/gym.entity';

export class CreateGymDto {
  @IsString()
  @IsNotEmpty({
    message: 'Salon adı zorunludur.',
  })
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Salon bağlantı adı zorunludur.',
  })
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerName?: string;

  @IsOptional()
  @IsEmail(
    {},
    {
      message: 'Geçerli bir salon e-posta adresi girin.',
    },
  )
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsEnum(GymSubscriptionPlan, {
    message: 'Geçerli bir abonelik paketi seçin.',
  })
  subscriptionPlan?: GymSubscriptionPlan;

  @IsOptional()
  @IsString()
  licenseStartDate?: string;

  @IsOptional()
  @IsString()
  licenseEndDate?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsString()
  @IsNotEmpty({
    message: 'Salon yöneticisinin adı zorunludur.',
  })
  @MaxLength(50)
  managerFirstName!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Salon yöneticisinin soyadı zorunludur.',
  })
  @MaxLength(50)
  managerLastName!: string;

  @IsEmail(
    {},
    {
      message: 'Geçerli bir yönetici e-postası girin.',
    },
  )
  managerEmail!: string;

  @IsString()
  @MinLength(8, {
    message: 'Yönetici şifresi en az 8 karakter olmalıdır.',
  })
  @Matches(/[A-ZÇĞİÖŞÜ]/, {
    message: 'Yönetici şifresi en az bir büyük harf içermelidir.',
  })
  @Matches(/[a-zçğıöşü]/, {
    message: 'Yönetici şifresi en az bir küçük harf içermelidir.',
  })
  @Matches(/[0-9]/, {
    message: 'Yönetici şifresi en az bir rakam içermelidir.',
  })
  managerPassword!: string;
}