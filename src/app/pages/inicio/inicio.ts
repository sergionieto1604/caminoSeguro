import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { UbicacionService } from '../../core/ubicacion.service';
import { Reporte } from '../../core/models';
import { Mapa } from '../../shared/mapa';
import { ReporteCard } from '../../shared/reporte-card';

@Component({
  selector: 'app-inicio',
  imports: [Mapa, ReporteCard, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly ubicacion = inject(UbicacionService);

  readonly categorias = toSignal(this.api.categorias$, { initialValue: [] });
  readonly municipios = toSignal(this.api.municipios$, { initialValue: [] });

  readonly categoriaId = signal<number | null>(null);
  readonly vista = signal<'lista' | 'mapa'>('lista');
  readonly seleccionado = signal<number | null>(null);
  readonly reportes = signal<Reporte[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly conteo = computed(() => {
    const n = this.reportes().length;
    return n === 1 ? '1 reporte' : `${n} reportes`;
  });

  constructor() {
    // Si la usuaria ya había elegido municipio en otra visita, se usa de una vez.
    effect(() => {
      const lista = this.municipios();
      if (!lista.length || untracked(this.ubicacion.punto)) return;
      const guardado = this.ubicacion.municipioGuardado();
      const m = lista.find((x) => x.id === guardado);
      if (m) untracked(() => this.ubicacion.usarMunicipio(m));
    });

    // Cada vez que cambia el punto de referencia o el filtro, se recarga la lista.
    effect(() => {
      const punto = this.ubicacion.punto();
      const categoriaId = this.categoriaId();
      untracked(() => this.cargar(punto?.lat, punto?.lng, punto?.municipioId, categoriaId));
    });
  }

  cargar(lat?: number, lng?: number, municipioRefId?: number, categoriaId?: number | null): void {
    this.cargando.set(true);
    this.error.set(null);
    const gps = this.ubicacion.punto()?.tipo === 'gps';
    this.api
      .reportes({
        lat: gps ? lat : undefined,
        lng: gps ? lng : undefined,
        municipioRefId: gps ? undefined : municipioRefId,
        categoriaId: categoriaId ?? undefined,
      })
      .subscribe({
        next: (r) => {
          this.reportes.set(r);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No pudimos cargar los reportes.'));
          this.cargando.set(false);
        },
      });
  }

  reintentar(): void {
    const p = this.ubicacion.punto();
    this.cargar(p?.lat, p?.lng, p?.municipioId, this.categoriaId());
  }

  elegirMunicipio(valor: string): void {
    const m = this.municipios().find((x) => x.id === Number(valor));
    if (m) this.ubicacion.usarMunicipio(m);
  }

  async usarGps(): Promise<void> {
    const ok = await this.ubicacion.usarGps();
    if (ok) this.toast.ok('Ordenando por cercanía a tu ubicación.');
  }

  filtrar(id: number | null): void {
    this.categoriaId.set(this.categoriaId() === id ? null : id);
  }

  verEnMapa(id: number): void {
    this.vista.set('mapa');
    // Espera a que el mapa sea visible en celular antes de centrar.
    this.seleccionado.set(null);
    setTimeout(() => this.seleccionado.set(id), 50);
  }

  enfocarEnLista(id: number): void {
    this.seleccionado.set(id);
    document.getElementById(`reporte-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  confirmar(r: Reporte): void {
    if (!this.auth.token()) {
      this.toast.error('Inicia sesión para confirmar reportes.');
      this.router.navigate(['/login'], { queryParams: { volver: '/' } });
      return;
    }
    // Actualización optimista: se ve el cambio de inmediato y se revierte si falla.
    const antes = r.yaConfirme;
    this.actualizarLocal(r.id, { yaConfirme: !antes, confirmaciones: r.confirmaciones + (antes ? -1 : 1) });
    const peticion = antes ? this.api.quitarConfirmacion(r.id) : this.api.confirmar(r.id);
    peticion.subscribe({
      error: (e) => {
        this.actualizarLocal(r.id, { yaConfirme: antes, confirmaciones: r.confirmaciones });
        this.toast.error(mensajeError(e));
      },
    });
  }

  editar(id: number): void {
    this.router.navigate(['/reportar', id]);
  }

  borrar(id: number): void {
    if (!confirm('¿Borrar este reporte? Esta acción no se puede deshacer.')) return;
    this.api.borrar(id).subscribe({
      next: () => {
        this.reportes.update((l) => l.filter((x) => x.id !== id));
        this.toast.ok('Reporte borrado.');
      },
      error: (e) => this.toast.error(mensajeError(e)),
    });
  }

  private actualizarLocal(id: number, cambios: Partial<Reporte>): void {
    this.reportes.update((l) => l.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
  }
}
