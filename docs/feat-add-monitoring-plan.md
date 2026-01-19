# Feature: Monitoring System Implementation Plan

> **Status**: Planning
> **Created**: 2026-01-20
> **Updated**: 2026-01-20
> **Author**: AI Assistant
> **Priority**: High
> **Approach**: Cloud-based (Zero Docker containers)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Cloud Services Stack](#cloud-services-stack)
4. [Implementation Phases](#implementation-phases)
   - [Phase 1: Application Metrics + Token Tracking](#phase-1-application-metrics--token-tracking)
   - [Phase 2: Grafana Cloud Integration](#phase-2-grafana-cloud-integration)
   - [Phase 3: Structured Logging](#phase-3-structured-logging)
   - [Phase 4: Error Tracking (Sentry)](#phase-4-error-tracking-sentry)
   - [Phase 5: Uptime Monitoring](#phase-5-uptime-monitoring)
   - [Phase 6: Alerting](#phase-6-alerting)
5. [AI Token Tracking](#ai-token-tracking)
6. [Database Schema Changes](#database-schema-changes)
7. [File Structure](#file-structure)
8. [Environment Variables](#environment-variables)
9. [Timeline & Milestones](#timeline--milestones)
10. [Quick Start Guide](#quick-start-guide)
11. [Cost Analysis](#cost-analysis)

---

## Overview

### Why Cloud-based Monitoring?

| Aspect               | Self-hosted      | Cloud-based (Option A) |
| -------------------- | ---------------- | ---------------------- |
| **Extra Containers** | 7 containers     | 0 containers           |
| **RAM Required**     | +1-2 GB          | 0 MB                   |
| **Disk Required**    | +5-10 GB         | 0 GB                   |
| **Setup Time**       | 4-6 hours        | 1-2 hours              |
| **Maintenance**      | Manual updates   | Zero maintenance       |
| **Cost**             | Server resources | Free tier (sufficient) |

### Objectives

- Monitor application health, performance, and resource usage
- Track HTTP traffic, response times, and error rates
- Monitor database query performance
- **Track AI/LLM token usage and costs**
- Implement alerting for critical issues
- Create comprehensive dashboards for observability
- **Zero additional Docker containers**

### Cloud Services Stack

| Service           | Purpose                      | Free Tier              | Monthly Cost |
| ----------------- | ---------------------------- | ---------------------- | ------------ |
| **Grafana Cloud** | Metrics + Logs + Dashboards  | 10k metrics, 50GB logs | $0           |
| **Sentry**        | Error Tracking + Performance | 5k errors/month        | $0           |
| **UptimeRobot**   | Uptime Monitoring            | 50 monitors            | $0           |
| **Total**         |                              |                        | **$0/month** |

---

## Architecture Design

### System Architecture (Cloud-based)

```
                         ┌─────────────────────────────────────────┐
                         │           CLOUD SERVICES                │
                         │  ┌─────────────┐  ┌─────────────┐       │
                         │  │   Grafana   │  │   Sentry    │       │
                         │  │    Cloud    │  │   (Errors)  │       │
                         │  │ ┌─────────┐ │  └──────▲──────┘       │
                         │  │ │Prometheus│ │         │              │
                         │  │ │  (TSDB)  │ │         │              │
                         │  │ └────▲────┘ │         │              │
                         │  │      │      │         │              │
                         │  │ ┌────▲────┐ │         │              │
                         │  │ │  Loki   │ │         │              │
                         │  │ │ (Logs)  │ │         │              │
                         │  │ └────▲────┘ │         │              │
                         │  └──────┼──────┘         │              │
                         │         │                │              │
                         │  ┌──────┴────────────────┴──────┐       │
                         │  │        UptimeRobot           │       │
                         │  │     (Health Checks)          │       │
                         │  └──────────────▲───────────────┘       │
                         └─────────────────┼───────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         │                     YOUR VPS (No extra containers)                │
         │                                 │                                 │
         │    ┌──────────────┐    ┌────────┴────────┐    ┌──────────────┐   │
         │    │   Nginx      │    │      API        │    │     Web      │   │
         │    │   (Proxy)    │◄───│    (NestJS)     │    │   (React)    │   │
         │    └──────────────┘    │                 │    └──────────────┘   │
         │                        │  ┌───────────┐  │                       │
         │                        │  │prom-client│──┼──► Push to Grafana    │
         │                        │  │  metrics  │  │                       │
         │                        │  └───────────┘  │                       │
         │                        │  ┌───────────┐  │                       │
         │                        │  │   Pino    │──┼──► Push to Loki       │
         │                        │  │  (Logs)   │  │                       │
         │                        │  └───────────┘  │                       │
         │                        │  ┌───────────┐  │                       │
         │                        │  │  Sentry   │──┼──► Push to Sentry     │
         │                        │  │   SDK     │  │                       │
         │                        │  └───────────┘  │                       │
         │                        └─────────────────┘                       │
         │                                                                  │
         │    ┌──────────────┐                                              │
         │    │  PostgreSQL  │                                              │
         │    │    (DB)      │                                              │
         │    └──────────────┘                                              │
         └──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  HTTP Request ──► HttpMetricsInterceptor ──► prom-client                │
│       │                    │                      │                      │
│       │                    ▼                      │                      │
│       │              Pino Logger ─────────────────┼──► Grafana Loki     │
│       │                    │                      │                      │
│       ▼                    │                      ▼                      │
│  Business Logic            │              GrafanaPushService            │
│       │                    │                      │                      │
│       │                    │                      ▼                      │
│       │                    │              Grafana Prometheus            │
│       │                    │                      │                      │
│       ▼                    ▼                      ▼                      │
│  Error ───────────► Sentry SDK ──────────► Sentry Cloud                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           GRAFANA CLOUD                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Prometheus ◄──── Metrics (HTTP, DB, LLM tokens)                        │
│       │                                                                  │
│       ▼                                                                  │
│  Grafana Dashboards ◄──── Visualize + Alert                             │
│       │                                                                  │
│       ▼                                                                  │
│  Alerting ──────► Email / Slack / PagerDuty                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cloud Services Stack

### 1. Grafana Cloud (Primary)

**URL**: https://grafana.com/products/cloud/

| Feature   | Free Tier Limit | Our Usage (Est.) |
| --------- | --------------- | ---------------- |
| Metrics   | 10,000 series   | ~500 series      |
| Logs      | 50 GB/month     | ~5 GB/month      |
| Traces    | 50 GB/month     | Not used         |
| Alerts    | Unlimited       | ~20 alerts       |
| Retention | 14 days         | Sufficient       |
| Users     | 3 users         | 1-2 users        |

**Includes:**

- Prometheus (metrics storage)
- Loki (logs storage)
- Grafana (dashboards)
- Alerting (built-in)

### 2. Sentry (Error Tracking)

**URL**: https://sentry.io/

| Feature     | Free Tier Limit  | Our Usage (Est.) |
| ----------- | ---------------- | ---------------- |
| Errors      | 5,000/month      | ~500/month       |
| Performance | 10k transactions | ~5k/month        |
| Retention   | 30 days          | Sufficient       |
| Users       | Unlimited        | 1-2 users        |

**Includes:**

- Error tracking with stack traces
- Performance monitoring
- Release tracking
- Source maps support

### 3. UptimeRobot (Uptime)

**URL**: https://uptimerobot.com/

| Feature        | Free Tier Limit | Our Usage (Est.) |
| -------------- | --------------- | ---------------- |
| Monitors       | 50              | 3-5              |
| Check Interval | 5 min           | 5 min            |
| Alert Contacts | Unlimited       | 1-2              |
| Status Pages   | 1               | 1                |

**Monitors to create:**

- `https://mimichatbot.fun/api/health` - API health
- `https://mimichatbot.fun` - Web frontend
- `https://mimichatbot.fun/api/health/ready` - Readiness

---

## Implementation Phases

### Phase 1: Application Metrics + Token Tracking

**Duration**: Week 1-2
**Goal**: Collect metrics in-app, prepare for cloud push

#### 1.1 Install Dependencies

```bash
pnpm --filter @expense-ai/api add prom-client @sentry/node @sentry/profiling-node
pnpm --filter @expense-ai/api add pino pino-http nestjs-pino pino-loki
pnpm --filter @expense-ai/api add -D pino-pretty
```

#### 1.2 Create Metrics Module

```
apps/api/src/modules/metrics/
├── metrics.module.ts
├── metrics.controller.ts
├── metrics.service.ts
├── interceptors/
│   └── http-metrics.interceptor.ts
└── services/
    ├── token-tracking.service.ts
    └── grafana-push.service.ts
```

#### 1.3 HTTP Metrics Interceptor

```typescript
// apps/api/src/modules/metrics/interceptors/http-metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram, Gauge } from 'prom-client';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

const httpRequestsInProgress = new Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests in progress',
  labelNames: ['method'],
});

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method } = request;
    const path = request.route?.path || request.url.split('?')[0];

    httpRequestsInProgress.labels(method).inc();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.recordMetrics(method, path, context, startTime),
        error: (error) => this.recordMetrics(method, path, context, startTime, error),
      }),
    );
  }

  private recordMetrics(
    method: string,
    path: string,
    context: ExecutionContext,
    startTime: number,
    error?: any,
  ): void {
    const response = context.switchToHttp().getResponse();
    const status = error?.status || response.statusCode || 500;
    const duration = (Date.now() - startTime) / 1000;

    httpRequestsTotal.labels(method, path, status.toString()).inc();
    httpRequestDuration.labels(method, path, status.toString()).observe(duration);
    httpRequestsInProgress.labels(method).dec();
  }
}
```

#### 1.4 Metrics Controller

```typescript
// apps/api/src/modules/metrics/metrics.controller.ts
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { register } from 'prom-client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PublicUser } from '../users/types/public-user.type';
import { TokenTrackingService } from './services/token-tracking.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly tokenTrackingService: TokenTrackingService) {}

  // Prometheus scrape endpoint (for local testing)
  @Get()
  async getPrometheusMetrics(): Promise<string> {
    return register.metrics();
  }

  // User token stats
  @Get('tokens/stats')
  @UseGuards(JwtAuthGuard)
  async getMyTokenStats(@CurrentUser() user: PublicUser, @Query('days') days?: string) {
    return this.tokenTrackingService.getUserStats(user.id, days ? parseInt(days, 10) : 30);
  }

  // User quota check
  @Get('tokens/quota')
  @UseGuards(JwtAuthGuard)
  async getMyQuota(@CurrentUser() user: PublicUser) {
    return this.tokenTrackingService.checkQuota(user.id);
  }

  // System-wide stats (admin only - future)
  @Get('tokens/system')
  @UseGuards(JwtAuthGuard)
  async getSystemStats(@Query('days') days?: string) {
    return this.tokenTrackingService.getSystemStats(days ? parseInt(days, 10) : 30);
  }
}
```

#### 1.5 Metrics Module

```typescript
// apps/api/src/modules/metrics/metrics.module.ts
import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { TokenTrackingService } from './services/token-tracking.service';
import { GrafanaPushService } from './services/grafana-push.service';
import { HttpMetricsInterceptor } from './interceptors/http-metrics.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    TokenTrackingService,
    GrafanaPushService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
  exports: [TokenTrackingService, MetricsService],
})
export class MetricsModule {}
```

#### 1.6 Metrics to Collect

| Metric Name                     | Type      | Labels                | Description              |
| ------------------------------- | --------- | --------------------- | ------------------------ |
| `http_requests_total`           | Counter   | method, path, status  | Total HTTP requests      |
| `http_request_duration_seconds` | Histogram | method, path, status  | Request latency          |
| `http_requests_in_progress`     | Gauge     | method                | Concurrent requests      |
| `prisma_queries_total`          | Counter   | model, operation      | Total DB queries         |
| `prisma_query_duration_seconds` | Histogram | model, operation      | Query execution time     |
| `prisma_slow_queries_total`     | Counter   | model, operation      | Slow queries (>1s)       |
| `llm_requests_total`            | Counter   | model, intent, status | Total LLM requests       |
| `llm_tokens_total`              | Counter   | type, model, intent   | Total tokens used        |
| `llm_prompt_tokens_total`       | Counter   | model, intent         | Input tokens             |
| `llm_completion_tokens_total`   | Counter   | model, intent         | Output tokens            |
| `llm_request_cost_dollars`      | Counter   | model                 | Estimated cost USD       |
| `llm_request_duration_seconds`  | Histogram | model, intent         | LLM API latency          |
| `llm_user_daily_tokens`         | Gauge     | userId                | User daily token usage   |
| `llm_user_monthly_tokens`       | Gauge     | userId                | User monthly token usage |

---

### Phase 2: Grafana Cloud Integration

**Duration**: Week 2
**Goal**: Push metrics and logs to Grafana Cloud

#### 2.1 Sign Up for Grafana Cloud

1. Go to https://grafana.com/products/cloud/
2. Create free account
3. Get credentials from Stack > Prometheus > Remote Write

#### 2.2 Grafana Push Service

```typescript
// apps/api/src/modules/metrics/services/grafana-push.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { register, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class GrafanaPushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GrafanaPushService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private readonly pushInterval = 15000; // 15 seconds

  private readonly prometheusUrl: string;
  private readonly prometheusUser: string;
  private readonly prometheusApiKey: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.prometheusUrl = this.configService.get<string>('GRAFANA_PROMETHEUS_URL') || '';
    this.prometheusUser = this.configService.get<string>('GRAFANA_PROMETHEUS_USER') || '';
    this.prometheusApiKey = this.configService.get<string>('GRAFANA_API_KEY') || '';
    this.enabled = !!(this.prometheusUrl && this.prometheusUser && this.prometheusApiKey);
  }

  async onModuleInit() {
    // Collect default Node.js metrics
    collectDefaultMetrics({
      prefix: 'expense_api_',
      labels: { app: 'expense-api' },
    });

    if (!this.enabled) {
      this.logger.warn('Grafana Cloud not configured, metrics will only be available locally');
      return;
    }

    this.logger.log('Starting Grafana Cloud metrics push service');
    this.intervalId = setInterval(() => this.pushMetrics(), this.pushInterval);

    // Initial push
    await this.pushMetrics();
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async pushMetrics(): Promise<void> {
    if (!this.enabled) return;

    try {
      const metrics = await register.metrics();

      // Convert Prometheus text format to remote write format
      // Using Prometheus remote write endpoint
      const response = await fetch(`${this.prometheusUrl}/api/v1/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Basic ${Buffer.from(`${this.prometheusUser}:${this.prometheusApiKey}`).toString('base64')}`,
        },
        body: metrics,
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Failed to push metrics: ${response.status} - ${text}`);
      }
    } catch (error) {
      this.logger.error('Error pushing metrics to Grafana Cloud', error);
    }
  }
}
```

#### 2.3 Alternative: Use Grafana Agent (Recommended for production)

For production, it's better to use **Grafana Alloy** (formerly Grafana Agent) as a lightweight collector:

```yaml
# docker-compose.yml (add to existing)
services:
  # ... existing services ...

  grafana-alloy:
    image: grafana/alloy:latest
    container_name: expense-grafana-alloy
    restart: unless-stopped
    volumes:
      - ./docker/alloy/config.alloy:/etc/alloy/config.alloy:ro
    command:
      - run
      - /etc/alloy/config.alloy
    environment:
      - GRAFANA_PROMETHEUS_URL=${GRAFANA_PROMETHEUS_URL}
      - GRAFANA_PROMETHEUS_USER=${GRAFANA_PROMETHEUS_USER}
      - GRAFANA_API_KEY=${GRAFANA_API_KEY}
      - GRAFANA_LOKI_URL=${GRAFANA_LOKI_URL}
      - GRAFANA_LOKI_USER=${GRAFANA_LOKI_USER}
    networks:
      - expense-network
    # Only ~30-50MB RAM
    deploy:
      resources:
        limits:
          memory: 64M
```

```hcl
// docker/alloy/config.alloy
prometheus.scrape "api" {
  targets = [{
    __address__ = "api:4000",
  }]
  forward_to = [prometheus.remote_write.grafana_cloud.receiver]
  metrics_path = "/api/metrics"
  scrape_interval = "15s"
}

prometheus.remote_write "grafana_cloud" {
  endpoint {
    url = env("GRAFANA_PROMETHEUS_URL")
    basic_auth {
      username = env("GRAFANA_PROMETHEUS_USER")
      password = env("GRAFANA_API_KEY")
    }
  }
}

loki.source.docker "containers" {
  host = "unix:///var/run/docker.sock"
  targets = []
  forward_to = [loki.write.grafana_cloud.receiver]
}

loki.write "grafana_cloud" {
  endpoint {
    url = env("GRAFANA_LOKI_URL")
    basic_auth {
      username = env("GRAFANA_LOKI_USER")
      password = env("GRAFANA_API_KEY")
    }
  }
}
```

---

### Phase 3: Structured Logging

**Duration**: Week 2-3
**Goal**: JSON logs pushed to Grafana Loki

#### 3.1 Configure Pino with Loki Transport

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // ... existing config
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const lokiUrl = configService.get('GRAFANA_LOKI_URL');
        const lokiUser = configService.get('GRAFANA_LOKI_USER');
        const lokiApiKey = configService.get('GRAFANA_API_KEY');

        const targets: any[] = [];

        // Pretty print for development
        if (!isProduction) {
          targets.push({
            target: 'pino-pretty',
            options: { colorize: true },
          });
        } else {
          // JSON to stdout for Docker logs
          targets.push({
            target: 'pino/file',
            options: { destination: 1 }, // stdout
          });
        }

        // Push to Loki if configured
        if (lokiUrl && lokiUser && lokiApiKey) {
          targets.push({
            target: 'pino-loki',
            options: {
              batching: true,
              interval: 5,
              host: lokiUrl,
              basicAuth: {
                username: lokiUser,
                password: lokiApiKey,
              },
              labels: {
                app: 'expense-api',
                env: isProduction ? 'production' : 'development',
              },
            },
          });
        }

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: { targets },
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                userId: req.user?.id,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },
          },
        };
      },
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

#### 3.2 Log Format Example

```json
{
  "level": "info",
  "time": 1705737600000,
  "pid": 1,
  "hostname": "expense-api",
  "req": {
    "id": "req-abc123",
    "method": "POST",
    "url": "/api/agent/chat",
    "userId": "user_xyz"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 245,
  "msg": "request completed"
}
```

---

### Phase 4: Error Tracking (Sentry)

**Duration**: Week 3
**Goal**: Capture and track errors with stack traces

#### 4.1 Install Sentry SDK

```bash
pnpm --filter @expense-ai/api add @sentry/node @sentry/profiling-node
```

#### 4.2 Initialize Sentry

```typescript
// apps/api/src/instrument.ts
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version,

    integrations: [nodeProfilingIntegration()],

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
}
```

#### 4.3 Update main.ts

```typescript
// apps/api/src/main.ts
import './instrument'; // Must be first import!
import { initSentry } from './instrument';
import * as Sentry from '@sentry/node';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  // Initialize Sentry before anything else
  initSentry();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Sentry error handler
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  const configService = app.get(ConfigService);
  const corsOrigins = (configService.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Sentry error handler (must be before any other error handlers)
  app.use(Sentry.Handlers.errorHandler());

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
}

bootstrap();
```

#### 4.4 Sentry Exception Filter

```typescript
// apps/api/src/common/filters/sentry-exception.filter.ts
import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Capture to Sentry
    Sentry.captureException(exception);

    // Let NestJS handle the response
    super.catch(exception, host);
  }
}
```

---

### Phase 5: Uptime Monitoring

**Duration**: Week 3
**Goal**: External health checks with UptimeRobot

#### 5.1 Sign Up for UptimeRobot

1. Go to https://uptimerobot.com/
2. Create free account
3. Add monitors

#### 5.2 Monitors to Create

| Monitor Name | URL                                        | Type    | Interval |
| ------------ | ------------------------------------------ | ------- | -------- |
| API Health   | `https://mimichatbot.fun/api/health`       | HTTP(s) | 5 min    |
| API Ready    | `https://mimichatbot.fun/api/health/ready` | HTTP(s) | 5 min    |
| Web Frontend | `https://mimichatbot.fun`                  | HTTP(s) | 5 min    |

#### 5.3 Alert Contacts

Configure alerts for:

- Email (primary)
- Telegram (optional)
- Slack webhook (optional)

---

### Phase 6: Alerting

**Duration**: Week 4
**Goal**: Configure alerts in Grafana Cloud

#### 6.1 Grafana Cloud Alert Rules

Create these alerts in Grafana Cloud UI (Alerting > Alert Rules):

**API Alerts:**

```yaml
# High Error Rate
- name: HighErrorRate
  condition: |
    sum(rate(http_requests_total{status=~"5.."}[5m])) 
    / sum(rate(http_requests_total[5m])) > 0.05
  for: 2m
  severity: critical
  message: 'Error rate is {{ $value | humanizePercentage }}'

# Slow Response Time
- name: SlowResponseTimeP95
  condition: |
    histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
  for: 5m
  severity: warning
  message: 'P95 latency exceeds 2 seconds'
```

**LLM/Token Alerts:**

```yaml
# High Token Burn Rate
- name: HighTokenBurnRate
  condition: |
    sum(rate(llm_tokens_total[1h])) * 3600 > 500000
  for: 15m
  severity: warning
  message: 'Consuming {{ $value | humanize }} tokens per hour'

# Daily Cost Threshold
- name: DailyCostExceeded
  condition: |
    sum(increase(llm_request_cost_dollars[24h])) > 10
  for: 5m
  severity: critical
  message: 'Daily LLM cost exceeded $10'

# High LLM Latency
- name: HighLLMLatency
  condition: |
    histogram_quantile(0.95, rate(llm_request_duration_seconds_bucket[5m])) > 15
  for: 5m
  severity: warning
  message: 'LLM P95 latency exceeds 15 seconds'
```

**Database Alerts:**

```yaml
# Slow Database Queries
- name: SlowDatabaseQueries
  condition: |
    histogram_quantile(0.95, rate(prisma_query_duration_seconds_bucket[5m])) > 1
  for: 5m
  severity: warning
  message: 'P95 query latency exceeds 1 second'
```

#### 6.2 Notification Channels

Configure in Grafana Cloud (Alerting > Contact Points):

1. **Email** (default)
2. **Slack** (optional - webhook integration)
3. **PagerDuty** (optional - for on-call)

---

## AI Token Tracking

### Token Tracking Service

```typescript
// apps/api/src/modules/metrics/services/token-tracking.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Gauge, Counter } from 'prom-client';

// Prometheus metrics
const userDailyTokensGauge = new Gauge({
  name: 'llm_user_daily_tokens',
  help: 'Daily token usage per user',
  labelNames: ['userId'],
});

const userMonthlyTokensGauge = new Gauge({
  name: 'llm_user_monthly_tokens',
  help: 'Monthly token usage per user',
  labelNames: ['userId'],
});

const tokenUsageCounter = new Counter({
  name: 'llm_token_usage_total',
  help: 'Total token usage',
  labelNames: ['userId', 'intent', 'type'],
});

export interface TokenUsageData {
  userId: string;
  intent: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

@Injectable()
export class TokenTrackingService {
  private readonly logger = new Logger(TokenTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordUsage(data: TokenUsageData): Promise<void> {
    try {
      // 1. Log to database
      await this.prisma.tokenUsageLog.create({
        data: {
          userId: data.userId,
          intent: data.intent,
          model: data.model,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          estimatedCostUsd: data.estimatedCostUsd,
          latencyMs: data.latencyMs,
        },
      });

      // 2. Update Prometheus counters
      tokenUsageCounter.labels(data.userId, data.intent, 'prompt').inc(data.promptTokens);
      tokenUsageCounter.labels(data.userId, data.intent, 'completion').inc(data.completionTokens);

      // 3. Update user quota
      await this.updateUserQuota(data.userId, data.totalTokens);

      this.logger.debug({
        message: 'Token usage recorded',
        userId: data.userId,
        intent: data.intent,
        tokens: data.totalTokens,
        cost: data.estimatedCostUsd.toFixed(6),
      });
    } catch (error) {
      this.logger.error('Failed to record token usage', error);
    }
  }

  private async updateUserQuota(userId: string, tokens: number): Promise<void> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    await this.prisma.$transaction(async (tx) => {
      let quota = await tx.userTokenQuota.findUnique({
        where: { userId },
      });

      if (!quota) {
        quota = await tx.userTokenQuota.create({
          data: { userId },
        });
      }

      const shouldResetDaily = quota.lastResetDaily < startOfDay;
      const shouldResetMonthly = quota.lastResetMonthly < startOfMonth;

      const updated = await tx.userTokenQuota.update({
        where: { userId },
        data: {
          todayUsed: shouldResetDaily ? tokens : { increment: tokens },
          monthUsed: shouldResetMonthly ? tokens : { increment: tokens },
          lastResetDaily: shouldResetDaily ? now : undefined,
          lastResetMonthly: shouldResetMonthly ? now : undefined,
        },
      });

      // Update Prometheus gauges
      userDailyTokensGauge.labels(userId).set(updated.todayUsed);
      userMonthlyTokensGauge.labels(userId).set(updated.monthUsed);
    });
  }

  async checkQuota(userId: string): Promise<{
    allowed: boolean;
    dailyRemaining: number;
    monthlyRemaining: number;
    dailyLimit: number;
    monthlyLimit: number;
  }> {
    const quota = await this.prisma.userTokenQuota.findUnique({
      where: { userId },
    });

    const defaultLimits = { dailyLimit: 100000, monthlyLimit: 2000000 };

    if (!quota) {
      return {
        allowed: true,
        dailyRemaining: defaultLimits.dailyLimit,
        monthlyRemaining: defaultLimits.monthlyLimit,
        ...defaultLimits,
      };
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayUsed = quota.lastResetDaily < startOfDay ? 0 : quota.todayUsed;
    const monthUsed = quota.lastResetMonthly < startOfMonth ? 0 : quota.monthUsed;

    return {
      allowed: todayUsed < quota.dailyLimit && monthUsed < quota.monthlyLimit,
      dailyRemaining: Math.max(0, quota.dailyLimit - todayUsed),
      monthlyRemaining: Math.max(0, quota.monthlyLimit - monthUsed),
      dailyLimit: quota.dailyLimit,
      monthlyLimit: quota.monthlyLimit,
    };
  }

  async getUserStats(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.tokenUsageLog.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    const byIntent: Record<string, { tokens: number; count: number }> = {};
    const byModel: Record<string, { tokens: number; cost: number }> = {};
    const dailyMap: Record<string, { tokens: number; cost: number; requests: number }> = {};

    let totalTokens = 0;
    let totalCost = 0;

    for (const log of logs) {
      totalTokens += log.totalTokens;
      totalCost += Number(log.estimatedCostUsd);

      // By intent
      if (!byIntent[log.intent]) byIntent[log.intent] = { tokens: 0, count: 0 };
      byIntent[log.intent].tokens += log.totalTokens;
      byIntent[log.intent].count += 1;

      // By model
      if (!byModel[log.model]) byModel[log.model] = { tokens: 0, cost: 0 };
      byModel[log.model].tokens += log.totalTokens;
      byModel[log.model].cost += Number(log.estimatedCostUsd);

      // Daily
      const dateKey = log.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { tokens: 0, cost: 0, requests: 0 };
      dailyMap[dateKey].tokens += log.totalTokens;
      dailyMap[dateKey].cost += Number(log.estimatedCostUsd);
      dailyMap[dateKey].requests += 1;
    }

    return {
      totalTokens,
      totalCost,
      avgTokensPerRequest: logs.length > 0 ? Math.round(totalTokens / logs.length) : 0,
      requestCount: logs.length,
      byIntent,
      byModel,
      dailyUsage: Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getSystemStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.tokenUsageLog.findMany({
      where: { createdAt: { gte: since } },
    });

    const userMap: Record<string, { tokens: number; cost: number }> = {};
    const intentMap: Record<string, number> = {};
    let totalTokens = 0;
    let totalCost = 0;

    for (const log of logs) {
      totalTokens += log.totalTokens;
      totalCost += Number(log.estimatedCostUsd);

      if (!userMap[log.userId]) userMap[log.userId] = { tokens: 0, cost: 0 };
      userMap[log.userId].tokens += log.totalTokens;
      userMap[log.userId].cost += Number(log.estimatedCostUsd);

      intentMap[log.intent] = (intentMap[log.intent] || 0) + 1;
    }

    return {
      totalTokens,
      totalCost,
      totalRequests: logs.length,
      uniqueUsers: Object.keys(userMap).length,
      topUsers: Object.entries(userMap)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10),
      intentDistribution: intentMap,
    };
  }
}
```

### Update HyperbolicService

```typescript
// apps/api/src/integrations/hyperbolic/hyperbolic.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Counter, Histogram } from 'prom-client';

// Types
export interface HyperbolicUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface HyperbolicResult {
  content: string;
  usage: HyperbolicUsage;
  model: string;
  latencyMs: number;
}

// Prometheus Metrics
const llmRequestsTotal = new Counter({
  name: 'llm_requests_total',
  help: 'Total LLM API requests',
  labelNames: ['model', 'intent', 'status'],
});

const llmRequestErrors = new Counter({
  name: 'llm_request_errors_total',
  help: 'Total LLM API errors',
  labelNames: ['model', 'intent', 'error_type'],
});

const promptTokenCounter = new Counter({
  name: 'llm_prompt_tokens_total',
  help: 'Total LLM prompt tokens',
  labelNames: ['model', 'intent'],
});

const completionTokenCounter = new Counter({
  name: 'llm_completion_tokens_total',
  help: 'Total LLM completion tokens',
  labelNames: ['model', 'intent'],
});

const costCounter = new Counter({
  name: 'llm_request_cost_dollars',
  help: 'Estimated LLM cost in USD',
  labelNames: ['model'],
});

const latencyHistogram = new Histogram({
  name: 'llm_request_duration_seconds',
  help: 'LLM API request duration',
  labelNames: ['model', 'intent'],
  buckets: [0.5, 1, 2, 5, 10, 15, 20, 30, 45, 60],
});

@Injectable()
export class HyperbolicService {
  private readonly logger = new Logger(HyperbolicService.name);
  private readonly url: string;
  private readonly apiKey: string;
  private readonly model: string;

  // Pricing per 1M tokens
  private readonly PRICING: Record<string, { input: number; output: number }> = {
    'Qwen/Qwen3-Next-80B-A3B-Instruct': { input: 0.2, output: 0.6 },
    'meta-llama/Llama-3.3-70B-Instruct': { input: 0.4, output: 0.4 },
    default: { input: 0.5, output: 1.0 },
  };

  constructor(private readonly configService: ConfigService) {
    this.url =
      this.configService.get<string>('HYPERBOLIC_API_URL') ??
      'https://api.hyperbolic.xyz/v1/chat/completions';
    this.apiKey = this.configService.get<string>('HYPERBOLIC_API_KEY') ?? '';
    this.model =
      this.configService.get<string>('HYPERBOLIC_MODEL') ?? 'Qwen/Qwen3-Next-80B-A3B-Instruct';
  }

  async complete(messages: HyperbolicMessage[], options?: HyperbolicOptions): Promise<string> {
    const result = await this.completeWithUsage(messages, options);
    return result.content;
  }

  async completeWithUsage(
    messages: HyperbolicMessage[],
    options?: HyperbolicOptions & { intent?: string },
  ): Promise<HyperbolicResult> {
    if (!this.apiKey) {
      throw new Error('Hyperbolic API key is not configured');
    }

    const startTime = Date.now();
    const model = options?.model ?? this.model;
    const intent = options?.intent ?? 'unknown';

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options?.max_tokens ?? 50000,
          temperature: options?.temperature ?? 0.7,
          top_p: options?.top_p ?? 0.8,
          stream: false,
          response_format: options?.response_format ?? { type: 'json_object' },
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const text = await response.text();
        llmRequestErrors.labels(model, intent, `http_${response.status}`).inc();
        llmRequestsTotal.labels(model, intent, 'error').inc();
        throw new Error(`Hyperbolic error ${response.status}: ${text}`);
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;

      if (!content) {
        llmRequestErrors.labels(model, intent, 'empty_response').inc();
        llmRequestsTotal.labels(model, intent, 'error').inc();
        throw new Error('Invalid Hyperbolic response');
      }

      const usage: HyperbolicUsage = json.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      // Record metrics
      this.recordMetrics(model, intent, usage, latencyMs);
      llmRequestsTotal.labels(model, intent, 'success').inc();

      return { content, usage, model, latencyMs };
    } catch (error) {
      latencyHistogram.labels(model, intent).observe((Date.now() - startTime) / 1000);
      throw error;
    }
  }

  private recordMetrics(
    model: string,
    intent: string,
    usage: HyperbolicUsage,
    latencyMs: number,
  ): void {
    promptTokenCounter.labels(model, intent).inc(usage.prompt_tokens);
    completionTokenCounter.labels(model, intent).inc(usage.completion_tokens);
    latencyHistogram.labels(model, intent).observe(latencyMs / 1000);

    const pricing = this.PRICING[model] ?? this.PRICING['default'];
    const cost =
      (usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output) / 1_000_000;
    costCounter.labels(model).inc(cost);

    this.logger.debug({
      message: 'LLM usage',
      intent,
      model,
      tokens: usage.total_tokens,
      latencyMs,
      costUsd: cost.toFixed(6),
    });
  }

  calculateCost(result: HyperbolicResult): number {
    const pricing = this.PRICING[result.model] ?? this.PRICING['default'];
    return (
      (result.usage.prompt_tokens * pricing.input +
        result.usage.completion_tokens * pricing.output) /
      1_000_000
    );
  }
}
```

---

## Database Schema Changes

### New Tables

```prisma
// prisma/schema.prisma

// Token usage log for detailed tracking
model TokenUsageLog {
  id               String   @id @default(cuid())
  userId           String
  intent           String   // classification, add_expense, query_total, etc.
  model            String   // Qwen/Qwen3-Next-80B-A3B-Instruct
  promptTokens     Int
  completionTokens Int
  totalTokens      Int
  estimatedCostUsd Decimal  @db.Decimal(10, 8)
  latencyMs        Int
  createdAt        DateTime @default(now())

  @@index([userId, createdAt])
  @@index([createdAt])
  @@index([intent])
}

// User token quota for rate limiting
model UserTokenQuota {
  id               String   @id @default(cuid())
  userId           String   @unique
  dailyLimit       Int      @default(100000)   // 100k tokens/day
  monthlyLimit     Int      @default(2000000)  // 2M tokens/month
  todayUsed        Int      @default(0)
  monthUsed        Int      @default(0)
  lastResetDaily   DateTime @default(now())
  lastResetMonthly DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### Migration

```bash
pnpm exec prisma migrate dev --name add_token_tracking
```

---

## File Structure

### New Files to Create

```
apps/api/src/
├── instrument.ts                              # NEW: Sentry initialization
├── modules/metrics/
│   ├── metrics.module.ts                      # NEW
│   ├── metrics.controller.ts                  # NEW
│   ├── metrics.service.ts                     # NEW
│   ├── interceptors/
│   │   └── http-metrics.interceptor.ts        # NEW
│   └── services/
│       ├── token-tracking.service.ts          # NEW
│       └── grafana-push.service.ts            # NEW
├── common/filters/
│   └── sentry-exception.filter.ts             # NEW
└── prisma/
    └── prisma-metrics.extension.ts            # NEW (optional)

# Optional: Grafana Alloy (only if you want agent-based collection)
docker/
└── alloy/
    └── config.alloy                           # NEW (optional)
```

### Files to Update

```
apps/api/src/
├── main.ts                      # UPDATE: Add Sentry, Pino logger
├── app.module.ts                # UPDATE: Add LoggerModule, MetricsModule
├── integrations/hyperbolic/
│   └── hyperbolic.service.ts    # UPDATE: Add usage tracking
└── modules/agent/
    └── agent.service.ts         # UPDATE: Integrate token tracking

prisma/
└── schema.prisma                # UPDATE: Add TokenUsageLog, UserTokenQuota
```

---

## Environment Variables

### Required for Cloud Services

```env
# Grafana Cloud
GRAFANA_PROMETHEUS_URL=https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
GRAFANA_PROMETHEUS_USER=123456
GRAFANA_API_KEY=glc_xxxxxxxxxxxxx

# Grafana Loki (same API key)
GRAFANA_LOKI_URL=https://logs-prod-xxx.grafana.net
GRAFANA_LOKI_USER=123456

# Sentry
SENTRY_DSN=https://xxxxx@xxx.ingest.sentry.io/xxxxx

# UptimeRobot - configured via web UI, no env vars needed
```

### How to Get Credentials

**Grafana Cloud:**

1. Login to https://grafana.com/
2. Go to your Stack
3. Click on Prometheus > Details > Remote Write
4. Copy the URL, username, and generate an API key

**Sentry:**

1. Login to https://sentry.io/
2. Create a new project (Node.js)
3. Copy the DSN from Project Settings > Client Keys

**UptimeRobot:**

1. Login to https://uptimerobot.com/
2. Add monitors via the dashboard
3. No API integration needed

---

## Timeline & Milestones

| Phase | Tasks                        | Duration | Deliverables                        |
| ----- | ---------------------------- | -------- | ----------------------------------- |
| **1** | App Metrics + Token Tracking | Week 1-2 | MetricsModule, TokenTrackingService |
| **2** | Grafana Cloud Integration    | Week 2   | Metrics pushing to cloud            |
| **3** | Structured Logging           | Week 2-3 | Pino + Loki integration             |
| **4** | Error Tracking               | Week 3   | Sentry integration                  |
| **5** | Uptime Monitoring            | Week 3   | UptimeRobot monitors                |
| **6** | Alerting                     | Week 4   | Grafana alert rules                 |

### Milestones

- [ ] **M1 (Week 2)**: Local metrics endpoint working + DB token tracking
- [ ] **M2 (Week 2)**: Metrics visible in Grafana Cloud
- [ ] **M3 (Week 3)**: Logs visible in Grafana Cloud
- [ ] **M4 (Week 3)**: Errors tracked in Sentry
- [ ] **M5 (Week 3)**: Uptime monitoring active
- [ ] **M6 (Week 4)**: All alerts configured

---

## Quick Start Guide

### Step 1: Install Dependencies

```bash
pnpm --filter @expense-ai/api add prom-client @sentry/node @sentry/profiling-node
pnpm --filter @expense-ai/api add pino pino-http nestjs-pino pino-loki
pnpm --filter @expense-ai/api add -D pino-pretty
```

### Step 2: Add Environment Variables

```bash
# Add to .env
GRAFANA_PROMETHEUS_URL=https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
GRAFANA_PROMETHEUS_USER=your-user-id
GRAFANA_API_KEY=your-api-key
GRAFANA_LOKI_URL=https://logs-prod-xxx.grafana.net
GRAFANA_LOKI_USER=your-user-id
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Step 3: Run Database Migration

```bash
pnpm exec prisma migrate dev --name add_token_tracking
```

### Step 4: Deploy

```bash
pnpm build
docker-compose up -d --build
```

### Step 5: Verify

```bash
# Check local metrics endpoint
curl http://localhost:4000/api/metrics

# Check Grafana Cloud dashboard
# https://your-instance.grafana.net/

# Check Sentry
# https://sentry.io/organizations/your-org/
```

---

## Cost Analysis

### Monthly Costs

| Service       | Free Tier              | Our Usage               | Cost         |
| ------------- | ---------------------- | ----------------------- | ------------ |
| Grafana Cloud | 10k metrics, 50GB logs | ~500 metrics, ~5GB logs | **$0**       |
| Sentry        | 5k errors/month        | ~500 errors/month       | **$0**       |
| UptimeRobot   | 50 monitors            | 3-5 monitors            | **$0**       |
| **Total**     |                        |                         | **$0/month** |

### If Exceeded Free Tier

| Service         | Overage Pricing       |
| --------------- | --------------------- |
| Grafana Metrics | $8/1000 series/month  |
| Grafana Logs    | $0.50/GB              |
| Sentry          | $26/month (Team plan) |
| UptimeRobot     | $7/month (Pro)        |

### Estimated Break-even Point

For a side project like Expense AI Chatbot, the free tiers are more than sufficient:

- Would need **20x current traffic** to exceed Grafana limits
- Would need **10x current errors** to exceed Sentry limits

---

## Grafana Dashboard Templates

### Import These Community Dashboards

1. **Node.js Application** - ID: `11159`
2. **HTTP Requests** - ID: `14359`
3. **Custom LLM Dashboard** - Create manually

### Custom LLM Token Dashboard Panels

```
Dashboard: AI/LLM Token Usage
├── Total Tokens (24h) - Stat
├── Estimated Cost (24h) - Stat
├── Tokens by Intent - Pie Chart
├── Token Usage Over Time - Time Series
├── Prompt vs Completion - Time Series
├── LLM Latency P95 - Gauge
├── Top Users by Tokens - Table
└── Cost Trend (7d) - Time Series
```

---

## Testing Checklist

- [ ] `/api/metrics` returns Prometheus format
- [ ] Token usage logs to database
- [ ] User quota check works
- [ ] Metrics visible in Grafana Cloud
- [ ] Logs visible in Grafana Loki
- [ ] Errors captured in Sentry
- [ ] UptimeRobot monitors active
- [ ] Alerts fire correctly (test with high error rate)

---

## Related Documents

- [AGENTS.md](../AGENTS.md) - Project coding standards
- [Docker Deployment](./deployment.md) - Production deployment guide

---

## Changelog

| Date       | Version | Changes                            |
| ---------- | ------- | ---------------------------------- |
| 2026-01-20 | 1.0.0   | Initial plan (self-hosted)         |
| 2026-01-20 | 2.0.0   | Switched to cloud-based (Option A) |
