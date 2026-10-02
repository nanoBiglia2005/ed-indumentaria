import { useEffect, useRef, useState } from 'react';
import { MAX_REPORTES_GUARDADOS } from '@backend/types';
import SectionWrapper from '@/components/layout/SectionWrapper';
import Paginador from '@/components/tabla/Paginador';
import Notificacion from '@/components/ui/Notificacion';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { listarReportes } from '@/api/reportes';
import { useNotificacion } from '@/hooks/useNotificacion';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { formatearFechaHora } from '@/utils/formato';
import { ETIQUETAS_TIPO_REPORTE } from '@/utils/reportes';
import type { ReporteGuardado } from '@/types/reportes';
import EliminarReporteModal from './modales/EliminarReporteModal';

const TAMANO_PAGINA = 20;

// Una sola grilla para la cabecera y las filas; debajo de md cada reporte se
// apila como tarjeta.
const COLUMNAS = 'md:grid md:grid-cols-[140px_170px_minmax(0,1fr)_150px_90px_150px] md:items-center md:gap-3';

/**
 * Historial de los PDFs de "Imprimir Reporte" (se generan desde Articulos). Hay
 * un tope GLOBAL de MAX_REPORTES_GUARDADOS: desde aca se ven, se reabren y se
 * borran para hacer lugar. Gateada a ROLES_ARTICULOS; el backend niega igual.
 */
export default function ReportesPage() {
  const [reportes, setReportes] = useState<ReporteGuardado[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [recarga, setRecarga] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<ReporteGuardado | null>(null);

  const { notificacion, tipoNotificacion, mostrar } = useNotificacion();

  const empezarCarga = () => {
    setCargando(true);
    setError(null);
  };
  useResetAlCambiar(pagina, empezarCarga);
  useResetAlCambiar(recarga, empezarCarga);

  // Las respuestas pueden llegar desordenadas: solo vale la ultima pedida.
  const secuencia = useRef(0);

  useEffect(() => {
    const peticion = ++secuencia.current;
    listarReportes(pagina, TAMANO_PAGINA)
      .then((respuesta) => {
        if (peticion !== secuencia.current) return;
        // Se borro el ultimo de la ultima pagina: se vuelve a la anterior.
        if (respuesta.reportes.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }
        setReportes(respuesta.reportes);
        setTotal(respuesta.total);
        setCargando(false);
      })
      .catch((err) => {
        if (peticion !== secuencia.current) return;
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar los reportes.'));
        setCargando(false);
      });
  }, [pagina, recarga]);

  const lleno = total >= MAX_REPORTES_GUARDADOS;

  const handleEliminado = () => {
    setAEliminar(null);
    setRecarga((n) => n + 1);
    mostrar('Reporte eliminado.');
  };

  return (
    <>
      <SectionWrapper>
        <div className='flex flex-wrap items-center justify-between gap-3 my-3'>
          <div className='flex flex-col'>
            <h1 className='text-h2 font-semibold text-neutro-900'>Reportes</h1>
            <p className='text-sm text-neutro-600'>
              Se generan desde Artículos → Imprimir Reporte.
            </p>
          </div>
          <span
            className={`rounded border px-3 py-1 text-sm font-medium ${
              lleno ? 'border-acento-100 bg-acento-50 text-acento-800' : 'border-neutro-200 text-neutro-600'
            }`}
            title={lleno ? 'Para generar uno nuevo hay que borrar al menos uno.' : undefined}
          >
            {total} de {MAX_REPORTES_GUARDADOS} reportes guardados
          </span>
        </div>

        {error && (
          <div className='mb-3 rounded border border-red-400 bg-red-100 p-3 text-sm text-red-700'>{error}</div>
        )}

        <div className='flex-1 min-h-0 overflow-auto rounded border border-neutro-200 text-neutro-900'>
          <div
            className={`hidden ${COLUMNAS} sticky top-0 border-b border-neutro-200 bg-neutro-100 px-3 py-2 text-sm font-semibold text-neutro-600`}
          >
            <span>Fecha</span>
            <span>Tipo</span>
            <span>Línea / Grupo / Subgrupo / Colegio-Club</span>
            <span>Generado por</span>
            <span className='text-right'>Artículos</span>
            <span />
          </div>

          {!cargando && reportes.length === 0 && !error && (
            <p className='p-6 text-center text-sm text-neutro-600'>
              Todavía no se generó ningún reporte.
            </p>
          )}

          {reportes.map((reporte) => {
            const { nombres } = reporte.parametros;
            return (
              <div
                key={reporte.id_reporte}
                className={`${COLUMNAS} flex flex-col gap-1 border-b border-neutro-200 px-3 py-2 text-sm last:border-b-0 hover:bg-neutro-100`}
              >
                <span className='text-neutro-600'>{formatearFechaHora(reporte.fecha_generado)}</span>
                <span className='font-semibold'>{ETIQUETAS_TIPO_REPORTE[reporte.tipo]}</span>
                <span className='min-w-0'>
                  {nombres.linea} / {nombres.grupo} / {nombres.subgrupo} /{' '}
                  {nombres.colegioClub ?? <span className='text-neutro-600'>Todos</span>}
                </span>
                <span className='text-neutro-600'>{reporte.generado_por ?? 'Usuario eliminado'}</span>
                <span className='md:text-right text-neutro-600'>
                  <span className='md:hidden'>Artículos: </span>
                  {reporte.cantidad_filas.toLocaleString('es-AR')}
                </span>
                <span className='mt-1 flex gap-2 md:mt-0 md:justify-end'>
                  <a
                    href={reporte.url}
                    target='_blank'
                    rel='noreferrer'
                    className='rounded bg-marca-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-marca-600'
                  >
                    Ver
                  </a>
                  <button
                    type='button'
                    onClick={() => setAEliminar(reporte)}
                    className='rounded bg-neutro-100 px-3 py-1 text-sm font-medium text-red-600 transition-colors hover:bg-neutro-200 cursor-pointer'
                  >
                    Borrar
                  </button>
                </span>
              </div>
            );
          })}
        </div>

        <Paginador
          pagina={pagina}
          tamano={TAMANO_PAGINA}
          total={total}
          cargando={cargando}
          onCambiarPagina={setPagina}
        />
      </SectionWrapper>

      <EliminarReporteModal
        abierto={aEliminar !== null}
        reporte={aEliminar}
        onCerrar={() => setAEliminar(null)}
        onEliminado={handleEliminado}
      />

      <Notificacion mensaje={notificacion} tipo={tipoNotificacion} posicion='pagina' />
    </>
  );
}
