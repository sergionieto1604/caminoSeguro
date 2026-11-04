import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth = inject(AuthService);
  readonly toast = inject(ToastService);
  readonly mock = environment.usarMock;
  readonly menuAbierto = signal(false);

  salir(): void {
    this.menuAbierto.set(false);
    this.auth.logout();
    this.toast.ok('Sesión cerrada.');
  }
}
