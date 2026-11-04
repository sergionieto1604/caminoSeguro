import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="panel-auth">
      <h1>Inicia sesión</h1>
      <p class="sub">Para reportar y confirmar puntos de riesgo.</p>

      @if (expirada) {
        <p class="alerta" role="status">Tu sesión expiró. Vuelve a ingresar.</p>
      }
      @if (mock) {
        <p class="alerta info">Modo demo: usa <strong>demo&#64;demo.com</strong> / <strong>Demo1234</strong></p>
      }

      <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <label for="email">Correo</label>
        <input id="email" type="email" formControlName="email" autocomplete="email" inputmode="email"
               [attr.aria-invalid]="invalido('email')" />
        @if (invalido('email')) { <small class="err">Escribe un correo válido.</small> }

        <label for="password">Contraseña</label>
        <div class="con-boton">
          <input id="password" [type]="ver() ? 'text' : 'password'" formControlName="password"
                 autocomplete="current-password" [attr.aria-invalid]="invalido('password')" />
          <button type="button" class="btn-txt" (click)="ver.set(!ver())"
                  [attr.aria-label]="ver() ? 'Ocultar contraseña' : 'Mostrar contraseña'">{{ ver() ? 'Ocultar' : 'Ver' }}</button>
        </div>
        @if (invalido('password')) { <small class="err">Escribe tu contraseña.</small> }

        @if (error()) { <p class="alerta" role="alert">{{ error() }}</p> }

        <button class="btn bloque" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>

      <p class="pie">¿No tienes cuenta? <a routerLink="/registro" [queryParams]="{ volver }">Regístrate</a></p>
    </section>
  `,
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private ruta = inject(ActivatedRoute);

  readonly mock = environment.usarMock;
  readonly expirada = this.ruta.snapshot.queryParamMap.has('expirada');
  /** Solo se acepta una ruta interna ("/..."), para evitar redirecciones abiertas a otros sitios. */
  readonly volver = (() => {
    const v = this.ruta.snapshot.queryParamMap.get('volver') ?? '/';
    return v.startsWith('/') && !v.startsWith('//') ? v : '/';
  })();

  readonly ver = signal(false);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.required, Validators.maxLength(100)]],
  });

  invalido(campo: 'email' | 'password'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email.trim().toLowerCase(), password }).subscribe({
      next: (r) => {
        this.toast.ok(`Hola, ${r.alias}.`);
        this.router.navigateByUrl(this.volver);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'Correo o contraseña incorrectos.'));
        this.enviando.set(false);
      },
    });
  }
}
