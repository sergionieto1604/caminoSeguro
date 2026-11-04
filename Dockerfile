# ---------- Etapa 1: compilar Angular ----------
FROM node:24-alpine AS build
WORKDIR /app

# URL de la API vista desde el navegador.
# Por defecto "/api": nginx reenvía /api al contenedor del backend (mismo origen, sin CORS).
ARG API_URL=/api

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Inyecta la URL de la API en el environment de producción y desactiva el modo demo.
RUN sed -i "s#apiUrl: '.*'#apiUrl: '${API_URL}'#" src/environments/environment.ts \
 && sed -i "s#usarMock: .*#usarMock: false,#" src/environments/environment.ts \
 && npx ng build --configuration production

# ---------- Etapa 2: servir con nginx (usuario sin privilegios) ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ruta-segura/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
