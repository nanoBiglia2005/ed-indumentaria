// Recorrido para elegir QUE articulos se van a tarifar, en pasos, igual que el
// asistente de AgregarProductoModal: paso 1 LINEA, paso 2 GRUPO, paso 3
// SUBGRUPO. El paso sale de lo que hay elegido, asi que avanza solo; las migas
// muestran lo elegido y vuelven a cualquier paso para cambiarlo.
//
// Cada paso ofrece SOLO lo que existe en el anterior: los grupos que tienen
// articulos en esa linea y los subgrupos que tienen articulos en ese grupo.
//
// Al elegir el subgrupo se confirma y el modal se cierra: la pagina se queda
// con el recorte y pide los talles.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LINEAS } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import ListaSeleccionable from '@/components/ui/ListaSeleccionable';
import MigasDePasos from '@/components/ui/MigasDePasos';
import type { MigaPaso } from '@/components/ui/MigasDePasos';
// Mismo id ficticio que usan los filtros de la tabla para "Sin asignar": los
// subgrupos reales son autoincrement (> 0), asi que el -1 nunca choca.
import { SIN_ASIGNAR_ID } from '@/components/tabla/tipos';
import type { Opcion } from '@/types/comunes';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { listarLineas } from '@/api/agrupaciones';
import { listarArticulosDeLinea } from '@/api/precios';
import type { RespuestaArticulosDeLinea } from '@/api/precios';

/**
 * Lo elegido en el recorrido. `idSubgrupo` en null son los articulos SIN
 * subgrupo (la opcion "Sin Subgrupo"), que es justo lo que espera la API.
 * Los nombres viajan para poder mostrarlos sin volver a buscarlos.
 */
export interface Recorte {
  idLinea: number;
  idGrupo: number;
  idSubgrupo: number | null;
  nombreLinea: string;
  nombreGrupo: string;
  nombreSubgrupo: string;
}

interface SeleccionRecorteModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (recorte: Recorte) => void;
  /**
   * Desde donde arranca el recorrido: sirve para editar un paso puntual sin
   * rehacer los anteriores. Se leen UNA sola vez (al montar), asi que la pagina
   * remonta el modal con otra `key` en cada apertura.
   */
  idLineaInicial?: number | null;
  idGrupoInicial?: number | null;
}

/** Articulos de una linea, con la linea que los produjo. */
type CargaLinea = {
  idLinea: number;
  datos: RespuestaArticulosDeLinea | null;
  error: string | null;
};

export default function SeleccionRecorteModal({
  abierto,
  onCerrar,
  onConfirmar,
  idLineaInicial = null,
  idGrupoInicial = null,
}: SeleccionRecorteModalProps) {
  const [idLinea, setIdLinea] = useState<number | null>(idLineaInicial);
  const [idGrupo, setIdGrupo] = useState<number | null>(idGrupoInicial);

  const [lineas, setLineas] = useState<LINEAS[]>([]);
  const [cargandoLineas, setCargandoLineas] = useState(true);
  const [errorLineas, setErrorLineas] = useState<string | null>(null);

  const [cargaLinea, setCargaLinea] = useState<CargaLinea | null>(null);

  useEffect(() => {
    listarLineas()
      .then(setLineas)
      .catch((error) => {
        console.error('Error al obtener las lineas:', error);
        setErrorLineas(mensajeDetallesPrimero(error, 'No se pudieron cargar las líneas.'));
      })
      .finally(() => setCargandoLineas(false));
  }, []);

  // Las respuestas pueden llegar desordenadas (una consulta lenta despues de
  // una rapida): solo se acepta la de la ultima peticion disparada.
  const secuenciaLinea = useRef(0);

  useEffect(() => {
    if (idLinea === null) return;

    const peticion = ++secuenciaLinea.current;

    listarArticulosDeLinea(idLinea)
      .then((datos) => {
        if (peticion !== secuenciaLinea.current) return;
        setCargaLinea({ idLinea, datos, error: null });
      })
      .catch((error) => {
        if (peticion !== secuenciaLinea.current) return;
        console.error('Error al obtener los articulos de la linea:', error);
        setCargaLinea({
          idLinea,
          datos: null,
          error: mensajeDetallesPrimero(error, 'No se pudieron cargar los artículos de la línea.'),
        });
      });
  }, [idLinea]);

  // Lo cargado solo vale si es de la linea que esta elegida AHORA.
  const lineaCargada = cargaLinea !== null && cargaLinea.idLinea === idLinea ? cargaLinea : null;
  const datosLinea = lineaCargada?.datos ?? null;
  const errorLinea = lineaCargada?.error ?? null;
  const cargandoLinea = idLinea !== null && lineaCargada === null;

  const opcionesLineas: Opcion[] = useMemo(
    () => lineas.map((linea) => ({ id: linea.id_linea, nombre: linea.nombre_linea })),
    [lineas]
  );

  // Grupos presentes entre los articulos de la linea. El backend ya descarta
  // "No Asignado": no es un grupo real y no se le fijan precios.
  const opcionesGrupos: Opcion[] = datosLinea?.grupos ?? [];

  // El grupo elegido solo cuenta si la linea actual lo tiene.
  const idGrupoValido = opcionesGrupos.some((opcion) => opcion.id === idGrupo) ? idGrupo : null;

  // Subgrupos presentes una vez filtrada la lista por el grupo elegido.
  const opcionesSubgrupos: Opcion[] = useMemo(() => {
    if (datosLinea === null || idGrupoValido === null) return [];

    const delGrupo = datosLinea.articulos.filter((articulo) => articulo.id_grupo === idGrupoValido);
    const idsPresentes = new Set(
      delGrupo.map((articulo) => articulo.id_subgrupo).filter((id): id is number => id !== null)
    );

    const opciones: Opcion[] = datosLinea.subgrupos
      .filter((subgrupo) => idsPresentes.has(subgrupo.id))
      .map((subgrupo) => ({ id: subgrupo.id, nombre: subgrupo.nombre }));

    // Sin esta opcion, los articulos sin subgrupo no se podrian tocar nunca.
    if (delGrupo.some((articulo) => articulo.id_subgrupo === null)) {
      opciones.push({ id: SIN_ASIGNAR_ID, nombre: 'Sin Subgrupo' });
    }

    return opciones;
  }, [datosLinea, idGrupoValido]);

  const paso = idLinea === null ? 1 : idGrupoValido === null ? 2 : 3;

  const volverAPaso = (destino: 1 | 2) => {
    setIdGrupo(null);
    if (destino === 1) setIdLinea(null);
  };

  const nombreDe = (opciones: Opcion[], id: number | null) =>
    opciones.find((opcion) => opcion.id === id)?.nombre ?? '';

  const nombreLinea = nombreDe(opcionesLineas, idLinea);
  const nombreGrupo = nombreDe(opcionesGrupos, idGrupoValido);

  // Elegir en un paso descarta lo del siguiente: son opciones de OTRO recorte.
  const handleElegirLinea = (opcion: Opcion) => {
    setIdLinea(opcion.id);
    setIdGrupo(null);
  };

  const handleElegirSubgrupo = (opcion: Opcion) => {
    if (idLinea === null || idGrupoValido === null) return;

    onConfirmar({
      idLinea,
      idGrupo: idGrupoValido,
      idSubgrupo: opcion.id === SIN_ASIGNAR_ID ? null : opcion.id,
      nombreLinea,
      nombreGrupo,
      nombreSubgrupo: opcion.nombre,
    });
  };

  const migas: MigaPaso[] = [];
  if (idLinea !== null) {
    migas.push({ clave: 'linea', texto: nombreLinea, onClick: () => volverAPaso(1) });
  }
  if (idGrupoValido !== null) {
    migas.push({ clave: 'grupo', texto: nombreGrupo, onClick: () => volverAPaso(2) });
  }

  const error = errorLineas ?? errorLinea;

  const titulo = paso === 1 ? 'Elegí una línea' : paso === 2 ? 'Elegí un grupo' : 'Elegí un subgrupo';

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={titulo}
      ancho='2xl'
      clasePanel='select-none'
      error={error ? { titulo: 'Ocurrió un error', detalle: error } : null}
      debajoDelTitulo={migas.length > 0 ? <MigasDePasos pasos={migas} /> : <div className='mb-4' />}
      footer={
        <button
          onClick={onCerrar}
          className='w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
        >
          Cerrar
        </button>
      }
    >
      {paso === 1 && (
        <ListaSeleccionable
          opciones={opcionesLineas}
          onSeleccionar={handleElegirLinea}
          cargando={cargandoLineas}
          mensajeCargando='Cargando líneas...'
          mensajeVacio='No hay líneas cargadas.'
          placeholder='Buscar línea...'
        />
      )}

      {paso === 2 && (
        <ListaSeleccionable
          opciones={opcionesGrupos}
          onSeleccionar={(opcion) => setIdGrupo(opcion.id)}
          cargando={cargandoLinea}
          mensajeCargando='Cargando grupos...'
          mensajeVacio={
            // Puede pasar que la linea tenga articulos pero todos en "No
            // Asignado", que no se ofrece como grupo.
            datosLinea !== null && datosLinea.articulos.length > 0
              ? 'Esta línea solo tiene artículos sin grupo asignado.'
              : 'Esta línea no tiene artículos.'
          }
          placeholder='Buscar grupo...'
        />
      )}

      {paso === 3 && (
        <ListaSeleccionable
          opciones={opcionesSubgrupos}
          onSeleccionar={handleElegirSubgrupo}
          mensajeVacio='Este grupo no tiene subgrupos con artículos.'
          placeholder='Buscar subgrupo...'
        />
      )}
    </BaseModal>
  );
}
