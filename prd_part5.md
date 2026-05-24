
---

# 31. Acceptance Criteria

> Given/When/Then format for critical features.

### AC-01: Guest Checkout

```
Given a guest user has items in cart and selects COD,
When they complete checkout with valid name, phone, and delivery address,
Then an order is created with status "PLACED",
  AND the user receives an SMS confirmation,
  AND they are redirected to the order tracking page,
  AND the admin sees the order in real-time on the dashboard.
```

### AC-02: Real-Time Order Status

```
Given an admin updates an order status from "CONFIRMED" to "PREPARING",
When the status is saved,
Then the customer's order tracking page updates within 2 seconds without refresh,
  AND the customer receives an SMS notification,
  AND the order status history log records the transition with timestamp.
```

### AC-03: Rider GPS Tracking

```
Given a rider has accepted an order and status is "OUT_FOR_DELIVERY",
When the rider sends a GPS location update,
Then the customer's tracking map updates within 3 seconds,
  AND the rider's location is persisted to the database,
  AND the map shows the rider's last known position if connection drops.
```

### AC-04: Fawry Payment

```
Given a customer selects Fawry payment at checkout,
When the order is placed,
Then a Fawry reference number is displayed to the customer,
  AND the order status remains "PLACED" with paymentStatus "PENDING",
  AND when Paymob sends the payment webhook,
  AND the HMAC signature is valid,
  Then the order paymentStatus updates to "PAID",
  AND the admin is notified in real-time.
```

### AC-05: Arabic RTL

```
Given a user switches language to Arabic,
When any page is loaded,
Then the HTML dir attribute is "rtl",
  AND all text flows right-to-left,
  AND the Cairo font is applied,
  AND the language preference is persisted in localStorage and user profile,
  AND all UI elements including icons are mirrored appropriately.
```

### AC-06: Menu Admin Management

```
Given an admin disables a menu item,
When the action is confirmed,
Then the item cache is invalidated within 1 second,
  AND the item appears unavailable on the customer menu,
  AND the item cannot be added to cart,
  AND any existing cart items with this item show a warning at checkout.
```

### AC-07: Coupon Validation

```
Given a customer applies coupon code "WELCOME20",
When the coupon is validated,
Then if the coupon is active, not expired, usage limit not exceeded, minimum order met:
  The discount is applied to the order total,
  The coupon usage count increments atomically (race condition safe),
  The coupon details are stored on the order for audit.
When any validation fails:
  A specific error message is returned (expired / min order / invalid code).
```

### AC-08: Security Rate Limiting

```
Given an attacker sends 6 login attempts from the same IP within 1 minute,
When the 6th request is received,
Then the API returns 429 Too Many Requests,
  AND includes a Retry-After header,
  AND logs a security_event with type "auth_rate_limit_exceeded",
  AND the rate limit persists even if the server restarts (Redis-backed).
```

---

# 32. MVP Scope

## 32.1 In Scope (Must Ship in 12 Weeks)

| Feature Area | MVP Features |
|-------------|-------------|
| **Customer Auth** | Email/password, Google OAuth, phone OTP, password reset, email verification |
| **Menu** | Category/subcategory display, items with images/prices, modifiers, availability |
| **Cart** | Add/remove/update items, modifiers, coupon application, price calculation |
| **Checkout** | Delivery/pickup/dine-in, guest checkout, address input with map pin, order notes |
| **Payments** | Card (Paymob), Fawry, COD, Cash at Pickup, payment failure handling |
| **Orders** | Full status lifecycle, SMS notifications, order history, cancellation |
| **Tracking** | Real-time status updates via WebSocket, order status page |
| **Rider** | Login, view assignments, status updates, GPS broadcast |
| **Admin** | Order board (real-time), menu CRUD, category CRUD, user management, coupon management, banner management |
| **Reports** | Revenue chart, top items, order summary (basic) |
| **i18n** | English + Arabic, full RTL support |
| **PWA** | Installable, offline menu browsing, push notifications |
| **Security** | Rate limiting, JWT auth, RBAC, OWASP mitigations |

## 32.2 Explicitly Out of Scope (Post-MVP)

| Feature | Reason Deferred |
|---------|----------------|
| Live rider map on customer screen | Engineering complexity; status tracking covers MVP need |
| Multiple restaurant branches | Architecture complexity; single branch MVP |
| Loyalty points system | Requires additional data model; coupons cover promotions |
| Table reservation | Different user journey; dine-in ordering covers MVP |
| Kitchen Display System (KDS) | Admin order board serves this function |
| Native iOS/Android app | PWA covers mobile; native app post-PMF |
| Advanced delivery zones/routing | Fixed delivery fee for MVP |
| Chat support | Integrate 3rd-party (Intercom) post-MVP |
| Inventory management | Out of scope for food ordering MVP |
| Multi-language admin panel (AR) | Admin panel English-only for MVP |
| Apple Pay / Google Pay | Post-MVP, Paymob supports it |

---

# 33. Post-MVP Scope

### Phase 2 (Month 4-6)
- Live rider GPS map on customer tracking screen (Google Maps embed)
- Push notifications (web push) for all order events
- Multiple delivery zones with dynamic pricing
- Loyalty points / rewards system
- Arabic admin panel
- Order scheduling (advance orders 24h+)
- Apple Pay / Google Pay via Paymob
- WhatsApp notifications (Twilio/WhatsApp Business)

### Phase 3 (Month 6-12)
- Native PWA with offline ordering capability
- Advanced analytics with Metabase/Grafana dashboards
- Multiple branch support
- Catering/bulk order requests
- Kitchen Display System (KDS) interface
- Delivery driver app (React Native)
- Third-party delivery integration (Glovo/Talabat as backup)
- Referral program

### Phase 4 (Year 2)
- Multi-restaurant SaaS platform (white-label)
- AI-powered recommendations
- Dynamic pricing
- Subscription/meal plan ordering

---

# 34. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Paymob API instability | Medium | High | Implement payment retry logic; COD as fallback; monitor Paymob status |
| Egyptian network conditions (3G) | High | Medium | Socket.IO polling fallback, Brotli compression, aggressive caching, skeleton loaders |
| SMS delivery failures (Vonage) | Medium | Medium | Retry with exponential backoff; fallback to email OTP; Twilio as backup provider |
| Redis unavailability | Low | High | Graceful degradation: disable rate limiting, serve menu from DB; auto-restart |
| Database migration failures | Low | High | Test migrations in staging first; automated pre-migration backups; rollback scripts |
| Rider location data abuse | Low | Medium | HTTPS only, WebSocket auth, rate limit location updates, GDPR-style consent |
| Scope creep in 12-week timeline | High | High | Strict MVP scope freeze after Week 2; weekly scope review; defer non-critical features |
| Google Maps API cost overrun | Medium | Low | Restrict API key to domain; set billing alerts; consider OpenStreetMap for address display |
| Fawry payment reconciliation | Medium | Medium | Store full Fawry reference + Paymob transaction ID; daily reconciliation report |
| VAT compliance (14% Egypt) | Low | Medium | Hardcode 14% VAT rate; display on invoice; consult accountant for enterprise billing |

---

# 35. Technical Tradeoffs

## Considered and Rejected

| Decision | Chosen | Rejected | Reason |
|----------|--------|---------|--------|
| State management | Zustand | Redux Toolkit | Redux: excessive boilerplate for MVP scale; Zustand simpler API, 1.5KB |
| ORM | Prisma | TypeORM / Sequelize | Prisma: type-safe, better DX, Prisma Studio for admin DB views |
| CSS | Tailwind + shadcn | MUI / Chakra | MUI: heavier bundle, harder RTL; Tailwind: utility-first, easy RTL customization |
| Payment gateway | Paymob | Stripe / Accept (PayTabs) | Stripe: no EGP/Fawry; Accept: less documentation; Paymob: dominant Egypt market |
| Search | PostgreSQL FTS | Elasticsearch | ES: overkill for single restaurant; PG FTS sufficient for menu item count |
| Queue | Bull (Redis) | RabbitMQ / SQS | RabbitMQ: operational overhead; SQS: AWS dependency; Bull: simple, Redis already present |
| Deployment | DigitalOcean | AWS / Azure | AWS: complex setup; DO: simpler, predictable pricing, Cairo region available |
| Frontend hosting | Vercel | Self-hosted | Vercel: zero-config Next.js deployment, edge network, free for starter |
| Monorepo | Turborepo | Nx / Lerna | Turborepo: simpler config, faster builds, official Vercel integration |

---

# 36. Third-Party Services

| Service | Purpose | Tier | Monthly Cost (USD) |
|---------|---------|------|-------------------|
| Paymob | Card + Fawry payments | Pay-as-you-go (2.5% + 1 EGP) | Variable |
| Google Maps Platform | Maps, Places Autocomplete | Pay-as-you-go | ~$10-30 (capped) |
| SendGrid | Transactional email | Free (100/day), Essentials $20 | Free → $20 |
| Vonage (Nexmo) | SMS (OTP + notifications) | Pay-per-SMS (~0.05 EGP) | ~$10-50 |
| Cloudinary | Image storage & CDN | Free (25GB) | Free → $89 |
| Sentry | Error tracking | Free (5k events) | Free |
| Google OAuth | Social login | Free | Free |
| Cloudflare | CDN, DDoS, WAF | Free tier | Free |
| UptimeRobot | Uptime monitoring | Free (5 monitors) | Free |
| **Total 3rd-party (estimated)** | | | **~$50-170/month** |

---

# 37. Environment Variables Structure

```bash
# .env.example — commit this to Git (safe template, no secrets)

# ══════════════════════════════════════════
# APPLICATION
# ══════════════════════════════════════════
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# ══════════════════════════════════════════
# DATABASE
# ══════════════════════════════════════════
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
DATABASE_POOL_MAX=10
DATABASE_POOL_MIN=2

# ══════════════════════════════════════════
# REDIS
# ══════════════════════════════════════════
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# ══════════════════════════════════════════
# JWT
# ══════════════════════════════════════════
# Generate: openssl rand -base64 32
JWT_ACCESS_SECRET=REPLACE_WITH_256_BIT_SECRET
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_256_BIT_SECRET
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ══════════════════════════════════════════
# GOOGLE OAUTH
# ══════════════════════════════════════════
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback

# ══════════════════════════════════════════
# PAYMENTS — PAYMOB
# ══════════════════════════════════════════
PAYMOB_API_KEY=
PAYMOB_INTEGRATION_ID_CARD=
PAYMOB_INTEGRATION_ID_FAWRY=
PAYMOB_IFRAME_ID=
PAYMOB_HMAC_SECRET=
PAYMOB_CALLBACK_URL=https://api.yourdomain.com/api/v1/payments/webhook

# ══════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Restaurant Name

VONAGE_API_KEY=
VONAGE_API_SECRET=
VONAGE_BRAND_NAME=RestName

# ══════════════════════════════════════════
# STORAGE — CLOUDINARY
# ══════════════════════════════════════════
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ══════════════════════════════════════════
# MAPS
# ══════════════════════════════════════════
GOOGLE_MAPS_API_KEY=          # Server-side geocoding
NEXT_PUBLIC_GOOGLE_MAPS_KEY=  # Client-side maps (HTTP referrer restricted)

# ══════════════════════════════════════════
# WEB PUSH (PWA notifications)
# ══════════════════════════════════════════
# Generate: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourdomain.com

# ══════════════════════════════════════════
# FRONTEND (Next.js — NEXT_PUBLIC_ only)
# ══════════════════════════════════════════
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=

# ══════════════════════════════════════════
# MONITORING
# ══════════════════════════════════════════
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
LOG_LEVEL=info
```

---

# 38. Folder Structure Recommendations

## Monorepo Structure (Turborepo)

```
food-ordering-platform/
├── apps/
│   ├── web/                          # Next.js 14 App Router
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── menu/
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   ├── order/
│   │   │   │   ├── auth/
│   │   │   │   ├── profile/
│   │   │   │   ├── admin/
│   │   │   │   └── rider/
│   │   │   ├── api/
│   │   │   └── middleware.ts
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui base components
│   │   │   ├── menu/                 # Menu-specific components
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── order/
│   │   │   ├── admin/
│   │   │   ├── rider/
│   │   │   └── shared/               # Common: Header, Footer, Map
│   │   ├── stores/                   # Zustand stores
│   │   │   ├── cart.store.ts
│   │   │   ├── auth.store.ts
│   │   │   └── ui.store.ts
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useOrderTracking.ts
│   │   │   ├── useSocket.ts
│   │   │   └── useCart.ts
│   │   ├── lib/
│   │   │   ├── api-client.ts         # Typed API client
│   │   │   ├── socket.ts             # Socket.IO client setup
│   │   │   └── utils.ts
│   │   ├── messages/
│   │   │   ├── en.json
│   │   │   └── ar.json
│   │   ├── public/
│   │   │   ├── icons/                # PWA icons
│   │   │   ├── manifest.json
│   │   │   └── sw.js                 # Service Worker
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                          # NestJS API
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── menu/
│       │   │   ├── cart/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   ├── riders/
│       │   │   ├── coupons/
│       │   │   ├── admin/
│       │   │   ├── notifications/
│       │   │   └── analytics/
│       │   ├── gateways/
│       │   │   └── events.gateway.ts
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   └── pipes/
│       │   ├── config/
│       │   └── prisma/
│       │       ├── prisma.service.ts
│       │       ├── schema.prisma
│       │       ├── migrations/
│       │       └── seed.ts
│       ├── test/                     # Integration + E2E tests
│       ├── Dockerfile
│       └── tsconfig.json
│
├── packages/
│   ├── shared-types/                 # Shared TypeScript types/DTOs
│   │   ├── src/
│   │   │   ├── order.types.ts
│   │   │   ├── menu.types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── eslint-config/               # Shared ESLint configuration
│
├── e2e/                              # Playwright E2E tests
│   ├── tests/
│   │   ├── checkout.spec.ts
│   │   ├── auth.spec.ts
│   │   ├── admin.spec.ts
│   │   └── rtl.spec.ts
│   ├── .auth/                       # Auth state storage (gitignored)
│   └── playwright.config.ts
│
├── infrastructure/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx.conf
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml
│   └── CODEOWNERS
│
├── turbo.json
├── package.json                      # Root package.json (workspaces)
└── .env.example
```

---

# 39. Recommended Database Schema

> Key schema decisions summarized (full Prisma schema in Section 14):

```sql
-- PostgreSQL: critical design decisions

-- 1. UUID primary keys (prevents enumeration)
-- 2. NUMERIC(10,2) for all monetary values
-- 3. Soft deletes on menu_items (deleted_at nullable)
-- 4. Immutable order snapshot (deliveryAddress JSONB, modifierSnapshot JSONB)
-- 5. Enum types for status fields (PostgreSQL native, fast comparison)
-- 6. Timezone: store all timestamps as UTC, display in Africa/Cairo (UTC+2/+3)

-- Critical: Order number generation
CREATE SEQUENCE order_number_seq START 1000;
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Called from application: INSERT INTO orders (order_number, ...) VALUES (generate_order_number(), ...)
-- Or via Prisma $queryRaw for the sequence call

-- Coupon usage: atomic increment to prevent race conditions
UPDATE coupons
SET usage_count = usage_count + 1
WHERE id = $1
  AND (max_usages IS NULL OR usage_count < max_usages)
  AND is_active = true
  AND (valid_until IS NULL OR valid_until > NOW())
RETURNING id, usage_count;
-- If no row returned: coupon is at limit or expired
```

---

# 40. Recommended API Endpoints

> Full endpoint catalog from Section 16. Key endpoint details:

```typescript
// DTO examples for key endpoints

// POST /api/v1/orders — CreateOrderDto
export class CreateOrderDto {
  @IsEnum(FulfillmentType)
  fulfillmentType: FulfillmentType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ValidateIf((o) => o.fulfillmentType === 'DELIVERY')
  @IsUUID()
  @IsOptional()
  addressId?: string;

  @ValidateIf((o) => o.fulfillmentType === 'DELIVERY' && !o.addressId)
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  items: OrderItemDto[];

  // Guest checkout fields (required if unauthenticated)
  @ValidateIf((o) => !o.userId)
  @IsString()
  @MinLength(2)
  guestName?: string;

  @ValidateIf((o) => !o.userId)
  @Matches(/^\+20[0-9]{10}$/)
  guestPhone?: string;
}
```

---

# 41. Recommended WebSocket Events

## 41.1 Event Naming Convention

```
{domain}:{action}
  ↑         ↑
  noun      verb (past tense for notifications, imperative for commands)

Examples:
  order:status_updated
  order:new (admin)
  rider:location_updated
  rider:assigned
  payment:confirmed
```

## 41.2 Complete Event Catalog

### Client → Server (Emitted by client)

| Event | Payload | Emitter |
|-------|---------|---------|
| `join_order_room` | `{ orderId: string }` | Customer, Admin |
| `leave_order_room` | `{ orderId: string }` | Customer, Admin |
| `join_admin_room` | `{}` | Admin |
| `rider_location_update` | `{ orderId, latitude, longitude }` | Rider |
| `rider_status_update` | `{ isOnline: boolean }` | Rider |

### Server → Client (Emitted by server)

| Event | Room/Target | Payload | Trigger |
|-------|------------|---------|---------|
| `order:new` | `admin_room` | `{ orderId, orderNumber, fulfillmentType, totalAmount, items[] }` | New order placed |
| `order:status_updated` | `order:{orderId}`, `admin_room` | `{ orderId, orderNumber, prevStatus, newStatus, timestamp }` | Admin status change |
| `order:payment_confirmed` | `order:{orderId}`, `admin_room` | `{ orderId, paymentMethod, amount }` | Payment webhook |
| `order:rider_assigned` | `order:{orderId}`, `rider:{riderId}` | `{ orderId, riderName, estimatedPickupMinutes }` | Rider assigned |
| `rider:location_updated` | `order:{orderId}` | `{ latitude, longitude, timestamp }` | Rider GPS update |
| `rider:new_assignment` | `rider:{riderId}` | `{ orderId, orderNumber, customerAddress, items[] }` | Admin assigns order |
| `payment:failed` | `order:{orderId}` | `{ orderId, reason }` | Paymob webhook |
| `error` | requesting socket | `{ code, message }` | Any error |

---

# 42. State Management Strategy

```typescript
// stores/cart.store.ts — Zustand with persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CartItem {
  id: string;               // cartItemId (UUID, client-generated)
  menuItemId: string;
  nameEn: string;
  nameAr: string;
  basePrice: number;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  modifiersPrice: number;   // Pre-calculated sum
  notes?: string;
}

interface CartStore {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  // Derived state (computed, not stored)
  subtotal: () => number;
  total: () => number;
  // Actions
  addItem: (item: MenuItemWithModifiers, modifiers: SelectedModifier[], notes?: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      subtotal: () => get().items.reduce((sum, item) =>
        sum + (item.basePrice + item.modifiersPrice) * item.quantity, 0),
      total: () => {
        const { subtotal, coupon } = get();
        const sub = subtotal();
        const discount = coupon
          ? coupon.type === 'PERCENTAGE' ? sub * (coupon.value / 100)
          : coupon.type === 'FIXED_AMOUNT' ? coupon.value
          : 0
          : 0;
        return sub - discount;
      },
      addItem: (menuItem, modifiers, notes) => {
        set((state) => {
          // Check if same item + same modifiers already in cart
          const existing = state.items.find(
            (i) => i.menuItemId === menuItem.id &&
              JSON.stringify(i.selectedModifiers) === JSON.stringify(modifiers)
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return {
            items: [...state.items, {
              id: crypto.randomUUID(),
              menuItemId: menuItem.id,
              nameEn: menuItem.nameEn,
              nameAr: menuItem.nameAr,
              basePrice: menuItem.basePrice,
              quantity: 1,
              selectedModifiers: modifiers,
              modifiersPrice: modifiers.reduce((sum, m) => sum + m.additionalPrice, 0),
              notes,
            }],
          };
        });
      },
      updateQuantity: (cartItemId, quantity) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => i.id !== cartItemId)
            : state.items.map((i) => i.id === cartItemId ? { ...i, quantity } : i),
        })),
      removeItem: (cartItemId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== cartItemId) })),
      clearCart: () => set({ items: [], coupon: null }),
      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

---

# 43. Error Handling Standards

## 43.1 Error Response Format (RFC 7807)

```typescript
// All API errors follow RFC 7807 Problem Details
{
  "type": "https://api.yourdomain.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "One or more fields failed validation",
  "instance": "POST /api/v1/orders",
  "timestamp": "2024-01-15T14:30:00+02:00",
  "errors": [
    {
      "field": "phone",
      "message": "Phone must be an Egyptian number (+20XXXXXXXXXX)"
    }
  ]
}
```

## 43.2 Error Type URI Catalog

| Error Type URI | HTTP Status | Use Case |
|---------------|-------------|---------|
| `.../errors/validation-error` | 422 | DTO validation failure |
| `.../errors/authentication-failed` | 401 | Invalid credentials |
| `.../errors/token-expired` | 401 | JWT expired |
| `.../errors/forbidden` | 403 | Insufficient role |
| `.../errors/not-found` | 404 | Resource not found |
| `.../errors/conflict` | 409 | Duplicate resource |
| `.../errors/rate-limit-exceeded` | 429 | Throttling |
| `.../errors/payment-failed` | 402 | Payment processing error |
| `.../errors/order-invalid-transition` | 422 | Invalid status change |
| `.../errors/item-unavailable` | 422 | Cart item no longer available |
| `.../errors/internal-error` | 500 | Unhandled server error |

## 43.3 Frontend Error Handling

```typescript
// lib/api-client.ts — centralized error handling
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ title: 'Network Error', status: response.status }));

    // Handle specific error types
    if (error.type?.includes('token-expired')) {
      await refreshTokenAndRetry();
      return apiCall<T>(endpoint, options); // Retry once
    }

    throw new ApiError(error.title, error.status, error.errors);
  }

  return response.json();
}
```

---

# 44. Accessibility Considerations

| Requirement | Implementation |
|------------|----------------|
| Keyboard navigation | All interactive elements: buttons, links, form inputs focusable via Tab |
| Screen reader support | ARIA labels on icons, status badges, cart count |
| Color contrast | WCAG AA ratio (≥4.5:1 for text) — verify with axe DevTools |
| Form labels | Explicit `<label>` elements, not placeholder-only |
| Error messages | Announced to screen readers via `aria-live="polite"` |
| Focus management | Modal open → focus first element; modal close → return to trigger |
| Skip navigation | Skip-to-main-content link as first focusable element |
| RTL screen readers | `lang="ar"` on root element; screen readers handle Arabic pronunciation |
| Images | All product images have descriptive alt text in current locale |
| Loading states | Skeleton loaders with `aria-busy="true"` on loading containers |

---

# 45. SEO Strategy

## 45.1 Technical SEO

```typescript
// app/[locale]/menu/page.tsx — generateMetadata
export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('menuTitle'),
    description: t('menuDescription'),
    openGraph: {
      title: t('menuTitle'),
      description: t('menuDescription'),
      url: `https://yourdomain.com/${locale}/menu`,
      siteName: 'Restaurant Name',
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      type: 'website',
    },
    alternates: {
      canonical: `https://yourdomain.com/${locale}/menu`,
      languages: {
        'en': 'https://yourdomain.com/en/menu',
        'ar': 'https://yourdomain.com/ar/menu',
      },
    },
  };
}
```

```json
// public/structured-data.json — JSON-LD for Restaurant
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Restaurant Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Your Street, Alexandria",
    "addressLocality": "Alexandria",
    "addressCountry": "EG"
  },
  "telephone": "+20XXXXXXXXXX",
  "servesCuisine": "Egyptian",
  "hasMenu": "https://yourdomain.com/en/menu",
  "acceptsReservations": "false",
  "priceRange": "$$"
}
```

## 45.2 Local SEO (Alexandria-specific)

- Register on Google Business Profile (maps.google.com/business)
- Target keywords: "مطعم توصيل اسكندرية" (restaurant delivery Alexandria)
- Arabic content for Arabic-speaking searchers
- Location pages for specific Alexandria neighborhoods
- WhatsApp Business integration for local engagement

---

# 46. Mobile Responsiveness Strategy

| Breakpoint | Tailwind | Target |
|-----------|---------|--------|
| 320px | `xs` | Budget Android phones (Samsung A-series) |
| 375px | `sm` | iPhone SE, standard iPhones |
| 414px | `sm/md` | iPhone Plus, large Android |
| 768px | `md` | iPad, tablets |
| 1024px | `lg` | iPad Pro, small laptops |
| 1280px | `xl` | Desktop |

**Mobile-first approach:**
- Design for 375px first, scale up
- Touch targets minimum 44x44px (Apple HIG / Material Design)
- Bottom navigation bar on mobile (cart, home, profile, orders)
- Swipe gestures for category navigation
- Sticky "Add to Cart" CTA on item detail page
- Horizontal scrolling category chips (not dropdown on mobile)

---

# 47. Delivery Roadmap — 12 Weeks

## Week-by-Week Plan

```
WEEK 1: Foundation
├── Repository setup (monorepo, Turborepo)
├── Development environment (Docker Compose)
├── CI/CD pipeline (GitHub Actions)
├── Database setup (PostgreSQL, Prisma schema, initial migration)
├── NestJS boilerplate (modules structure, guards, filters)
├── Next.js setup (App Router, Tailwind, shadcn, next-intl)
└── Deliverable: Running local dev environment, DB schema v1

WEEK 2: Authentication
├── Email/password registration + login
├── JWT access + refresh token flow
├── Password reset (email)
├── Email verification
├── Google OAuth
├── Phone OTP (Vonage integration)
├── Auth middleware (Next.js + NestJS guards)
└── Deliverable: Complete auth flows, unit tests

WEEK 3: Menu System
├── Category/subcategory CRUD (Admin)
├── Menu item CRUD (Admin)
├── Modifier groups/options CRUD
├── Image upload (Cloudinary)
├── Menu display frontend (RSC, ISR)
├── RTL menu display (Arabic)
├── Redis menu cache
└── Deliverable: Full menu browsable in EN + AR

WEEK 4: Cart & Checkout (Part 1)
├── Cart state management (Zustand + persistence)
├── Add/update/remove items with modifiers
├── Cart UI (mobile-optimized)
├── Checkout form (delivery/pickup/dine-in)
├── Address input + Google Maps Places
├── Order placement API
├── Coupon validation
└── Deliverable: Guest can place COD order

WEEK 5: Payments
├── Paymob SDK integration (card payment)
├── Fawry payment flow
├── Webhook handler (HMAC verification)
├── Payment failure handling + retry
├── Order payment status updates
└── Deliverable: Card + Fawry + COD payments working

WEEK 6: Order Lifecycle & Real-Time (Part 1)
├── Order status state machine
├── Order status update API (admin)
├── Socket.IO gateway setup
├── Redis adapter (horizontal scaling ready)
├── Order status WebSocket events
├── Customer order tracking page
└── Deliverable: Real-time order status updates

WEEK 7: Rider Module
├── Rider auth (separate login)
├── Rider dashboard (assigned orders)
├── Order status updates (rider)
├── GPS location broadcasting (WebSocket)
├── Rider location persistence
├── Admin rider assignment
└── Deliverable: Rider can receive and complete deliveries

WEEK 8: Admin Dashboard (Part 1)
├── Admin order board (Kanban, real-time)
├── Order detail + status management
├── Manual order creation
├── Sound alerts on new orders
├── Basic user management (list, block)
└── Deliverable: Admin can manage orders in real-time

WEEK 9: Admin Dashboard (Part 2)
├── Menu management UI (admin)
├── Category management with drag-drop ordering
├── Coupon management CRUD
├── Banner management
├── Bulk item availability toggle
└── Deliverable: Complete admin menu and coupon management

WEEK 10: Reports, Notifications & PWA
├── Revenue reports (charts, CSV export)
├── Top items report
├── SMS notifications (all order events)
├── PWA configuration (manifest, service worker)
├── Push notification setup
├── Offline menu caching
└── Deliverable: Reports, notifications, and PWA installable

WEEK 11: Localization, Performance & Security
├── Complete Arabic translations (all pages)
├── RTL testing + fixes
├── Performance audit (Lighthouse)
├── Security review (OWASP checklist)
├── Rate limiting verification
├── Input sanitization audit
├── E2E test suite (Playwright)
└── Deliverable: Production-grade i18n, security, performance

WEEK 12: Staging, Testing & Launch
├── Staging environment deploy
├── Full regression testing
├── Payment integration testing (Paymob sandbox → live)
├── Load testing (basic)
├── SEO metadata + structured data
├── Analytics setup (GA4)
├── Production deploy
├── DNS configuration, SSL
├── Monitoring + alerting setup
└── Deliverable: PRODUCTION LAUNCH 🚀
```

---

# 48. Sprint Planning Recommendation

> 2-week sprints, 6 sprints total

| Sprint | Scope | Team Focus |
|--------|-------|------------|
| Sprint 1 (W1-2) | Foundation + Auth | Full-stack: API + Frontend |
| Sprint 2 (W3-4) | Menu + Cart | Frontend heavy, Backend support |
| Sprint 3 (W5-6) | Payments + Orders + Real-time | Backend heavy, Frontend integration |
| Sprint 4 (W7-8) | Rider + Admin (Part 1) | Full-stack |
| Sprint 5 (W9-10) | Admin (Part 2) + Reports + PWA | Frontend heavy |
| Sprint 6 (W11-12) | QA + i18n + Performance + Launch | Full team: testing + hardening |

**Ceremonies:**
- Daily standup: 15 min
- Sprint planning: 2h per sprint start
- Sprint review/demo: 1h per sprint end
- Retrospective: 1h per sprint end

---

# 49. Team Composition Recommendation

| Role | Count | Responsibilities |
|------|-------|----------------|
| Full-Stack Lead | 1 | Architecture, code review, complex features |
| Full-Stack Developer | 1 | Feature development across stack |
| Frontend Developer | 1 | UI components, i18n, RTL, PWA |
| Backend Developer | 1 | API, payments, WebSockets |
| DevOps / Part-time | 0.5 | CI/CD, infrastructure, monitoring |
| Product Owner | 0.5 | Backlog, acceptance criteria, stakeholder comms |
| QA Engineer / Part-time | 0.5 | Test plans, manual QA, E2E |
| Designer | 0.5 | UI/UX (EN+AR), component design |
| **Total** | **~5 FTE** | |

**Minimum viable team (tight budget):**
- 2 full-stack developers (1 senior, 1 mid)
- 1 designer (part-time)
- Timeline extends to 16 weeks with 2-person dev team

---

# 50. Cost Estimation Guidance

## 50.1 Development Cost (12 Weeks)

| Role | Rate (USD/day) | Days | Cost |
|------|---------------|------|------|
| Full-Stack Lead | $300 | 60 | $18,000 |
| Full-Stack Developer | $200 | 60 | $12,000 |
| Frontend Developer | $180 | 60 | $10,800 |
| Backend Developer | $180 | 60 | $10,800 |
| DevOps (part-time) | $250 | 15 | $3,750 |
| Designer (part-time) | $150 | 20 | $3,000 |
| QA (part-time) | $120 | 20 | $2,400 |
| **Development Total** | | | **~$60,750** |

> Egyptian market rates (local developers): Reduce by 40-60%
> Freelancer/agency route: Highly variable; risk of underdelivery

## 50.2 Monthly Operating Cost (Post-Launch)

| Category | Monthly (USD) |
|----------|--------------|
| Infrastructure (DigitalOcean) | $76 |
| Third-party services | $50-170 |
| Domain + SSL | $2 |
| Google Maps Platform | $10-30 |
| SMS (variable by volume) | $10-50 |
| **Total Monthly** | **$150-330** |

---

# 51. Definition of Done

A feature is considered **Done** when ALL of the following are satisfied:

### Code Quality
- [ ] All acceptance criteria in the user story are met
- [ ] TypeScript: zero `any` types, all types explicit
- [ ] ESLint: zero warnings or errors
- [ ] No `console.log` in committed code (use structured logger)
- [ ] No hardcoded secrets, credentials, or environment-specific values
- [ ] No TODOs or FIXMEs without linked issue numbers

### Testing
- [ ] Unit tests written for business logic (service layer)
- [ ] Integration tests for all new API endpoints
- [ ] Test coverage maintained at ≥80% for changed files
- [ ] All existing tests pass (no regressions)
- [ ] E2E test added for new user-facing feature (critical path only)

### Security
- [ ] Input validated on both client and server
- [ ] All new endpoints have appropriate auth guards
- [ ] RBAC permissions correctly applied
- [ ] No sensitive data logged
- [ ] Security checklist (from fullstack-guardian skill) reviewed

### Performance
- [ ] Lighthouse score ≥90 for affected pages
- [ ] No N+1 queries (Prisma relation loading uses `include` judiciously)
- [ ] Cache invalidation implemented where applicable
- [ ] New menu/catalog endpoints use Redis caching

### Documentation
- [ ] Swagger documentation updated for new endpoints
- [ ] README updated if setup steps changed
- [ ] Complex logic has inline comments explaining "why"

### Deployment
- [ ] Feature tested on staging environment
- [ ] Database migration tested on staging
- [ ] No breaking changes to existing API contracts (or versioned)
- [ ] Feature flag ready if risky (for post-MVP gradual rollouts)

### Localization
- [ ] All new UI strings added to both `en.json` and `ar.json`
- [ ] Arabic translations reviewed (not machine-translated for user-facing copy)
- [ ] RTL layout tested in Arabic mode

---

# 52. Open Questions & Assumptions

## Assumptions (Verified needed before development)

| ID | Assumption | Risk if Wrong |
|----|-----------|--------------|
| A-01 | Restaurant has a Paymob merchant account | Payment features blocked |
| A-02 | Restaurant wants a single Alexandria delivery zone for MVP | Delivery fee logic needs redesign |
| A-03 | VAT rate is 14% (Egypt standard) | Compliance issue |
| A-04 | Default delivery fee is flat rate (not distance-based) | Checkout pricing logic changes |
| A-05 | Restaurant has operating hours they can provide | Scheduling feature incomplete |
| A-06 | Single branch for MVP | Architecture assumption throughout |
| A-07 | Admin panel will be English-only for MVP | i18n scope changes |
| A-08 | Paymob supports Fawry for this merchant category | Payment feature blocked |
| A-09 | Vonage (Nexmo) can send SMS to Egyptian numbers | OTP login broken |
| A-10 | Restaurant owner has Google Business account | SEO strategy impacts |

## Open Questions

| ID | Question | Owner | Priority |
|----|---------|-------|---------|
| OQ-01 | What is the minimum order amount for delivery? | Business | High |
| OQ-02 | What is the delivery fee structure? (Flat/Zone-based) | Business | High |
| OQ-03 | What is the service fee percentage? | Business | High |
| OQ-04 | What operating hours does the restaurant maintain? | Business | High |
| OQ-05 | Does the restaurant want a cancellation window? (Time after order) | Business | Medium |
| OQ-06 | How many riders are employed? (WebSocket connection planning) | Business | Medium |
| OQ-07 | What are the expected peak daily order volumes? (Infrastructure sizing) | Business | Medium |
| OQ-08 | Are there any specific items that cannot be cancelled after preparation? | Business | Low |
| OQ-09 | Does the restaurant want push notifications or SMS only? | Business | Low |
| OQ-10 | What is the Google Maps budget per month? (Plan API usage limits) | Business | Medium |
| OQ-11 | Is Arabic the primary language for kitchen/rider screens? | Business | Low |
| OQ-12 | Should guest orders be convertible to registered accounts? | Product | Low |

---

# Appendix A: Coding Standards

## TypeScript Conventions

```typescript
// ✅ Correct: Explicit types, no any, descriptive names
async function calculateOrderTotal(
  items: OrderItem[],
  coupon: Coupon | null,
  fulfillmentType: FulfillmentType,
  settings: RestaurantSettings,
): Promise<OrderTotals> {
  const subtotal = items.reduce(
    (sum, item) => sum.plus(item.lineTotal), // Use decimal.js for money math
    new Decimal(0)
  );
  // ... calculation logic
}

// ❌ Wrong: any types, implicit returns
async function calcTotal(items: any[], coupon: any) {
  return items.reduce((s, i) => s + i.total, 0);
}
```

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | kebab-case | `order-status.service.ts` |
| Classes | PascalCase | `OrderStatusService` |
| Interfaces | PascalCase (no I prefix) | `OrderTotals` |
| Functions/methods | camelCase | `calculateOrderTotal` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_ORDER_ITEMS = 50` |
| DB columns | snake_case | `user_id`, `created_at` |
| API endpoints | kebab-case | `/menu-items`, `/order-history` |
| ENV variables | SCREAMING_SNAKE_CASE | `JWT_ACCESS_SECRET` |
| React components | PascalCase | `CartItemCard` |
| Hooks | camelCase with `use` prefix | `useOrderTracking` |

---

*Document Version: 1.0.0*
*Last Updated: 2025*
*Status: Ready for Engineering Kickoff*
*Next Review: Sprint 1 Completion*
