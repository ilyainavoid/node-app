# --- build stage: ставим зависимости и собираем (если нужно)
FROM node:20-slim AS build
WORKDIR /app

# Копируем только манифесты для кешируемой установки зависимостей
COPY package*.json ./

# Ставим зависимости (dev+prod) — быстрее сборка; в final возьмём только prod
RUN npm ci

# Копируем исходники
COPY . .

# Если есть шаг сборки (например, frontend), раскомментируйте:
# RUN npm run build

# --- runtime stage: лёгкий образ только с прод-зависимостями
FROM node:20-slim AS runtime
WORKDIR /app

# Копируем манифесты и ставим только production-зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Копируем приложение (без node_modules из build, только код/артефакты)
COPY --from=build /app ./

# Готовим права на публичную директорию для пользователя node
RUN mkdir -p /app/public/images && chown -R node:node /app

# Переходим под non-root пользователем
USER node

# Порт приложения
EXPOSE 3000

# Старт
CMD ["npm", "start"]