import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
// Por ruta directa, no desde el barrel: importar '@phosphor-icons/react' arrastra
// el paquete entero al bundle (ver PaymentIcon.tsx).
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { PrinterIcon } from '@phosphor-icons/react/dist/csr/Printer';
import { colorEstadoImpresora, estadoImpresora, ordenarImpresoras } from '@/utils/impresoras';
import type { Impresora } from '@/types/impresoras';

interface SelectorImpresoraProps {
  impresoras: Impresora[];
  valor: number | null;
  onChange: (idImpresora: number | null) => void;
  /** false = el usuario no elige impresora; el control no se muestra. */
  puedeElegir: boolean;
  deshabilitado?: boolean;
  etiqueta?: string;
}

/**
 * Elige a que impresora va un trabajo. Se muestra SOLO a quien puede elegir:
 * para el resto no es que este deshabilitado, directamente no existe (un
 * control gris que no se puede tocar invita a preguntar por que).
 *
 * Que este control no aparezca no es la seguridad: el backend ignora el id que
 * mande alguien que no puede elegir (services/impresoras.js). Esto es
 * comodidad, no permiso.
 *
 * Las desconectadas se pueden elegir igual: puede ser que la PC este por
 * prender, y el error al imprimir es mas claro que un item bloqueado.
 */
export default function SelectorImpresora({
  impresoras,
  valor,
  onChange,
  puedeElegir,
  deshabilitado = false,
  etiqueta = 'Imprimir en',
}: SelectorImpresoraProps) {
  if (!puedeElegir) return null;

  const disponibles = ordenarImpresoras(impresoras.filter((impresora) => impresora.activa));
  if (disponibles.length === 0) return null;

  const elegida = disponibles.find((impresora) => impresora.id_impresora === valor) ?? null;

  return (
    <Listbox value={valor} onChange={onChange} disabled={deshabilitado}>
      <div className='relative'>
        <Listbox.Label className='block text-xs font-medium text-gray-500 mb-1'>
          {etiqueta}
        </Listbox.Label>

        <Listbox.Button className='relative w-full cursor-pointer rounded-lg border-2 border-gray-300 bg-white py-2 pl-3 pr-9 text-left text-sm transition-colors hover:border-violet-400 focus:border-violet-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100'>
          <span className='flex items-center gap-2 truncate'>
            <PrinterIcon size={18} className='shrink-0 text-violet-600' weight='bold' />
            {elegida ? (
              <>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${colorEstadoImpresora(elegida)}`}
                  title={estadoImpresora(elegida)}
                />
                <span className='truncate font-medium text-gray-900'>{elegida.nombre}</span>
              </>
            ) : (
              <span className='text-gray-500'>Elegí una impresora</span>
            )}
          </span>
          <CaretDownIcon
            size={16}
            className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'
          />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave='transition ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <Listbox.Options className='absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none'>
            {disponibles.map((impresora) => (
              <Listbox.Option
                key={impresora.id_impresora}
                value={impresora.id_impresora}
                className={({ focus }) =>
                  `relative cursor-pointer select-none py-2 pl-9 pr-3 text-sm ${
                    focus ? 'bg-violet-50 text-violet-900' : 'text-gray-900'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    {selected && (
                      <CheckIcon
                        size={16}
                        weight='bold'
                        className='absolute left-3 top-1/2 -translate-y-1/2 text-violet-600'
                      />
                    )}
                    <span className='flex items-center justify-between gap-3'>
                      <span className={`truncate ${selected ? 'font-medium' : ''}`}>
                        {impresora.nombre}
                        {impresora.es_predeterminada && (
                          <span className='ml-2 text-xs text-gray-400'>(predeterminada)</span>
                        )}
                      </span>
                      <span className='flex shrink-0 items-center gap-1.5 text-xs text-gray-500'>
                        <span
                          className={`h-2 w-2 rounded-full ${colorEstadoImpresora(impresora)}`}
                        />
                        {estadoImpresora(impresora)}
                      </span>
                    </span>
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
