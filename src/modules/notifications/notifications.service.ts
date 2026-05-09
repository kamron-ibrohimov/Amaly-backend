import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ?? {},
      },
    });

    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { userId: params.userId },
      select: { token: true },
    });

    const tokens = deviceTokens.map((d) => d.token);

    if (tokens.length) {
      await this.firebase.sendToMultiple(tokens, params.title, params.body, params.data);
    }
  }

  async notifyFollow(followerId: string, followingId: string) {
    const follower = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { firstName: true, lastName: true, username: true },
    });

    if (!follower) return;

    const name = `${follower.firstName} ${follower.lastName ?? ''}`.trim();

    await this.createNotification({
      userId: followingId,
      type: 'FOLLOW',
      title: 'Yangi follower 🎉',
      body: `${name} sizni follow qildi`,
      data: { followerId, type: 'FOLLOW' },
    });
  }

  async notifyComment(commenterId: string, habitId: string, habitOwnerId: string) {
    if (commenterId === habitOwnerId) return; 

    const commenter = await this.prisma.user.findUnique({
      where: { id: commenterId },
      select: { firstName: true, lastName: true },
    });

    if (!commenter) return;

    const name = `${commenter.firstName} ${commenter.lastName ?? ''}`.trim();

    await this.createNotification({
      userId: habitOwnerId,
      type: 'COMMENT',
      title: 'Yangi izoh 💬',
      body: `${name} habitingizga izoh qoldirdi`,
      data: { habitId, commenterId, type: 'COMMENT' },
    });
  }

  async notifyReaction(reactorId: string, habitId: string, habitOwnerId: string) {
    if (reactorId === habitOwnerId) return;

    const reactor = await this.prisma.user.findUnique({
      where: { id: reactorId },
      select: { firstName: true, lastName: true },
    });

    if (!reactor) return;

    const name = `${reactor.firstName} ${reactor.lastName ?? ''}`.trim();

    await this.createNotification({
      userId: habitOwnerId,
      type: 'REACTION',
      title: 'Yangi reaksiya 🔥',
      body: `${name} habitingizga reaksiya qo'ydi`,
      data: { habitId, reactorId, type: 'REACTION' },
    });
  }

  async getAll(userId: string, query: NotificationQueryDto) {
    const { page = 1, limit = 20, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
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

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    return { message: 'O\'qildi deb belgilandi' };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'Barcha bildirishnomalar o\'qildi' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async remove(userId: string, notificationId: string) {
    await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });

    return { message: 'Bildirishnoma o\'chirildi' };
  }
}