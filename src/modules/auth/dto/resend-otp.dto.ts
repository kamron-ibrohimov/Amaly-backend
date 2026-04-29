import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ResendOtpDto {
  @ApiProperty({ example: 'ibrahimovkamronbek7@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}