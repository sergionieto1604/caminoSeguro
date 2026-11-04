import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Reporte } from '../../core/models';
import { ReporteCard } from '../../shared/reporte-card';

@Component({
  selector: 'app-mis-reportes',
  imports: [ReporteCard, RouterLink],
  template: `
    <a routerLink="/" class="volver">← Volver</a>
    <h1>Mis reportes</h1>
    <p class="sub">Solo tú puedes editar o borrar estos reportes.</p>

    <section class="lista">
      @if (cargando()) {
        <p>Cargando…</p>
      } @else {
        @for (r of reportes(); track r.id) {
          <app-reporte-card [reporte]="r" (editar)="editar($event)" (borrar)="borrar($event)"
                            (verEnMapa)="verEnMapa()" />
        } @empty {
          <div class="vacio">
            <p>Aún no has hecho reportes.</p>
            <a class="btn" routerLink="/reportar">Hacer mi primer reporte</a>
          </div>
        }
      }
    </section>
  `,
  styles: `
    :host { display: block; max-width: 680px; margin: 0 auto; }
    .volver { display: inline-block; min-height: 40px; line-height: 40px; color: var(--texto-suave); text-decoration: none; }
    h1 { margin: 0 0 4px; }
    .sub { margin: 0 0 16px; color: var(--texto-suave); }
    .lista { display: grid; gap: 12px; }
    .vacio { text-align: center; padding: 32px 16px; border: 1.5px dashed var(--borde-fuerte); border-radius: var(--radio); }
  `,
})
export class MisReportes implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly reportes = signal<Reporte[]>([]);
  readonly cargando = signal(true);

  ngOnInit(): void {
    this.api.misReportes().subscribe({
      next: (r) => {
        this.reportes.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.toast.error(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  editar(id: number): void {
    this.router.navigate(['/reportar', id]);
  }

  verEnMapa(): void {
    this.router.navigateByUrl('/');
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
}
