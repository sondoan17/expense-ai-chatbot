import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { CreateRecurringRuleDto } from './dto/create-recurring-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicUser } from '../users/types/public-user.type';

@Controller('recurring')
@UseGuards(JwtAuthGuard)
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateRecurringRuleDto) {
    return this.recurringService.createRule(user.id, {
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });
  }
}
