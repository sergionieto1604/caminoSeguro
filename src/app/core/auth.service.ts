import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegistroRequest } from './models';

const CLAVE = 'rs_sesion';

interface Sesion {
  token: string;
  expiraEn: string;
  alias: string;
}

/**
 * Maneja el JWT en el cliente.
 * Decisión: se guarda en localStorage por simplicidad (hackatón).
 * Riesgo: si hubiera XSS, se podría leer el token. Mitigación: Angular escapa todo
 * por defecto, no usamos innerHTML y el token expira en 2 h.
 * Trabajo futuro: cookie HttpOnly + SameSite.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private sesion = signal<Sesion | null>(this.leer());

  readonly autenticada = computed(() => this.sesion() !== null);
  readonly alias = computed(() => this.sesion()?.alias ?? '');

  login(datos: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, datos)
      .pipe(tap((r) => this.guardar(r)));
  }

  registro(datos: RegistroRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/registro`, datos)
      .pipe(tap((r) => this.guardar(r)));
  }

  logout(redirigir = true): void {
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      /* almacenamiento no disponible */
    }
    this.sesion.set(null);
    if (redirigir) this.router.navigateByUrl('/');
  }

  /** Devuelve el token solo si sigue vigente. */
  token(): string | null {
    const s = this.sesion();
    if (!s) return null;
    if (new Date(s.expiraEn).getTime() <= Date.now()) {
      this.logout(false);
      return null;
    }
    return s.token;
  }

  private guardar(r: AuthResponse): void {
    const s: Sesion = { token: r.token, expiraEn: r.expiraEn, alias: r.alias };
    try {
      localStorage.setItem(CLAVE, JSON.stringify(s));
    } catch {
      /* si falla, la sesión vive solo en memoria */
    }
    this.sesion.set(s);
  }

  private leer(): Sesion | null {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return null;
      const s = JSON.parse(crudo) as Sesion;
      if (!s.token || new Date(s.expiraEn).getTime() <= Date.now()) {
        localStorage.removeItem(CLAVE);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }
}
