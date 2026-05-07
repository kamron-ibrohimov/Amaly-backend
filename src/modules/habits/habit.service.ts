import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from '../../common/types/pagination.types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { HabitQueryDto } from './dto/habit-query.dto';
import { HabitResponseDto } from './dto/habit-response.dto';
import { LogHabitDto } from './dto/log-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { PublicHabitQueryDto } from './dto/public-habit-query.dto';

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────
  async create(userId: string, dto: CreateHabitDto): Promise<HabitResponseDto> {
    const habit = await this.prisma.habit.create({
      data: {
        ...dto,
        userId,
      },
    });

    return habit;
  }

  // ─────────────────────────────────────────
  // GET ALL (o'z habitlari)
  // ─────────────────────────────────────────
  async findAll(userId: string, query: HabitQueryDto): Promise<PaginatedResult<HabitResponseDto>> {
    const {
      page = 1,
      limit = 10,
      search,
      frequency,
      categoryId,
      isPublic,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(frequency && { frequency }),
      ...(categoryId && { categoryId }),
      ...(isPublic !== undefined && { isPublic }),
    };

    const [habits, total] = await Promise.all([
      this.prisma.habit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.habit.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: habits,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────
  // GET ONE
  // ─────────────────────────────────────────
  async findOne(userId: string, habitId: string): Promise<HabitResponseDto> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      throw new NotFoundException('Habit topilmadi');
    }

    if (habit.userId !== userId && !habit.isPublic) {
      throw new ForbiddenException('Bu habitga ruxsat yo\'q');
    }

    return habit;
  }

  // ─────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────
  async update(userId: string, habitId: string, dto: UpdateHabitDto): Promise<HabitResponseDto> {
    await this.checkOwnership(userId, habitId);

    const updated = await this.prisma.habit.update({
      where: { id: habitId },
      data: dto,
    });

    return updated;
  }

  // ─────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────
  async remove(userId: string, habitId: string): Promise<{ message: string }> {
    await this.checkOwnership(userId, habitId);

    await this.prisma.habit.delete({
      where: { id: habitId },
    });

    return { message: 'Habit muvaffaqiyatli o\'chirildi' };
  }

  // ─────────────────────────────────────────
  // LOG HABIT
  // ─────────────────────────────────────────
  async logHabit(userId: string, habitId: string, dto: LogHabitDto) {
    await this.checkOwnership(userId, habitId);

    const date = dto.date ? new Date(dto.date) : new Date();
    date.setUTCHours(0, 0, 0, 0);

    const log = await this.prisma.habitLog.upsert({
      where: {
        habitId_date: { habitId, date },
      },
      update: {
        completed: dto.completed ?? true,
        note: dto.note,
      },
      create: {
        habitId,
        date,
        completed: dto.completed ?? true,
        note: dto.note,
      },
    });

    return log;
  }

  // ─────────────────────────────────────────
  // GET LOGS
  // ─────────────────────────────────────────
  async getLogs(userId: string, habitId: string) {
    await this.checkOwnership(userId, habitId);

    const logs = await this.prisma.habitLog.findMany({
      where: { habitId },
      orderBy: { date: 'desc' },
    });

    return logs;
  }

  // ─────────────────────────────────────────
  // GET STREAK
  // ─────────────────────────────────────────
  async getStreak(userId: string, habitId: string) {
    await this.checkOwnership(userId, habitId);

    const logs = await this.prisma.habitLog.findMany({
      where: { habitId, completed: true },
      orderBy: { date: 'desc' },
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < logs.length; i++) {
      const logDate = new Date(logs[i].date);
      const expectedDate = new Date(today);
      expectedDate.setUTCDate(today.getUTCDate() - i);

      if (logDate.toISOString() === expectedDate.toISOString()) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      } else {
        break;
      }
    }

    // Longest streak hisoblash
    let streak = 0;
    for (let i = 0; i < logs.length; i++) {
      if (i === 0) {
        streak = 1;
      } else {
        const prev = new Date(logs[i - 1].date);
        const curr = new Date(logs[i].date);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
          streak++;
        } else {
          streak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, streak);
    }

    return {
      currentStreak,
      longestStreak,
      totalCompleted: logs.length,
    };
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────
  private async checkOwnership(userId: string, habitId: string): Promise<void> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      throw new NotFoundException('Habit topilmadi');
    }

    if (habit.userId !== userId) {
      throw new ForbiddenException('Bu habitga ruxsat yo\'q');
    }
  }

async getPublicHabits(
  currentUserId: string,
  targetUserId: string,
  query: PublicHabitQueryDto,
) {
  // Target user mavjudmi?
  const targetUser = await this.prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isPublic: true },
  });

  if (!targetUser) throw new NotFoundException('Foydalanuvchi topilmadi');

  // Private akkaunt bo'lsa — faqat ACCEPTED follower ko'ra oladi
  if (!targetUser.isPublic) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    if (!follow || follow.status !== 'ACCEPTED') {
      throw new ForbiddenException('Bu foydalanuvchi private akkauntga ega');
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return this.prisma.habit.findMany({
    where: {
      userId: targetUserId,
      isPublic: true,
      ...(query.frequency && { frequency: query.frequency }),
      ...(query.categoryId && { categoryId: query.categoryId }),
    },
    include: {
      logs: {
        where: { date: { gte: today } },
        take: 1,
      },
      _count: {
        select: { reactions: true, comments: true },
      },
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
}