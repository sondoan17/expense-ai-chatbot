import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsOverviewQueryDto } from "./dto/reports-overview-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PublicUser } from "../users/types/public-user.type";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("overview")
  overview(@CurrentUser() user: PublicUser, @Query() query: ReportsOverviewQueryDto) {
    return this.reportsService.overview(user.id, query);
  }
}
