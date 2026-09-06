# ==========================================
# 1. Build Stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Cài đặt dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Sao chép toàn bộ mã nguồn
COPY . .

# Build dự án cho môi trường Node độc lập (không Cloudflare Workers)
ENV NODE_ENV=production
ENV TARGET=node
RUN npx vinext build

# ==========================================
# 2. Production Runner Stage
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Cài curl để phục vụ container healthcheck
RUN apk add --no-cache curl

ENV NODE_ENV=production \
    TARGET=node \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data

# Sao chép các artifact và thư viện đã build từ builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/runtime ./runtime
COPY --from=builder /app/drizzle ./drizzle

# Tạo thư mục dữ liệu SQLite + file uploads và phân quyền cho user node
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "runtime/serve.mjs"]
