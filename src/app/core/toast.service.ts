import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  texto: string;
  tipo: 'ok' | 'error';
}

/** Mensajes cortos de confirmación o error (feedback inmediato = mejor UX). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private siguiente = 1;

  ok(texto: string): void {
    this.mostrar(texto, 'ok');
  }

  error(texto: string): void {
    this.mostrar(texto, 'error');
  }

  cerrar(id: number): void {
    this.toasts.update((l) => l.filter((t) => t.id !== id));
  }

  private mostrar(texto: string, tipo: Toast['tipo']): void {
    const id = this.siguiente++;
    this.toasts.update((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => this.cerrar(id), 4000);
  }
}
