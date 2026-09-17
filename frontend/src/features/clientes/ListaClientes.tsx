import { useEffect, useRef, useState } from 'react';
import type { CLIENTES } from '@backend/types';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { listarClientesPagina } from '@/api/clientesFinales';
import { useDebounce } from '@/hooks/useDebounce';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { nombreCompleto, telefonoDeCliente } from '@/features/ventas/cliente/formatoCliente';

const RETRASO_BUSQUEDA_MS = 300;
const TAMANO_PAGINA = 40;
/** Distancia al final (px) que dispara el pedido de la pagina siguiente. */
const MARGEN_SCROLL = 120;

interface ListaClientesProps {
  /** Fila resaltada (null mientras se crea uno nuevo o no hay nada elegido). */
  idSeleccionado: number | null;
  /** Se esta completando el alta: se agrega una fila "Nuevo Cliente" arriba de la lista. */
  creando: boolean;
  /** Cambia cuando el panel derecho guarda o borra: obliga a releer la lista. */
  recarga: number;
  onSeleccionar: (cliente: CLIENTES) => void;
  onNuevo: () => void;
}

/**
 * Panel izquierdo de la pagina Clientes: buscador con debounce + lista que se
 * va cargando de a paginas al scrollear.
 *
 * Scroll infinito y no un Paginador como en Ventas/Articulos: aca la lista es
 * un selector lateral, no el contenido principal de la pagina — el usuario
 * busca un cliente y sigue trabajando a la derecha, no recorre paginas.
 */
export default function ListaClientes({
  idSeleccionado,
  creando,
  recarga,
  onSeleccionar,
  onNuevo,
}: ListaClientesProps) {
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda.trim(), RETRASO_BUSQUEDA_MS);

  const [clientes, setClientes] = useState<CLIENTES[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contenedorRef = useRef<HTMLDivElement>(null);

  // Buscar otra cosa (o recargar) empieza la lista de cero: si no, la pagina 2
  // de la busqueda vieja se apilaria sobre los resultados nuevos.
  const volverAlPrincipio = () => {
    setPagina(1);
    setClientes([]);
    setTotal(0);
    setCargando(true);
    setError(null);
  };
  useResetAlCambiar(busquedaDebounced, volverAlPrincipio);
  useResetAlCambiar(recarga, volverAlPrincipio);
  useResetAlCambiar(pagina, () => {
    setCargando(true);
    setError(null);
  });

  // Volver arriba al empezar una lista nueva (o al entrar en "creando") es
  // sincronizar el DOM (el scroll no es estado de React), asi que aca el
  // efecto es el lugar correcto: si quedara scrolleada, el handler de abajo
  // pediria la pagina 2 de entrada, y ademas la fila "Nuevo Cliente" quedaria
  // fuera de vista justo cuando mas hace falta verla.
  useEffect(() => {
    contenedorRef.current?.scrollTo({ top: 0 });
  }, [busquedaDebounced, recarga, creando]);

  // Las respuestas pueden llegar desordenadas: solo vale la ultima pedida.
  const secuencia = useRef(0);

  useEffect(() => {
    const peticion = ++secuencia.current;

    listarClientesPagina({ busqueda: busquedaDebounced, pagina, tamano: TAMANO_PAGINA })
      .then((respuesta) => {
        if (peticion !== secuencia.current) return;
        // La pagina 1 reemplaza; las siguientes se apilan (scroll infinito).
        setClientes((previos) =>
          pagina === 1 ? respuesta.clientes : [...previos, ...respuesta.clientes]
        );
        setTotal(respuesta.total);
      })
      .catch((err) => {
        if (peticion !== secuencia.current) return;
        console.error('Error al obtener los clientes:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar los clientes.'));
      })
      .finally(() => {
        if (peticion === secuencia.current) setCargando(false);
      });
  }, [busquedaDebounced, pagina, recarga]);

  const hayMas = clientes.length < total;

  const handleScroll = () => {
    const nodo = contenedorRef.current;
    if (!nodo || cargando || !hayMas) return;

    if (nodo.scrollTop + nodo.clientHeight >= nodo.scrollHeight - MARGEN_SCROLL) {
      setPagina((previa) => previa + 1);
    }
  };

  return (
    <div className='flex h-full min-h-0 flex-col gap-3'>
      <button
        type='button'
        onClick={onNuevo}
        className='shrink-0 rounded bg-marca-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-100 ease-in hover:bg-marca-600 active:bg-marca-700 cursor-pointer'
      >
        Nuevo Cliente
      </button>

      <input
        type='text'
        autoComplete='off'
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder='Buscar por nombre o teléfono...'
        aria-label='Buscar un cliente por nombre o teléfono'
        className='shrink-0 rounded border border-neutro-200 bg-white px-3 py-2 text-sm text-neutro-900 placeholder:text-neutro-400 transition-colors duration-100 ease-in hover:border-marca-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30'
      />

      <div
        ref={contenedorRef}
        onScroll={handleScroll}
        className='min-h-0 flex-1 overflow-y-auto rounded border border-neutro-200'
      >
        {/* Puramente visual: no es un cliente real, no tiene onClick. Se va
            sola en cuanto se crea (recarga) o se cancela el alta. */}
        {creando && (
          <div className='flex w-full flex-col border-b border-neutro-200 bg-marca-500 px-4 py-2 text-left text-white'>
            <span className='font-semibold italic'>Nuevo Cliente</span>
            <span className='text-xs text-marca-100'>Completando datos...</span>
          </div>
        )}

        {error && <p className='px-4 py-3 text-sm text-red-600'>{error}</p>}

        {!error && clientes.length === 0 && cargando && (
          <p className='px-4 py-3 text-sm text-neutro-400'>Cargando clientes...</p>
        )}

        {!error && clientes.length === 0 && !cargando && (
          <p className='px-4 py-3 text-sm italic text-neutro-400'>
            {busquedaDebounced === ''
              ? 'Todavía no hay clientes cargados.'
              : 'No hay clientes con ese nombre o teléfono.'}
          </p>
        )}

        {clientes.map((cliente) => {
          const activo = cliente.id_cliente === idSeleccionado;

          return (
            <button
              key={cliente.id_cliente}
              type='button'
              onClick={() => onSeleccionar(cliente)}
              className={`flex w-full flex-col border-b border-neutro-200 px-4 py-2 text-left last:border-b-0 transition-colors duration-100 ease-in cursor-pointer ${
                activo ? 'bg-marca-500 text-white' : 'hover:bg-neutro-100'
              }`}
            >
              <span className={`font-semibold ${activo ? 'text-white' : 'text-neutro-900'}`}>
                {nombreCompleto(cliente) || 'Sin nombre'}
              </span>
              <span className={`text-xs ${activo ? 'text-marca-100' : 'text-neutro-600'}`}>
                {telefonoDeCliente(cliente) || 'Sin teléfono'}
              </span>
            </button>
          );
        })}

        {clientes.length > 0 && cargando && (
          <p className='px-4 py-3 text-sm text-neutro-400'>Cargando más...</p>
        )}
      </div>

      <span className='shrink-0 text-xs text-neutro-400'>
        {clientes.length} de {total} {total === 1 ? 'cliente' : 'clientes'}
      </span>
    </div>
  );
}
