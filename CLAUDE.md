# ED Indumentaria — Convenciones

## Stack
- Backend: Node CommonJS + Express 5 + Prisma 7 (JS, sin TS). El esquema se versiona con
  **Prisma Migrate**: los cambios se hacen con `npx prisma migrate dev --name <descripcion>`
  desde `backend/`, NUNCA editando la base a mano. El deploy aplica lo pendiente con
  `npx prisma migrate deploy`.
- Los triggers y funciones plpgsql viven como SQL crudo dentro de las migraciones
  (`prisma/migrations/0_init/migration.sql`); Prisma no los modela y no los toca.
- `prisma migrate dev` puede ofrecer RESETEAR la base: solo se corre en desarrollo.
  Contra producción va únicamente `migrate deploy`.
- Frontend: React 19 + TypeScript + Vite + Tailwind v4 (clases inline) + Headless UI.
  Sin librerías nuevas sin justificación.
- Identificadores y textos en español. Componentes PascalCase, hooks `useCosa`, resto camelCase.

## Backend
- Todas las llamadas a la API deben verificar si el usuario está loggeado antes de realizarse.
- `index.js` es solo bootstrap (health → auth → requireAuth → routers). No agregar rutas ahí.
- Nueva ruta: archivo en `routes/<dominio>.js` con `express.Router`, handlers envueltos en
  `asyncHandler(fn, 'mensaje de error 500')` de `lib/http.js`. Errores esperados:
  `throw new HttpError(status, body)`.
- IDs de params: `parseId()` / `parseIds()`. Unicidad de nombres: `assertNombreUnico()`.
  Errores de Prisma (P2002/P2003/P2025): el mapa `errores` de `asyncHandler`
  (todo en `lib/validaciones.js` y `lib/http.js`).
- Los ABMs (grupos/subgrupos/clientes/lineas) son routers explícitos con esos helpers:
  se descartó un factory genérico porque los cuatro desvían en validaciones reales
  (filtros, campos extra, chequeos de padre). No introducir un factory con flags.
- Lógica de negocio (precios, remitos, impresión) va en `services/`, nunca en el handler.
- Constantes compartidas con el frontend: un JSON por dominio en `shared/`
  (`ventas.json`, `agrupaciones.json`, `barcode.json`) es la única fuente. CJS las lee vía
  `constants/<dominio>.js`; el frontend vía `types.ts`. Nunca duplicar el valor literal.

## Frontend
- Los precios (En efectivo y con otros métodos de pago) deben SIEMPRE estar formateados utilizando
  la funcion formatearPesos de `src/utils/formato.ts` excepto cuando se esté editando un campo de precio.
- El frontend importa del backend SOLO `@backend/types`. Prohibido importar
  `backend/generated/**` y prohibido `fetch()` fuera de `src/api/cliente.ts`.
- Llamadas HTTP: función en `src/api/<recurso>.ts` usando `request<T>`. Lanzan `ApiError`;
  el llamador maneja el error.
- Estructura: páginas y sus modales viven en `features/<feature>/` (articulos, ventas,
  configuracion, auth); lo compartido en `components/` (`ui/`, `layout/`, `tabla/`),
  `hooks/`, `api/`, `types/`, `utils/`.
- Nuevo modal: en `features/<feature>/modales/`, siempre sobre `components/ui/BaseModal`.
  Convención de apertura: `abierto: boolean` + payload como prop separada.
  Acciones async con `useAccionAsync`; confirmación demorada con `useCuentaRegresiva`.
- Nueva columna de tabla: agregar una `ColumnaTabla<T>` en el `columnas.tsx` de la feature.
  El motor (`useTablaFiltrable`) y la grilla (`DataGrid`) no se modifican para casos puntuales.
- Asociaciones muchos-a-muchos de un artículo: usar `EditRelacionesModal` con un objeto
  de textos + funciones de api, no crear un modal nuevo por entidad.
- Tipos compartidos en `src/types/` ({id, nombre} = `Opcion`). Los tipos de dominio no viven
  dentro de componentes.
- Compartido entre features → `components/`, `hooks/`, `utils/`. De una sola feature → dentro
  de la feature. Ante la duda, dejarlo en la feature (extraer recién con el segundo uso).
- No cambiar comportamiento al refactorizar. Bug encontrado = se documenta y se pregunta;
  no se arregla en silencio.
- Priorizar la claridad visual y simpleza de uso para todas las partes de la pagina ya que
  esta no será utilizada por un cliente técnico.
- Los colores principales de la página son violeta (violet en tailwind) y amarillo (amber 
  en tailwind). Utilizar estos colores para botones, hovers, borders, etc.
- El desarrollo debe ser enfocado en uso en resoluciones de pantalla altas (PC) pero los
  elementos de la página deben adaptarse a resoluciones más pequeñas (Celular).
- Al crear una nueva pagina se debe crear un botón en la sidebar para acceder a esta.

## General
- ¡IMPORTANTE! La aplicación está siendo hosteada en una maquina de Ubuntu en la web.
- Aplicar buenas practicas de seguridad al manejar funcionalidades bloqueadas por el rol del usuario.
- Priorizar la reusabilidad en el desarrollo del codigo.

## Migración a DonWeb: zona horaria (PENDIENTE)
- ANTES de facturar nada en el servidor nuevo, fijar la zona horaria de la base:
  `ALTER DATABASE <base> SET TimeZone = 'America/Buenos_Aires';` y verificar con `SHOW TimeZone;`.
  La base actual ya está en `America/Buenos_Aires`; el default de Postgres en un server
  limpio suele ser UTC.
- Por qué: con la base en UTC, todo lo que se sella con la fecha del servidor se corre un día
  para las operaciones posteriores a las 21:00 hora argentina. Afecta a `REMITOS.fecha_de_creacion`
  (default `now()`), al trigger `trg_fecha_de_emision`, y sobre todo a `REMITOS.cod_mes`
  (default `EXTRACT(month FROM now())`), que entra en el código visible del remito: un remito
  del 31 a la noche quedaría numerado en el mes siguiente.
- Vale para cualquier `now()` / `CURRENT_DATE` que se agregue en la base. En código JS usar
  fechas del servidor de Node tiene el mismo problema: ahí el que manda es el TZ del SO.


