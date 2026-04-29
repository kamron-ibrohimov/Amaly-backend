import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { Language } from '../../../generated/prisma/enums';

export class RegisterDto {
  @ApiProperty({ example: 'ibrahimovkamronbek7@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Kamron' })
  // @IsString()
  @IsOptional()
  // @MaxLength(50)

  firstName?: string;

  @ApiPropertyOptional({ example: 'Ibrohimov' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'kamron_ibrohimov' })
  @IsString()
  @IsOptional()          // @IsNotEmpty() o'rniga
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username faqat harf, raqam va _ dan iborat bolishi kerak',
  })
  username?: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)          
  password!: string;

  @ApiPropertyOptional({ example: 'Asia/Tashkent' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ enum: Language, example: Language.UZ })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;
}