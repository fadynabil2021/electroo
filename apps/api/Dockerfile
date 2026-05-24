# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including devDependencies to compile NestJS
RUN npm ci

# Copy application source
COPY . .

# Generate Prisma Client & Build NestJS app
RUN npx prisma generate
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies to keep the image lightweight & secure
RUN npm ci --only=production

# Copy generated Prisma Client and compiled bundle
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist

EXPOSE 3011
CMD ["node", "dist/main.js"]
