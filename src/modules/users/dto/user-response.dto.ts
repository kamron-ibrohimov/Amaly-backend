import { Language, Role } from '../../../generated/prisma/enums';

export interface PublicUserResponseDto {
  id: string;
  username: string;
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  isPublic: boolean;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export interface PrivateUserResponseDto {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  isPublic: boolean;
  timezone: string;
  language: Language;
  role: Role;
  isVerified: boolean;
  lastLoginAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
}