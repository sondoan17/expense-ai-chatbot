import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Post,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicUser } from './types/public-user.type';
import { UsersService } from './users.service';
import { UserSettingsService } from './users-settings.service';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { ResetAccountDto } from './dto/reset-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePersonalityDto } from './dto/update-personality.dto';
import * as bcrypt from 'bcryptjs';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly userSettingsService: UserSettingsService,
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
    this.logger.debug(`getUploadSignature called for user: ${user.id}`);
    try {
      const result = this.cloudinaryService.generateSignature(`avatars/${user.id}`);
      this.logger.debug(`Signature generated successfully for user: ${user.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to generate signature for user ${user.id}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: PublicUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-account')
  async resetAccount(@CurrentUser() user: PublicUser, @Body() resetAccountDto: ResetAccountDto) {
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

  @UseGuards(JwtAuthGuard)
  @Get('settings')
  async getSettings(@CurrentUser() user: PublicUser) {
    return this.userSettingsService.getOrCreateSettings(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings/personality')
  async updatePersonality(@CurrentUser() user: PublicUser, @Body() dto: UpdatePersonalityDto) {
    return this.userSettingsService.updatePersonality(user.id, dto.personality);
  }
}
