import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";
import { TransactionSummaryQueryDto } from "./dto/transaction-summary-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PublicUser } from "../users/types/public-user.type";

@Controller("transactions")
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: PublicUser, @Query() query: ListTransactionsQueryDto) {
    return this.transactionsService.list(user.id, query);
  }

  @Get("summary")
  summary(@CurrentUser() user: PublicUser, @Query() query: TransactionSummaryQueryDto) {
    return this.transactionsService.summary(user.id, query);
  }

  @Delete(":id")
  remove(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    return this.transactionsService.remove(user.id, id);
  }
}
