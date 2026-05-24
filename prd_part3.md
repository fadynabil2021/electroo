
---

# 16. API Design

## 16.1 Conventions

| Convention | Rule |
|------------|------|
| Base URL | `https://api.yourdomain.com/api/v1` |
| Auth | Bearer JWT in `Authorization` header |
| Casing | `camelCase` in JSON request/response bodies |
| Dates | ISO 8601 with timezone: `2024-01-15T14:30:00+02:00` |
| Monetary | String representation of decimal: `"135.50"` |
| Errors | RFC 7807 `application/problem+json` |
| Pagination | Cursor-based for feeds, offset for admin tables |
| Versioning | URI-based: `/v1/`, `/v2/` |
| Rate limiting | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` headers |

## 16.2 Core API Endpoints

### Authentication Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/google
POST   /api/v1/auth/phone/request-otp
POST   /api/v1/auth/phone/verify-otp
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/verify-email?token=...
```

### Menu Endpoints

```
GET    /api/v1/menu                          # Full menu (cached)
GET    /api/v1/menu/categories               # Category tree
GET    /api/v1/menu/categories/:slug         # Category with items
GET    /api/v1/menu/items/:slug              # Single item detail
GET    /api/v1/menu/search?q=...             # Full-text search
```

### Cart Endpoints

```
GET    /api/v1/cart                          # Get current cart
POST   /api/v1/cart/items                    # Add item to cart
PATCH  /api/v1/cart/items/:itemId            # Update quantity/modifiers
DELETE /api/v1/cart/items/:itemId            # Remove item
DELETE /api/v1/cart                          # Clear cart
POST   /api/v1/cart/validate                 # Validate cart before checkout
POST   /api/v1/cart/coupon                   # Apply coupon
DELETE /api/v1/cart/coupon                   # Remove coupon
```

### Order Endpoints

```
POST   /api/v1/orders                        # Place order
GET    /api/v1/orders                        # Order history (auth)
GET    /api/v1/orders/:id                    # Order detail
GET    /api/v1/orders/:id/track              # Live tracking data
POST   /api/v1/orders/:id/cancel             # Cancel order
GET    /api/v1/orders/guest?phone=&orderId=  # Guest order lookup
```

### Payment Endpoints

```
POST   /api/v1/payments/initiate             # Initiate Paymob session
POST   /api/v1/payments/webhook              # Paymob callback (HMAC verified)
POST   /api/v1/payments/fawry/initiate       # Generate Fawry reference
GET    /api/v1/payments/:orderId/status      # Poll payment status
```

### User/Profile Endpoints

```
GET    /api/v1/users/me                      # Current user profile
PATCH  /api/v1/users/me                      # Update profile
POST   /api/v1/users/me/addresses            # Add address
GET    /api/v1/users/me/addresses            # List addresses
PATCH  /api/v1/users/me/addresses/:id        # Update address
DELETE /api/v1/users/me/addresses/:id        # Delete address
PATCH  /api/v1/users/me/password             # Change password
```

### Admin Endpoints

```
# Orders
GET    /api/v1/admin/orders                  # List with filters + pagination
GET    /api/v1/admin/orders/:id              # Order detail
PATCH  /api/v1/admin/orders/:id/status       # Update status
POST   /api/v1/admin/orders/:id/assign-rider # Assign rider
POST   /api/v1/admin/orders                  # Manual order creation

# Menu
GET    /api/v1/admin/categories              # List categories
POST   /api/v1/admin/categories              # Create category
PATCH  /api/v1/admin/categories/:id          # Update
DELETE /api/v1/admin/categories/:id          # Delete
PATCH  /api/v1/admin/categories/reorder      # Batch reorder

GET    /api/v1/admin/menu-items              # List items
POST   /api/v1/admin/menu-items              # Create
PATCH  /api/v1/admin/menu-items/:id          # Update
DELETE /api/v1/admin/menu-items/:id          # Soft delete
PATCH  /api/v1/admin/menu-items/:id/availability # Toggle availability
POST   /api/v1/admin/menu-items/:id/image    # Upload image (multipart)

# Coupons
GET    /api/v1/admin/coupons
POST   /api/v1/admin/coupons
PATCH  /api/v1/admin/coupons/:id
DELETE /api/v1/admin/coupons/:id

# Banners
GET    /api/v1/admin/banners
POST   /api/v1/admin/banners
PATCH  /api/v1/admin/banners/:id
DELETE /api/v1/admin/banners/:id

# Users
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id/status

# Reports
GET    /api/v1/admin/reports/revenue?from=&to=&groupBy=day|week|month
GET    /api/v1/admin/reports/top-items?from=&to=&limit=10
GET    /api/v1/admin/reports/orders-summary?from=&to=
GET    /api/v1/admin/reports/export?type=orders&from=&to=

# Riders
GET    /api/v1/admin/riders
POST   /api/v1/admin/riders                  # Create rider account
PATCH  /api/v1/admin/riders/:id
```

### Rider Endpoints

```
GET    /api/v1/rider/orders                  # Assigned orders
GET    /api/v1/rider/orders/:id              # Order detail
PATCH  /api/v1/rider/orders/:id/status       # Update delivery status
POST   /api/v1/rider/location                # Update GPS location
PATCH  /api/v1/rider/status                  # Toggle online/offline
```

## 16.3 Request/Response Examples

### POST /api/v1/orders — Place Order

**Request:**
```json
{
  "fulfillmentType": "DELIVERY",
  "addressId": "550e8400-e29b-41d4-a716-446655440000",
  "deliveryAddress": {
    "fullAddress": "15 Corniche El Nil, Raml Station, Alexandria",
    "landmark": "Next to Sidi Gaber Hotel",
    "latitude": "31.2001",
    "longitude": "29.9187"
  },
  "scheduledFor": null,
  "notes": "No onions please",
  "paymentMethod": "CARD",
  "couponCode": "WELCOME20",
  "items": [
    {
      "menuItemId": "item-uuid-1",
      "quantity": 2,
      "selectedModifiers": [
        { "groupId": "group-uuid-1", "optionId": "option-uuid-1" }
      ],
      "notes": "Extra crispy"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "order-uuid-1",
  "orderNumber": "ORD-2024-001234",
  "status": "PLACED",
  "fulfillmentType": "DELIVERY",
  "subtotal": "120.00",
  "deliveryFee": "15.00",
  "taxAmount": "19.04",
  "discountAmount": "24.00",
  "totalAmount": "130.04",
  "paymentMethod": "CARD",
  "paymentStatus": "PENDING",
  "paymentIntent": {
    "paymobOrderId": "12345678",
    "paymentKey": "eyJ0...",
    "iframeUrl": "https://accept.paymob.com/api/acceptance/iframes/12345?payment_token=eyJ0..."
  },
  "estimatedDeliveryMinutes": 35,
  "createdAt": "2024-01-15T14:30:00+02:00"
}
```

### GET /api/v1/menu — Menu Response (abbreviated)

```json
{
  "categories": [
    {
      "id": "cat-uuid-1",
      "nameEn": "Hot Drinks",
      "nameAr": "مشروبات ساخنة",
      "slug": "hot-drinks",
      "imageUrl": "https://res.cloudinary.com/...",
      "items": [
        {
          "id": "item-uuid-1",
          "nameEn": "Classic Espresso",
          "nameAr": "إسبريسو كلاسيك",
          "descriptionEn": "Rich double shot espresso",
          "descriptionAr": "شوت إسبريسو مزدوج غني",
          "basePrice": "25.00",
          "imageUrl": "https://res.cloudinary.com/...",
          "isAvailable": true,
          "isFeatured": false,
          "modifierGroups": [
            {
              "id": "group-uuid-1",
              "nameEn": "Size",
              "nameAr": "الحجم",
              "minSelection": 1,
              "maxSelection": 1,
              "isRequired": true,
              "options": [
                { "id": "opt-1", "nameEn": "Regular", "nameAr": "عادي", "additionalPrice": "0.00" },
                { "id": "opt-2", "nameEn": "Large", "nameAr": "كبير", "additionalPrice": "5.00" }
              ]
            }
          ]
        }
      ]
    }
  ],
  "metadata": {
    "cachedAt": "2024-01-15T14:00:00+02:00",
    "restaurantIsOpen": true,
    "nextOpenTime": null
  }
}
```

---

# 17. Authentication Flows

## 17.1 Email/Password Login

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB
    participant Redis

    Client->>API: POST /auth/login {email, password}
    API->>API: Validate DTO (whitelist, sanitize)
    API->>DB: SELECT user WHERE email = ?
    DB-->>API: User record (with passwordHash)
    API->>API: bcrypt.compare(password, passwordHash)
    alt Invalid credentials
        API-->>Client: 401 Unauthorized
    else Valid
        API->>API: Generate accessToken (15m) + refreshToken (7d)
        API->>Redis: SET refresh_token:{userId} = hash(refreshToken) TTL 7d
        API-->>Client: 200 {accessToken, refreshToken, user}
        Note over Client: Store refreshToken in HttpOnly cookie
        Note over Client: Store accessToken in memory only
    end
```

## 17.2 Silent Token Refresh

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Redis

    Note over Client: accessToken expires
    Client->>API: POST /auth/refresh (HttpOnly cookie with refreshToken)
    API->>API: Verify refreshToken JWT signature
    API->>Redis: GET refresh_token:{userId}
    Redis-->>API: Stored token hash
    API->>API: Compare hash(incomingToken) == storedHash
    alt Token invalid or revoked
        API-->>Client: 401 — Force re-login
    else Valid
        API->>API: Issue new accessToken (15m) + rotate refreshToken
        API->>Redis: SET refresh_token:{userId} = hash(newRefreshToken) TTL 7d
        API-->>Client: 200 {newAccessToken}
    end
```

## 17.3 Google OAuth Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Google
    participant DB

    Client->>API: GET /auth/google
    API-->>Client: Redirect to Google Consent Screen
    Client->>Google: User grants consent
    Google-->>Client: Redirect to /auth/google/callback?code=...
    Client->>API: GET /auth/google/callback?code=...
    API->>Google: Exchange code for tokens
    Google-->>API: {id_token, access_token, profile}
    API->>DB: UPSERT user WHERE google_id = ? OR email = ?
    Note over API: Merge with existing account if email matches
    API->>API: Generate JWT tokens
    API-->>Client: Redirect to app with tokens set in cookies
```

## 17.4 Phone OTP Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Redis
    participant Vonage
    participant DB

    Client->>API: POST /auth/phone/request-otp {phone}
    API->>API: Validate Egyptian phone format (+20XXXXXXXXXX)
    API->>Redis: CHECK rate limit: otp_attempts:{phone} < 3/hour
    alt Rate limited
        API-->>Client: 429 Too Many Requests
    else
        API->>API: Generate 6-digit OTP
        API->>Redis: SET otp:{phone} = OTP TTL 300s
        API->>Vonage: Send SMS with OTP
        Vonage-->>API: Message sent
        API-->>Client: 200 {message: "OTP sent"}
    end

    Client->>API: POST /auth/phone/verify-otp {phone, otp}
    API->>Redis: GET otp:{phone}
    alt OTP mismatch or expired
        API-->>Client: 400 Bad Request
    else Valid
        API->>Redis: DEL otp:{phone}
        API->>DB: UPSERT user WHERE phone = ?
        API->>API: Generate JWT tokens
        API-->>Client: 200 {accessToken, refreshToken, user}
    end
```

## 17.5 RBAC Design

```typescript
// Roles and permissions matrix
export enum Role {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  RIDER = 'RIDER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const PERMISSIONS = {
  // Orders
  'order:read:own': [Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN],
  'order:read:all': [Role.ADMIN, Role.SUPER_ADMIN],
  'order:create': [Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN],
  'order:update:status': [Role.ADMIN, Role.SUPER_ADMIN, Role.RIDER],
  'order:cancel:own': [Role.CUSTOMER],
  // Menu
  'menu:read': [], // Public
  'menu:write': [Role.ADMIN, Role.SUPER_ADMIN],
  // Users
  'user:read:own': [Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN],
  'user:read:all': [Role.ADMIN, Role.SUPER_ADMIN],
  'user:block': [Role.ADMIN, Role.SUPER_ADMIN],
  // Analytics
  'analytics:read': [Role.ADMIN, Role.SUPER_ADMIN],
} as const;

// Usage in controller
@Get(':id')
@Roles(Role.ADMIN, Role.CUSTOMER)  // Guard checks role
@UseGuards(JwtAuthGuard, RolesGuard)
async getOrder(@Param('id') id: string, @CurrentUser() user: RequestUser) {
  // Service enforces ownership for CUSTOMER role
  return this.ordersService.findOne(id, user);
}
```

---

# 18. Payment Flows

## 18.1 Card Payment via Paymob

```mermaid
sequenceDiagram
    participant Customer
    participant Frontend
    participant API
    participant Paymob

    Customer->>Frontend: Confirm order with Card payment
    Frontend->>API: POST /orders {paymentMethod: CARD, ...}
    API->>API: Create order in DB (status: PLACED, paymentStatus: PENDING)
    API->>Paymob: Step 1 — Authenticate API (get auth token)
    Paymob-->>API: auth_token
    API->>Paymob: Step 2 — Create Paymob Order (amount, currency, items)
    Paymob-->>API: paymob_order_id
    API->>Paymob: Step 3 — Request Payment Key (iframe integration)
    Paymob-->>API: payment_key
    API-->>Frontend: {orderId, iframeUrl: "https://accept.paymob.com/...?token=payment_key"}
    Frontend->>Frontend: Load Paymob iframe (PCI-compliant hosted fields)
    Customer->>Frontend: Enter card details in iframe
    Frontend->>Paymob: Card data (never touches our server)
    Paymob->>Paymob: Process payment
    Paymob->>API: POST /payments/webhook (HMAC-256 signed callback)
    API->>API: Verify HMAC signature
    API->>API: Update Payment status + Order paymentStatus
    alt Payment Success
        API->>API: Order status remains PLACED, paymentStatus=PAID
        Paymob-->>Frontend: Redirect to success URL
        Frontend->>Frontend: Navigate to order tracking
    else Payment Failed
        API->>API: paymentStatus=FAILED
        Paymob-->>Frontend: Redirect to failure URL
        Frontend->>Frontend: Show retry option
    end
```

## 18.2 Fawry Payment Flow

```mermaid
sequenceDiagram
    participant Customer
    participant Frontend
    participant API
    participant Paymob_Fawry

    Customer->>Frontend: Select Fawry payment
    Frontend->>API: POST /orders {paymentMethod: FAWRY, ...}
    API->>API: Create order (status: PLACED, paymentStatus: PENDING)
    API->>Paymob_Fawry: Create Fawry payment request
    Paymob_Fawry-->>API: fawry_reference_number (valid 48h)
    API-->>Frontend: {orderId, fawryReferenceNumber, expiresAt}
    Frontend->>Customer: Display Fawry reference to pay at Fawry outlet
    Note over Customer: Customer pays at Fawry outlet within 48h
    Paymob_Fawry->>API: POST /payments/webhook (payment confirmed)
    API->>API: paymentStatus=PAID, emit WebSocket event
    API->>Customer: SMS: "Your order payment confirmed! Order #ORD-001"
```

## 18.3 Webhook Security

```typescript
// src/modules/payments/payments.controller.ts
@Post('webhook')
@HttpCode(200)
async handleWebhook(
  @Headers('x-paymob-signature') signature: string,
  @Body() payload: Record<string, unknown>,
  @RawBody() rawBody: Buffer,
) {
  // Verify HMAC-SHA512 signature BEFORE processing
  const expectedSig = crypto
    .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET!)
    .update(rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig),
  )) {
    throw new UnauthorizedException('Invalid webhook signature');
  }

  await this.paymentsService.processWebhook(payload);
  return { received: true };
}
```

## 18.4 Refund Flow

```mermaid
flowchart TD
    A[Admin/Customer initiates cancellation] --> B{Order paymentStatus?}
    B -->|PENDING/COD| C[Mark cancelled — no refund needed]
    B -->|PAID via Card| D[Call Paymob Refund API]
    B -->|PAID via Fawry| E[Manual refund process + flag for finance]
    D --> F{Paymob refund status?}
    F -->|Success| G[Update paymentStatus=REFUNDED, notify customer via SMS]
    F -->|Failed| H[Set paymentStatus=REFUND_INITIATED, alert admin]
    E --> I[Admin processes manual refund]
    I --> J[Mark paymentStatus=REFUNDED manually]
    C --> K[Order closed]
    G --> K
    J --> K
```

---

# 19. Real-Time Tracking Architecture

## 19.1 Socket.IO Gateway

```typescript
// src/gateways/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { createAdapter } from '@socket.io/redis-adapter';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  namespace: '/events',
  transports: ['websocket', 'polling'], // Polling fallback for 3G
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    // Authenticate on connection
    const token = client.handshake.auth?.token;
    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // If rider, mark offline
    if (client.data.role === 'RIDER') {
      this.ridersService.setOffline(client.data.userId);
    }
  }

  // Customer joins order room to receive updates
  @SubscribeMessage('join_order_room')
  @UseGuards(WsJwtGuard)
  handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    // Verify customer owns this order
    client.join(`order:${data.orderId}`);
    return { event: 'joined', room: `order:${data.orderId}` };
  }

  // Rider broadcasts GPS location
  @SubscribeMessage('rider_location_update')
  @UseGuards(WsJwtGuard)
  async handleRiderLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; latitude: number; longitude: number },
  ) {
    if (client.data.role !== 'RIDER') return;

    // Update rider location in DB
    await this.ridersService.updateLocation(client.data.userId, data);

    // Broadcast to customer tracking room
    this.server.to(`order:${data.orderId}`).emit('rider_location', {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit from services (order status changes)
  emitOrderStatusUpdate(orderId: string, payload: OrderStatusPayload) {
    this.server.to(`order:${orderId}`).emit('order_status_update', payload);
    this.server.to('admin_room').emit('order_status_update', payload);
  }
}
```

## 19.2 WebSocket Room Architecture

```
Socket.IO Rooms:
├── order:{orderId}          # Customer + Rider tracking a specific order
├── admin_room               # All admins (order board updates)
├── rider:{riderId}          # Rider-specific notifications
└── kitchen_room             # Kitchen display (future)
```

## 19.3 Redis Pub/Sub for Horizontal Scaling

```typescript
// Socket.IO Redis adapter setup (for multi-instance deployment)
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

// When emitting from NestJS API service (not gateway):
// Use Redis pub/sub to relay event to correct Socket.IO instance
```

## 19.4 Rider Location Data Flow

```
Rider App → POST /rider/location (REST, every 10s)
         → API saves to DB (rider_profiles table)
         → API emits via Socket.IO to order:{orderId} room
         → Customer map updates in real-time
         
ALSO:
Rider App → WebSocket emit rider_location_update (WebSocket, every 10s)
         → Gateway relays to order:{orderId} room
         → Lower latency than REST polling
```

**Design decision:** Use WebSocket-only for location during active delivery. REST endpoint as fallback when WebSocket connection drops.

---

# 20. Admin Dashboard Architecture

## 20.1 Real-Time Order Board

```
Admin connects to Socket.IO → joins admin_room
→ Receives all order events:
  - new_order: New order placed
  - order_status_update: Any status change
  - payment_confirmed: Payment received
  - rider_assigned: Rider assigned to order

Frontend:
- TanStack Query: initial load of orders from REST
- Socket.IO: real-time updates patch the query cache
- Audio alert: play sound on new_order event
- Kanban columns: PLACED | CONFIRMED | PREPARING | READY | OUT_FOR_DELIVERY
```

## 20.2 Reports Architecture

```typescript
// src/modules/analytics/analytics.service.ts

async getRevenueReport(params: ReportParamsDto): Promise<RevenueReport> {
  const { from, to, groupBy } = params;

  // Raw SQL for complex aggregation (Prisma queryRaw for performance)
  const result = await this.prisma.$queryRaw<RevenueRow[]>`
    SELECT
      DATE_TRUNC(${groupBy}::text, created_at AT TIME ZONE 'Africa/Cairo') AS period,
      COUNT(*)::int AS order_count,
      SUM(total_amount)::numeric AS revenue,
      AVG(total_amount)::numeric AS avg_order_value,
      COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int AS cancelled_count
    FROM orders
    WHERE
      created_at BETWEEN ${from} AND ${to}
      AND status NOT IN ('PLACED', 'CANCELLED')
      AND payment_status = 'PAID'
    GROUP BY period
    ORDER BY period ASC
  `;

  return { data: result, summary: this.calculateSummary(result) };
}
```

---

# 21. Localization / i18n Architecture

## 21.1 next-intl Configuration

```typescript
// messages/en.json (excerpt)
{
  "menu": {
    "title": "Our Menu",
    "addToCart": "Add to Cart",
    "unavailable": "Currently Unavailable",
    "customizeItem": "Customize {itemName}"
  },
  "checkout": {
    "orderSummary": "Order Summary",
    "deliveryFee": "Delivery Fee",
    "tax": "Tax (14% VAT)",
    "total": "Total",
    "placeOrder": "Place Order"
  },
  "order": {
    "statuses": {
      "PLACED": "Order Placed",
      "CONFIRMED": "Confirmed",
      "PREPARING": "Being Prepared",
      "READY": "Ready for Pickup",
      "OUT_FOR_DELIVERY": "Out for Delivery",
      "DELIVERED": "Delivered",
      "CANCELLED": "Cancelled"
    }
  }
}

// messages/ar.json (excerpt)
{
  "menu": {
    "title": "قائمتنا",
    "addToCart": "أضف إلى السلة",
    "unavailable": "غير متوفر حالياً",
    "customizeItem": "تخصيص {itemName}"
  },
  "checkout": {
    "orderSummary": "ملخص الطلب",
    "deliveryFee": "رسوم التوصيل",
    "tax": "الضريبة (14% ضريبة قيمة مضافة)",
    "total": "الإجمالي",
    "placeOrder": "تأكيد الطلب"
  }
}
```

## 21.2 Arabic Font Strategy

```css
/* Cairo: best Google Font for Arabic UI */
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-body: 'Inter', sans-serif;
  --font-arabic: 'Cairo', sans-serif;
}

[dir="rtl"] {
  font-family: var(--font-arabic);
  /* Flip directional Tailwind classes automatically via tailwindcss-rtl plugin */
}
```

## 21.3 Backend Bilingual Response Strategy

```typescript
// API returns both EN and AR; client picks based on locale
// No server-side language filtering — reduces cache fragmentation

// On frontend:
const name = locale === 'ar' ? item.nameAr : item.nameEn;
const description = locale === 'ar' ? item.descriptionAr : item.descriptionEn;
```

---

# 22. PWA Architecture

## 22.1 Service Worker Strategy

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.yourdomain\.com\/api\/v1\/menu/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'menu-cache',
        expiration: { maxAgeSeconds: 300, maxEntries: 50 },
      },
    },
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: { maxAgeSeconds: 86400, maxEntries: 100 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'font-cache' },
    },
  ],
});
```

## 22.2 Web App Manifest

```json
{
  "name": "Restaurant Name",
  "short_name": "RestName",
  "description": "Order delicious food online",
  "start_url": "/en",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#E85D04",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "categories": ["food", "shopping"],
  "lang": "en",
  "dir": "ltr"
}
```

## 22.3 Push Notifications

```typescript
// Backend: send push notification on order status change
// Using web-push library with VAPID keys

async sendPushNotification(userId: string, payload: PushPayload) {
  const subscriptions = await this.prisma.pushSubscription.findMany({
    where: { userId },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        JSON.parse(sub.subscription),
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: '/icons/icon-192.png',
          data: { url: payload.url },
        }),
      ),
    ),
  );

  // Remove invalid subscriptions (410 Gone)
  const expiredSubs = results
    .map((r, i) => (r.status === 'rejected' && r.reason?.statusCode === 410 ? subscriptions[i].id : null))
    .filter(Boolean);

  if (expiredSubs.length > 0) {
    await this.prisma.pushSubscription.deleteMany({ where: { id: { in: expiredSubs as string[] } } });
  }
}
```

---

# 23. Security Architecture

## 23.1 Security Layers

```
Request Flow with Security Controls:

Internet Request
  ↓
[Cloudflare] — DDoS, Bot protection, WAF, TLS termination
  ↓
[Nginx] — Rate limiting (ngx_http_limit_req_module), request size limits
  ↓
[NestJS App] — Helmet (security headers), CORS, CSRF tokens
  ↓
[Throttle Guard] — Per-endpoint rate limiting (Redis-backed)
  ↓
[JWT Auth Guard] — Token verification, expiry check
  ↓
[Roles Guard] — RBAC permission check
  ↓
[Validation Pipe] — DTO whitelist, sanitization, type coercion
  ↓
[Service Layer] — Business logic, ownership checks
  ↓
[Prisma ORM] — Parameterized queries (no raw SQL injection possible)
  ↓
[PostgreSQL] — Row-level data
```

## 23.2 Rate Limiting Configuration

```typescript
// src/app.module.ts
ThrottlerModule.forRoot([
  { name: 'short',  ttl: 1000,   limit: 5   },   // 5 req/sec
  { name: 'medium', ttl: 60000,  limit: 60  },   // 60 req/min
  { name: 'long',   ttl: 3600000, limit: 500 },  // 500 req/hour
]),

// Override for sensitive endpoints
@Controller('auth')
@Throttle({ short: { ttl: 60000, limit: 5 } })  // Auth: 5/min
class AuthController {}

@Controller('orders')
@Throttle({ short: { ttl: 60000, limit: 20 } }) // Orders: 20/min
class OrdersController {}
```

## 23.3 OWASP Top 10 Mitigations

| OWASP Category | Mitigation |
|---------------|------------|
| A01: Broken Access Control | RBAC guards, ownership checks on every resource access, no direct object reference (UUIDs) |
| A02: Cryptographic Failures | bcrypt cost 12 for passwords, TLS 1.3, secrets in env vars, no sensitive data in logs |
| A03: Injection | Prisma parameterized queries, class-validator whitelist, `forbidNonWhitelisted: true` |
| A04: Insecure Design | Threat modeling per feature, payment via Paymob hosted fields (no card data) |
| A05: Security Misconfiguration | Helmet headers, no default credentials, Swagger disabled in production |
| A06: Vulnerable Components | `npm audit` in CI, Dependabot alerts, weekly dependency review |
| A07: Auth Failures | Account lockout after 5 failed attempts (15-min Redis lock), OTP rate limiting, refresh token rotation |
| A08: Data Integrity | Paymob webhook HMAC-SHA512 verification, JWT signature validation |
| A09: Logging Failures | Pino structured logging, all auth events logged, no sensitive data in logs |
| A10: SSRF | No user-provided URLs fetched by server; Cloudinary handles all image URLs |

## 23.4 Environment Security

```bash
# Secrets never committed to Git
# Use .env.example (safe template) committed
# Actual .env.local / .env.production stored in:
# - Local: .env.local (gitignored)
# - Production: DigitalOcean App Platform environment variables
# - CI/CD: GitHub Actions secrets

# Password for env var access
JWT_ACCESS_SECRET=<min 256-bit entropy, generated: openssl rand -base64 32>
JWT_REFRESH_SECRET=<separate high-entropy secret>
PAYMOB_HMAC_SECRET=<from Paymob dashboard>
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

## 23.5 Input Sanitization

```typescript
// All inputs sanitized before processing
// Example: prevent stored XSS in menu descriptions

import { sanitize } from 'class-sanitizer';
import xss from 'xss';

// In service layer, before persisting user-provided text:
const safeDescription = xss(dto.descriptionEn, {
  whiteList: {}, // No HTML tags allowed in descriptions
  stripIgnoreTag: true,
});
```

## 23.6 Security Headers (Helmet)

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://accept.paymob.com; frame-src https://accept.paymob.com; connect-src 'self' wss://api.yourdomain.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY (override for Paymob iframe page)
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

---
