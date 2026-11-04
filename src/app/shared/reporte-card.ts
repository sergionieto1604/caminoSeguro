import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Reporte } from '../core/models';

/** Tarjeta de un reporte. Todo el texto se interpola con {{ }} (Angular lo escapa: sin XSS). */
@Component({
  selector: 'app-reporte-card',
  imports: [DecimalPipe],
  template: `
    @let r = reporte();
    <article class="card" [class.activa]="activa()" [style.--cat]="r.colorHex">
      <header>
        <span class="cat">{{ r.categoria }}</span>
        @if (r.distanciaKm != null) {
          <span class="dist" [attr.aria-label]="'A ' + r.distanciaKm + ' kilómetros'">
            {{ r.distanciaKm < 1 ? (r.distanciaKm * 1000 | number: '1.0-0') + ' m' : (r.distanciaKm | number: '1.0-1') + ' km' }}
          </span>
        }
      </header>

      <h3>{{ r.puntoReferencia }}</h3>
      <p class="meta">
        {{ r.municipio }}
        @if (r.franjaHoraria) { · {{ r.franjaHoraria }} }
        · {{ hace() }}
        @if (r.fuenteCoordenadas === 'CentroMunicipio') { · <span title="No encontramos el punto exacto">ubicación aprox.</span> }
      </p>
      @if (r.descripcion) {
        <p class="desc">{{ r.descripcion }}</p>
      }

      <footer>
        <span class="autor">{{ r.esMio ? 'Tu reporte' : r.autor }}</span>
        <div class="acciones">
          <button type="button" class="btn-txt" (click)="verEnMapa.emit(r.id)" aria-label="Ver en el mapa">📍 Mapa</button>
          @if (r.esMio) {
            <button type="button" class="btn-txt" (click)="editar.emit(r.id)">Editar</button>
            <button type="button" class="btn-txt peligro" (click)="borrar.emit(r.id)">Borrar</button>
          } @else {
            <button type="button" class="confirmar" [class.on]="r.yaConfirme" [attr.aria-pressed]="r.yaConfirme"
                    (click)="confirmar.emit(r)">
              {{ r.yaConfirme ? '✓ Me pasó' : 'A mí también' }} · {{ r.confirmaciones }}
            </button>
          }
        </div>
      </footer>
    </article>
  `,
  styleUrl: './reporte-card.scss',
})
export class ReporteCard {
  readonly reporte = input.required<Reporte>();
  readonly activa = input(false);
  readonly confirmar = output<Reporte>();
  readonly editar = output<number>();
  readonly borrar = output<number>();
  readonly verEnMapa = output<number>();

  readonly hace = computed(() => {
    const min = Math.max(0, (Date.now() - new Date(this.reporte().fechaCreacion).getTime()) / 60000);
    if (min < 60) return `hace ${Math.max(1, Math.round(min))} min`;
    const h = min / 60;
    if (h < 24) return `hace ${Math.round(h)} h`;
    const d = Math.round(h / 24);
    return d === 1 ? 'ayer' : `hace ${d} días`;
  });
}
