import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FollowersQueryDto } from './dto/followers-query.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─────────────────────────────────────────
  // FOLLOW
  // ─────────────────────────────────────────
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('O\'zingizni follow qila olmaysiz');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, isPublic: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException('Allaqachon follow qilgansiz');
      }
      if (existing.status === 'PENDING') {
        throw new BadRequestException('So\'rovingiz kutilmoqda');
      }
    }

    const status = targetUser.isPublic ? 'ACCEPTED' : 'PENDING';

    const follow = await this.prisma.follow.create({
      data: { followerId, followingId, status },
    });

    // Faqat public account da notification ketadi
    // Private da PENDING — accept qilinganda notification ketadi
    if (status === 'ACCEPTED') {
      await this.notifications.notifyFollow(followerId, followingId);
    }

    return {
      ...follow,
      message: status === 'PENDING'
        ? 'Follow so\'rovi yuborildi'
        : 'Muvaffaqiyatli follow qilindi',
    };
  }

  // ─────────────────────────────────────────
  // UNFOLLOW
  // ─────────────────────────────────────────
  async unfollow(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow topilmadi');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    return { message: 'Unfollow muvaffaqiyatli' };
  }

  // ─────────────────────────────────────────
  // ACCEPT / REJECT REQUEST (faqat following tomonidan)
  // ─────────────────────────────────────────
    async acceptRequest(currentUserId: string, followerId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: currentUserId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('So\'rov topilmadi');
    }

    if (follow.status !== 'PENDING') {
      throw new BadRequestException('So\'rov allaqachon ko\'rib chiqilgan');
    }

    const updated = await this.prisma.follow.update({
      where: {
        followerId_followingId: {
          followerId,
          followingId: currentUserId,
        },
      },
      data: { status: 'ACCEPTED' },
    });

    // Accept qilinganda notification ketadi
    await this.notifications.notifyFollow(followerId, currentUserId);

    return updated;
  }

    async rejectRequest(currentUserId: string, followerId: string) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId: currentUserId,
          },
        },
      });

      if (!follow) {
        throw new NotFoundException('So\'rov topilmadi');
      }

      if (follow.status !== 'PENDING') {
        throw new BadRequestException('So\'rov allaqachon ko\'rib chiqilgan');
      }

      await this.prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId: currentUserId,
          },
        },
      });

      return { message: 'So\'rov rad etildi' };
    }

  // ─────────────────────────────────────────
  // PENDING REQUESTS (menga kelgan so'rovlar)
  // ─────────────────────────────────────────
  async getPendingRequests(currentUserId: string, query: FollowersQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: currentUserId, status: 'PENDING' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
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
      this.prisma.follow.count({
        where: { followingId: currentUserId, status: 'PENDING' },
      }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────
  // GET FOLLOWERS
  // ─────────────────────────────────────────
  async getFollowers(currentUserId: string, targetUserId: string, query: FollowersQueryDto) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isPublic: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // Private account → faqat o'zi ko'ra oladi
    if (!targetUser.isPublic && currentUserId !== targetUserId) {
      throw new ForbiddenException('Bu foydalanuvchi profili yopiq');
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: targetUserId, status: 'ACCEPTED' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
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
      this.prisma.follow.count({
        where: { followingId: targetUserId, status: 'ACCEPTED' },
      }),
    ]);

    return {
      data: followers.map((f) => f.follower),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────
  // GET FOLLOWING
  // ─────────────────────────────────────────
  async getFollowing(currentUserId: string, targetUserId: string, query: FollowersQueryDto) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isPublic: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if (!targetUser.isPublic && currentUserId !== targetUserId) {
      throw new ForbiddenException('Bu foydalanuvchi profili yopiq');
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: targetUserId, status: 'ACCEPTED' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
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
      this.prisma.follow.count({
        where: { followerId: targetUserId, status: 'ACCEPTED' },
      }),
    ]);

    return {
      data: following.map((f) => f.following),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}