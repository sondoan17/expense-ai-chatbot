import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PublicUser } from '../users/types/public-user.type';
import { RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/types/user.entity';

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
  ) {}

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

  private async generateToken(user: UserEntity): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d';
    return this.jwtService.signAsync(payload, { expiresIn });
  }
}
