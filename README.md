# Camino Seguro — Frontend (Angular 22.2)

Aplicación web colaborativa para reportar y visibilizar puntos de riesgo nocturnos para mujeres en Cundinamarca.

## Correr en local
```bash
npm install
npm start            # http://localhost:4200
```
- Por defecto arranca en **modo demo** (`usarMock: true` en `src/environments/environment.development.ts`): funciona sin backend. Usuaria demo: `demo@demo.com` / `Demo1234`.
- Para usar la API real de .NET: poner `usarMock: false` y la URL de la API en `apiUrl`.

## Build y despliegue (Netlify)
1. Poner la URL de Azure en `src/environments/environment.ts` (`apiUrl`, termina en `/api`).
2. `npm run build`
3. Arrastrar la carpeta `dist/ruta-segura/browser` a https://app.netlify.com/drop
   (el archivo `_redirects` ya va incluido para que las rutas funcionen al recargar).
4. Pasarle la URL de Netlify al backend para `Cors__AllowedOrigins`.

## Docker (todo en una instancia)
```bash
cd deploy && cp .env.example .env   # editar secretos
docker compose up -d --build        # http://<IP>
```
Detalles en [docs/04-manual-tecnico.md](docs/04-manual-tecnico.md). Documentación completa en [docs/](docs/README.md).

## Estructura
```
src/app/
  core/    models.ts (contrato), api.service, auth.service, auth.interceptor,
           auth.guard, ubicacion.service, toast.service, mock-backend.interceptor
  shared/  mapa.ts (Leaflet + OpenStreetMap), reporte-card
  pages/   inicio, login, registro, reportar (crear/editar), mis-reportes
```

## Contrato que debe cumplir el backend (.NET)
JSON en camelCase (es el default de ASP.NET Core). Base: `/api`.

| Método | Ruta | Token | Body / Query | Respuesta |
|---|---|---|---|---|
| POST | /auth/registro | No | `{email, alias, password}` | 201 `AuthResponse` · 409 si el correo existe |
| POST | /auth/login | No | `{email, password}` | 200 `AuthResponse` · 401 |
| GET | /municipios | No | | `[{id, nombre, latitud, longitud}]` |
| GET | /categorias | No | | `[{id, nombre, colorHex}]` |
| GET | /reportes | No (si viene token, llenar `esMio` y `yaConfirme`) | `?lat&lng` **o** `?municipioRefId`, y `&categoriaId` opcional | `Reporte[]` ordenado por `distanciaKm` ascendente |
| GET | /reportes/{id} | No | | `Reporte` |
| GET | /reportes/mios | Sí | | `Reporte[]` |
| POST | /reportes | Sí | `ReporteRequest` | 201 `Reporte` |
| PUT | /reportes/{id} | Sí (dueña) | `ReporteRequest` | 200 `Reporte` · 403 |
| DELETE | /reportes/{id} | Sí (dueña) | | 204 · 403 |
| POST | /reportes/{id}/confirmaciones | Sí | | 204 · 400 si es propio |
| DELETE | /reportes/{id}/confirmaciones | Sí | | 204 |

```ts
AuthResponse   { token, expiraEn /* ISO UTC */, alias, email }

ReporteRequest { municipioId, categoriaId,
                 puntoReferencia /* 5-200 caracteres */,
                 descripcion     /* <= 500 o null */,
                 franjaHoraria   /* 'Tarde' | 'Noche' | 'Madrugada' | null */,
                 esAnonimo }

Reporte        { id, categoriaId, categoria, colorHex, municipioId, municipio,
                 puntoReferencia, descripcion, franjaHoraria, latitud, longitud,
                 fuenteCoordenadas /* 'Nominatim' | 'CentroMunicipio' */,
                 autor             /* alias o 'Anónima'. NUNCA el correo */,
                 confirmaciones, yaConfirme, esMio, esAnonimo,
                 distanciaKm       /* null si no hay punto de referencia */,
                 fechaCreacion }
```

- Errores: devolver `{ "message": "texto para la usuaria" }` o ProblemDetails de validación (`errors`). El frontend los muestra tal cual.
- CORS: permitir `http://localhost:4200` y la URL de Netlify.
- `GET /reportes` va con `[AllowAnonymous]`, pero si llega token se lee el usuario para calcular `esMio` y `yaConfirme`.

## Decisiones de seguridad en el frontend (para la sustentación)
- El token solo se envía a nuestra API (interceptor), nunca a OpenStreetMap ni a terceros.
- Cero `innerHTML`: Angular escapa todo y los popups de Leaflet se arman con `textContent` (anti-XSS).
- Si la API responde 401 se cierra la sesión; un token expirado se descarta al cargar la app.
- El parámetro `?volver=` del login solo acepta rutas internas (evita redirección abierta).
- La ubicación GPS se redondea a 3 decimales (~100 m) y no se guarda.
- Los guards de rutas son solo UX: la autorización real está en el backend con `[Authorize]`.
