FROM node:22-bookworm-slim
WORKDIR /app

ENV HOST=0.0.0.0
ENV PORT=8080
ENV VITE_AUTH_ENABLED=true

COPY package.json package-lock.json ./
# Fall back to npm install if the lockfile is slightly out of date.
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev"]
