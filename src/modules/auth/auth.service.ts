import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { generateOtp, getOtpExpires } from '../../common/helpers/otp.helper';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthResponseDto, MeResponseDto, TokensDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');
    }

    if (dto.username) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existingUsername) {
        throw new ConflictException('Bu username band');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const otp = generateOtp();
    const otpExpires = getOtpExpires();

    await this.prisma.user.create({
      data: {
        ...dto,
        username: dto.username ?? `user_${Date.now()}`, 
        firstName: dto.firstName ?? '', 
        password: hashedPassword,
        otpCode: otp,
        otpExpires,
      },
    });

    await this.mailService.sendOtp(dto.email, otp);

    return { message: 'Ro\'yxatdan o\'tildi. Email tasdiqlash kodi yuborildi' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.otpCode || !user.otpExpires) {
      throw new BadRequestException('OTP topilmadi');
    }

    if (new Date() > user.otpExpires) {
      throw new BadRequestException('OTP muddati tugagan');
    }

    if (user.otpCode !== dto.otp) {
      throw new BadRequestException('OTP noto\'g\'ri');
    }

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        otpCode: null,
        otpExpires: null,
        isVerified: true,
      },
    });

    return { message: 'Email muvaffaqiyatli tasdiqlandi' };
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email allaqachon tasdiqlangan');
    }

    await this.sendOtp(dto.email);

    return { message: 'OTP qayta yuborildi' };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Akkaunt bloklangan');
    }

    if (!user.isVerified) {
      throw new ForbiddenException('Email tasdiqlanmagan. Avval emailni tasdiqlang');
    }

    await this.verifyPassword(dto.password, user.password);

    const tokens = await this.generateTokens(user.id, user.email);

    await Promise.all([
      this.saveRefreshToken(user.id, tokens.refreshToken),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName ?? undefined,
        avatar: user.avatar ?? undefined,
        role: user.role,
      },
      tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Refresh token topilmadi');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    return {
      ...user,
      lastName: user.lastName ?? undefined,
      avatar: user.avatar ?? undefined,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { message: 'Agar email mavjud bo\'lsa, OTP yuborildi' };
    }

    await this.sendOtp(dto.email);

    return { message: 'Agar email mavjud bo\'lsa, OTP yuborildi' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.otpCode || !user.otpExpires) {
      throw new BadRequestException('OTP topilmadi');
    }

    if (new Date() > user.otpExpires) {
      throw new BadRequestException('OTP muddati tugagan');
    }

    if (user.otpCode !== dto.otp) {
      throw new BadRequestException('OTP noto\'g\'ri');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        password: hashedPassword,
        otpCode: null,
        otpExpires: null,
      },
    });

    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  private async generateTokens(userId: string, email: string): Promise<TokensDto> {
  const payload: JwtPayload = { sub: userId, email };

  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') as any,
    }),
    this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') as any,
    }),
  ]);

  return { accessToken, refreshToken };
}

  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  private async verifyPassword(plain: string, hashed: string): Promise<void> {
    const isMatch = await bcrypt.compare(plain, hashed);

    if (!isMatch) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }
  }

  private async sendOtp(email: string): Promise<void> {
    const otp = generateOtp();
    const otpExpires = getOtpExpires();

    await this.prisma.user.update({
      where: { email },
      data: { otpCode: otp, otpExpires },
    });

    await this.mailService.sendOtp(email, otp);
  }
}