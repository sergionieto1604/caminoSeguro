import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';

/** Mínimo 8 caracteres, con al menos una letra y un número (igual que valida el backend). */
function claveSegura(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '');
  return /[A-Za-z]/.test(v) && /\d/.test(v) && v.length >= 8 ? null : { debil: true };
}

function coinciden(g: AbstractControl): ValidationErrors | null {
  return g.get('password')?.value === g.get('confirmar')?.value ? null : { noCoinciden: true };
}

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="panel-auth">
      <h1>Crea tu cuenta</h1>
      <p class="sub">Tu correo nunca se muestra a otras usuarias.</p>

      <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <label for="alias">Alias <span class="opcional">(cómo te verán si no reportas anónima)</span></label>
        <input id="alias" formControlName="alias" autocomplete="nickname" maxlength="40"
               placeholder="Ej: Caminante Fusa" [attr.aria-invalid]="invalido('alias')" />
        @if (invalido('alias')) { <small class="err">Entre 2 y 40 caracteres. No uses tu nombre completo.</small> }

        <label for="email">Correo</label>
        <input id="email" type="email" formControlName="email" autocomplete="email" inputmode="email"
               [attr.aria-invalid]="invalido('email')" />
        @if (invalido('email')) { <small class="err">Escribe un correo válido.</small> }

        <label for="password">Contraseña</label>
        <input id="password" type="password" formControlName="password" autocomplete="new-password"
               [attr.aria-invalid]="invalido('password')" aria-describedby="ayudaClave" />
        <small id="ayudaClave" [class.err]="invalido('password')">Mínimo 8 caracteres, con letras y números.</small>

        <label for="confirmar">Repite la contraseña</label>
        <input id="confirmar" type="password" formControlName="confirmar" autocomplete="new-password"
               [attr.aria-invalid]="form.hasError('noCoinciden') && form.controls.confirmar.touched" />
        @if (form.hasError('noCoinciden') && form.controls.confirmar.touched) {
          <small class="err">Las contraseñas no coinciden.</small>
        }

        <label class="check">
          <input type="checkbox" formControlName="acepta" />
          <span>Acepto el tratamiento de mis datos (Ley 1581 de 2012). Solo guardamos correo, alias y mis reportes.</span>
        </label>
        @if (invalido('acepta')) { <small class="err">Debes aceptar para continuar.</small> }

        @if (error()) { <p class="alerta" role="alert">{{ error() }}</p> }

        <button class="btn bloque" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>
      </form>

      <p class="pie">¿Ya tienes cuenta? <a routerLink="/login" [queryParams]="{ volver }">Inicia sesión</a></p>
    </section>
  `,
})
export class Registro {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private ruta = inject(ActivatedRoute);

  readonly volver = (() => {
    const v = this.ruta.snapshot.queryParamMap.get('volver') ?? '/';
    return v.startsWith('/') && !v.startsWith('//') ? v : '/';
  })();

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      alias: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      password: ['', [Validators.required, Validators.maxLength(100), claveSegura]],
      confirmar: ['', [Validators.required]],
      acepta: [false, [Validators.requiredTrue]],
    },
    { validators: coinciden },
  );

  invalido(campo: 'alias' | 'email' | 'password' | 'acepta'): boolean {
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
    const { alias, email, password } = this.form.getRawValue();
    this.auth.registro({ alias: alias.trim(), email: email.trim().toLowerCase(), password }).subscribe({
      next: () => {
        this.toast.ok('Cuenta creada. ¡Bienvenida!');
        this.router.navigateByUrl(this.volver);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No pudimos crear la cuenta.'));
        this.enviando.set(false);
      },
    });
  }
}
