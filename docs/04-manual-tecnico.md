# Camino Seguro — Manual técnico (instalación, ejecución y despliegue)

**Versión 1.1 · 4 de noviembre de 2026**

## 1. Repositorios y estructura

| Repositorio | Carpeta local | Contenido |
|---|---|---|
| https://github.com/sergionieto1604/caminoSeguro | `camino_segurofront/` | SPA Angular, Dockerfile del frontend, `nginx.conf`, `deploy/` (docker-compose) y `docs/` |
| https://github.com/sergionieto1604/caminoSeguroBack | `camino_seguroback/` | API ASP.NET Core 8, EF Core y `Dockerfile` |

```
hackaton/
├── camino_segurofront/
│   ├── src/app/{core,shared,pages}
│   ├── Dockerfile · nginx.conf · .dockerignore
│   ├── deploy/{docker-compose.yml, .env.example, Dockerfile.backend}
│   └── docs/
└── camino_seguroback/
    ├── CaminoSeguro.Api/   (Controllers, Services, Models, Dtos, Data)
    └── Dockerfile          (.NET 8, usuario sin privilegios, puerto 8080)
```

## 2. Requisitos

| Herramienta | Versión | Comprobar |
|---|---|---|
| Node.js | **≥ 24.15.0** o **≥ 26.0.0** (Angular 22.2 rechaza la 24.14) | `node -v` |
| Angular CLI | 22.2.5 (viene incluido en el proyecto) | `npx ng version` |
| .NET SDK | 8.0 | `dotnet --list-sdks` |
| SQL Server | 2022 Express/Developer, o el contenedor de Docker | SSMS |
| Docker + Compose | Docker Desktop (Windows) o Docker 24+ (Linux) | `docker compose version` |
| Git | 2.40 o superior | `git --version` |

---

## 3. Ejecución local

### 3.1 Frontend en modo demo (sin backend)
```bash
cd camino_segurofront
npm install
npm start                 # http://localhost:4200
```
Usuaria demo: `demo@demo.com` / `Demo1234`. Los datos viven en memoria (`core/mock-backend.interceptor.ts`) y se pierden al recargar.

### 3.2 Frontend conectado a la API real
En `src/environments/environment.development.ts`:
```ts
apiUrl: 'https://localhost:7001/api',  // el puerto que muestre "dotnet run"
usarMock: false,
```

### 3.3 Backend
```bash
cd camino_seguroback/CaminoSeguro.Api
dotnet dev-certs https --trust
dotnet run --launch-profile https     # https://localhost:7001/swagger
```
- Al arrancar, `EnsureCreated()` **crea la base, las tablas y los datos iniciales** (18 municipios y 6 categorías). No hace falta `dotnet ef`.
- En desarrollo se crea también la usuaria `demo@demo.com` / `Demo1234`. En producción no existe.
- `appsettings.Development.json` apunta a `localhost\SQLEXPRESS` y trae una clave JWT **solo para desarrollo**. En producción la clave y la conexión llegan por variables de entorno, nunca desde el repositorio.

### 3.4 Variables de configuración del backend

| Variable (formato de entorno) | Ejemplo | Uso |
|---|---|---|
| `ConnectionStrings__Default` | `Server=db,1433;Database=CaminoSeguro;...` | Conexión a SQL Server |
| `Jwt__Key` | 48 bytes aleatorios en base64 | Firma HS256 (mínimo 32 bytes) |
| `Jwt__Issuer` / `Jwt__Audience` | `CaminoSeguro` / `CaminoSeguroWeb` | Validación del token |
| `Cors__AllowedOrigins__0` | `http://localhost:4200` | Orígenes permitidos; `__1`, `__2`... para más (no se usa `*`) |
| `Nominatim__UserAgent` | `CaminoSeguro-Hackaton/1.0` | Lo exige la política de Nominatim |
| `Swagger__Habilitado` | `true` | Muestra Swagger en producción (por defecto, apagado) |

---

## 4. Despliegue con Docker en una instancia en la nube

### 4.1 Arquitectura
Hay tres contenedores en una red interna: `web` (nginx, puerto público 80), `api` (.NET, solo interno) y `db` (SQL Server, solo interno). nginx sirve Angular y reenvía `/api/*` a la API. El diagrama completo es el número 11 del Anexo A.

```mermaid
flowchart LR
    I((Internet)) -- ":80" --> W["web · nginx"]
    W -- "/api" --> A["api · .NET 8"]
    A --> D[("db · SQL Server")]
```

### 4.2 Requisitos de la instancia
- Ubuntu 22.04/24.04 con **mínimo 2 vCPU y 4 GB de RAM**. SQL Server necesita 2 GB solo para él.
- En el firewall o *security group*: abrir solo los puertos **22** (SSH) y **80** (más **443** si se configura HTTPS).

### 4.3 Pasos
```bash
# 1) Instalar Docker en la instancia
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# 2) Clonar los dos repos uno al lado del otro, con estos nombres
mkdir hackaton && cd hackaton
git clone https://github.com/sergionieto1604/caminoSeguro.git camino_segurofront
git clone https://github.com/sergionieto1604/caminoSeguroBack.git camino_seguroback

# 3) El backend ya trae su Dockerfile en la raíz
ls camino_seguroback/Dockerfile

# 4) Configurar los secretos
cd camino_segurofront/deploy
cp .env.example .env
nano .env          # SQL_SA_PASSWORD, JWT_KEY, PUBLIC_URL=http://<IP-pública>, API_APP_NAME

# 5) Construir y levantar
docker compose up -d --build
docker compose ps          # db debe quedar "healthy"
docker compose logs -f api # verificar que aplicó las migraciones
```
Luego se abre `http://<IP-pública>` en el navegador.

La API ejecuta `EnsureCreated()` al arrancar y crea el esquema y los datos iniciales. Gracias a `depends_on: service_healthy`, espera a que SQL Server esté listo. **La primera vez la descarga es lenta:** la imagen de SQL Server pesa unos 630 MB. En producción no existe la usuaria demo: hay que registrarse.

### 4.4 Actualizar después de cambios
```bash
cd ~/hackaton/camino_segurofront && git pull
cd ../camino_seguroback && git pull
cd ../camino_segurofront/deploy && docker compose up -d --build
```

### 4.5 Alternativa sin Docker (PaaS)

| Pieza | Servicio | Paso clave |
|---|---|---|
| Frontend | Netlify | Poner la URL completa de la API en `environment.ts`, correr `npm run build` y arrastrar `dist/ruta-segura/browser` (incluye `_redirects`) |
| API | Azure App Service (Linux, .NET 8) | Variables de entorno de la §3.4 y `Cors__AllowedOrigins__0` = URL de Netlify |
| Base de datos | Azure SQL Database | Firewall: «Permitir servicios de Azure» y la IP del equipo para SSMS |

---

## 5. Seguridad en la operación
- `deploy/.env` está en `.gitignore`. **Nunca se sube.**
- Las imágenes corren **sin root**: `nginx-unprivileged` y el usuario `app` de .NET.
- La base de datos no publica puertos. Para administrarla con SSMS se usa un túnel SSH: `ssh -L 1433:localhost:1433 ...` y se agrega temporalmente `ports: ["127.0.0.1:1433:1433"]` al servicio `db`.
- HTTPS (recomendado): poner un dominio y Caddy o Certbot delante del contenedor `web`. Mientras tanto, la geolocalización del navegador solo funciona en `localhost` o con HTTPS.

## 6. Solución de problemas

| Síntoma | Causa | Solución |
|---|---|---|
| `The Angular CLI requires a minimum Node.js version` | Node 24.14 o anterior | Instalar Node LTS (`winget install OpenJS.NodeJS.LTS`) y abrir una terminal nueva |
| `'Copy-Item' is not recognized` | Comando de PowerShell ejecutado en CMD | Usar los equivalentes de CMD (`xcopy`, `tar`) o abrir PowerShell |
| `npm error Missing script: "start"` | Se ejecutó fuera de la carpeta del proyecto | `cd camino_segurofront` |
| Error de CORS en la consola | Falta el origen en `Cors__AllowedOrigins` | Agregar la URL exacta del frontend, sin barra al final |
| 401 en todas las peticiones | La clave JWT cambió o el token expiró | Cerrar sesión y volver a ingresar; revisar que `Jwt__Key` sea la misma |
| `db` queda *unhealthy* | Poca RAM o contraseña débil | Mínimo 4 GB en la VM; contraseña con mayúscula, minúscula, número y símbolo |
| *multiple cascade paths* al crear la base | Dos FK con cascada hacia `Confirmaciones` | Ya resuelto: `DeleteBehavior.Restrict` en las llaves hacia `Usuarios` |
| 429 «Demasiados intentos» para todos | El *rate limiting* ve la IP de nginx | Ya resuelto con `UseForwardedHeaders` en `Program.cs` |
| `port 80 is already allocated` | Otro programa usa el puerto 80 | En `docker-compose.yml` cambiar `"80:8080"` por `"8081:8080"` |
| Mapa gris | Sin internet, o la CSP bloquea las teselas | Revisar `img-src` en `nginx.conf` |
| GPS no funciona en la nube | Se está usando HTTP | Configurar HTTPS o usar el selector de municipio |
