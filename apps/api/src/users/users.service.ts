import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser } from './types/public-user.type';
import { UserEntity } from './types/user.entity';

type CreateUserInput = {
  email: string;
  name?: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
      },
    });
  }

  toPublicUser(user: UserEntity): PublicUser {
    const { passwordHash: _ignored, ...rest } = user;
    void _ignored;
    return rest;
  }
}
