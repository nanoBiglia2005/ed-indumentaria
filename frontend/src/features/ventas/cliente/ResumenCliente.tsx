import type { CampoCliente, DatosCliente } from './formatoCliente';
import { telefonoLegible } from './formatoCliente';

interface Fila {
  etiqueta: string;
  valor: string;
  /** Campos que componen la fila (para saber si se resalta). */
  campos: CampoCliente[];
}

const filasDe = (datos: DatosCliente): Fila[] => [
  {
    etiqueta: 'Nombre',
    valor: `${datos.nombre.trim()} ${datos.apellido.trim()}`.trim(),
    campos: ['nombre', 'apellido'],
  },
  { etiqueta: 'DNI', valor: datos.dni.trim(), campos: ['dni'] },
  { etiqueta: 'Email', valor: datos.email.trim(), campos: ['email'] },
  {
    etiqueta: 'Teléfono',
    valor: telefonoLegible(datos),
    campos: ['cod_pais', 'cod_area', 'telefono'],
  },
  {
    etiqueta: 'Fecha de Nacimiento',
    valor: datos.fecha_nacimiento.trim(),
    campos: ['fecha_nacimiento'],
  },
];

interface ResumenClienteProps {
  datos: DatosCliente;
  /** Campos a marcar en amarillo (lo que cambiaria respecto de la base). */
  resaltados?: Set<CampoCliente>;
}

/** Ficha de solo lectura de un cliente, para los modales de confirmacion. */
export default function ResumenCliente({ datos, resaltados }: ResumenClienteProps) {
  return (
    <dl className='flex flex-col gap-2'>
      {filasDe(datos).map((fila) => {
        const resaltado = fila.campos.some((campo) => resaltados?.has(campo));

        return (
          <div key={fila.etiqueta} className='flex flex-col'>
            <dt className='text-xs text-gray-400'>{fila.etiqueta}</dt>
            <dd
              className={`text-sm break-words ${
                resaltado
                  ? 'rounded bg-amber-50 px-1 font-semibold text-amber-800'
                  : 'font-medium text-gray-800'
              }`}
            >
              {fila.valor === '' ? '—' : fila.valor}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
