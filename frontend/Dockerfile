FROM node:20-alpine AS base
WORKDIR /app

FROM base AS dev

COPY package.json pnpm-lock.yaml* ./

RUN npm install -g pnpm && pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "run", "dev"]
