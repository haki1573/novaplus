import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFinanceDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  @IsIn(['income', 'expense'])
  type!: 'income' | 'expense';

  @IsOptional()
  @IsString()
  description?: string;
}