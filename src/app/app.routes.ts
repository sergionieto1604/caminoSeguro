import { Routes } from '@angular/router';
import { authGuard, invitadaGuard } from './core/auth.guard';

// Carga diferida (lazy) de cada página: la app inicial pesa menos y abre más rápido en celular.
export const routes: Routes = [
  { path: '', title: 'Ruta Segura · Zonas de riesgo', loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio) },
  { path: 'login', title: 'Ingresar · Ruta Segura', canActivate: [invitadaGuard], loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  { path: 'registro', title: 'Crear cuenta · Ruta Segura', canActivate: [invitadaGuard], loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro) },
  { path: 'reportar', title: 'Reportar · Ruta Segura', canActivate: [authGuard], loadComponent: () => import('./pages/reportar/reportar').then((m) => m.Reportar) },
  { path: 'reportar/:id', title: 'Editar reporte · Ruta Segura', canActivate: [authGuard], loadComponent: () => import('./pages/reportar/reportar').then((m) => m.Reportar) },
  { path: 'mis-reportes', title: 'Mis reportes · Ruta Segura', canActivate: [authGuard], loadComponent: () => import('./pages/mis-reportes/mis-reportes').then((m) => m.MisReportes) },
  { path: '**', redirectTo: '' },
];
