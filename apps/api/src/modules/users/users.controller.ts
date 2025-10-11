import { Controller, Get, Patch, Body, UseGuards, Post, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicUser } from './types/public-user.type';
import { UsersService } from './users.service';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { ResetAccountDto } from './dto/reset-account.dto';
import * as bcrypt from 'bcryptjs';

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

  @UseGuards(JwtAuthGuard)
  @Post('reset-account')
  async resetAccount(
    @CurrentUser() user: PublicUser,
    @Body() resetAccountDto: ResetAccountDto,
  ) {
    // Lấy user entity để có passwordHash
    const userEntity = await this.usersService.findById(user.id);
    if (!userEntity) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    // Xác thực password
    const isPasswordValid = await bcrypt.compare(resetAccountDto.password, userEntity.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu không đúng');
    }

    // Thực hiện reset dữ liệu
    const result = await this.usersService.resetAccountData(user.id);

    return {
      message: 'Đã xóa toàn bộ dữ liệu tài khoản thành công',
      deletedCounts: result.deletedCounts,
    };
  }
}
