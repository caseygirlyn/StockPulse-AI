# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy a custom nginx config to handle SPA routing if needed
# For now, the default is fine for a basic deployment
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
