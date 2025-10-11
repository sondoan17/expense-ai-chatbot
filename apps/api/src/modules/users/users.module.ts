import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserSettingsService } from './users-settings.service';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  providers: [UsersService, UserSettingsService],
  exports: [UsersService, UserSettingsService],
  controllers: [UsersController],
})
export class UsersModule {}
