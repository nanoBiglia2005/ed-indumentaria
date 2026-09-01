// Tests de validarCliente — la validacion del alta/edicion de clientes.
//
// Nueve ramas, incluida una que depende del reloj (la fecha futura). Los limites
// salen de shared/clientes.json, que es la misma fuente que usa el backend.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { validarCliente } from '@/features/ventas/cliente/formatoCliente';

const VALIDO = {
  nombre: 'Ana',
  apellido: 'Perez',
  dni: '12345678',
  email: '',
  cod_pais: '',
  cod_area: '',
  telefono: '',
  fecha_nacimiento: '',
};

const con = (cambios: Partial<typeof VALIDO>) => validarCliente({ ...VALIDO, ...cambios });

afterEach(() => {
  vi.useRealTimers();
});

describe('campos obligatorios', () => {
  it('acepta el minimo: nombre, apellido y DNI', () => {
    expect(validarCliente(VALIDO)).toBeNull();
  });

  it('exige nombre', () => {
    expect(con({ nombre: '' })).toBe('El nombre del cliente es obligatorio.');
    expect(con({ nombre: '   ' })).toBe('El nombre del cliente es obligatorio.');
  });

  it('exige apellido', () => {
    expect(con({ apellido: '' })).toBe('El apellido del cliente es obligatorio.');
  });

  it('exige DNI', () => {
    expect(con({ dni: '' })).toBe('El DNI del cliente es obligatorio.');
  });
});

describe('DNI', () => {
  it('exige largo EXACTO, no un maximo', () => {
    expect(con({ dni: '1234567' })).toMatch(/exactamente/);
    expect(con({ dni: '123456789' })).toMatch(/exactamente/);
    expect(con({ dni: '12345678' })).toBeNull();
  });
});

describe('largos maximos', () => {
  it('rebota un nombre de mas de 50 caracteres', () => {
    expect(con({ nombre: 'a'.repeat(51) })).toMatch(/no puede tener mas de 50/);
    expect(con({ nombre: 'a'.repeat(50) })).toBeNull();
  });

  it('rebota un apellido de mas de 50 caracteres', () => {
    expect(con({ apellido: 'a'.repeat(51) })).toMatch(/no puede tener mas de 50/);
  });
});

describe('email', () => {
  it('es opcional', () => {
    expect(con({ email: '' })).toBeNull();
    expect(con({ email: '   ' })).toBeNull();
  });

  it('acepta un formato valido', () => {
    expect(con({ email: 'ana@ejemplo.com' })).toBeNull();
  });

  it('rebota formatos invalidos', () => {
    expect(con({ email: 'ana' })).toBe('El email no tiene un formato válido.');
    expect(con({ email: 'ana@ejemplo' })).toBe('El email no tiene un formato válido.');
    expect(con({ email: 'ana ejemplo@x.com' })).toBe('El email no tiene un formato válido.');
    expect(con({ email: '@ejemplo.com' })).toBe('El email no tiene un formato válido.');
  });

  it('rebota un email demasiado largo antes de validar el formato', () => {
    expect(con({ email: `${'a'.repeat(45)}@ejemplo.com` })).toMatch(/no puede tener mas de 50/);
  });
});

describe('fecha de nacimiento', () => {
  it('es opcional', () => {
    expect(con({ fecha_nacimiento: '' })).toBeNull();
  });

  it('acepta DD/MM/AAAA completa', () => {
    expect(con({ fecha_nacimiento: '05/01/1990' })).toBeNull();
  });

  it('exige los 8 digitos', () => {
    expect(con({ fecha_nacimiento: '05/01' })).toBe('La fecha de nacimiento debe ser DD/MM/AAAA.');
  });

  it('rebota dias que no existen', () => {
    // 31/02 caeria en marzo si no se validara con el round-trip.
    expect(con({ fecha_nacimiento: '31/02/1990' })).toBe('La fecha de nacimiento no existe.');
    expect(con({ fecha_nacimiento: '31/04/1990' })).toBe('La fecha de nacimiento no existe.');
    expect(con({ fecha_nacimiento: '00/01/1990' })).toBe('La fecha de nacimiento no existe.');
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(con({ fecha_nacimiento: '29/02/2024' })).toBeNull();
    expect(con({ fecha_nacimiento: '29/02/2023' })).toBe('La fecha de nacimiento no existe.');
  });

  it('rebota una fecha futura', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));

    expect(con({ fecha_nacimiento: '16/06/2026' })).toBe(
      'La fecha de nacimiento no puede ser futura.'
    );
    expect(con({ fecha_nacimiento: '14/06/2026' })).toBeNull();
  });
});

describe('orden de las validaciones', () => {
  it('devuelve el PRIMER problema, no todos', () => {
    // Con nombre vacio y DNI corto, avisa del nombre.
    expect(con({ nombre: '', dni: '1' })).toBe('El nombre del cliente es obligatorio.');
  });
});
