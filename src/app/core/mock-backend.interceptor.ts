import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, Municipio, Reporte, ReporteRequest } from './models';

/**
 * BACKEND FALSO (solo desarrollo, environment.usarMock = true).
 * Permite trabajar el frontend mientras la API de .NET está lista.
 * Imita el contrato real: mismas rutas, mismos JSON, mismos códigos HTTP.
 * Los datos viven en memoria y se pierden al recargar.
 */

const municipios: Municipio[] = [
  { id: 1, nombre: 'Fusagasugá', latitud: 4.3365, longitud: -74.3638 },
  { id: 2, nombre: 'Soacha', latitud: 4.5794, longitud: -74.2168 },
  { id: 3, nombre: 'Girardot', latitud: 4.3032, longitud: -74.8037 },
  { id: 4, nombre: 'Zipaquirá', latitud: 5.0221, longitud: -73.993 },
  { id: 5, nombre: 'Facatativá', latitud: 4.8137, longitud: -74.3545 },
  { id: 6, nombre: 'Chía', latitud: 4.8616, longitud: -74.0326 },
  { id: 7, nombre: 'Silvania', latitud: 4.4036, longitud: -74.388 },
  { id: 8, nombre: 'Mosquera', latitud: 4.7059, longitud: -74.2302 },
];

const categorias: Categoria[] = [
  { id: 1, nombre: 'Acoso', colorHex: '#f0506e' },
  { id: 2, nombre: 'Iluminación deficiente', colorHex: '#f2c14e' },
  { id: 3, nombre: 'Zona desolada', colorHex: '#9b8cff' },
  { id: 4, nombre: 'Otro', colorHex: '#4fc3b5' },
];

interface UsuariaMock { id: number; email: string; alias: string; password: string; }
interface ReporteMock extends Omit<Reporte, 'yaConfirme' | 'esMio' | 'distanciaKm' | 'autor' | 'confirmaciones'> {
  usuarioId: number;
  confirmadoPor: number[];
}

const usuarias: UsuariaMock[] = [
  { id: 1, email: 'demo@demo.com', alias: 'Laura', password: 'Demo1234' },
];

let idReporte = 1;
const reportes: ReporteMock[] = [];

function sembrar(usuarioId: number, munId: number, catId: number, ref: string, desc: string | null,
                 franja: Reporte['franjaHoraria'], dLat: number, dLng: number, anon: boolean, conf: number[]): void {
  const m = municipios.find((x) => x.id === munId)!;
  const c = categorias.find((x) => x.id === catId)!;
  reportes.push({
    id: idReporte++, usuarioId, categoriaId: c.id, categoria: c.nombre, colorHex: c.colorHex,
    municipioId: m.id, municipio: m.nombre, puntoReferencia: ref, descripcion: desc, franjaHoraria: franja,
    latitud: m.latitud + dLat, longitud: m.longitud + dLng, fuenteCoordenadas: 'Nominatim', esAnonimo: anon,
    fechaCreacion: new Date(Date.now() - Math.random() * 6 * 86400_000).toISOString(), confirmadoPor: conf,
  });
}
sembrar(1, 1, 2, 'Parque principal, costado sur', 'Varias lámparas apagadas desde hace semanas.', 'Noche', 0.001, 0.002, true, [2, 3]);
sembrar(2, 1, 1, 'Salida de la universidad, puerta 2', 'Hombres en moto molestan a las estudiantes al salir.', 'Noche', 0.004, -0.003, true, [1, 3, 4]);
sembrar(3, 7, 3, 'Vía al Boquerón, después del puente', null, 'Madrugada', 0.002, 0.004, false, []);
sembrar(2, 2, 1, 'Paradero de TransMilenio San Mateo', 'Acoso verbal frecuente en la fila.', 'Tarde', -0.002, 0.003, true, [1]);
sembrar(3, 3, 2, 'Malecón del río, tramo norte', 'Muy oscuro después de las 7 p. m.', 'Noche', 0.003, 0.001, false, [2]);
sembrar(2, 6, 3, 'Ciclorruta hacia la Universidad de La Sabana', 'Tramo sin casas ni comercio.', 'Noche', 0.01, 0.005, true, []);

const RADIO_TIERRA_KM = 6371;
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(a));
}

function aDto(r: ReporteMock, usuarioId: number | null, lat?: number, lng?: number): Reporte {
  const autora = usuarias.find((u) => u.id === r.usuarioId);
  const { usuarioId: _u, confirmadoPor, ...resto } = r;
  return {
    ...resto,
    autor: r.esAnonimo ? 'Anónima' : (autora?.alias ?? 'Usuaria'),
    confirmaciones: confirmadoPor.length,
    yaConfirme: usuarioId != null && confirmadoPor.includes(usuarioId),
    esMio: usuarioId === r.usuarioId,
    distanciaKm: lat != null && lng != null ? Math.round(haversine(lat, lng, r.latitud, r.longitud) * 10) / 10 : null,
  };
}

function ok<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status, body })).pipe(delay(350));
}
function fallo(status: number, message: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { message } })).pipe(delay(350));
}

function sesionDe(req: HttpRequest<unknown>): number | null {
  const h = req.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  // Formato del token falso: mock-<idUsuaria>-<aleatorio>. Sobrevive a recargar la página.
  const m = h.slice(7).match(/^mock-(\d+)-/);
  return m ? Number(m[1]) : null;
}

function emitirToken(u: UsuariaMock) {
  const token = `mock-${u.id}-${Math.random().toString(36).slice(2)}`;
  return { token, expiraEn: new Date(Date.now() + 2 * 3600_000).toISOString(), alias: u.alias, email: u.email };
}

function validar(b: ReporteRequest): string | null {
  if (!municipios.some((m) => m.id === b.municipioId)) return 'Elige un municipio válido.';
  if (!categorias.some((c) => c.id === b.categoriaId)) return 'Elige una categoría válida.';
  const ref = b.puntoReferencia?.trim() ?? '';
  if (ref.length < 5 || ref.length > 200) return 'El punto de referencia debe tener entre 5 y 200 caracteres.';
  if ((b.descripcion?.length ?? 0) > 500) return 'La descripción no puede pasar de 500 caracteres.';
  return null;
}

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.usarMock || !req.url.startsWith(environment.apiUrl)) return next(req);

  const ruta = req.url.slice(environment.apiUrl.length).split('?')[0];
  const metodo = req.method;
  const yo = sesionDe(req);

  // ---- Auth ----
  if (ruta === '/auth/login' && metodo === 'POST') {
    const b = req.body as { email: string; password: string };
    const u = usuarias.find((x) => x.email === b.email.trim().toLowerCase() && x.password === b.password);
    return u ? ok(emitirToken(u)) : fallo(401, 'Credenciales inválidas.');
  }
  if (ruta === '/auth/registro' && metodo === 'POST') {
    const b = req.body as { email: string; alias: string; password: string };
    const email = b.email.trim().toLowerCase();
    if (usuarias.some((x) => x.email === email)) return fallo(409, 'Ya existe una cuenta con ese correo.');
    const u: UsuariaMock = { id: usuarias.length + 10, email, alias: b.alias.trim() || 'Usuaria', password: b.password };
    usuarias.push(u);
    return ok(emitirToken(u), 201);
  }

  // ---- Catálogos ----
  if (ruta === '/municipios' && metodo === 'GET') return ok(municipios);
  if (ruta === '/categorias' && metodo === 'GET') return ok(categorias);

  // ---- Reportes ----
  if (ruta === '/reportes' && metodo === 'GET') {
    const p = req.params;
    let lat = p.has('lat') ? Number(p.get('lat')) : undefined;
    let lng = p.has('lng') ? Number(p.get('lng')) : undefined;
    const ref = municipios.find((m) => m.id === Number(p.get('municipioRefId')));
    if ((lat == null || lng == null) && ref) { lat = ref.latitud; lng = ref.longitud; }
    const cat = p.has('categoriaId') ? Number(p.get('categoriaId')) : null;
    const lista = reportes
      .filter((r) => cat == null || r.categoriaId === cat)
      .map((r) => aDto(r, yo, lat, lng))
      .sort((a, b) => (a.distanciaKm ?? 0) - (b.distanciaKm ?? 0) || b.fechaCreacion.localeCompare(a.fechaCreacion));
    return ok(lista);
  }
  if (ruta === '/reportes/mios' && metodo === 'GET') {
    if (yo == null) return fallo(401, 'Sesión requerida.');
    return ok(reportes.filter((r) => r.usuarioId === yo).map((r) => aDto(r, yo)));
  }
  if (ruta === '/reportes' && metodo === 'POST') {
    if (yo == null) return fallo(401, 'Sesión requerida.');
    const b = req.body as ReporteRequest;
    const error = validar(b);
    if (error) return fallo(400, error);
    const m = municipios.find((x) => x.id === b.municipioId)!;
    const c = categorias.find((x) => x.id === b.categoriaId)!;
    const nuevo: ReporteMock = {
      id: idReporte++, usuarioId: yo, categoriaId: c.id, categoria: c.nombre, colorHex: c.colorHex,
      municipioId: m.id, municipio: m.nombre, puntoReferencia: b.puntoReferencia.trim(),
      descripcion: b.descripcion?.trim() || null, franjaHoraria: b.franjaHoraria, esAnonimo: b.esAnonimo,
      latitud: m.latitud + (Math.random() - 0.5) * 0.01, longitud: m.longitud + (Math.random() - 0.5) * 0.01,
      fuenteCoordenadas: Math.random() > 0.3 ? 'Nominatim' : 'CentroMunicipio',
      fechaCreacion: new Date().toISOString(), confirmadoPor: [],
    };
    reportes.push(nuevo);
    return ok(aDto(nuevo, yo), 201);
  }

  const conId = ruta.match(/^\/reportes\/(\d+)(\/confirmaciones)?$/);
  if (conId) {
    const r = reportes.find((x) => x.id === Number(conId[1]));
    if (!r) return fallo(404, 'Reporte no encontrado.');
    const esConfirmacion = !!conId[2];

    if (!esConfirmacion && metodo === 'GET') return ok(aDto(r, yo));
    if (yo == null) return fallo(401, 'Sesión requerida.');

    if (esConfirmacion && metodo === 'POST') {
      if (r.usuarioId === yo) return fallo(400, 'No puedes confirmar tu propio reporte.');
      if (!r.confirmadoPor.includes(yo)) r.confirmadoPor.push(yo);
      return ok(null, 204);
    }
    if (esConfirmacion && metodo === 'DELETE') {
      r.confirmadoPor = r.confirmadoPor.filter((x) => x !== yo);
      return ok(null, 204);
    }
    if (r.usuarioId !== yo) return fallo(403, 'Solo puedes modificar tus propios reportes.');
    if (metodo === 'PUT') {
      const b = req.body as ReporteRequest;
      const error = validar(b);
      if (error) return fallo(400, error);
      const m = municipios.find((x) => x.id === b.municipioId)!;
      const c = categorias.find((x) => x.id === b.categoriaId)!;
      Object.assign(r, {
        municipioId: m.id, municipio: m.nombre, categoriaId: c.id, categoria: c.nombre, colorHex: c.colorHex,
        puntoReferencia: b.puntoReferencia.trim(), descripcion: b.descripcion?.trim() || null,
        franjaHoraria: b.franjaHoraria, esAnonimo: b.esAnonimo,
      });
      return ok(aDto(r, yo));
    }
    if (metodo === 'DELETE') {
      reportes.splice(reportes.indexOf(r), 1);
      return ok(null, 204);
    }
  }

  return fallo(404, `Ruta simulada no existe: ${metodo} ${ruta}`);
};
