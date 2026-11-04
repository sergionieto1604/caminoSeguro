import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, FiltroReportes, Municipio, Reporte, ReporteRequest } from './models';

/** Acceso a los endpoints de la API (la "V" de MVC consume el "C" por HTTP). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // Catálogos: casi nunca cambian, se piden una vez y se reutilizan.
  readonly municipios$: Observable<Municipio[]> = this.http
    .get<Municipio[]>(`${this.base}/municipios`)
    .pipe(shareReplay(1));

  readonly categorias$: Observable<Categoria[]> = this.http
    .get<Categoria[]>(`${this.base}/categorias`)
    .pipe(shareReplay(1));

  reportes(f: FiltroReportes): Observable<Reporte[]> {
    let params = new HttpParams();
    if (f.lat != null && f.lng != null) {
      // Redondeo a ~100 m: suficiente para ordenar y no expone la ubicación exacta.
      params = params.set('lat', f.lat.toFixed(3)).set('lng', f.lng.toFixed(3));
    }
    if (f.municipioRefId) params = params.set('municipioRefId', f.municipioRefId);
    if (f.categoriaId) params = params.set('categoriaId', f.categoriaId);
    return this.http.get<Reporte[]>(`${this.base}/reportes`, { params });
  }

  reporte(id: number): Observable<Reporte> {
    return this.http.get<Reporte>(`${this.base}/reportes/${id}`);
  }

  misReportes(): Observable<Reporte[]> {
    return this.http.get<Reporte[]>(`${this.base}/reportes/mios`);
  }

  crear(r: ReporteRequest): Observable<Reporte> {
    return this.http.post<Reporte>(`${this.base}/reportes`, r);
  }

  editar(id: number, r: ReporteRequest): Observable<Reporte> {
    return this.http.put<Reporte>(`${this.base}/reportes/${id}`, r);
  }

  borrar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/reportes/${id}`);
  }

  confirmar(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/reportes/${id}/confirmaciones`, {});
  }

  quitarConfirmacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/reportes/${id}/confirmaciones`);
  }
}

/** Convierte un error HTTP en un mensaje entendible para la usuaria. */
export function mensajeError(err: unknown, porDefecto = 'Algo salió mal. Intenta de nuevo.'): string {
  if (!(err instanceof HttpErrorResponse)) return porDefecto;
  if (err.status === 0) return 'No hay conexión con el servidor. Revisa tu internet.';
  if (err.status === 429) return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
  if (err.status === 403) return 'No tienes permiso para hacer esto.';
  if (err.status === 404) return 'No encontramos lo que buscabas.';
  const cuerpo = err.error as { message?: string; title?: string; errors?: Record<string, string[]> } | null;
  if (cuerpo?.errors) {
    const primero = Object.values(cuerpo.errors)[0]?.[0];
    if (primero) return primero;
  }
  return cuerpo?.message ?? cuerpo?.title ?? porDefecto;
}
