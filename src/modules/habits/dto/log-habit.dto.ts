import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class LogHabitDto {
  @ApiPropertyOptional({ example: '2026-04-29' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ example: '30 daqiqa o\'qidim' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}