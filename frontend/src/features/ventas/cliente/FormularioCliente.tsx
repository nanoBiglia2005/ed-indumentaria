import type { CampoCliente, DatosCliente } from './formatoCliente';
import { LIMITES, enmascararFecha, soloDigitos } from './formatoCliente';

interface InputClienteProps {
  valor: string;
  onCambiar: (valor: string) => void;
  /** Formato esperado del valor, no el nombre del campo (eso va en `etiqueta`). */
  placeholder: string;
  etiqueta: string;
  requerido?: boolean;
  /** Distinto de lo guardado: se resalta en amarillo. */
  modificado?: boolean;
  deshabilitado?: boolean;
  soloNumeros?: boolean;
  centrado?: boolean;
  maxLength?: number;
  claseExtra?: string;
}

function InputCliente({
  valor,
  onCambiar,
  placeholder,
  etiqueta,
  requerido = false,
  modificado = false,
  deshabilitado = false,
  soloNumeros = false,
  centrado = false,
  maxLength,
  claseExtra = '',
}: InputClienteProps) {
  // El amarillo avisa "esto se va a pisar en la base al confirmar la venta".
  const colores = modificado
    ? 'border-acento-500 bg-acento-100 text-acento-800 hover:border-acento-600 focus:border-acento-600 focus:ring-acento-500/40'
    : 'border-neutro-200 bg-white text-neutro-600 hover:border-marca-400 focus:border-marca-500 focus:ring-marca-500/30';

  return (
    <label className={`flex min-w-0 flex-col gap-1 ${claseExtra}`}>
      <span className='text-xs font-medium text-neutro-600'>
        {etiqueta}
        {requerido && <span className='text-red-500'> *</span>}
      </span>
      <input
        type='text'
        inputMode={soloNumeros ? 'numeric' : undefined}
        autoComplete='off'
        value={valor}
        maxLength={maxLength}
        disabled={deshabilitado}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={placeholder}
        className={`w-full min-w-0 rounded border px-3 py-2 text-sm placeholder:text-neutro-400 transition-colors duration-100 ease-in focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${centrado ? 'text-center' : ''} ${colores}`}
      />
    </label>
  );
}

interface FormularioClienteProps {
  datos: DatosCliente;
  onCambiar: (campo: CampoCliente, valor: string) => void;
  /** Campos distintos de lo que hay guardado (solo al editar un asignado). */
  modificados?: Set<CampoCliente>;
  deshabilitado?: boolean;
}

/**
 * Los datos de un cliente final. Se usa igual para el alta (campos vacios) y
 * para editar al cliente ya asignado a la venta; en ese segundo caso
 * `modificados` pinta en amarillo lo que quedo distinto de la base.
 *
 * Obligatorios: nombre, apellido y teléfono. Los limites de cada campo salen
 * de formatoCliente (que los lee de @backend/types), no hardcodeados aca.
 */
export default function FormularioCliente({
  datos,
  onCambiar,
  modificados,
  deshabilitado = false,
}: FormularioClienteProps) {
  const esModificado = (campo: CampoCliente) => modificados?.has(campo) ?? false;

  const comun = (campo: CampoCliente) => ({
    valor: datos[campo],
    modificado: esModificado(campo),
    deshabilitado,
  });

  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <InputCliente
          {...comun('nombre')}
          onCambiar={(valor) => onCambiar('nombre', valor)}
          placeholder='Ej: Juan'
          etiqueta='Nombre'
          requerido
          maxLength={LIMITES.nombre}
        />
        <InputCliente
          {...comun('apellido')}
          onCambiar={(valor) => onCambiar('apellido', valor)}
          placeholder='Ej: Pérez'
          etiqueta='Apellido'
          requerido
          maxLength={LIMITES.apellido}
        />
        {/* Los tres pedazos del telefono son columnas separadas en la base. */}
        <div className='flex gap-2 w-full col-span-2'>
          <InputCliente
            {...comun('cod_pais')}
            onCambiar={(valor) => onCambiar('cod_pais', soloDigitos(valor, LIMITES.cod_pais))}
            placeholder='54'
            etiqueta='Cód. país'
            soloNumeros
            centrado
            claseExtra='w-16 shrink-0'
          />
          <InputCliente
            {...comun('cod_area')}
            onCambiar={(valor) => onCambiar('cod_area', soloDigitos(valor, LIMITES.cod_area))}
            placeholder='9 11'
            etiqueta='Cód. área'
            soloNumeros
            centrado
            claseExtra='w-20 shrink-0'
          />
          <InputCliente
            {...comun('telefono')}
            onCambiar={(valor) => onCambiar('telefono', soloDigitos(valor, LIMITES.telefono))}
            placeholder='12345678'
            etiqueta='Teléfono'
            requerido
            soloNumeros
            claseExtra='flex-1'
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 border-t border-neutro-200 pt-3 lg:grid-cols-3'>
        <InputCliente
          {...comun('dni')}
          onCambiar={(valor) => onCambiar('dni', soloDigitos(valor, LIMITES.dni))}
          placeholder={`${LIMITES.dni} dígitos`}
          etiqueta='DNI'
          soloNumeros
        />

        <InputCliente
          {...comun('email')}
          onCambiar={(valor) => onCambiar('email', valor)}
          placeholder='nombre@ejemplo.com'
          etiqueta='Email'
          maxLength={LIMITES.email}
        />

        <InputCliente
          {...comun('fecha_nacimiento')}
          onCambiar={(valor) => onCambiar('fecha_nacimiento', enmascararFecha(valor))}
          placeholder='DD/MM/AAAA'
          etiqueta='Fecha de nacimiento'
          soloNumeros
        />
      </div>
    </div>
  );
}
