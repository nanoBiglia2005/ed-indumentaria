// "Imprimir Reporte" de Articulos, en pasos como el asistente de Ventas y el
// selector de Precios: Linea -> Grupo -> Subgrupo -> Colegio/Club -> confirmar.
// El paso sale de lo que hay elegido, asi que avanza solo; las migas muestran lo
// elegido y vuelven a cualquier paso para cambiarlo.
//
// Con la linea elegida llegan todas las combinaciones que tienen articulos y
// cada paso ofrece solo lo que existe con lo anterior (recorridoReporte.ts).
// Con un Colegio/Club sale la Planilla de produccion; con "Todos" el Stock por
// talle.
//
// Tope de reportes guardados: se consulta al abrir, asi el aviso aparece antes
// de recorrer los pasos, y se vuelve a respetar si el POST responde 409 (otro
// usuario pudo llegar al tope mientras el modal estaba abierto). Quien corta de
// verdad es el backend.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LINEAS } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import ListaSeleccionable from '@/components/ui/ListaSeleccionable';
import MigasDePasos from '@/components/ui/MigasDePasos';
import type { MigaPaso } from '@/components/ui/MigasDePasos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import {
  generarReporteArticulos,
  listarOpcionesReporte,
  masAntiguoDelLimite,
  obtenerEstadoReportes,
} from '@/api/reportes';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { formatearFechaHora } from '@/utils/formato';
import { ETIQUETAS_TIPO_REPORTE, resumenParametros } from '@/utils/reportes';
import type { Opcion } from '@/types/comunes';
import type { CombinacionReporte, ReporteGuardado } from '@/types/reportes';
import {
  articulosDelRecorrido,
  colegiosDelRecorrido,
  gruposDelRecorrido,
  subgruposDelRecorrido,
} from '../recorridoReporte';

/** Con que arranca el recorrido: los filtros de pagina que habia en Articulos. */
export interface SeleccionInicialReporte {
  idLinea: number | null;
  idGrupo: number | null;
  idSubgrupo: number | null;
  idCliente: number | null;
}

interface GenerarReporteModalProps {
  abierto: boolean;
  inicial: SeleccionInicialReporte;
  lineas: LINEAS[];
  onCerrar: () => void;
}

/** El paso 4 se contesto con "Todos los Colegios/Clubes" (Stock por talle). */
const TODOS = 'todos' as const;
type EleccionColegio = number | typeof TODOS | null;

type Paso = 1 | 2 | 3 | 4 | 5;

const TITULO_POR_PASO: Record<Paso, string> = {
  1: 'Elegí una línea',
  2: 'Elegí un grupo',
  3: 'Elegí un subgrupo',
  4: 'Elegí un Colegio/Club',
  5: 'Imprimir Reporte',
};

/** Combinaciones de una linea, con la linea que las produjo. */
type CargaLinea = { idLinea: number; combinaciones: CombinacionReporte[] | null; error: string | null };

/**
 * Abre una pestaña en blanco DENTRO del click: un window.open que corre despues
 * de un await ya no cuenta como gesto del usuario y el navegador lo bloquea.
 * Cuando llega la url, la pestaña ya abierta navega al PDF.
 */
function abrirPestanaEnEspera() {
  const pestana = window.open('', '_blank');
  if (pestana) {
    pestana.opener = null;
    try {
      pestana.document.title = 'Generando reporte…';
      pestana.document.body.textContent = 'Generando el reporte, un momento…';
    } catch {
      // Solo es el texto de espera: sin el, la pestaña igual navega al PDF.
    }
  }
  return pestana;
}

const contiene = (opciones: Opcion[], id: number | null) => id !== null && opciones.some((o) => o.id === id);

const claseBotonSecundario =
  'px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer disabled:opacity-60';

export default function GenerarReporteModal({ abierto, inicial, lineas, onCerrar }: GenerarReporteModalProps) {
  const navigate = useNavigate();
  const { cargando, error, setError, ejecutar } = useAccionAsync();

  const [idLinea, setIdLinea] = useState<number | null>(null);
  const [idGrupo, setIdGrupo] = useState<number | null>(null);
  const [idSubgrupo, setIdSubgrupo] = useState<number | null>(null);
  const [colegio, setColegio] = useState<EleccionColegio>(null);

  const [cargaLinea, setCargaLinea] = useState<CargaLinea | null>(null);
  /** El reporte que se ofrece borrar (solo con el tope alcanzado). */
  const [masAntiguo, setMasAntiguo] = useState<ReporteGuardado | null>(null);
  const [maximo, setMaximo] = useState<number | null>(null);
  /** El navegador bloqueo la pestaña: se ofrece el enlace a mano. */
  const [urlSinAbrir, setUrlSinAbrir] = useState<string | null>(null);

  // El modal queda montado entre usos: cada vez que se abre arranca con los
  // filtros que habia en la pagina. Los que no existan en el recorrido (p. ej.
  // un grupo sin articulos en esa linea) se descartan solos: el paso se calcula
  // sobre las opciones validas.
  useResetAlCambiar(abierto, () => {
    if (!abierto) return;
    setIdLinea(inicial.idLinea);
    setIdGrupo(inicial.idGrupo);
    setIdSubgrupo(inicial.idSubgrupo);
    setColegio(inicial.idCliente);
    setMasAntiguo(null);
    setMaximo(null);
    setUrlSinAbrir(null);
    setError(null);
  });

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    obtenerEstadoReportes()
      .then((estado) => {
        if (!vigente) return;
        setMaximo(estado.maximo);
        if (estado.total >= estado.maximo) setMasAntiguo(estado.masAntiguo);
      })
      // Sin estado igual se puede generar: si hay tope, el 409 lo avisa.
      .catch((err) => console.error('Error al obtener el estado de los reportes:', err));
    return () => {
      vigente = false;
    };
  }, [abierto]);

  // Las respuestas pueden llegar desordenadas: solo vale la ultima pedida.
  const secuenciaLinea = useRef(0);

  useEffect(() => {
    if (!abierto || idLinea === null) return;
    const peticion = ++secuenciaLinea.current;
    listarOpcionesReporte(idLinea)
      .then(({ combinaciones }) => {
        if (peticion !== secuenciaLinea.current) return;
        setCargaLinea({ idLinea, combinaciones, error: null });
      })
      .catch((err) => {
        if (peticion !== secuenciaLinea.current) return;
        console.error('Error al obtener las opciones del reporte:', err);
        setCargaLinea({
          idLinea,
          combinaciones: null,
          error: mensajeDetallesPrimero(err, 'No se pudieron cargar los grupos de la línea.'),
        });
      });
  }, [abierto, idLinea]);

  // Lo cargado solo vale si es de la linea elegida AHORA.
  const cargaActual = cargaLinea !== null && cargaLinea.idLinea === idLinea ? cargaLinea : null;
  const combinaciones = cargaActual?.combinaciones ?? null;
  const cargandoOpciones = idLinea !== null && cargaActual === null;

  // --- Opciones de cada paso y lo elegido que sigue siendo valido ---
  const opcionesLinea = useMemo(() => lineas.map((l) => ({ id: l.id_linea, nombre: l.nombre_linea })), [lineas]);
  const lineaValida = contiene(opcionesLinea, idLinea) ? idLinea : null;

  const opcionesGrupo = useMemo(() => (combinaciones ? gruposDelRecorrido(combinaciones) : []), [combinaciones]);
  const grupoValido = lineaValida !== null && contiene(opcionesGrupo, idGrupo) ? idGrupo : null;

  const opcionesSubgrupo = useMemo(
    () => (combinaciones && grupoValido !== null ? subgruposDelRecorrido(combinaciones, grupoValido) : []),
    [combinaciones, grupoValido]
  );
  const subgrupoValido = grupoValido !== null && contiene(opcionesSubgrupo, idSubgrupo) ? idSubgrupo : null;

  const opcionesColegio = useMemo(
    () =>
      combinaciones && grupoValido !== null && subgrupoValido !== null
        ? colegiosDelRecorrido(combinaciones, grupoValido, subgrupoValido)
        : [],
    [combinaciones, grupoValido, subgrupoValido]
  );
  const colegioValido: EleccionColegio =
    subgrupoValido === null
      ? null
      : colegio === TODOS
        ? TODOS
        : contiene(opcionesColegio, colegio)
          ? colegio
          : null;

  const paso: Paso =
    lineaValida === null
      ? 1
      : grupoValido === null
        ? 2
        : subgrupoValido === null
          ? 3
          : colegioValido === null
            ? 4
            : 5;

  const idClienteElegido = typeof colegioValido === 'number' ? colegioValido : null;

  // --- Elegir en un paso descarta lo de los siguientes ---
  const volverAPaso = (destino: 1 | 2 | 3 | 4) => {
    setError(null);
    setUrlSinAbrir(null);
    setColegio(null);
    if (destino <= 3) setIdSubgrupo(null);
    if (destino <= 2) setIdGrupo(null);
    if (destino === 1) setIdLinea(null);
  };

  const elegirLinea = (id: number) => {
    volverAPaso(1);
    setIdLinea(id);
  };
  const elegirGrupo = (id: number) => {
    volverAPaso(2);
    setIdGrupo(id);
  };
  const elegirSubgrupo = (id: number) => {
    volverAPaso(3);
    setIdSubgrupo(id);
  };

  const nombreDe = (opciones: Opcion[], id: number | null) => opciones.find((o) => o.id === id)?.nombre ?? '';

  const migas: MigaPaso[] = [];
  if (lineaValida !== null) {
    migas.push({ clave: 'linea', texto: nombreDe(opcionesLinea, lineaValida), onClick: () => volverAPaso(1) });
  }
  if (grupoValido !== null) {
    migas.push({ clave: 'grupo', texto: nombreDe(opcionesGrupo, grupoValido), onClick: () => volverAPaso(2) });
  }
  if (subgrupoValido !== null) {
    migas.push({ clave: 'subgrupo', texto: nombreDe(opcionesSubgrupo, subgrupoValido), onClick: () => volverAPaso(3) });
  }
  if (colegioValido !== null) {
    migas.push({
      clave: 'colegio',
      texto: colegioValido === TODOS ? 'Todos los Colegios/Clubes' : nombreDe(opcionesColegio, colegioValido),
      onClick: () => volverAPaso(4),
    });
  }

  const generar = (reemplazar: ReporteGuardado | null) => {
    if (lineaValida === null || grupoValido === null || subgrupoValido === null || colegioValido === null) return;
    if (cargando) return;
    const pestana = abrirPestanaEnEspera();
    setUrlSinAbrir(null);

    ejecutar(async () => {
      try {
        const creado = await generarReporteArticulos({
          id_linea: lineaValida,
          id_grupo: grupoValido,
          id_subgrupo: subgrupoValido,
          id_cliente: idClienteElegido,
          ...(reemplazar ? { id_reporte_a_reemplazar: reemplazar.id_reporte } : {}),
        });
        if (pestana) {
          pestana.location.href = creado.url;
          onCerrar();
        } else {
          setMasAntiguo(null);
          setUrlSinAbrir(creado.url);
        }
      } catch (err) {
        pestana?.close();
        const delLimite = masAntiguoDelLimite(err);
        if (delLimite) {
          setMasAntiguo(delLimite);
          return;
        }
        throw err;
      }
    });
  };

  const enLimite = masAntiguo !== null;
  const errorDelModal = error
    ? { titulo: 'No se pudo generar el reporte', detalle: error }
    : cargaActual?.error
      ? { titulo: 'Ocurrió un error', detalle: cargaActual.error }
      : null;

  // --- Footer: los pasos solo cancelan; el ultimo genera ---
  let footer;
  if (urlSinAbrir) {
    footer = (
      <button type='button' onClick={onCerrar} className={`flex-1 ${claseBotonSecundario}`}>
        Cerrar
      </button>
    );
  } else if (paso < 5) {
    footer = (
      <button type='button' onClick={onCerrar} className={`flex-1 ${claseBotonSecundario}`}>
        Cancelar
      </button>
    );
  } else if (enLimite) {
    footer = (
      <div className='flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end'>
        <button type='button' onClick={onCerrar} disabled={cargando} className={claseBotonSecundario}>
          Cancelar
        </button>
        <button
          type='button'
          onClick={() => {
            onCerrar();
            navigate('/gestion/reportes');
          }}
          disabled={cargando}
          className={claseBotonSecundario}
        >
          Elegir otro en Reportes
        </button>
        <button
          type='button'
          onClick={() => generar(masAntiguo)}
          disabled={cargando}
          className='px-4 py-2 text-sm font-medium text-white rounded transition-colors bg-red-600 hover:bg-red-700 cursor-pointer disabled:bg-red-300 disabled:cursor-not-allowed'
        >
          {cargando ? 'Generando...' : 'Borrar el más antiguo y generar'}
        </button>
      </div>
    );
  } else {
    footer = (
      <>
        <button type='button' onClick={onCerrar} disabled={cargando} className={`flex-1 ${claseBotonSecundario}`}>
          Cancelar
        </button>
        <button
          type='button'
          onClick={() => generar(null)}
          disabled={cargando}
          className='flex-1 px-4 py-2 text-sm font-medium text-white rounded transition-colors bg-marca-500 hover:bg-marca-600 disabled:bg-marca-400 cursor-pointer disabled:cursor-not-allowed'
        >
          {cargando ? 'Generando...' : 'Generar reporte'}
        </button>
      </>
    );
  }

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo={TITULO_POR_PASO[paso]}
      ancho='2xl'
      clasePanel='select-none'
      error={errorDelModal}
      debajoDelTitulo={migas.length > 0 ? <MigasDePasos pasos={migas} className='flex flex-wrap items-center gap-2 mt-2 mb-4 text-sm' /> : <div className='mb-4' />}
      footer={footer}
    >
      {urlSinAbrir ? (
        <div className='rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800'>
          El reporte se generó, pero el navegador no dejó abrir la pestaña nueva.{' '}
          <a href={urlSinAbrir} target='_blank' rel='noreferrer' className='font-semibold underline'>
            Abrir reporte
          </a>
        </div>
      ) : (
        <>
          {/* En los pasos, un aviso corto; el detalle y la decision van al final. */}
          {enLimite && paso < 5 && (
            <p className='mb-3 rounded border border-acento-100 bg-acento-50 px-3 py-2 text-sm text-acento-800'>
              Hay {maximo ?? 'el máximo de'} reportes guardados: para generar uno nuevo vas a tener que borrar uno.
            </p>
          )}

          {paso === 1 && (
            <ListaSeleccionable
              opciones={opcionesLinea}
              onSeleccionar={(opcion) => elegirLinea(opcion.id)}
              mensajeVacio='No hay líneas cargadas.'
              placeholder='Buscar línea...'
            />
          )}

          {paso === 2 && (
            <ListaSeleccionable
              opciones={opcionesGrupo}
              onSeleccionar={(opcion) => elegirGrupo(opcion.id)}
              cargando={cargandoOpciones}
              mensajeCargando='Cargando grupos...'
              mensajeVacio='Esta línea no tiene artículos con grupo y subgrupo asignados.'
              placeholder='Buscar grupo...'
            />
          )}

          {paso === 3 && (
            <ListaSeleccionable
              opciones={opcionesSubgrupo}
              onSeleccionar={(opcion) => elegirSubgrupo(opcion.id)}
              mensajeVacio='Este grupo no tiene subgrupos con artículos en esta línea.'
              placeholder='Buscar subgrupo...'
            />
          )}

          {paso === 4 &&
            (opcionesColegio.length > 0 ? (
              <ListaSeleccionable
                opciones={opcionesColegio}
                onSeleccionar={(opcion) => setColegio(opcion.id)}
                mensajeVacio=''
                placeholder='Buscar Colegio/Club...'
                opcionTodos={{
                  nombre: 'Todos los Colegios/Clubes (Stock por talle)',
                  onSeleccionar: () => setColegio(TODOS),
                }}
              />
            ) : (
              <div className='rounded border border-neutro-200 px-3 py-6 text-center text-sm'>
                <p className='italic text-neutro-400'>Ningún Colegio/Club tiene artículos en este subgrupo.</p>
                <button
                  type='button'
                  onClick={() => setColegio(TODOS)}
                  className='mt-3 rounded px-3 py-1.5 font-semibold text-marca-600 transition-colors hover:bg-marca-50 cursor-pointer'
                >
                  Ver el Stock por talle de todo el subgrupo
                </button>
              </div>
            ))}

          {paso === 5 && grupoValido !== null && subgrupoValido !== null && combinaciones && (
            <>
              {enLimite && (
                <div className='mb-4 rounded border border-acento-100 bg-acento-50 p-3 text-sm text-acento-800'>
                  <p>
                    Se alcanzó el máximo de {maximo ?? 'reportes'} reportes guardados. Para generar uno nuevo hay que
                    borrar al menos uno. Te proponemos borrar el más antiguo:
                  </p>
                  <a
                    href={masAntiguo.url}
                    target='_blank'
                    rel='noreferrer'
                    title='Abrir el PDF en otra pestaña'
                    className='mt-2 block rounded border border-acento-100 bg-white p-2 text-neutro-900 transition-colors hover:bg-neutro-100'
                  >
                    <span className='flex flex-wrap items-baseline justify-between gap-x-3'>
                      <span className='font-semibold'>{ETIQUETAS_TIPO_REPORTE[masAntiguo.tipo]}</span>
                      <span className='text-xs text-neutro-600'>{formatearFechaHora(masAntiguo.fecha_generado)}</span>
                    </span>
                    <span className='block text-xs text-neutro-600'>{resumenParametros(masAntiguo.parametros)}</span>
                    <span className='mt-1 block text-xs font-semibold text-marca-600'>Ver PDF ↗</span>
                  </a>
                </div>
              )}

              <div className='rounded border border-neutro-200 bg-neutro-50 p-4 text-sm text-neutro-600'>
                <p className='text-base font-semibold text-neutro-900'>
                  {ETIQUETAS_TIPO_REPORTE[idClienteElegido === null ? 'general' : 'colegio']}
                </p>
                <p className='mt-1'>
                  {idClienteElegido === null
                    ? 'Una fila por Colegio/Club y una columna por talle, con la cantidad en stock de cada uno.'
                    : 'Descripción, talle y cantidad de cada artículo, con una columna “Cantidad a producir” para completar en el PDF o a mano en papel.'}
                </p>
                <p className='mt-2'>
                  Incluye{' '}
                  <span className='font-semibold text-neutro-900'>
                    {articulosDelRecorrido(combinaciones, grupoValido, subgrupoValido, idClienteElegido).toLocaleString('es-AR')}
                  </span>{' '}
                  artículos.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </BaseModal>
  );
}
