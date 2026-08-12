/**
 * Unico lugar del frontend donde se llama a fetch().
 * Cada recurso expone sus funciones en su propio modulo (api/articulos.ts, etc.)
 * usando request<T>. Las funciones LANZAN ApiError; el llamador decide como
 * mostrar el error (banner, alert, silencio), igual que antes de la refactor.
 */

type CuerpoError = { message?: string; details?: string } | null;

export class ApiError extends Error {
  readonly status: number;
  /** Body JSON de la respuesta de error ({ message, details? }) o null si no era JSON. */
  readonly datos: CuerpoError;
  /** Atajo a datos.details (los sitios que mostraban details-primero lo usan). */
  readonly details?: string;

  constructor(status: number, datos: CuerpoError) {
    super(datos?.message || datos?.details || `Error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.datos = datos;
    this.details = datos?.details;
  }
}

/**
 * Extraccion "details primero" que usaban algunos modales
 * (`errorData.details || errorData.message`): ante un error de Prisma/500
 * muestran el detalle tecnico en vez del mensaje de la ruta.
 */
export const mensajeDetallesPrimero = (err: unknown, fallback = 'Error desconocido') => {
  if (err instanceof ApiError) return err.details || err.message;
  return err instanceof Error ? err.message : fallback;
};

type OpcionesRequest = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Se serializa como JSON y agrega el Content-Type automaticamente. */
  cuerpo?: unknown;
};

export async function request<T>(ruta: string, opciones: OpcionesRequest = {}): Promise<T> {
  const { metodo = 'GET', cuerpo } = opciones;

  const respuesta = await fetch(ruta, {
    method: metodo,
    ...(cuerpo !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }),
  });

  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => null)) as CuerpoError;
    throw new ApiError(respuesta.status, datos);
  }

  // Los DELETE responden 204 sin cuerpo.
  if (respuesta.status === 204) {
    return undefined as T;
  }

  return respuesta.json() as Promise<T>;
}
