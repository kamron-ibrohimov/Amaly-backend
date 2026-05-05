import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Frequency } from '../../../generated/prisma/enums';

export class PublicHabitQueryDto {
  @ApiPropertyOptional({ enum: Frequency })
  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @ApiPropertyOptional({ example: 'categoryId' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}