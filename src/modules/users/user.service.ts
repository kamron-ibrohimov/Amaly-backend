import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaginatedResult } from '../../common/types/pagination.types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { PrivateUserResponseDto, PublicUserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // GET ALL USERS
  // ─────────────────────────────────────────
  async findAll(query: UserQueryDto): Promise<PaginatedResult<PublicUserResponseDto>> {
  const {
    page = 1,
    limit = 10,
    search,
    role,
    language,
    isPublic,
    isVerified,
    isActive = true,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { username: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(role && { role }),
    ...(language && { language }),
    ...(isPublic !== undefined && { isPublic }),
    ...(isVerified !== undefined && { isVerified }),
    isActive,
  };

  const [users, total] = await Promise.all([
    this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: this.publicSelect(),
    }),
    this.prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: users as unknown as PublicUserResponseDto[],
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
  // GET USER BY USERNAME
  // ─────────────────────────────────────────
  async findByUsername(username: string): Promise<PublicUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: this.publicSelect(),
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return user as unknown as PublicUserResponseDto;
  }

  // ─────────────────────────────────────────
  // GET ME
  // ─────────────────────────────────────────
  async getMe(userId: string): Promise<PrivateUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.privateSelect(),
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return user as unknown as PrivateUserResponseDto;
  }

  // ─────────────────────────────────────────
  // UPDATE ME
  // ─────────────────────────────────────────
  async updateMe(userId: string, dto: UpdateUserDto): Promise<PrivateUserResponseDto> {
    if (dto.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });

      if (existing && existing.id !== userId) {
        throw new ConflictException('Bu username band');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: this.privateSelect(),
    });

    return updated as unknown as PrivateUserResponseDto;
  }

  // ─────────────────────────────────────────
  // CHANGE PASSWORD
  // ─────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException("Eski parol noto'g'ri");
    }

    const isSame = await bcrypt.compare(dto.newPassword, user.password);
    if (isSame) {
      throw new BadRequestException(
        "Yangi parol eski parol bilan bir xil bo'lmasligi kerak",
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  // ─────────────────────────────────────────
  // DELETE ME
  // ─────────────────────────────────────────
  async deleteMe(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { message: "Akkaunt muvaffaqiyatli o'chirildi" };
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────
  private publicSelect() {
    return {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      bio: true,
      isPublic: true,
      role: true,
      isActive: true,
      createdAt: true,
    };
  }

  private privateSelect() {
    return {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      bio: true,
      isPublic: true,
      timezone: true,
      language: true,
      role: true,
      isVerified: true,
      lastLoginAt: true,
      isActive: true,
      createdAt: true,
    };
  }
}