import { useEffect, useRef, useState } from 'react';
import type { CLIENTES } from '@backend/types';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { buscarClientes } from '@/api/venta';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useDebounce } from '@/hooks/useDebounce';
import { nombreCompleto } from './formatoCliente';

const RETRASO_BUSQUEDA_MS = 300;

interface BuscadorClientesProps {
  onSeleccionar: (cliente: CLIENTES) => void;
  deshabilitado?: boolean;
}

/**
 * Buscador del cliente de la venta: un solo campo que matchea por nombre,
 * apellido o DNI (el backend decide contra que columna, el usuario no elige).
 * Al elegir uno el campo se limpia: lo que queda a la vista es la ficha del
 * cliente asignado, no el texto que se busco.
 */
export default function BuscadorClientes({
  onSeleccionar,
  deshabilitado = false,
}: BuscadorClientesProps) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<CLIENTES[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const terminoDebounced = useDebounce(termino.trim(), RETRASO_BUSQUEDA_MS);

  useClickOutside(contenedorRef, abierto, () => setAbierto(false));

  useEffect(() => {
    if (terminoDebounced === '') {
      setResultados([]);
      setError(null);
      setCargando(false);
      return;
    }

    let cancelado = false;
    setCargando(true);

    buscarClientes(terminoDebounced)
      .then((clientes) => {
        if (cancelado) return;
        setResultados(clientes);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al buscar clientes:', err);
        setResultados([]);
        setError(mensajeDetallesPrimero(err, 'No se pudieron buscar los clientes.'));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [terminoDebounced]);

  const handleSeleccionar = (cliente: CLIENTES) => {
    setTermino('');
    setResultados([]);
    setAbierto(false);
    onSeleccionar(cliente);
  };

  // El desplegable solo aparece cuando hay algo que mostrar.
  const hayAlgoQueMostrar = termino.trim() !== '' && abierto;

  return (
    <div ref={contenedorRef} className='relative flex-1 min-w-0 max-w-sm'>
      <input
        type='text'
        autoComplete='off'
        value={termino}
        disabled={deshabilitado}
        onChange={(e) => {
          setTermino(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder='Buscar por Nombre/DNI...'
        aria-label='Buscar un cliente por nombre o DNI'
        className='w-full rounded border border-neutro-200 bg-white px-3 py-2 text-sm text-neutro-600 placeholder:text-neutro-400 transition-colors duration-100 ease-in hover:border-marca-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 disabled:cursor-not-allowed disabled:opacity-60'
      />

      {hayAlgoQueMostrar && (
        <div className='absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded border border-neutro-200 bg-white shadow-sm'>
          {cargando && <p className='px-4 py-3 text-sm text-neutro-400'>Buscando...</p>}

          {!cargando && error && <p className='px-4 py-3 text-sm text-red-600'>{error}</p>}

          {!cargando && !error && resultados.length === 0 && (
            <p className='px-4 py-3 text-sm italic text-neutro-400'>
              No hay clientes con ese nombre o DNI.
            </p>
          )}

          {!cargando &&
            !error &&
            resultados.map((cliente) => (
              <button
                key={cliente.id_cliente}
                type='button'
                onClick={() => handleSeleccionar(cliente)}
                className='flex w-full flex-col border-b border-neutro-200 px-4 py-2 text-left last:border-b-0 transition-colors duration-100 ease-in hover:bg-neutro-100 cursor-pointer'
              >
                <span className='font-semibold text-neutro-900'>{nombreCompleto(cliente)}</span>
                <span className='text-xs text-neutro-600'>DNI {cliente.dni}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
