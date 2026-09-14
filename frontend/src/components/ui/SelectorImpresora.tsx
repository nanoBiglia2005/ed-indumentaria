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
  etiqueta,
}: SelectorImpresoraProps) {
  if (!puedeElegir) return null;

  const disponibles = ordenarImpresoras(impresoras.filter((impresora) => impresora.activa));
  if (disponibles.length === 0) return null;

  const elegida = disponibles.find((impresora) => impresora.id_impresora === valor) ?? null;

  return (
    <Listbox value={valor} onChange={onChange} disabled={deshabilitado}>
      <div className='relative'>
        <Listbox.Label className='block text-xs font-medium text-neutro-600'>
          {etiqueta}
        </Listbox.Label>

        <Listbox.Button className='relative w-full cursor-pointer rounded border-2 border-neutro-200 bg-white py-2 pl-3 pr-9 text-left text-sm transition-colors hover:border-marca-400 focus:border-marca-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutro-100'>
          <span className='flex items-center gap-2 truncate'>
            <PrinterIcon size={18} className='shrink-0 text-marca-500' weight='bold' />
            {elegida ? (
              <>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${colorEstadoImpresora(elegida)}`}
                  title={estadoImpresora(elegida)}
                />
                <span className='truncate font-medium text-neutro-900'>{elegida.nombre}</span>
              </>
            ) : (
              <span className='text-neutro-600'>Elegí una impresora</span>
            )}
          </span>
          <CaretDownIcon
            size={16}
            className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutro-400'
          />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave='transition ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <Listbox.Options className='absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded border border-neutro-200 bg-white py-1 shadow-sm focus:outline-none'>
            {disponibles.map((impresora) => (
              <Listbox.Option
                key={impresora.id_impresora}
                value={impresora.id_impresora}
                className={({ focus }) =>
                  `relative cursor-pointer select-none py-2 pl-9 pr-3 text-sm text-neutro-900 ${
                    focus ? 'bg-neutro-100' : ''
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    {selected && (
                      <CheckIcon
                        size={16}
                        weight='bold'
                        className='absolute left-3 top-1/2 -translate-y-1/2 text-marca-600'
                      />
                    )}
                    <span className='flex items-center justify-between gap-3'>
                      <span className={`truncate ${selected ? 'font-medium' : ''}`}>
                        {impresora.nombre}
                        {impresora.es_predeterminada && (
                          <span className='ml-2 text-xs text-neutro-400'>(predeterminada)</span>
                        )}
                      </span>
                      <span className='flex shrink-0 items-center gap-1.5 text-xs text-neutro-600'>
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
