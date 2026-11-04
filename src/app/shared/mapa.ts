import {
  Component, ElementRef, OnDestroy, afterNextRender, effect, input, output, viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { PuntoReferenciaUsuaria, Reporte } from '../core/models';

/** Centro aproximado de Cundinamarca, para cuando no hay referencia. */
const CENTRO_CUNDINAMARCA: L.LatLngTuple = [4.6, -74.2];

/**
 * Mapa con Leaflet + teselas de OpenStreetMap (API externa).
 * Marcadores circulares con el color de la categoría: no requieren imágenes.
 * SEGURIDAD (XSS): el contenido de los popups se arma con textContent,
 * nunca concatenando HTML con datos escritos por usuarias.
 */
@Component({
  selector: 'app-mapa',
  template: `<div #contenedor class="mapa" role="region" aria-label="Mapa de reportes"></div>`,
  styles: `
    :host { display: block; height: 100%; }
    .mapa { height: 100%; min-height: 320px; border-radius: var(--radio); overflow: hidden; }
  `,
})
export class Mapa implements OnDestroy {
  readonly reportes = input<Reporte[]>([]);
  readonly referencia = input<PuntoReferenciaUsuaria | null>(null);
  readonly seleccionado = input<number | null>(null);
  readonly seleccionar = output<number>();

  private contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private mapa?: L.Map;
  private capaReportes = L.layerGroup();
  private capaReferencia = L.layerGroup();
  private marcadores = new Map<number, L.CircleMarker>();
  private observador?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.mapa = L.map(this.contenedor().nativeElement, { zoomControl: true }).setView(CENTRO_CUNDINAMARCA, 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this.mapa);
      this.capaReferencia.addTo(this.mapa);
      this.capaReportes.addTo(this.mapa);
      // El mapa puede nacer oculto (pestaña "Lista" en celular): recalcular al mostrarse.
      this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
      this.observador.observe(this.contenedor().nativeElement);
      this.pintar();
    });

    effect(() => {
      this.reportes();
      this.referencia();
      this.pintar();
    });

    effect(() => {
      const id = this.seleccionado();
      const m = id != null ? this.marcadores.get(id) : undefined;
      if (m && this.mapa) {
        this.mapa.setView(m.getLatLng(), Math.max(this.mapa.getZoom(), 15));
        m.openPopup();
      }
    });
  }

  private pintar(): void {
    if (!this.mapa) return;
    this.capaReportes.clearLayers();
    this.capaReferencia.clearLayers();
    this.marcadores.clear();

    const puntos: L.LatLngTuple[] = [];
    for (const r of this.reportes()) {
      const m = L.circleMarker([r.latitud, r.longitud], {
        radius: 9,
        color: '#0b1022',
        weight: 2,
        fillColor: r.colorHex,
        fillOpacity: 0.95,
      });
      m.bindPopup(() => this.popup(r));
      m.on('click', () => this.seleccionar.emit(r.id));
      m.addTo(this.capaReportes);
      this.marcadores.set(r.id, m);
      puntos.push([r.latitud, r.longitud]);
    }

    const ref = this.referencia();
    if (ref) {
      L.circleMarker([ref.lat, ref.lng], {
        radius: 7, color: '#ffffff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1,
      })
        .bindTooltip(ref.etiqueta)
        .addTo(this.capaReferencia);
      puntos.push([ref.lat, ref.lng]);
    }

    if (puntos.length > 1) this.mapa.fitBounds(L.latLngBounds(puntos), { padding: [30, 30], maxZoom: 15 });
    else if (puntos.length === 1) this.mapa.setView(puntos[0], 14);
  }

  private popup(r: Reporte): HTMLElement {
    const caja = document.createElement('div');
    caja.className = 'popup-reporte';
    const cat = document.createElement('strong');
    cat.textContent = r.categoria;
    cat.style.color = r.colorHex;
    const lugar = document.createElement('div');
    lugar.textContent = `${r.puntoReferencia} · ${r.municipio}`;
    caja.append(cat, lugar);
    if (r.descripcion) {
      const d = document.createElement('p');
      d.textContent = r.descripcion;
      caja.append(d);
    }
    if (r.fuenteCoordenadas === 'CentroMunicipio') {
      const aviso = document.createElement('small');
      aviso.textContent = 'Ubicación aproximada (centro del municipio)';
      caja.append(aviso);
    }
    return caja;
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.mapa?.remove();
  }
}
