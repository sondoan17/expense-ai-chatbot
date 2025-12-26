import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PublicUser } from '../users/types/public-user.type';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserEntity } from '../users/types/user.entity';
import { EmailService } from '../../integrations/email/email.service';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) { }

  async register(dto: RegisterDto): Promise<{ user: PublicUser; accessToken: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const created = await this.usersService.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      passwordHash,
    });

    const user = this.usersService.toPublicUser(created);
    const accessToken = await this.generateToken(created);
    return { user, accessToken };
  }

  async login(user: UserEntity): Promise<{ user: PublicUser; accessToken: string }> {
    const accessToken = await this.generateToken(user);
    const publicUser = this.usersService.toPublicUser(user);
    return { user: publicUser, accessToken };
  }

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Sai thông tin đăng nhập');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Sai thông tin đăng nhập');
    }

    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (!user) {
      // Không tiết lộ thông tin về việc email có tồn tại hay không
      return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu' };
    }

    // Tạo token reset password
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    // Lưu token vào database
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // Gửi email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Tìm token reset password
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Token đặt lại mật khẩu không hợp lệ');
    }

    if (resetToken.used) {
      throw new BadRequestException('Token đặt lại mật khẩu đã được sử dụng');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token đặt lại mật khẩu đã hết hạn');
    }

    // Hash mật khẩu mới
    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    // Cập nhật mật khẩu và đánh dấu token đã sử dụng
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }

  private async generateToken(user: UserEntity): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d';
    return this.jwtService.signAsync(payload, { expiresIn } as JwtSignOptions);
  }

  setAuthCookie(res: Response, token: string): void {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d';
    const maxAge = this.parseExpiresIn(expiresIn);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
      ...(isProduction && {
        domain: this.configService.get<string>('COOKIE_DOMAIN'),
      }),
    });
  }

  clearAuthCookie(res: Response): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      ...(isProduction && {
        domain: this.configService.get<string>('COOKIE_DOMAIN'),
      }),
    });
  }

  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days to milliseconds
      case 'h':
        return value * 60 * 60 * 1000; // hours to milliseconds
      case 'm':
        return value * 60 * 1000; // minutes to milliseconds
      case 's':
        return value * 1000; // seconds to milliseconds
      default:
        return 7 * 24 * 60 * 60 * 1000; // default 7 days
    }
  }
}
