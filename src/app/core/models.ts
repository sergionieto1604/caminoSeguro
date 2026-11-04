// Contrato con la API de .NET. Si el backend cambia un nombre, se cambia aquí.

export interface AuthResponse {
  token: string;
  expiraEn: string; // ISO 8601 (UTC)
  alias: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegistroRequest {
  email: string;
  alias: string;
  password: string;
}

export interface Municipio {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
}

export interface Categoria {
  id: number;
  nombre: string;
  colorHex: string;
}

export type FranjaHoraria = 'Tarde' | 'Noche' | 'Madrugada';

export interface Reporte {
  id: number;
  categoriaId: number;
  categoria: string;
  colorHex: string;
  municipioId: number;
  municipio: string;
  puntoReferencia: string;
  descripcion: string | null;
  franjaHoraria: FranjaHoraria | null;
  latitud: number;
  longitud: number;
  fuenteCoordenadas: 'Nominatim' | 'CentroMunicipio';
  autor: string; // alias o "Anónima". Nunca el correo.
  confirmaciones: number;
  yaConfirme: boolean;
  esMio: boolean;
  esAnonimo: boolean;
  distanciaKm: number | null;
  fechaCreacion: string;
}

export interface ReporteRequest {
  municipioId: number;
  categoriaId: number;
  puntoReferencia: string;
  descripcion: string | null;
  franjaHoraria: FranjaHoraria | null;
  esAnonimo: boolean;
}

export interface FiltroReportes {
  lat?: number;
  lng?: number;
  municipioRefId?: number;
  categoriaId?: number;
}

/** Punto desde el que se mide la cercanía. */
export interface PuntoReferenciaUsuaria {
  tipo: 'gps' | 'municipio';
  lat: number;
  lng: number;
  municipioId?: number;
  etiqueta: string;
}
