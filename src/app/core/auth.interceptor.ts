import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Pone "Authorization: Bearer <token>" SOLO en peticiones a nuestra API.
 * Así el token nunca se envía a terceros (tiles de OpenStreetMap, etc.).
 * Si la API responde 401, se cierra la sesión y se manda al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const esNuestraApi = req.url.startsWith(environment.apiUrl);
  const token = esNuestraApi ? auth.token() : null;

  const peticion = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && esNuestraApi && token) {
        auth.logout(false);
        router.navigate(['/login'], { queryParams: { expirada: 1 } });
      }
      return throwError(() => err);
    }),
  );
};
