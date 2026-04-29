import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CommentQueryDto } from './dto/comment-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────
  async create(userId: string, habitId: string, dto: CreateCommentDto) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      select: { id: true, userId: true, isPublic: true },
    });

    if (!habit) {
      throw new NotFoundException('Habit topilmadi');
    }

    // Private habit — faqat egasi comment qo'sha oladi
    if (!habit.isPublic && habit.userId !== userId) {
      throw new ForbiddenException('Bu habitga ruxsat yo\'q');
    }

    const comment = await this.prisma.comment.create({
      data: { text: dto.text, userId, habitId },
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

    // Notification trigger
    await this.notifications.notifyComment(userId, habitId, habit.userId);

    return comment;
  }

  // ─────────────────────────────────────────
  // GET ALL (habit commentlari)
  // ─────────────────────────────────────────
  async findAll(userId: string, habitId: string, query: CommentQueryDto) {
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

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { habitId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.comment.count({ where: { habitId } }),
    ]);

    return {
      data: comments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────
  async update(userId: string, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Izoh topilmadi');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Bu izohni tahrirlash huquqingiz yo\'q');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { text: dto.text },
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

    return updated;
  }

  // ─────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────
  async remove(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        habit: { select: { userId: true } },
      },
    });

    if (!comment) {
      throw new NotFoundException('Izoh topilmadi');
    }

    // O'z commenti yoki habit egasi o'chira oladi
    if (comment.userId !== userId && comment.habit.userId !== userId) {
      throw new ForbiddenException('Bu izohni o\'chirish huquqingiz yo\'q');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    return { message: 'Izoh o\'chirildi' };
  }
}