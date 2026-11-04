import { Injectable, signal } from '@angular/core';
import { Municipio, PuntoReferenciaUsuaria } from './models';

const CLAVE_MUNICIPIO = 'rs_municipio_ref';

/**
 * Define desde dónde se mide la cercanía.
 * - GPS del navegador (con permiso explícito). Nunca se guarda ni se envía exacto.
 * - O un municipio elegido manualmente (se recuerda en este navegador).
 */
@Injectable({ providedIn: 'root' })
export class UbicacionService {
  readonly punto = signal<PuntoReferenciaUsuaria | null>(null);
  readonly buscando = signal(false);
  readonly error = signal<string | null>(null);

  municipioGuardado(): number | null {
    try {
      const v = localStorage.getItem(CLAVE_MUNICIPIO);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  }

  usarMunicipio(m: Municipio): void {
    try {
      localStorage.setItem(CLAVE_MUNICIPIO, String(m.id));
    } catch {
      /* ignorar */
    }
    this.error.set(null);
    this.punto.set({ tipo: 'municipio', lat: m.latitud, lng: m.longitud, municipioId: m.id, etiqueta: m.nombre });
  }

  usarGps(): Promise<boolean> {
    if (!('geolocation' in navigator)) {
      this.error.set('Tu navegador no permite obtener la ubicación. Elige un municipio.');
      return Promise.resolve(false);
    }
    this.buscando.set(true);
    this.error.set(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.buscando.set(false);
          this.punto.set({
            tipo: 'gps',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            etiqueta: 'Tu ubicación actual',
          });
          resolve(true);
        },
        (err) => {
          this.buscando.set(false);
          this.error.set(
            err.code === err.PERMISSION_DENIED
              ? 'No diste permiso de ubicación. Elige tu municipio para ordenar por cercanía.'
              : 'No pudimos obtener tu ubicación. Elige tu municipio.',
          );
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
      );
    });
  }
}
