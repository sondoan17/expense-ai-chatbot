import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PublicUser } from "../users/types/public-user.type";
import { RecurringTransactionsService } from "./recurring-transactions.service";
import { CreateRecurringTransactionDto } from "./dto/create-recurring-transaction.dto";

@Controller("recurring-transactions")
@UseGuards(JwtAuthGuard)
export class RecurringTransactionsController {
  constructor(private readonly recurringTransactionsService: RecurringTransactionsService) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateRecurringTransactionDto) {
    return this.recurringTransactionsService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.recurringTransactionsService.list(user.id);
  }

  @Delete(":id")
  cancel(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    return this.recurringTransactionsService.cancel(user.id, id);
  }
}
