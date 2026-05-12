import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReactionDto } from './dto/create-reaction.dto';

@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async react(userId: string, habitId: string, dto: CreateReactionDto) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      select: { id: true, userId: true, isPublic: true },
    });

    if (!habit) {
      throw new NotFoundException('Habit topilmadi');
    }

    if (!habit.isPublic && habit.userId !== userId) {
      throw new ForbiddenException('Bu habitga ruxsat yo\'q');
    }

    const reaction = await this.prisma.reaction.upsert({
      where: {
        userId_habitId: { userId, habitId },
      },
      update: { emoji: dto.emoji },
      create: { userId, habitId, emoji: dto.emoji },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    await this.notifications.notifyReaction(userId, habitId, habit.userId);

    return reaction;
  }

  async remove(userId: string, habitId: string) {
    const reaction = await this.prisma.reaction.findUnique({
      where: {
        userId_habitId: { userId, habitId },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reaksiya topilmadi');
    }

    await this.prisma.reaction.delete({
      where: {
        userId_habitId: { userId, habitId },
      },
    });

    return { message: 'Reaksiya olib tashlandi' };
  }

  // ─────────────────────────────────────────
  // GET ALL (grouped by emoji)
  // ─────────────────────────────────────────
  async findAll(userId: string, habitId: string) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      select: { id: true, userId: true, isPublic: true },
    });

    if (!habit) {
      throw new NotFoundException('Habit topilmadi');
    }

    if (!habit.isPublic && habit.userId !== userId) {
      throw new ForbiddenException('Bu habitga ruxsat yo\'q');
    }

    const reactions = await this.prisma.reaction.findMany({
      where: { habitId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Emoji bo'yicha guruhlash
    const grouped = reactions.reduce(
      (acc, reaction) => {
        const key = reaction.emoji;
        if (!acc[key]) {
          acc[key] = { emoji: key, count: 0, users: [] };
        }
        acc[key].count++;
        acc[key].users.push(reaction.user);
        return acc;
      },
      {} as Record<string, { emoji: string; count: number; users: any[] }>,
    );

    // Joriy user reaksiyasi
    const myReaction = reactions.find((r) => r.userId === userId);

    return {
      total: reactions.length,
      myReaction: myReaction?.emoji ?? null,
      grouped: Object.values(grouped),
    };
  }
}