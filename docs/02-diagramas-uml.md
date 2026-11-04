# Camino Seguro — Diagramas UML

**Anexo A del documento de arquitectura** · Hackatón, ciclo de Profundización · 4 de noviembre de 2026
Equipo: Yeison Hernández · Alejandro Martínez · Alejandro Nieto

Todos los diagramas están escritos como código Mermaid. GitHub los muestra dibujados al abrir este archivo. Para exportarlos como imagen se puede usar https://mermaid.live.

| # | Diagrama | Tipo UML | Vista (IEEE 42010) |
|---|---|---|---|
| 1 | Casos de uso | Comportamiento | Funcional |
| 2 | Modelo de dominio | Estructura (clases) | Lógica |
| 3 | Clases del backend por capas (MVC) | Estructura (clases) | Lógica |
| 4 | Clases del frontend | Estructura (clases) | Lógica |
| 5 | Secuencia: iniciar sesión | Interacción | Procesos |
| 6 | Secuencia: crear reporte con geocodificación | Interacción | Procesos |
| 7 | Secuencia: listar reportes por cercanía | Interacción | Procesos |
| 8 | Actividad: reportar un punto de riesgo | Comportamiento | Procesos |
| 9 | Estados: sesión de la usuaria | Comportamiento | Procesos |
| 10 | Componentes | Estructura | Desarrollo |
| 11 | Despliegue | Estructura | Física |
| 12 | Entidad-relación | Datos | Información |

---

## 1. Casos de uso

Mermaid no tiene un tipo propio para casos de uso. Se representan con un diagrama de flujo: los actores van a los lados y los casos de uso, con forma de óvalo, dentro del límite del sistema. Las flechas punteadas indican relaciones `«include»` y `«extend»`.

```mermaid
flowchart LR
    V(["👤 Visitante"])
    U(["👩 Usuaria autenticada"])
    N(["🌐 Nominatim<br/>(OpenStreetMap)"])
    T(["🗺️ Servidor de teselas<br/>(OpenStreetMap)"])

    subgraph SIS["Sistema Camino Seguro"]
        direction TB
        CU01(["CU01 Registrarse"])
        CU02(["CU02 Iniciar sesión"])
        CU03(["CU03 Consultar reportes<br/>ordenados por cercanía"])
        CU04(["CU04 Filtrar por tipo de riesgo"])
        CU05(["CU05 Ver mapa de reportes"])
        CU06(["CU06 Crear reporte"])
        CU07(["CU07 Editar reporte propio"])
        CU08(["CU08 Borrar reporte propio"])
        CU09(["CU09 Confirmar reporte<br/>«a mí también me pasó»"])
        CU10(["CU10 Ver mis reportes"])
        CU11(["CU11 Cerrar sesión"])
        CU12(["CU12 Geocodificar<br/>punto de referencia"])
        CU13(["CU13 Usar ubicación GPS<br/>como referencia"])
    end

    V --- CU01
    V --- CU02
    V --- CU03
    V --- CU04
    V --- CU05
    U -. "hereda de" .-> V
    U --- CU06
    U --- CU07
    U --- CU08
    U --- CU09
    U --- CU10
    U --- CU11

    CU06 -. "«include»" .-> CU12
    CU07 -. "«include»" .-> CU12
    CU13 -. "«extend»" .-> CU03
    CU04 -. "«extend»" .-> CU03
    CU12 --- N
    CU05 --- T

    classDef actor fill:#fff4ee,stroke:#ff8a5b,stroke-width:2px,color:#3a1a0a
    classDef cu fill:#eef1ff,stroke:#5b6bd6,stroke-width:1.5px,color:#151a3a
    classDef ext fill:#f2f2f2,stroke:#888,stroke-dasharray:4 3,color:#333
    class V,U actor
    class N,T ext
    class CU01,CU02,CU03,CU04,CU05,CU06,CU07,CU08,CU09,CU10,CU11,CU12,CU13 cu
```

### Especificación resumida de los casos de uso

| ID | Nombre | Actor | Precondición | Flujo principal | Postcondición |
|---|---|---|---|---|---|
| CU01 | Registrarse | Visitante | No tiene cuenta | Ingresa alias, correo y contraseña (mínimo 8 caracteres, con letras y números) y acepta la Ley 1581 | Cuenta creada y sesión iniciada con JWT |
| CU02 | Iniciar sesión | Visitante | Tiene cuenta | Ingresa correo y contraseña; el sistema valida con BCrypt | Recibe un JWT válido por 2 h |
| CU03 | Consultar reportes | Visitante | — | Elige un municipio o su GPS; el sistema calcula la distancia con Haversine | Lista ordenada de menor a mayor distancia |
| CU04 | Filtrar por tipo | Visitante | Lista cargada | Toca una categoría | Solo se ven los reportes de esa categoría |
| CU05 | Ver mapa | Visitante | Lista cargada | Cambia a la pestaña Mapa | Puntos de colores por categoría |
| CU06 | Crear reporte | Usuaria | Sesión activa | Elige categoría, municipio y punto de referencia; detalles opcionales | Reporte guardado con coordenadas |
| CU07 | Editar reporte | Usuaria | Ser la autora | Modifica los campos | Reporte actualizado (403 si no es la autora) |
| CU08 | Borrar reporte | Usuaria | Ser la autora | Confirma el borrado | Reporte y sus confirmaciones eliminados |
| CU09 | Confirmar reporte | Usuaria | Sesión activa y no ser la autora | Toca «A mí también» | Contador +1; una sola vez por usuaria |
| CU10 | Mis reportes | Usuaria | Sesión activa | Abre «Mis reportes» | Lista de sus reportes |
| CU11 | Cerrar sesión | Usuaria | Sesión activa | Toca «Salir» | Token eliminado del navegador |
| CU12 | Geocodificar | Sistema | CU06 o CU07 | Consulta Nominatim; si no hay resultado, usa el centro del municipio | Coordenadas y fuente guardadas |
| CU13 | Usar GPS | Visitante | Navegador con permiso de ubicación | Acepta el permiso | Referencia redondeada a unos 100 m, sin guardarse |

---

## 2. Modelo de dominio

```mermaid
classDiagram
    direction LR
    class Usuario {
        +int Id
        +string Email
        +string Alias
        +string PasswordHash
        +DateTime FechaRegistro
    }
    class Municipio {
        +int Id
        +string Nombre
        +string CodigoDane
        +double Latitud
        +double Longitud
    }
    class Categoria {
        +int Id
        +string Nombre
        +string ColorHex
    }
    class Reporte {
        +int Id
        +int UsuarioId
        +int MunicipioId
        +int CategoriaId
        +string PuntoReferencia
        +string? Descripcion
        +FranjaHoraria? FranjaHoraria
        +double Latitud
        +double Longitud
        +FuenteCoordenadas Fuente
        +bool EsAnonimo
        +DateTime FechaCreacion
        +DateTime? FechaActualizacion
        +EsDe(int usuarioId) bool
    }
    class Confirmacion {
        +int Id
        +int ReporteId
        +int UsuarioId
        +DateTime Fecha
    }
    class FranjaHoraria {
        <<enumeration>>
        Tarde
        Noche
        Madrugada
    }
    class FuenteCoordenadas {
        <<enumeration>>
        Nominatim
        CentroMunicipio
    }

    Usuario "1" --> "0..*" Reporte : crea
    Usuario "1" --> "0..*" Confirmacion : hace
    Reporte "1" *-- "0..*" Confirmacion : recibe
    Municipio "1" <-- "0..*" Reporte : ubicado en
    Categoria "1" <-- "0..*" Reporte : clasificado como
    Reporte ..> FranjaHoraria
    Reporte ..> FuenteCoordenadas
```

---

## 3. Clases del backend por capas (MVC + servicios)

**Model** = entidades y DTOs · **Controller** = controladores de la API · **View** = la SPA de Angular, que consume JSON (diagrama 4). La capa de servicios mantiene los controladores delgados.

```mermaid
classDiagram
    direction TB

    namespace Controllers {
        class AuthController {
            +Registro(RegistroDto) ActionResult~AuthResponseDto~
            +Login(LoginDto) ActionResult~AuthResponseDto~
        }
        class ReportesController {
            +Listar(lat, lng, municipioRefId, categoriaId) ActionResult~List~ReporteDto~~
            +Obtener(int id) ActionResult~ReporteDto~
            +Mios() ActionResult~List~ReporteDto~~
            +Crear(ReporteRequestDto) ActionResult~ReporteDto~
            +Editar(int id, ReporteRequestDto) ActionResult~ReporteDto~
            +Borrar(int id) IActionResult
            +Confirmar(int id) IActionResult
            +QuitarConfirmacion(int id) IActionResult
        }
        class MunicipiosController {
            +Listar() ActionResult~List~MunicipioDto~~
        }
        class CategoriasController {
            +Listar() ActionResult~List~CategoriaDto~~
        }
    }

    namespace Services {
        class IReporteService {
            <<interface>>
            +ListarAsync(FiltroReportes, int? usuarioId) Task~List~ReporteDto~~
            +CrearAsync(ReporteRequestDto, int usuarioId) Task~ReporteDto~
            +EditarAsync(int id, ReporteRequestDto, int usuarioId) Task~ReporteDto~
            +BorrarAsync(int id, int usuarioId) Task
        }
        class ReporteService
        class IGeocodingService {
            <<interface>>
            +GeocodificarAsync(string referencia, Municipio m) Task~Coordenadas?~
        }
        class NominatimGeocodingService {
            -HttpClient http
            -string userAgent
        }
        class ITokenService {
            <<interface>>
            +Generar(Usuario u) AuthResponseDto
        }
        class TokenService {
            -JwtOptions opciones
        }
        class Distancia {
            <<static>>
            +HaversineKm(lat1, lng1, lat2, lng2) double
        }
    }

    namespace Data {
        class AppDbContext {
            +DbSet~Usuario~ Usuarios
            +DbSet~Reporte~ Reportes
            +DbSet~Municipio~ Municipios
            +DbSet~Categoria~ Categorias
            +DbSet~Confirmacion~ Confirmaciones
            #OnModelCreating(ModelBuilder)
        }
    }

    namespace Dtos {
        class ReporteDto {
            +int Id
            +string Categoria
            +string ColorHex
            +string Municipio
            +string PuntoReferencia
            +double Latitud
            +double Longitud
            +string Autor
            +int Confirmaciones
            +bool YaConfirme
            +bool EsMio
            +double? DistanciaKm
        }
        class ReporteRequestDto {
            +int MunicipioId
            +int CategoriaId
            +string PuntoReferencia
            +string? Descripcion
            +FranjaHoraria? FranjaHoraria
            +bool EsAnonimo
        }
        class AuthResponseDto {
            +string Token
            +DateTime ExpiraEn
            +string Alias
            +string Email
        }
    }

    ReporteService ..|> IReporteService
    NominatimGeocodingService ..|> IGeocodingService
    TokenService ..|> ITokenService
    ReportesController --> IReporteService
    AuthController --> ITokenService
    AuthController --> AppDbContext
    MunicipiosController --> AppDbContext
    CategoriasController --> AppDbContext
    ReporteService --> AppDbContext
    ReporteService --> IGeocodingService
    ReporteService ..> Distancia
    ReporteService ..> ReporteDto : produce
    ReportesController ..> ReporteRequestDto : recibe
```

---

## 4. Clases del frontend (Angular)

```mermaid
classDiagram
    direction LR

    class Inicio {
        +categorias Signal~Categoria[]~
        +reportes Signal~Reporte[]~
        +categoriaId Signal~number~
        +vista Signal~lista|mapa~
        +cargar()
        +filtrar(id)
        +confirmar(r)
        +borrar(id)
    }
    class Reportar {
        +id input~number~
        +form FormGroup
        +enviar()
    }
    class Login {
        +form FormGroup
        +enviar()
    }
    class Registro {
        +form FormGroup
        +enviar()
    }
    class MisReportes {
        +reportes Signal~Reporte[]~
    }
    class Mapa {
        +reportes input~Reporte[]~
        +referencia input~PuntoReferenciaUsuaria~
        +seleccionar output~number~
        -pintar()
        -popup(r) HTMLElement
    }
    class ReporteCard {
        +reporte input~Reporte~
        +confirmar output
        +editar output
        +borrar output
    }
    class ApiService {
        +municipios$ Observable
        +categorias$ Observable
        +reportes(filtro) Observable
        +crear(req) Observable
        +editar(id, req) Observable
        +borrar(id) Observable
        +confirmar(id) Observable
    }
    class AuthService {
        -sesion Signal~Sesion~
        +autenticada Signal~boolean~
        +login(datos) Observable
        +registro(datos) Observable
        +logout()
        +token() string
    }
    class UbicacionService {
        +punto Signal~PuntoReferenciaUsuaria~
        +usarGps() Promise~boolean~
        +usarMunicipio(m)
    }
    class authInterceptor {
        <<HttpInterceptorFn>>
    }
    class authGuard {
        <<CanActivateFn>>
    }
    class mockBackendInterceptor {
        <<HttpInterceptorFn · solo desarrollo>>
    }

    Inicio *-- Mapa
    Inicio *-- ReporteCard
    MisReportes *-- ReporteCard
    Inicio --> ApiService
    Inicio --> UbicacionService
    Inicio --> AuthService
    Reportar --> ApiService
    MisReportes --> ApiService
    Login --> AuthService
    Registro --> AuthService
    authInterceptor --> AuthService
    authGuard --> AuthService
    ApiService ..> authInterceptor : HttpClient pasa por
```

---

## 5. Secuencia: iniciar sesión (JWT)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuaria
    participant FE as Angular (Login)
    participant INT as authInterceptor
    participant API as AuthController
    participant DB as SQL Server

    U->>FE: Correo y contraseña
    FE->>FE: Validación del formulario
    FE->>INT: POST /api/auth/login
    INT->>API: (sin token)
    API->>API: Rate limiting (máx. intentos/minuto)
    API->>DB: SELECT Usuario WHERE Email = @email
    DB-->>API: Usuario o null
    alt Usuario existe y BCrypt.Verify(password, hash)
        API->>API: TokenService.Generar() · HS256 · exp 2 h
        API-->>FE: 200 {token, expiraEn, alias, email}
        FE->>FE: Guarda la sesión y redirige
        FE-->>U: «Hola, alias»
    else Credenciales inválidas
        API-->>FE: 401 «Credenciales inválidas»
        FE-->>U: Mensaje genérico (no revela si el correo existe)
    end
```

---

## 6. Secuencia: crear reporte con geocodificación y respaldo

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuaria
    participant FE as Angular (Reportar)
    participant INT as authInterceptor
    participant C as ReportesController
    participant S as ReporteService
    participant G as NominatimGeocodingService
    participant OSM as Nominatim (OSM)
    participant DB as SQL Server

    U->>FE: Categoría, municipio, punto de referencia
    FE->>INT: POST /api/reportes
    INT->>C: Authorization: Bearer JWT
    C->>C: [Authorize] valida firma, emisor y expiración
    C->>C: Validación del DTO (longitudes, ids)
    C->>S: CrearAsync(dto, usuarioId del claim sub)
    S->>DB: Buscar Municipio y Categoria
    S->>G: GeocodificarAsync("ref, municipio, Cundinamarca")
    G->>OSM: GET /search?q=...&countrycodes=co&limit=1 (User-Agent propio, timeout 5 s)
    alt Nominatim encuentra el lugar
        OSM-->>G: [{lat, lon}]
        G-->>S: Coordenadas (fuente = Nominatim)
    else Sin resultados, error o timeout
        OSM-->>G: [] / error
        G-->>S: null
        S->>S: Usar centro del municipio (fuente = CentroMunicipio)
    end
    S->>DB: INSERT Reporte (consulta parametrizada por EF Core)
    DB-->>S: Id
    S-->>C: ReporteDto (sin correo ni UsuarioId)
    C-->>FE: 201 Created
    FE-->>U: «Reporte publicado» y vuelve a la lista
```

---

## 7. Secuencia: listar reportes por cercanía (Haversine)

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitante
    participant FE as Angular (Inicio)
    participant GEO as Navegador (Geolocation API)
    participant C as ReportesController
    participant S as ReporteService
    participant DB as SQL Server
    participant T as Teselas OSM

    alt Elige «Usar mi ubicación»
        V->>FE: Toca el botón
        FE->>GEO: getCurrentPosition()
        GEO-->>FE: lat, lng
        FE->>FE: Redondeo a 3 decimales (~100 m)
    else Elige un municipio
        V->>FE: Selecciona el municipio
    end
    FE->>C: GET /api/reportes?lat&lng | municipioRefId [&categoriaId]
    C->>S: ListarAsync(filtro, usuarioId?)
    S->>DB: SELECT reportes WHERE categoria = @cat (con municipio y categoría)
    DB-->>S: Filas
    S->>S: distancia = Haversine(ref, reporte) y ordenar ascendente
    S-->>C: ReporteDto[]
    C-->>FE: 200 JSON
    par Lista
        FE->>FE: Pinta las tarjetas (distancia en m/km)
    and Mapa
        FE->>T: Pide las imágenes del mapa
        T-->>FE: Teselas
        FE->>FE: Leaflet dibuja un círculo por reporte
    end
```

---

## 8. Actividad: reportar un punto de riesgo

```mermaid
flowchart TD
    A([Inicio]) --> B{¿Tiene sesión<br/>vigente?}
    B -- No --> C[Ir a Iniciar sesión]
    C --> D{¿Tiene cuenta?}
    D -- No --> E[Registrarse]
    D -- Sí --> F[Ingresar credenciales]
    E --> G
    F --> G[Abrir formulario «Reportar»]
    B -- Sí --> G
    G --> H[Elegir categoría de riesgo]
    H --> I[Elegir municipio]
    I --> J[Escribir punto de referencia]
    J --> K[/Opcional: franja horaria,<br/>descripción, anónima/]
    K --> L{¿Formulario<br/>válido?}
    L -- No --> M[Mostrar errores y<br/>enfocar el primer campo] --> H
    L -- Sí --> N[Enviar al backend]
    N --> O{¿Respuesta?}
    O -- 401 --> C
    O -- 400 --> M
    O -- 201 --> P{¿Fuente de<br/>coordenadas?}
    P -- Nominatim --> Q[«Reporte publicado»]
    P -- CentroMunicipio --> R[«Guardado con<br/>ubicación aproximada»]
    Q --> S([Ver el reporte en la lista y el mapa])
    R --> S

    classDef ok fill:#e8fff4,stroke:#1f9d63,color:#073b25
    classDef err fill:#ffe8ec,stroke:#d9435b,color:#5c0a1c
    class Q,R,S ok
    class M err
```

---

## 9. Estados: sesión de la usuaria

```mermaid
stateDiagram-v2
    [*] --> Visitante
    Visitante --> Autenticando : enviar login / registro
    Autenticando --> Autenticada : 200 / 201 (JWT recibido)
    Autenticando --> Visitante : 401 / 409 / error
    Autenticada --> Autenticada : petición con Bearer JWT
    Autenticada --> Expirada : pasan 2 h
    Autenticada --> Visitante : cerrar sesión
    Expirada --> Visitante : la API responde 401 o la app detecta exp
    Visitante --> [*]

    note right of Autenticada
        El token solo se envía
        a la API propia (interceptor).
    end note
```

---

## 10. Componentes

```mermaid
flowchart LR
    subgraph NAV["Navegador (celular o PC)"]
        direction TB
        subgraph SPA["SPA Angular 22 — VISTA"]
            P["Páginas<br/>Inicio · Reportar · Login<br/>Registro · Mis reportes"]
            SH["Componentes compartidos<br/>Mapa (Leaflet) · ReporteCard"]
            SV["Servicios<br/>ApiService · AuthService<br/>UbicacionService · ToastService"]
            IN["Interceptores y guards<br/>authInterceptor · authGuard"]
        end
    end

    subgraph BE["API ASP.NET Core 10"]
        direction TB
        CT["CONTROLADORES<br/>Auth · Reportes · Municipios · Categorias"]
        SR["Servicios<br/>ReporteService · TokenService<br/>NominatimGeocodingService"]
        MD["MODELO<br/>Entidades + DTOs"]
        EF["EF Core · AppDbContext"]
    end

    DB[("SQL Server")]
    NOM["Nominatim<br/>(geocodificación)"]
    TIL["Teselas OSM<br/>(mapa)"]

    P --> SH
    P --> SV
    SV --> IN
    IN -- "HTTPS · JSON · JWT" --> CT
    CT --> SR
    SR --> MD
    SR --> EF
    EF --> DB
    SR -- "HTTPS" --> NOM
    SH -- "HTTPS (imágenes)" --> TIL

    classDef vista fill:#fff4ee,stroke:#ff8a5b,color:#3a1a0a
    classDef ctrl fill:#eef1ff,stroke:#5b6bd6,color:#151a3a
    classDef model fill:#e8fff4,stroke:#1f9d63,color:#073b25
    classDef ext fill:#f2f2f2,stroke:#888,stroke-dasharray:4 3,color:#333
    class P,SH,SV,IN vista
    class CT,SR ctrl
    class MD,EF model
    class NOM,TIL ext
```

---

## 11. Despliegue (Docker en una instancia)

```mermaid
flowchart TB
    U["📱 Navegador de la usuaria"]

    subgraph VM["Instancia en la nube (Linux + Docker Compose)"]
        direction TB
        subgraph RED["Red interna de Docker"]
            WEB["Contenedor web<br/>nginx-unprivileged<br/>Angular compilado<br/>puerto 8080"]
            API["Contenedor api<br/>ASP.NET Core 10<br/>usuario app · puerto 8080"]
            DB[("Contenedor db<br/>SQL Server 2022 Express<br/>puerto 1433")]
            VOL[["Volumen sqldata"]]
        end
    end

    OSM["Teselas OSM"]
    NOM["Nominatim"]

    U -- "HTTP(S) :80 → web:8080" --> WEB
    WEB -- "/api/* (proxy inverso)" --> API
    API -- "TDS 1433 (solo red interna)" --> DB
    DB --- VOL
    U -- "imágenes del mapa" --> OSM
    API -- "geocodificación" --> NOM

    classDef pub fill:#fff4ee,stroke:#ff8a5b,color:#3a1a0a
    classDef priv fill:#eef1ff,stroke:#5b6bd6,color:#151a3a
    classDef ext fill:#f2f2f2,stroke:#888,stroke-dasharray:4 3,color:#333
    class WEB pub
    class API,DB,VOL priv
    class OSM,NOM ext
```

Solo el contenedor `web` publica un puerto hacia internet. La API y la base de datos solo son accesibles dentro de la red interna de Docker.

---

## 12. Entidad-relación (SQL Server)

```mermaid
erDiagram
    USUARIOS ||--o{ REPORTES : "crea"
    USUARIOS ||--o{ CONFIRMACIONES : "hace"
    REPORTES ||--o{ CONFIRMACIONES : "recibe (cascada)"
    MUNICIPIOS ||--o{ REPORTES : "ubica"
    CATEGORIAS ||--o{ REPORTES : "clasifica"

    USUARIOS {
        int Id PK
        nvarchar150 Email UK "minúsculas"
        nvarchar40 Alias
        nvarchar100 PasswordHash "BCrypt"
        datetime2 FechaRegistro "UTC"
    }
    MUNICIPIOS {
        int Id PK
        nvarchar80 Nombre
        nvarchar5 CodigoDane
        float Latitud
        float Longitud
    }
    CATEGORIAS {
        int Id PK
        nvarchar50 Nombre
        nvarchar7 ColorHex
    }
    REPORTES {
        int Id PK
        int UsuarioId FK
        int MunicipioId FK "índice"
        int CategoriaId FK "índice"
        nvarchar200 PuntoReferencia
        nvarchar500 Descripcion "nullable"
        nvarchar20 FranjaHoraria "nullable"
        float Latitud
        float Longitud
        nvarchar20 FuenteCoordenadas
        bit EsAnonimo
        datetime2 FechaCreacion
        datetime2 FechaActualizacion "nullable"
    }
    CONFIRMACIONES {
        int Id PK
        int ReporteId FK "ON DELETE CASCADE"
        int UsuarioId FK "ON DELETE NO ACTION"
        datetime2 Fecha
    }
```

**Restricción única:** `CONFIRMACIONES (ReporteId, UsuarioId)`, para que nadie confirme dos veces el mismo reporte.
**Nota técnica:** `UsuarioId` en `CONFIRMACIONES` usa `NO ACTION`. Si las dos llaves foráneas tuvieran cascada, SQL Server rechazaría la migración por *multiple cascade paths*.
