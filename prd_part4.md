
---

# 24. Performance Optimization Strategy

## 24.1 Frontend Performance

| Optimization | Implementation | Impact |
|-------------|----------------|--------|
| RSC + Streaming | Use React Server Components for menu; stream with `Suspense` | -40% JS bundle |
| ISR for menu | `next.revalidate: 300` on menu fetch | Near-zero TTFB for repeat visits |
| Image optimization | `next/image` with Cloudinary transformations | -60% image payload |
| Font optimization | `next/font/google` with `display: 'swap'` | Eliminate CLS from fonts |
| Critical CSS inlining | Next.js handles automatically | Reduce render-blocking CSS |
| Bundle splitting | `next/dynamic` for heavy components (Map, Charts) | Load on demand |
| Prefetching | `<Link prefetch>` on menu category links | Instant perceived navigation |

```typescript
// Dynamic import for Google Maps (heavy: ~200KB)
const OrderTrackingMap = dynamic(
  () => import('@/components/tracking/OrderTrackingMap'),
  {
    loading: () => <MapSkeleton />,
    ssr: false, // Maps require browser API
  }
);

// Dynamic import for admin charts
const RevenueChart = dynamic(
  () => import('@/components/admin/RevenueChart'),
  { loading: () => <ChartSkeleton /> }
);
```

## 24.2 Backend Performance

```typescript
// Redis caching strategy for menu (cache-aside pattern)
async getMenu(): Promise<MenuDto> {
  const cacheKey = 'menu:full:v1';
  const cached = await this.redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached) as MenuDto;
  }

  // Cache miss: fetch from DB
  const menu = await this.prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: {
      children: { where: { isActive: true } },
      menuItems: {
        where: { isAvailable: true, deletedAt: null },
        include: {
          modifierGroups: {
            include: { options: { where: { isAvailable: true } } },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });

  const dto = this.transformToDto(menu);
  await this.redis.setEx(cacheKey, 300, JSON.stringify(dto)); // 5-minute TTL
  return dto;
}

// Cache invalidation on menu update
async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
  const item = await this.prisma.menuItem.update({ where: { id }, data: dto });
  await this.redis.del('menu:full:v1'); // Invalidate on any menu change
  return item;
}
```

## 24.3 Database Query Optimization

```sql
-- Pagination with cursor (avoid OFFSET on large tables)
-- First page:
SELECT * FROM orders
WHERE user_id = $1
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Subsequent pages (cursor = last item's created_at + id):
SELECT * FROM orders
WHERE user_id = $1
  AND deleted_at IS NULL
  AND (created_at, id) < ($2, $3)  -- Cursor tuple comparison
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Index supports this query
CREATE INDEX idx_orders_user_cursor ON orders (user_id, created_at DESC, id DESC);
```

## 24.4 Network Performance for Egyptian Users

- **Cloudflare CDN:** Static assets served from nearest PoP (Cairo, UAE nearby)
- **Image CDN:** Cloudinary with auto-format (`f_auto`) and quality (`q_auto`)
- **Compression:** Brotli (API) + gzip fallback
- **Connection reuse:** HTTP/2 multiplexing via Nginx
- **Minimal JS:** Avoid heavy client-side libraries; prefer CSS animations over JS

---

# 25. Scalability Strategy

## 25.1 MVP Scaling Profile

Expected load for single Alexandria restaurant MVP:
- Peak concurrent users: ~200
- Orders/day: ~500
- Orders/minute (peak): ~15
- Menu cache hit rate: >95%

**Single server (DigitalOcean Droplet 4GB RAM / 2 vCPU) can handle this comfortably.**

## 25.2 Horizontal Scaling Path

```
Phase 1 (MVP — Month 1-6):
  Single DigitalOcean Droplet
  → Next.js + NestJS + Redis on same server
  → Managed PostgreSQL (DigitalOcean)
  → Handles: ~1000 orders/day, ~500 concurrent users

Phase 2 (Growth — Month 6-18):
  → Separate Next.js (Vercel or DigitalOcean App Platform)
  → NestJS API on 2x Droplets behind load balancer
  → Redis (Managed Redis)
  → PostgreSQL with read replica
  → Socket.IO with Redis adapter (enables multi-instance)
  → Handles: ~5000 orders/day

Phase 3 (Scale — 18+ months):
  → NestJS microservices extraction (Orders, Payments separate)
  → Queue-based notifications (Bull + Redis)
  → Elasticsearch for menu search
  → CDN for all static content
```

## 25.3 Stateless API Design

```typescript
// CRITICAL: No in-memory state in NestJS API
// All state in Redis or PostgreSQL:
// ✅ Sessions: Redis
// ✅ Rate limits: Redis (ThrottlerModule)
// ✅ OTP codes: Redis
// ✅ Cart (optional): Redis or DB
// ✅ Order state: PostgreSQL
// ❌ NEVER: in-memory maps, global variables for request state
```

---

# 26. CI/CD Strategy

## 26.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: --health-cmd "redis-cli ping"

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: TypeScript type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/test_db

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Security audit
        run: npm audit --audit-level=high

      - name: Build
        run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000

  deploy-staging:
    needs: [test, e2e]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: deploy
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /app
            git pull origin develop
            npm ci --omit=dev
            npx prisma migrate deploy
            pm2 restart all

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          # DigitalOcean App Platform auto-deploy on main push
          # Or use doctl for manual trigger
          echo "Deploying to production"
```

## 26.2 Git Branching Strategy

```
main ──────────────────────────────────── Production
  │
develop ───────────────────────────────── Staging (auto-deploy)
  │
  ├─ feature/US-001-menu-display
  ├─ feature/US-002-cart-management
  ├─ fix/order-status-transition
  └─ hotfix/payment-webhook-validation ── Direct to main (emergency)

Branching rules:
- main: Protected. Requires PR review + all CI checks passing
- develop: Integration branch. Requires PR review
- feature/*: From develop, merge back to develop
- hotfix/*: From main, merge to main + develop
- release/v1.x.x: Release branches for QA

Commit convention (Conventional Commits):
  feat(orders): add cancellation window validation
  fix(auth): handle Google OAuth email collision
  perf(menu): add Redis cache with 5-minute TTL
  security(payments): add HMAC webhook verification
  test(orders): add state machine transition tests
```

---

# 27. Infrastructure & Deployment

## 27.1 Production Architecture

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │  (DNS + CDN +   │
                    │   WAF + DDoS)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐      │    ┌─────────▼───────┐
     │  Next.js App   │      │    │  DigitalOcean   │
     │  (Vercel or    │      │    │  Load Balancer  │
     │  DO App Plat.) │      │    └─────────┬───────┘
     └────────────────┘      │              │
                             │    ┌─────────▼───────┐
                             │    │  NestJS API     │
                             │    │  (DO Droplet    │
                             │    │  4GB/2vCPU)     │
                             │    └─────────┬───────┘
                             │              │
                    ┌────────▼──────────────▼────────┐
                    │         DigitalOcean            │
                    │     Managed Services            │
                    │                                 │
                    │  ┌──────────┐ ┌──────────────┐ │
                    │  │Postgres  │ │   Redis      │ │
                    │  │(Managed) │ │  (Managed)   │ │
                    │  └──────────┘ └──────────────┘ │
                    └─────────────────────────────────┘
```

## 27.2 Docker Configuration

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
WORKDIR /app
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main"]
```

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml (development)
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: foodapp_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports: ['5432:5432']

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports: ['6379:6379']

  api:
    build: ./apps/api
    ports: ['3001:3001']
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/foodapp_dev
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]
    volumes:
      - ./apps/api:/app
      - /app/node_modules

  web:
    build: ./apps/web
    ports: ['3000:3000']
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on: [api]

volumes:
  pgdata:
```

## 27.3 DigitalOcean Deployment Specifications

| Service | Spec | Monthly Cost (USD) |
|---------|------|--------------------|
| NestJS API Droplet | 4GB RAM, 2 vCPU, 80GB SSD | ~$24 |
| Managed PostgreSQL | 1GB RAM, 1 vCPU, 25GB | ~$15 |
| Managed Redis | 1GB | ~$15 |
| Next.js (App Platform Basic) | 512MB RAM | ~$5 |
| Load Balancer | DigitalOcean LB | ~$12 |
| Spaces (Backup storage) | 250GB | ~$5 |
| **Total MVP Infrastructure** | | **~$76/month** |

> Alternative: Cloudflare free tier + Vercel hobby eliminates LB + frontend cost for early MVP (~$30/month total).

---

# 28. Monitoring & Logging

## 28.1 Structured Logging with Pino

```typescript
// src/common/logger/logger.service.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'food-ordering-api',
    env: process.env.NODE_ENV,
  },
  redact: {
    // NEVER log sensitive fields
    paths: [
      'req.headers.authorization',
      'body.password',
      'body.passwordHash',
      'body.cardNumber',
      'body.cvv',
    ],
    remove: true,
  },
  serializers: {
    req: (req) => ({
      requestId: req.id,
      method: req.method,
      url: req.url,
      userId: req.user?.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      responseTime: res.responseTime,
    }),
  },
});

// Log security events explicitly
export function logSecurityEvent(event: SecurityEvent) {
  logger.warn({
    type: 'security_event',
    eventType: event.type,
    userId: event.userId,
    ip: event.ip,
    details: event.details,
  });
}
```

## 28.2 Metrics with Prometheus

```typescript
// src/common/metrics/metrics.service.ts
import { Counter, Histogram, Gauge, register } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

export const ordersCreatedTotal = new Counter({
  name: 'orders_created_total',
  help: 'Total orders placed',
  labelNames: ['fulfillment_type', 'payment_method'],
});

export const activeWebSocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Active WebSocket connections',
});

// Expose metrics endpoint for Prometheus scraping
@Controller('metrics')
@UseGuards(InternalIpGuard) // Only accessible from monitoring server
export class MetricsController {
  @Get()
  async getMetrics() {
    return register.metrics();
  }
}
```

## 28.3 Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: food-ordering-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels: { severity: critical }
        annotations:
          summary: "Error rate > 5% for 2 minutes"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels: { severity: warning }

      - alert: OrderProcessingStalled
        expr: increase(orders_created_total[15m]) == 0
        for: 15m
        labels: { severity: warning }
        annotations:
          summary: "No orders placed in 15 minutes (check if restaurant is open)"

      - alert: PaymentWebhookFailures
        expr: increase(payment_webhook_failures_total[10m]) > 3
        for: 1m
        labels: { severity: critical }

      - alert: APILatencyHigh
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        labels: { severity: warning }
```

## 28.4 Observability Stack

| Tool | Purpose | Deployment |
|------|---------|------------|
| Pino | Structured JSON logging | In-app |
| Prometheus | Metrics collection | DigitalOcean Droplet |
| Grafana | Dashboards & alerting | DigitalOcean Droplet |
| Sentry | Error tracking + tracing | Cloud (free tier) |
| UptimeRobot | Uptime monitoring + alerts | Cloud (free) |
| Datadog (future) | APM when scale demands | Cloud |

---

# 29. Analytics Strategy

## 29.1 Business Analytics (Admin Dashboard)

Implemented as SQL queries on PostgreSQL — no external BI tool needed for MVP:

```sql
-- Daily revenue trend (last 30 days)
SELECT
  DATE_TRUNC('day', created_at AT TIME ZONE 'Africa/Cairo')::date AS date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue,
  AVG(total_amount) AS avg_order_value
FROM orders
WHERE
  created_at >= NOW() - INTERVAL '30 days'
  AND payment_status = 'PAID'
  AND status = 'DELIVERED'
GROUP BY date
ORDER BY date;

-- Top 10 selling items this week
SELECT
  oi.item_name_en,
  oi.item_name_ar,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.line_total) AS revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE
  o.created_at >= DATE_TRUNC('week', NOW())
  AND o.status = 'DELIVERED'
GROUP BY oi.item_name_en, oi.item_name_ar
ORDER BY units_sold DESC
LIMIT 10;

-- Orders by hour of day (peak time analysis)
SELECT
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Africa/Cairo') AS hour,
  COUNT(*) AS order_count
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY hour
ORDER BY hour;
```

## 29.2 Product Analytics

- **Google Analytics 4:** Page views, user flows, conversion funnel
- **Custom events:** `add_to_cart`, `checkout_started`, `order_placed`, `payment_failed`
- **Mixpanel (post-MVP):** Cohort analysis, retention

```typescript
// Frontend: track funnel events
analytics.track('checkout_started', {
  itemCount: cart.items.length,
  subtotal: cart.subtotal,
  fulfillmentType: selectedFulfillment,
});
```

---

# 30. Testing Strategy

## 30.1 Testing Pyramid

```
              ╱▲╲
             ╱ E2E╲         5% — Playwright: critical user journeys
            ╱──────╲
           ╱Integration╲    25% — NestJS supertest: API contracts
          ╱──────────────╲
         ╱   Unit Tests   ╲  70% — Vitest/Jest: services, state machines
        ╱──────────────────╲
```

## 30.2 Unit Tests (Vitest / Jest)

```typescript
// src/modules/orders/order-status.machine.spec.ts
import { describe, it, expect } from 'vitest';
import { isValidTransition, ORDER_STATUS_TRANSITIONS } from './order-status.machine';

describe('Order Status State Machine', () => {
  it('allows PLACED → CONFIRMED transition', () => {
    expect(isValidTransition('PLACED', 'CONFIRMED')).toBe(true);
  });

  it('forbids DELIVERED → CONFIRMED (terminal state)', () => {
    expect(isValidTransition('DELIVERED', 'CONFIRMED')).toBe(false);
  });

  it('forbids PREPARING → PLACED (backwards transition)', () => {
    expect(isValidTransition('PREPARING', 'PLACED')).toBe(false);
  });

  it('allows cancellation from most states', () => {
    const cancellableStates = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
    cancellableStates.forEach((status) => {
      expect(isValidTransition(status as OrderStatus, 'CANCELLED')).toBe(true);
    });
  });
});
```

## 30.3 Integration Tests (NestJS Supertest)

```typescript
// src/modules/orders/orders.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';

describe('Orders API (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    // Authenticate
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Test@1234' });
    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => await app.close());

  describe('POST /api/v1/orders', () => {
    it('should place a delivery order successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fulfillmentType: 'DELIVERY',
          paymentMethod: 'CASH_ON_DELIVERY',
          items: [{ menuItemId: 'valid-item-uuid', quantity: 1, selectedModifiers: [] }],
          deliveryAddress: {
            fullAddress: '15 Corniche El Nil, Alexandria',
            latitude: '31.2001',
            longitude: '29.9187',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/);
      expect(res.body.status).toBe('PLACED');
      expect(res.body.totalAmount).toBeDefined();
    });

    it('should reject order with unavailable items', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ menuItemId: 'unavailable-item-uuid', quantity: 1 }] });

      expect(res.status).toBe(422);
      expect(res.body.title).toBe('Validation Error');
    });

    it('should reject unauthenticated requests for order history', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/orders');
      expect(res.status).toBe(401);
    });
  });
});
```

## 30.4 E2E Tests (Playwright)

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Guest Checkout Flow', () => {
  test('completes a delivery order with COD payment', async ({ page }) => {
    // Navigate to menu
    await page.goto('/en/menu');
    await expect(page.getByText('Our Menu')).toBeVisible();

    // Add item to cart
    await page.click('[data-testid="item-classic-espresso"]');
    await page.click('[data-testid="modifier-option-regular"]'); // Select size
    await page.click('[data-testid="add-to-cart"]');

    // Verify cart badge updated
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');

    // Proceed to checkout
    await page.goto('/en/checkout');

    // Enter guest details
    await page.fill('[data-testid="guest-name"]', 'Ahmed Hassan');
    await page.fill('[data-testid="guest-phone"]', '+201001234567');

    // Select delivery
    await page.click('[data-testid="fulfillment-delivery"]');

    // Enter address
    await page.fill('[data-testid="address-input"]', '15 Corniche El Nil, Alexandria');
    await page.click('[data-testid="use-current-location"]'); // Skip map for E2E

    // Select COD payment
    await page.click('[data-testid="payment-cod"]');

    // Place order
    await page.click('[data-testid="place-order"]');

    // Verify order confirmation
    await expect(page).toHaveURL(/\/order\//);
    await expect(page.getByText(/ORD-\d{4}-\d{6}/)).toBeVisible();
    await expect(page.getByText('Order Placed')).toBeVisible();
  });
});

test.describe('Arabic RTL Layout', () => {
  test('switches to Arabic and verifies RTL layout', async ({ page }) => {
    await page.goto('/ar/menu');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByText('قائمتنا')).toBeVisible();
  });
});

test.describe('Admin Order Management', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('admin can update order status', async ({ page }) => {
    await page.goto('/admin/orders');
    await page.click('[data-testid="order-row"]:first-child [data-testid="confirm-btn"]');
    await expect(page.locator('[data-testid="status-badge"]:first-child')).toHaveText('Confirmed');
  });
});
```

## 30.5 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup: authenticate users
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium — customer',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile safari — iPhone',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
    {
      name: 'android mobile',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 30.6 Test Coverage Targets

| Module | Unit Coverage | Integration Coverage |
|--------|--------------|---------------------|
| Auth service | 90% | 85% |
| Order state machine | 100% | 90% |
| Payment service | 85% | 80% |
| Menu service | 80% | 75% |
| Coupon validation | 95% | 90% |
| Rider location | 80% | 75% |
| **Overall target** | **80%** | **75%** |
