import { Controller, Get, Patch, Body, UseGuards, Post } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicUser } from './types/public-user.type';
import { UsersService } from './users.service';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: PublicUser) {
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: PublicUser,
    @Body() updateData: { name?: string; avatar?: string },
  ) {
    const updatedUser = await this.usersService.update(user.id, updateData);
    return { user: this.usersService.toPublicUser(updatedUser) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-signature')
  getUploadSignature(@CurrentUser() user: PublicUser) {
    return this.cloudinaryService.generateSignature(`avatars/${user.id}`);
  }
}
