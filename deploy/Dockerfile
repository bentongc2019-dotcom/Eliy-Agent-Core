FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx tsc --noEmit || true

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/eliy-kernel ./eliy-kernel
COPY --from=builder /app/adapters ./adapters
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/package.json ./

EXPOSE 3000
ENV NODE_ENV=production

# 静态文件服务（MVP 阶段）
RUN npm install -g serve
CMD ["serve", "frontend/webchat", "-l", "3000", "-s"]
