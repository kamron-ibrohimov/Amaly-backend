import { Frequency } from '../../../generated/prisma/enums';

export interface HabitResponseDto {
  id: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isPublic: boolean;
  frequency: Frequency;
  targetDays: number;
  userId: string;
  categoryId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}