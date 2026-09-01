// Tests de api/cliente.ts — el unico lugar del frontend que llama a fetch().
//
// Todas las llamadas de la aplicacion pasan por request<T>, asi que su manejo de
// errores y de respuestas sin cuerpo define como se comporta la app entera
// cuando el backend responde algo raro.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { request, ApiError, mensajeDetallesPrimero } from '@/api/cliente';

/** Respuesta minima que alcanza para lo que usa request(). */
const respuesta = ({
  ok = true,
  status = 200,
  json = async () => ({}),
}: {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}) => ({ ok, status, json }) as Response;

const mockFetch = (valor: Response) => {
  const fn = vi.fn(async () => valor);
  vi.stubGlobal('fetch', fn);
  return fn;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiError', () => {
  it('resuelve el message en cascada: message, details, y por ultimo el status', () => {
    expect(new ApiError(400, { message: 'Falta el nombre.' }).message).toBe('Falta el nombre.');
    expect(new ApiError(500, { details: 'detalle tecnico' }).message).toBe('detalle tecnico');
    expect(new ApiError(500, null).message).toBe('Error 500');
  });

  it('expone status, datos y details', () => {
    const error = new ApiError(404, { message: 'No existe.', details: 'P2025' });

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(404);
    expect(error.details).toBe('P2025');
    expect(error.datos).toEqual({ message: 'No existe.', details: 'P2025' });
  });
});

describe('request', () => {
  it('hace GET sin cuerpo ni Content-Type por defecto', async () => {
    const fetchMock = mockFetch(respuesta({ json: async () => [{ id: 1 }] }));

    const datos = await request<{ id: number }[]>('/api/grupos');

    expect(datos).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/grupos', { method: 'GET' });
  });

  it('serializa el cuerpo y agrega el Content-Type', async () => {
    const fetchMock = mockFetch(respuesta({ json: async () => ({ ok: true }) }));

    await request('/api/grupos', { metodo: 'POST', cuerpo: { nombre: 'Verano' } });

    expect(fetchMock).toHaveBeenCalledWith('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"nombre":"Verano"}',
    });
  });

  it('un cuerpo null SI se envia (null no es undefined)', async () => {
    // Sutil pero real: `cuerpo: null` manda body "null", `undefined` no manda nada.
    const fetchMock = mockFetch(respuesta({ json: async () => ({}) }));

    await request('/api/x', { metodo: 'PUT', cuerpo: null });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ body: 'null' });
  });

  it('devuelve undefined ante un 204 sin leer el cuerpo', async () => {
    const json = vi.fn(async () => ({}));
    mockFetch(respuesta({ status: 204, json }));

    await expect(request('/api/grupos/1', { metodo: 'DELETE' })).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('lanza ApiError con el cuerpo del error', async () => {
    mockFetch(
      respuesta({ ok: false, status: 409, json: async () => ({ message: 'Ese grupo ya existe.' }) })
    );

    await expect(request('/api/grupos')).rejects.toMatchObject({
      status: 409,
      message: 'Ese grupo ya existe.',
    });
  });

  it('lanza ApiError aunque el error no venga en JSON', async () => {
    // nginx puede devolver HTML en un 502: no debe romper el parseo.
    mockFetch(
      respuesta({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      })
    );

    await expect(request('/api/grupos')).rejects.toMatchObject({
      status: 502,
      message: 'Error 502',
    });
  });
});

describe('mensajeDetallesPrimero', () => {
  it('prioriza details sobre message en un ApiError', () => {
    const error = new ApiError(500, { message: 'Error al crear.', details: 'FK violation' });
    expect(mensajeDetallesPrimero(error)).toBe('FK violation');
  });

  it('usa message cuando no hay details', () => {
    expect(mensajeDetallesPrimero(new ApiError(400, { message: 'Falta el nombre.' }))).toBe(
      'Falta el nombre.'
    );
  });

  it('usa el message de un Error comun', () => {
    expect(mensajeDetallesPrimero(new Error('boom'))).toBe('boom');
  });

  it('cae al fallback con cualquier otra cosa', () => {
    expect(mensajeDetallesPrimero('un string', 'Fallo.')).toBe('Fallo.');
    expect(mensajeDetallesPrimero(null, 'Fallo.')).toBe('Fallo.');
  });
});
