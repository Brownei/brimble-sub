FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile
COPY . .

# Build
RUN npm run build

ENV PORT=3000
EXPOSE 3000
# Vite preview serves both client AND handles SSR through the server
CMD ["npx", "vite", "preview", "--port", "3000", "--host"]
