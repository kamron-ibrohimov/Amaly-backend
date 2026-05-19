import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChallengeQueryDto } from './dto/challenge-query.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateChallengeDto) {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && startDate >= endDate) {
      throw new BadRequestException('startDate endDate dan oldin bo\'lishi kerak');
    }

    const challenge = await this.prisma.challenge.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        isPublic: dto.isPublic ?? true,
        startDate,
        endDate,
        creatorId: userId,
        users: {
          create: {
            userId,
            status: 'ACTIVE',
          },
        },
      },
      include: this.challengeInclude(),
    });

    return this.formatChallenge(challenge, userId);
  }

  async findAll(userId: string, query: ChallengeQueryDto) {
    const { page = 1, limit = 20, onlyMine } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(onlyMine
        ? { users: { some: { userId } } }
        : { OR: [{ isPublic: true }, { users: { some: { userId } } }] }),
    };

    const [challenges, total] = await Promise.all([
      this.prisma.challenge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.challengeInclude(),
      }),
      this.prisma.challenge.count({ where }),
    ]);

    return {
      data: challenges.map((c) => this.formatChallenge(c, userId)),
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

  async findOne(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        ...this.challengeInclude(true),
        habits: {
          include: {
            habit: {
              select: { id: true, title: true, icon: true, color: true },
            },
          },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge topilmadi');
    }

    const isMember = (challenge.users as any[]).some(
      (u) => u.userId === userId && u.status !== 'LEFT',
    );

    if (!challenge.isPublic && !isMember) {
      throw new ForbiddenException('Bu challengega ruxsat yo\'q');
    }

    return this.formatChallenge(challenge, userId);
  }

  async update(userId: string, challengeId: string, dto: UpdateChallengeDto) {
    await this.checkCreator(userId, challengeId);

    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    if (startDate && endDate && startDate >= endDate) {
      throw new BadRequestException('startDate endDate dan oldin bo\'lishi kerak');
    }

    const updated = await this.prisma.challenge.update({
      where: { id: challengeId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
      include: this.challengeInclude(),
    });

    return this.formatChallenge(updated, userId);
  }

  async remove(userId: string, challengeId: string) {
    await this.checkCreator(userId, challengeId);

    await this.prisma.challenge.delete({ where: { id: challengeId } });

    return { message: 'Challenge o\'chirildi' };
  }

  async inviteUser(creatorId: string, challengeId: string, dto: InviteUserDto) {
    await this.checkCreator(creatorId, challengeId);

    if (creatorId === dto.userId) {
      throw new BadRequestException('O\'zingizni invite qila olmaysiz');
    }

    // Faqat following ni invite qilsa bo'ladi
    const isFollowing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: creatorId,
          followingId: dto.userId,
        },
      },
    });

    if (!isFollowing || isFollowing.status !== 'ACCEPTED') {
      throw new BadRequestException('Faqat do\'stlaringizni invite qilishingiz mumkin');
    }

    const existing = await this.prisma.challengeUser.findUnique({
      where: {
        challengeId_userId: { challengeId, userId: dto.userId },
      },
    });

    if (existing) {
      throw new BadRequestException('Bu foydalanuvchi allaqachon taklif qilingan yoki a\'zo');
    }

    await this.prisma.challengeUser.create({
      data: {
        challengeId,
        userId: dto.userId,
        status: 'PENDING',
      },
    });

    await this.notifications.createNotification({
      userId: dto.userId,
      type: 'CHALLENGE_INVITE',
      title: 'Challenge taklifi 🏆',
      body: 'Sizni challengega taklif qilishdi',
      data: { challengeId, type: 'CHALLENGE_INVITE' },
    });

    return { message: 'Taklif yuborildi' };
  }

  async acceptInvite(userId: string, challengeId: string) {
    const member = await this.prisma.challengeUser.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Taklif topilmadi');
    }

    if (member.status !== 'PENDING') {
      throw new BadRequestException('Taklif allaqachon ko\'rib chiqilgan');
    }

    const updated = await this.prisma.challengeUser.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: { status: 'ACTIVE' },
    });

    return updated;
  }

  async leaveOrReject(userId: string, challengeId: string) {
    const member = await this.prisma.challengeUser.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Challenge a\'zolik topilmadi');
    }

    // Creator chiqib keta olmaydi
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { creatorId: true },
    });

    if (challenge?.creatorId === userId) {
      throw new BadRequestException('Challenge yaratuvchisi challengeni tark eta olmaydi');
    }

    const status = member.status === 'PENDING' ? 'LEFT' : 'LEFT';

    await this.prisma.challengeUser.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: { status },
    });

    return { message: member.status === 'PENDING' ? 'Taklif rad etildi' : 'Challengedan chiqildi' };
  }

  async addHabit(userId: string, challengeId: string, habitId: string) {
    await this.checkCreator(userId, challengeId);

    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      select: { id: true, userId: true },
    });

    if (!habit) {
      throw new NotFoundException('Habit topilmadi');
    }

    if (habit.userId !== userId) {
      throw new ForbiddenException('Faqat o\'z habitingizni qo\'sha olasiz');
    }

    const existing = await this.prisma.challengeHabit.findUnique({
      where: { challengeId_habitId: { challengeId, habitId } },
    });

    if (existing) {
      throw new BadRequestException('Bu habit allaqachon challenge ga qo\'shilgan');
    }

    const challengeHabit = await this.prisma.challengeHabit.create({
      data: { challengeId, habitId },
      include: {
        habit: {
          select: { id: true, title: true, icon: true, color: true },
        },
      },
    });

    return challengeHabit;
  }

  async removeHabit(userId: string, challengeId: string, habitId: string) {
    await this.checkCreator(userId, challengeId);

    const existing = await this.prisma.challengeHabit.findUnique({
      where: { challengeId_habitId: { challengeId, habitId } },
    });

    if (!existing) {
      throw new NotFoundException('Habit bu challengeda topilmadi');
    }

    await this.prisma.challengeHabit.delete({
      where: { challengeId_habitId: { challengeId, habitId } },
    });

    return { message: 'Habit challengedan olib tashlandi' };
  }

  async getMembers(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { isPublic: true, users: { select: { userId: true } } },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge topilmadi');
    }

    const isMember = challenge.users.some((u) => u.userId === userId);

    if (!challenge.isPublic && !isMember) {
      throw new ForbiddenException('Bu challengega ruxsat yo\'q');
    }

    const members = await this.prisma.challengeUser.findMany({
      where: { challengeId },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  }

  private async checkCreator(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { creatorId: true },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge topilmadi');
    }

    if (challenge.creatorId !== userId) {
      throw new ForbiddenException('Faqat challenge yaratuvchisi bu amalni bajarishi mumkin');
    }
  }

  private challengeInclude(allUsers = false) {
    return {
      creator: {
        select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
      },
      users: {
        ...(!allUsers && { where: { status: 'ACTIVE' as const } }),
        include: {
          user: {
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { joinedAt: 'asc' as const },
      },
      _count: { select: { users: true, habits: true } },
    };
  }

  private formatChallenge(challenge: any, currentUserId: string) {
    const now = new Date();
    const startDate = new Date(challenge.startDate);
    const endDate = challenge.endDate ? new Date(challenge.endDate) : null;

    const totalDays = endDate
      ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000))
      : null;

    const dayN = Math.max(0, Math.round((now.getTime() - startDate.getTime()) / 86_400_000)) + 1;

    const daysLeft = endDate
      ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000))
      : null;

    const progress = totalDays
      ? Math.min(100, Math.round((Math.min(dayN, totalDays) / totalDays) * 100))
      : null;

    const allUsers: any[] = challenge.users ?? [];
    const activeUsers = allUsers.filter((u) => !u.status || u.status === 'ACTIVE');

    const isMember = allUsers.some(
      (u) => u.userId === currentUserId && (!u.status || u.status === 'ACTIVE'),
    );
    const displayStatus = isMember ? 'ACTIVE' : 'DISCOVER';

    const memberColors = ['#C76E48', '#5E8FB8', '#739E6A', '#7A4E6F', '#4F5BD5'];
    const members = activeUsers.map((u: any, i: number) => ({
      id: u.user.id,
      name: u.user.firstName || u.user.username,
      username: u.user.username,
      avatar: u.user.avatar,
      color: memberColors[i % memberColors.length],
    }));

    return {
      ...challenge,
      displayStatus,
      isMember,
      participants: challenge._count?.users ?? members.length,
      members,
      daysLeft,
      dayN: Math.min(dayN, totalDays ?? dayN),
      total: totalDays,
      progress,
    };
  }
}