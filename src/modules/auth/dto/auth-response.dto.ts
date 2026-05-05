import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  user!: {
    id: string;
    email: string;
    username: string;
    firstName?: string | null;   
    lastName?: string | undefined;
    avatar?: string | undefined;
    role: string;
  };

  @ApiProperty()
  tokens!: TokensDto;
}

export class MeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  username!: string;

  @ApiPropertyOptional()
  firstName?: string | null;   

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  avatar?: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

