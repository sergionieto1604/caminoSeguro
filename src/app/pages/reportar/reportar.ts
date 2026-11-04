import { Component, computed, inject, input, numberAttribute, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { UbicacionService } from '../../core/ubicacion.service';
import { FranjaHoraria, ReporteRequest } from '../../core/models';

@Component({
  selector: 'app-reportar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reportar.html',
  styleUrl: './reportar.scss',
})
export class Reportar implements OnInit {
  /** Viene de la ruta /reportar/:id (modo edición). withComponentInputBinding lo llena. */
  readonly id = input(undefined, { transform: numberAttribute });

  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private ubicacion = inject(UbicacionService);

  readonly municipios = toSignal(this.api.municipios$, { initialValue: [] });
  readonly categorias = toSignal(this.api.categorias$, { initialValue: [] });
  readonly franjas: FranjaHoraria[] = ['Tarde', 'Noche', 'Madrugada'];

  readonly editando = computed(() => !Number.isNaN(this.id() ?? NaN));
  readonly enviando = signal(false);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    municipioId: this.fb.control<number | null>(null, Validators.required),
    puntoReferencia: this.fb.nonNullable.control('', [
      Validators.required, Validators.minLength(5), Validators.maxLength(200),
    ]),
    categoriaId: this.fb.control<number | null>(null, Validators.required),
    franjaHoraria: this.fb.control<FranjaHoraria | null>('Noche'),
    descripcion: this.fb.nonNullable.control('', Validators.maxLength(500)),
    esAnonimo: this.fb.nonNullable.control(true),
  });

  readonly largoDescripcion = toSignal(this.form.controls.descripcion.valueChanges, { initialValue: '' });

  ngOnInit(): void {
    const id = this.id();
    if (id != null && !Number.isNaN(id)) {
      this.cargando.set(true);
      this.api.reporte(id).subscribe({
        next: (r) => {
          if (!r.esMio) {
            this.toast.error('Solo puedes editar tus propios reportes.');
            this.router.navigateByUrl('/');
            return;
          }
          this.form.setValue({
            municipioId: r.municipioId,
            puntoReferencia: r.puntoReferencia,
            categoriaId: r.categoriaId,
            franjaHoraria: r.franjaHoraria,
            descripcion: r.descripcion ?? '',
            esAnonimo: r.esAnonimo,
          });
          this.cargando.set(false);
        },
        error: (e) => {
          this.toast.error(mensajeError(e));
          this.router.navigateByUrl('/');
        },
      });
    } else {
      // Preselecciona el municipio que la usuaria eligió como referencia.
      const m = this.ubicacion.punto()?.municipioId ?? this.ubicacion.municipioGuardado();
      if (m) this.form.controls.municipioId.setValue(m);
    }
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  elegirFranja(f: FranjaHoraria): void {
    const c = this.form.controls.franjaHoraria;
    c.setValue(c.value === f ? null : f);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Lleva el foco al primer campo con error (accesibilidad en celular).
      setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }
    const v = this.form.getRawValue();
    const datos: ReporteRequest = {
      municipioId: Number(v.municipioId),
      categoriaId: Number(v.categoriaId),
      puntoReferencia: v.puntoReferencia.trim(),
      descripcion: v.descripcion.trim() || null,
      franjaHoraria: v.franjaHoraria,
      esAnonimo: v.esAnonimo,
    };
    this.enviando.set(true);
    this.error.set(null);
    const id = this.id();
    const peticion = this.editando() && id != null ? this.api.editar(id, datos) : this.api.crear(datos);
    peticion.subscribe({
      next: (r) => {
        this.toast.ok(
          r.fuenteCoordenadas === 'CentroMunicipio'
            ? 'Reporte guardado. No encontramos el punto exacto: se ubicó en el centro del municipio.'
            : this.editando() ? 'Reporte actualizado.' : 'Reporte publicado. Gracias por cuidar a otras.',
        );
        this.router.navigateByUrl('/');
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No pudimos guardar el reporte.'));
        this.enviando.set(false);
      },
    });
  }
}
