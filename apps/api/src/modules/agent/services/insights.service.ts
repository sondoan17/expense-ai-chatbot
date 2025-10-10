import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Currency } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  InsightResult,
  SpendingTrendData,
  AnomalyDetectionResult,
  BudgetRecommendation,
} from '../types/internal.types';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async analyzeSpendingTrends(
    userId: string,
    timeRange: { start: Date; end: Date },
    currency?: Currency,
  ): Promise<SpendingTrendData[]> {
    const timezone = this.configService.get<string>('APP_TIMEZONE') ?? 'Asia/Ho_Chi_Minh';
    
    // Lấy dữ liệu tháng hiện tại
    const currentMonth = DateTime.fromJSDate(timeRange.end).setZone(timezone);
    const previousMonth = currentMonth.minus({ months: 1 });

    const currentMonthStart = currentMonth.startOf('month').toJSDate();
    const currentMonthEnd = currentMonth.endOf('month').toJSDate();
    const previousMonthStart = previousMonth.startOf('month').toJSDate();
    const previousMonthEnd = previousMonth.endOf('month').toJSDate();

    // Query transactions cho tháng hiện tại
    const currentMonthData = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        occurredAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        ...(currency && { currency }),
      },
      _sum: {
        amount: true,
      },
    });

    // Query transactions cho tháng trước
    const previousMonthData = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        occurredAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
        ...(currency && { currency }),
      },
      _sum: {
        amount: true,
      },
    });

    // Lấy thông tin categories
    const categoryIds = new Set([
      ...currentMonthData.map(d => d.categoryId).filter(Boolean),
      ...previousMonthData.map(d => d.categoryId).filter(Boolean),
    ]);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: Array.from(categoryIds).filter(Boolean) as string[] } },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    // Tạo map cho dễ lookup
    const currentMap = new Map(
      currentMonthData.map(d => [d.categoryId, d._sum.amount?.toNumber() ?? 0])
    );
    const previousMap = new Map(
      previousMonthData.map(d => [d.categoryId, d._sum.amount?.toNumber() ?? 0])
    );

    // Tính toán trends
    const trends: SpendingTrendData[] = [];
    
    for (const categoryId of categoryIds) {
      const currentAmount = currentMap.get(categoryId) ?? 0;
      const previousAmount = previousMap.get(categoryId) ?? 0;
      
      if (currentAmount > 0 || previousAmount > 0) {
        const percentageChange = previousAmount > 0 
          ? ((currentAmount - previousAmount) / previousAmount) * 100
          : currentAmount > 0 ? 100 : 0;

        let trend: 'increasing' | 'decreasing' | 'stable';
        if (Math.abs(percentageChange) < 5) {
          trend = 'stable';
        } else if (percentageChange > 0) {
          trend = 'increasing';
        } else {
          trend = 'decreasing';
        }

        trends.push({
          category: categoryMap.get(categoryId as string) ?? 'Khác',
          currentAmount,
          previousAmount,
          percentageChange,
          trend,
        });
      }
    }

    return trends.sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));
  }

  async detectAnomalies(
    userId: string,
    currentMonth: Date,
    previousMonth: Date,
    currency?: Currency,
  ): Promise<AnomalyDetectionResult[]> {
    const trends = await this.analyzeSpendingTrends(
      userId,
      { start: previousMonth, end: currentMonth },
      currency,
    );

    const anomalies: AnomalyDetectionResult[] = [];
    const threshold = 20; // 20% change threshold

    for (const trend of trends) {
      if (Math.abs(trend.percentageChange) >= threshold) {
        const anomalyType = trend.percentageChange > 0 ? 'spike' : 'drop';
        const severity = Math.abs(trend.percentageChange) >= 50 ? 'high' : 
                        Math.abs(trend.percentageChange) >= 30 ? 'medium' : 'low';

        let description: string;
        let suggestedAction: string | undefined;

        if (anomalyType === 'spike') {
          description = `${trend.category} tăng ${Math.abs(trend.percentageChange).toFixed(1)}% so với tháng trước`;
          suggestedAction = `Cân nhắc đặt ngân sách cho ${trend.category} để kiểm soát chi tiêu`;
        } else {
          description = `${trend.category} giảm ${Math.abs(trend.percentageChange).toFixed(1)}% so với tháng trước`;
          suggestedAction = `Kiểm tra xem có vấn đề gì với ${trend.category} không`;
        }

        anomalies.push({
          category: trend.category,
          anomalyType,
          severity,
          description,
          suggestedAction,
        });
      }
    }

    return anomalies;
  }

  async generateRecommendations(
    userId: string,
    insights: InsightResult[],
    currency: Currency = Currency.VND,
  ): Promise<BudgetRecommendation[]> {
    const recommendations: BudgetRecommendation[] = [];
    
    // Lấy dữ liệu chi tiêu 3 tháng gần nhất để đề xuất ngân sách
    const timezone = this.configService.get<string>('APP_TIMEZONE') ?? 'Asia/Ho_Chi_Minh';
    const now = DateTime.now().setZone(timezone);
    const threeMonthsAgo = now.minus({ months: 3 });

    const spendingData = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        occurredAt: {
          gte: threeMonthsAgo.toJSDate(),
        },
        currency,
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: { id: { in: spendingData.map(d => d.categoryId).filter(Boolean) as string[] } },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    // Kiểm tra categories nào chưa có budget
    const existingBudgets = await this.prisma.budget.findMany({
      where: {
        userId,
        year: now.year,
        month: now.month,
        currency,
      },
    });

    const budgetedCategories = new Set(existingBudgets.map(b => b.categoryId));

    for (const data of spendingData) {
      const categoryName = categoryMap.get(data.categoryId as string) ?? 'Khác';
      const avgAmount = data._avg.amount?.toNumber() ?? 0;

      if (avgAmount > 0 && !budgetedCategories.has(data.categoryId)) {
        // Đề xuất budget dựa trên trung bình chi tiêu + 20% buffer
        const suggestedAmount = Math.round(avgAmount * 1.2);
        
        let priority: 'high' | 'medium' | 'low';
        let reason: string;

        if (avgAmount >= 1000000) { // >= 1M VND
          priority = 'high';
          reason = `${categoryName} là danh mục chi tiêu lớn (trung bình ${this.formatCurrency(avgAmount, currency)})`;
        } else if (avgAmount >= 500000) { // >= 500K VND
          priority = 'medium';
          reason = `${categoryName} có chi tiêu đáng kể (trung bình ${this.formatCurrency(avgAmount, currency)})`;
        } else {
          priority = 'low';
          reason = `${categoryName} có chi tiêu nhỏ nhưng nên có ngân sách`;
        }

        recommendations.push({
          category: categoryName,
          suggestedAmount,
          reason,
          priority,
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  async generateInsights(
    userId: string,
    timeRange: { start: Date; end: Date },
    currency?: Currency,
  ): Promise<InsightResult[]> {
    
    try {
      // Phân tích trends
      const trends = await this.analyzeSpendingTrends(userId, timeRange, currency);
      
      // Phát hiện anomalies
      const anomalies = await this.detectAnomalies(
        userId,
        timeRange.end,
        timeRange.start,
        currency,
      );

      // Tạo recommendations
      const recommendations = await this.generateRecommendations(
        userId,
        [],
        currency ?? Currency.VND,
      );

      // Chuyển đổi thành InsightResult và filter
      const allInsights: InsightResult[] = [];

      // 1. Anomalies (ưu tiên cao)
      for (const anomaly of anomalies) {
        allInsights.push({
          type: 'anomaly',
          severity: anomaly.severity === 'high' ? 'critical' : 
                   anomaly.severity === 'medium' ? 'warning' : 'info',
          category: anomaly.category,
          message: anomaly.description,
          data: {
            suggestedAction: anomaly.suggestedAction,
            anomalyType: anomaly.anomalyType,
          },
        });
      }

      // 2. Top recommendations (chỉ lấy high priority)
      const highPriorityRecs = recommendations.filter(r => r.priority === 'high').slice(0, 2);
      for (const rec of highPriorityRecs) {
        allInsights.push({
          type: 'recommendation',
          severity: 'warning',
          category: rec.category,
          message: `Nên đặt ngân sách ${this.formatCurrency(rec.suggestedAmount, currency ?? Currency.VND)} cho ${rec.category}`,
          data: {
            suggestedAmount: rec.suggestedAmount,
            reason: rec.reason,
            priority: rec.priority,
          },
        });
      }

      // 3. Significant trends (chỉ lấy những thay đổi > 50%)
      const significantTrends = trends.filter(t => Math.abs(t.percentageChange) >= 50);
      for (const trend of significantTrends.slice(0, 2)) {
        allInsights.push({
          type: 'trend',
          severity: Math.abs(trend.percentageChange) >= 100 ? 'critical' : 'warning',
          category: trend.category,
          message: `${trend.category} ${trend.trend === 'increasing' ? 'tăng' : 'giảm'} ${Math.abs(trend.percentageChange).toFixed(1)}% so với tháng trước`,
          data: {
            percentageChange: trend.percentageChange,
            trend: trend.trend,
            currentAmount: trend.currentAmount,
            previousAmount: trend.previousAmount,
          },
        });
      }

      // 4. Remove duplicates và sort by priority
      const uniqueInsights = this.removeDuplicateInsights(allInsights);
      const sortedInsights = this.sortInsightsByPriority(uniqueInsights);

      // 5. Limit to top 4 insights để tránh spam
      return sortedInsights.slice(0, 4);

    } catch (error) {
      this.logger.error('Error generating insights', error);
      return [];
    }
  }

  private removeDuplicateInsights(insights: InsightResult[]): InsightResult[] {
    const seen = new Set<string>();
    return insights.filter(insight => {
      const key = `${insight.type}-${insight.category}-${insight.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private sortInsightsByPriority(insights: InsightResult[]): InsightResult[] {
    const priorityOrder = { critical: 4, warning: 3, info: 2 };
    return insights.sort((a, b) => {
      const priorityA = priorityOrder[a.severity] || 1;
      const priorityB = priorityOrder[b.severity] || 1;
      return priorityB - priorityA;
    });
  }

  private formatCurrency(amount: number, currency: Currency): string {
    const locale = 'vi-VN';
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === Currency.VND ? 0 : 2,
      maximumFractionDigits: currency === Currency.VND ? 0 : 2,
    });
    return formatter.format(amount);
  }
}
