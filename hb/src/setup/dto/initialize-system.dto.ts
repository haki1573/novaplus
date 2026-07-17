import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class InitializeSystemDto {
  @IsString()
  @IsNotEmpty({
    message: 'Ad alanı zorunludur.',
  })
  @MaxLength(50, {
    message: 'Ad en fazla 50 karakter olabilir.',
  })
  firstName!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Soyad alanı zorunludur.',
  })
  @MaxLength(50, {
    message: 'Soyad en fazla 50 karakter olabilir.',
  })
  lastName!: string;

  @IsEmail(
    {},
    {
      message: 'Geçerli bir e-posta adresi girin.',
    },
  )
  @IsNotEmpty({
    message: 'E-posta alanı zorunludur.',
  })
  email!: string;

  @IsString()
  @MinLength(8, {
    message: 'Şifre en az 8 karakter olmalıdır.',
  })
  @MaxLength(100, {
    message: 'Şifre en fazla 100 karakter olabilir.',
  })
  @Matches(/[A-ZÇĞİÖŞÜ]/, {
    message:
      'Şifre en az bir büyük harf içermelidir.',
  })
  @Matches(/[a-zçğıöşü]/, {
    message:
      'Şifre en az bir küçük harf içermelidir.',
  })
  @Matches(/[0-9]/, {
    message:
      'Şifre en az bir rakam içermelidir.',
  })
  password!: string;
}