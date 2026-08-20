// Traduccion entre la fila de CLIENTES y el formulario, mas las validaciones.
//
// El formulario trabaja SIEMPRE con strings (es lo que se tipea): los numeros y
// la fecha se convierten recien al mandar. Los limites salen de @backend/types
// (shared/clientes.json), que es lo mismo que valida la API: si aca se
// duplicaran, el formulario dejaria cargar algo que el backend rechaza.
import type { CLIENTES } from '@backend/types';
import {
  NOMBRE_MAX,
  APELLIDO_MAX,
  DNI_LARGO,
  EMAIL_MAX,
  COD_PAIS_DIGITOS,
  COD_AREA_DIGITOS,
  TELEFONO_DIGITOS,
} from '@backend/types';
import type { DatosClienteAPI } from '@/api/venta';

/** Los campos del formulario, tal cual se ven en pantalla. */
export interface DatosCliente {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  cod_pais: string;
  cod_area: string;
  telefono: string;
  /** Siempre DD/MM/AAAA (las barras las pone enmascararFecha). */
  fecha_nacimiento: string;
}

export type CampoCliente = keyof DatosCliente;

export const CLIENTE_VACIO: DatosCliente = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  cod_pais: '',
  cod_area: '',
  telefono: '',
  fecha_nacimiento: '',
};

export const soloDigitos = (valor: string, max: number) =>
  valor.replace(/\D/g, '').slice(0, max);

const DIGITOS_FECHA = 8;

/**
 * Mascara DD/MM/AAAA: se tipean solo los digitos y las barras aparecen solas.
 * La barra se agrega recien cuando hay un digito DESPUES de ella, si no,
 * borrar con la tecla de retroceso se quedaria trabado en "02/".
 */
export const enmascararFecha = (valor: string) => {
  const digitos = soloDigitos(valor, DIGITOS_FECHA);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
};

// Las fechas de CLIENTES son columnas `date` (medianoche UTC) y por JSON llegan
// como string ISO: hay que leerlas en UTC o con la hora local de Argentina
// (UTC-3) caerian el dia anterior. Mismo criterio que utils/formato.ts.
const fechaAFormulario = (fecha: Date | string | null) => {
  if (!fecha) return '';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '';

  const dia = String(valor.getUTCDate()).padStart(2, '0');
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${valor.getUTCFullYear()}`;
};

/** Fila de la base -> campos del formulario. */
export const desdeCliente = (cliente: CLIENTES): DatosCliente => ({
  nombre: cliente.nombre ?? '',
  apellido: cliente.apellido ?? '',
  dni: cliente.dni ?? '',
  email: cliente.email ?? '',
  cod_pais: cliente.cod_pais === null ? '' : String(cliente.cod_pais),
  cod_area: cliente.cod_area === null ? '' : String(cliente.cod_area),
  telefono: cliente.telefono === null ? '' : String(cliente.telefono),
  fecha_nacimiento: fechaAFormulario(cliente.fecha_nacimiento),
});

const numeroONulo = (valor: string) => (valor.trim() === '' ? null : Number(valor));

/** Campos del formulario -> cuerpo de la API (la fecha en AAAA-MM-DD). */
export const aDatosAPI = (datos: DatosCliente): DatosClienteAPI => {
  const digitos = soloDigitos(datos.fecha_nacimiento, DIGITOS_FECHA);

  return {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    dni: datos.dni.trim(),
    email: datos.email.trim() === '' ? null : datos.email.trim(),
    cod_pais: numeroONulo(datos.cod_pais),
    cod_area: numeroONulo(datos.cod_area),
    telefono: numeroONulo(datos.telefono),
    fecha_nacimiento:
      digitos.length === DIGITOS_FECHA
        ? `${digitos.slice(4)}-${digitos.slice(2, 4)}-${digitos.slice(0, 2)}`
        : null,
  };
};

// Mismo chequeo que el backend: alcanza con atajar el tipeo obvio.
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Primer problema que impide guardar, o null si esta todo bien.
 * Obligatorios: nombre, apellido y DNI. El resto solo se valida si tiene algo.
 */
export const validarCliente = (datos: DatosCliente): string | null => {
  if (datos.nombre.trim() === '') return 'El nombre del cliente es obligatorio.';
  if (datos.nombre.trim().length > NOMBRE_MAX)
    return `El nombre no puede tener mas de ${NOMBRE_MAX} caracteres.`;

  if (datos.apellido.trim() === '') return 'El apellido del cliente es obligatorio.';
  if (datos.apellido.trim().length > APELLIDO_MAX)
    return `El apellido no puede tener mas de ${APELLIDO_MAX} caracteres.`;

  if (datos.dni.trim() === '') return 'El DNI del cliente es obligatorio.';
  if (datos.dni.trim().length !== DNI_LARGO)
    return `El DNI debe tener exactamente ${DNI_LARGO} dígitos.`;

  const email = datos.email.trim();
  if (email !== '') {
    if (email.length > EMAIL_MAX) return `El email no puede tener mas de ${EMAIL_MAX} caracteres.`;
    if (!EMAIL_VALIDO.test(email)) return 'El email no tiene un formato válido.';
  }

  const fecha = soloDigitos(datos.fecha_nacimiento, DIGITOS_FECHA);
  if (fecha !== '') {
    if (fecha.length !== DIGITOS_FECHA) return 'La fecha de nacimiento debe ser DD/MM/AAAA.';

    const dia = Number(fecha.slice(0, 2));
    const mes = Number(fecha.slice(2, 4));
    const anio = Number(fecha.slice(4));
    const valor = new Date(Date.UTC(anio, mes - 1, dia));

    // Rebota los dias que no existen (31/02 caeria en marzo).
    if (
      valor.getUTCFullYear() !== anio ||
      valor.getUTCMonth() !== mes - 1 ||
      valor.getUTCDate() !== dia
    ) {
      return 'La fecha de nacimiento no existe.';
    }
    if (valor.getTime() > Date.now()) return 'La fecha de nacimiento no puede ser futura.';
  }

  return null;
};

/**
 * Campos del borrador que quedaron distintos de lo que hay guardado. Con esto
 * el formulario los pinta en amarillo y la venta sabe si hay que actualizar al
 * cliente al confirmar.
 */
export const camposModificados = (
  borrador: DatosCliente,
  guardado: CLIENTES
): Set<CampoCliente> => {
  const original = desdeCliente(guardado);
  const campos = Object.keys(CLIENTE_VACIO) as CampoCliente[];

  return new Set(campos.filter((campo) => borrador[campo].trim() !== original[campo].trim()));
};

export const nombreCompleto = (cliente: CLIENTES) =>
  `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim();

/** Los tres pedazos del telefono como se leen juntos: +54 9 11 12345678. */
export const telefonoLegible = (datos: DatosCliente) => {
  const partes = [
    datos.cod_pais.trim() === '' ? '' : `+${datos.cod_pais.trim()}`,
    datos.cod_area.trim(),
    datos.telefono.trim(),
  ].filter((parte) => parte !== '');

  return partes.join(' ');
};

/** Limites que necesitan los inputs del formulario. */
export const LIMITES = {
  nombre: NOMBRE_MAX,
  apellido: APELLIDO_MAX,
  dni: DNI_LARGO,
  email: EMAIL_MAX,
  cod_pais: COD_PAIS_DIGITOS,
  cod_area: COD_AREA_DIGITOS,
  telefono: TELEFONO_DIGITOS,
} as const;
