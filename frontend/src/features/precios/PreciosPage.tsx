// Actualizacion masiva de precios por talle.
//
// La pagina ES la tabla: se ve siempre, con o sin recorte elegido. QUE
// articulos se tarifan lo elige SeleccionRecorteModal (linea -> grupo ->
// subgrupo), que se abre solo al entrar y se puede volver a abrir con el boton
// "Buscar Talle" o clickeando cualquiera de las migas.
//
// Con el recorte elegido se piden los TALLES distintos, cada uno con los ids de
// sus articulos. Los ids se guardan por talle y la actualizacion viaja POR ID:
// si alguien le cambia el talle a un articulo mientras se estan cargando los
// precios, el precio cae igual en los articulos que estaban en pantalla.
//
// Los talles quedan ETIQUETADOS con la consulta que los produjo (mismo idiom
// que las opciones de filtro de ArticulosPage): lo que no corresponde al
// recorte actual simplemente no se usa.
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRECIO_MAX } from '@backend/types';
import SectionWrapper from '@/components/layout/SectionWrapper';
import MigasDePasos from '@/components/ui/MigasDePasos';
import type { MigaPaso } from '@/components/ui/MigasDePasos';
import { compararTalles } from '@/utils/talles';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { listarTallesDePrecios, actualizarPrecios } from '@/api/precios';
import type { TalleDePrecios } from '@/api/precios';
import TablaPreciosPorTalle from './TablaPreciosPorTalle';
import type { FilaPrecio } from './TablaPreciosPorTalle';
import SeleccionRecorteModal from './modales/SeleccionRecorteModal';
import type { Recorte } from './modales/SeleccionRecorteModal';
import ConfirmarPreciosModal from './modales/ConfirmarPreciosModal';

const MAX_DIGITOS_PRECIO = String(PRECIO_MAX).length;

// Clave de la fila de los articulos sin talle. Es un NUL: el backend devuelve
// los talles ya recortados y nunca vacios, asi que no puede chocar con uno real.
const CLAVE_SIN_TALLE = ' ';

const claveDeTalle = (talle: string | null) => talle ?? CLAVE_SIN_TALLE;

/** Deja solo digitos y saca los ceros a la izquierda ("0012" -> "12"). */
const normalizarPrecio = (valor: string) => valor.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

/** Talles de un recorte, con la clave del recorte que los produjo. */
type CargaTalles = {
  clave: string;
  talles: TalleDePrecios[] | null;
  error: string | null;
};

/**
 * Apertura del selector. `n` cambia en cada apertura para remontarlo (asi
 * relee desde donde tiene que arrancar y refresca sus listas); mientras se
 * cierra queda igual, para no cortarle la animacion de salida.
 */
type AperturaSelector = {
  n: number;
  abierto: boolean;
  idLinea: number | null;
  idGrupo: number | null;
};

const SIN_PRECIOS: Record<string, string> = {};

function PreciosPage() {
  // Lo elegido en el selector. Null = todavia no se eligio nada.
  const [recorte, setRecorte] = useState<Recorte | null>(null);

  const [selector, setSelector] = useState<AperturaSelector>({
    n: 0,
    abierto: false,
    idLinea: null,
    idGrupo: null,
  });

  const [cargaTalles, setCargaTalles] = useState<CargaTalles | null>(null);
  // Se incrementa despues de guardar para volver a pedir los talles.
  const [recarga, setRecarga] = useState(0);

  // Lo tipeado en cada input, por clave de talle, junto al recorte al que
  // pertenece: al cambiar de recorte los valores viejos dejan de aplicar (dos
  // recortes distintos pueden tener el mismo talle "10").
  const [precios, setPrecios] = useState<{ clave: string; valores: Record<string, string> } | null>(
    null
  );
  const [confirmando, setConfirmando] = useState(false);
  const [exito, setExito] = useState<{ clave: string; texto: string } | null>(null);

  const abrirSelector = (idLinea: number | null, idGrupo: number | null) =>
    setSelector((actual) => ({ n: actual.n + 1, abierto: true, idLinea, idGrupo }));

  const cerrarSelector = () => setSelector((actual) => ({ ...actual, abierto: false }));

  const handleConfirmarRecorte = (elegido: Recorte) => {
    setRecorte(elegido);
    cerrarSelector();
  };

  // Identifica el recorte pedido. `recarga` entra en la clave para que guardar
  // vuelva a traer los talles (los ids pueden haber cambiado mientras tanto).
  const claveRecorte =
    recorte === null
      ? null
      : `${recorte.idLinea}|${recorte.idGrupo}|${recorte.idSubgrupo}|${recarga}`;

  // Las respuestas pueden llegar desordenadas (una consulta lenta despues de
  // una rapida): solo se acepta la de la ultima peticion disparada.
  const secuenciaTalles = useRef(0);

  useEffect(() => {
    if (recorte === null || claveRecorte === null) return;

    const peticion = ++secuenciaTalles.current;

    listarTallesDePrecios(recorte.idLinea, recorte.idGrupo, recorte.idSubgrupo)
      .then(({ talles }) => {
        if (peticion !== secuenciaTalles.current) return;
        setCargaTalles({ clave: claveRecorte, talles, error: null });
      })
      .catch((error) => {
        if (peticion !== secuenciaTalles.current) return;
        console.error('Error al obtener los talles:', error);
        setCargaTalles({
          clave: claveRecorte,
          talles: null,
          error: mensajeDetallesPrimero(error, 'No se pudieron cargar los talles.'),
        });
      });
  }, [recorte, claveRecorte]);

  const tallesCargados =
    cargaTalles !== null && cargaTalles.clave === claveRecorte ? cargaTalles : null;
  const talles = tallesCargados?.talles ?? null;
  const errorTalles = tallesCargados?.error ?? null;
  const cargandoTalles = claveRecorte !== null && tallesCargados === null;

  // Los precios tipeados valen solo mientras siga el mismo recorte.
  const valoresPrecios =
    precios !== null && precios.clave === claveRecorte ? precios.valores : SIN_PRECIOS;

  // Mismo orden de talles que la DataGrid: numerico cuando se puede, y los
  // articulos sin talle al final.
  const filas: FilaPrecio[] = useMemo(() => {
    if (talles === null) return [];

    return [...talles]
      .sort((a, b) => compararTalles(a.talle, b.talle))
      .map((fila) => {
        const clave = claveDeTalle(fila.talle);
        return {
          clave,
          etiqueta: fila.talle ?? 'Sin Talle',
          cantidad: fila.ids.length,
          valor: valoresPrecios[clave] ?? '',
        };
      });
  }, [talles, valoresPrecios]);

  // Solo los talles con precio cargado: es lo que se manda y lo que habilita el
  // boton.
  const actualizaciones = useMemo(() => {
    if (talles === null) return [];

    return talles
      .map((fila) => ({ precio: valoresPrecios[claveDeTalle(fila.talle)] ?? '', ids: fila.ids }))
      .filter((entrada) => entrada.precio !== '')
      .map((entrada) => ({ precio: Number(entrada.precio), ids: entrada.ids }));
  }, [talles, valoresPrecios]);

  const articulosAActualizar = actualizaciones.reduce((total, { ids }) => total + ids.length, 0);
  const puedeActualizar = actualizaciones.length > 0;

  // El aviso de "listo" es de la tanda recien guardada: sobrevive a la recarga
  // de los talles, pero no a un cambio de recorte.
  const claveDelExito =
    recorte === null ? '' : `${recorte.idLinea}|${recorte.idGrupo}|${recorte.idSubgrupo}`;
  const mensajeExito = exito !== null && exito.clave === claveDelExito ? exito.texto : null;

  const handleCambiarPrecio = (claveTalle: string, valor: string) => {
    if (claveRecorte === null) return;
    const limpio = normalizarPrecio(valor);

    setPrecios((previos) => ({
      clave: claveRecorte,
      valores: {
        ...(previos !== null && previos.clave === claveRecorte ? previos.valores : {}),
        [claveTalle]: limpio,
      },
    }));
  };

  const handleConfirmar = async () => {
    const { actualizados } = await actualizarPrecios(actualizaciones);

    setPrecios(null);
    setExito({
      clave: claveDelExito,
      texto: `Se actualizó el precio de ${actualizados} ${
        actualizados === 1 ? 'artículo' : 'artículos'
      }.`,
    });
    setRecarga((numero) => numero + 1);
  };

  // Migas del recorte elegido: cada una vuelve a abrir el selector en su paso.
  const migas: MigaPaso[] =
    recorte === null
      ? []
      : [
          {
            clave: 'linea',
            texto: recorte.nombreLinea,
            onClick: () => abrirSelector(null, null),
          },
          {
            clave: 'grupo',
            texto: recorte.nombreGrupo,
            onClick: () => abrirSelector(recorte.idLinea, null),
          },
          {
            clave: 'subgrupo',
            texto: recorte.nombreSubgrupo,
            onClick: () => abrirSelector(recorte.idLinea, recorte.idGrupo),
          },
        ];

  const botonBuscarTalle = (
    <button
      type='button'
      onClick={() => abrirSelector(recorte?.idLinea ?? null, recorte?.idGrupo ?? null)}
      className='rounded border px-4 py-2 font-semibold text-white bg-violet-500 whitespace-nowrap transition-colors duration-100 ease-in cursor-pointer hover:bg-violet-600'
    >
      Buscar Talle
    </button>
  );

  return (
    <SectionWrapper>
      <div className='flex flex-col h-full min-h-0 px-2 sm:px-5 py-4 gap-3'>
        <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
          <span className='text-2xl font-semibold text-black'>Precios</span>

          {/* El recorte elegido queda siempre a la vista y cada paso se puede
              volver a elegir sin rehacer los otros. */}
          {migas.length > 0 && (
            <MigasDePasos pasos={migas} className='flex flex-wrap items-center gap-2 text-sm' />
          )}
        </div>

        {errorTalles && (
          <p className='rounded border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-700'>
            {errorTalles}
          </p>
        )}

        {mensajeExito && (
          <p className='rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700'>
            {mensajeExito}
          </p>
        )}

        <TablaPreciosPorTalle
          filas={filas}
          onCambiarPrecio={handleCambiarPrecio}
          maxDigitos={MAX_DIGITOS_PRECIO}
          estadoVacio={
            <div className='flex flex-col items-center gap-3 py-10 text-center'>
              {recorte === null ? (
                <>
                  <p className='text-gray-400 italic'>
                    Elegí una línea, un grupo y un subgrupo para ver sus talles.
                  </p>
                  {botonBuscarTalle}
                </>
              ) : cargandoTalles ? (
                <p className='text-gray-400 italic'>Cargando talles...</p>
              ) : (
                <>
                  <p className='text-gray-400 italic'>Este subgrupo no tiene artículos.</p>
                  {botonBuscarTalle}
                </>
              )}
            </div>
          }
        />

        {/* Sin talles en pantalla no hay nada que actualizar: la botonera
            aparece recien con la tabla cargada. */}
        {filas.length > 0 && (
          <div className='flex flex-wrap items-center justify-end gap-3'>
            {/* Con el boton apagado siempre se dice por que, y con el prendido a
                cuanto alcanza: no hay que adivinar nada. */}
            <span className='text-sm text-gray-500'>
              {puedeActualizar
                ? `Se van a actualizar ${articulosAActualizar} ${
                    articulosAActualizar === 1 ? 'artículo' : 'artículos'
                  } en ${actualizaciones.length} ${
                    actualizaciones.length === 1 ? 'talle' : 'talles'
                  }.`
                : 'Escribí un precio en al menos un talle para poder actualizar.'}
            </span>
            <button
              type='button'
              onClick={() => setConfirmando(true)}
              disabled={!puedeActualizar}
              className='rounded border px-3 py-1.5 lg:px-4 lg:py-2 font-semibold text-white bg-violet-500 whitespace-nowrap transition-colors duration-100 ease-in cursor-pointer hover:bg-violet-600 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed'
            >
              Actualizar Precios
            </button>
          </div>
        )}
      </div>

      <SeleccionRecorteModal
        key={selector.n}
        abierto={selector.abierto}
        onCerrar={cerrarSelector}
        onConfirmar={handleConfirmarRecorte}
        idLineaInicial={selector.idLinea}
        idGrupoInicial={selector.idGrupo}
      />

      <ConfirmarPreciosModal
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
        cantidadTalles={actualizaciones.length}
        cantidadArticulos={articulosAActualizar}
        onConfirmar={handleConfirmar}
      />
    </SectionWrapper>
  );
}

export default PreciosPage;
