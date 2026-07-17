import {
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, {
    message:
      'Yeni şifre en az 8 karakter olmalıdır.',
  })
  @Matches(/[A-ZÇĞİÖŞÜ]/, {
    message:
      'Yeni şifre en az bir büyük harf içermelidir.',
  })
  @Matches(/[a-zçğıöşü]/, {
    message:
      'Yeni şifre en az bir küçük harf içermelidir.',
  })
  @Matches(/[0-9]/, {
    message:
      'Yeni şifre en az bir rakam içermelidir.',
  })
  newPassword!: string;
}
