# Build Stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN sh -c "if [ -f package-lock.json ]; then npm ci --silent; else npm install --silent; fi"
COPY . .
RUN npm run build

# Production Stage
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
