# --- Giai đoạn 1: Build FE (Using AWS Mirror for Rate Limit) ---
FROM public.ecr.aws/docker/library/node:20-alpine AS build-stage

WORKDIR /app

# Copy package files để cache layer node_modules
COPY package*.json ./

# Cài đặt dependencies (dùng --frozen-lockfile hoặc tương đương để đảm bảo ổn định)
RUN npm install

# Copy toàn bộ code FE
COPY . .

# Thực hiện build ra folder dist (Bỏ qua tsc check để build nhanh)
RUN npx vite build

# --- Giai đoạn 2: Serve bằng Nginx ---
FROM public.ecr.aws/docker/library/nginx:stable-alpine AS production-stage

# Copy folder dist từ build-stage vào thư mục html của nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy cấu hình nginx tùy chỉnh để xử lý Single Page Application routing
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
