import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Frequency } from '../../../generated/prisma/enums';

export class HabitQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Frequency })
  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ enum: ['createdAt', 'title', 'targetDays'] })
  @IsOptional()
  @IsEnum(['createdAt', 'title', 'targetDays'])
  sortBy?: 'createdAt' | 'title' | 'targetDays';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}