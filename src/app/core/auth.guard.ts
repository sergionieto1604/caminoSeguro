import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Protege rutas que requieren sesión (reportar, mis reportes).
 * OJO para la sustentación: el guard es solo UX. La seguridad real está en el
 * backend con [Authorize]; el guard se puede saltar desde el navegador.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token()) return true;
  return router.createUrlTree(['/login'], { queryParams: { volver: state.url } });
};

/** Evita que una usuaria con sesión vea login/registro. */
export const invitadaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.token() ? router.createUrlTree(['/']) : true;
};
