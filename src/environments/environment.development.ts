// Desarrollo (ng serve).
// usarMock = true  -> la app funciona sin backend (datos falsos en memoria).
// usarMock = false -> usa la API real de .NET en apiUrl.
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7001/api',
  usarMock: true,
};
