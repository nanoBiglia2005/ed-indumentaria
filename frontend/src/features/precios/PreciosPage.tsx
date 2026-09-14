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
// Cada talle se despliega para editar el precio de sus articulos UNO POR UNO.
// La UNICA fuente de lo tipeado es `preciosArticulo` (por id de articulo): el
// input del talle no tiene estado propio, es una vista derivada que cascadea
// su valor a todos los articulos de la fila al escribir en el. Por eso el
// input de un articulo muestra su VALUE precargado con el precio actual (no un
// placeholder: es un numero concreto), mientras que el del talle solo puede
// mostrar un VALUE cuando sus articulos valen todos lo mismo — si no, cae a
// PLACEHOLDER con el rango, porque el input no puede representar un rango como
// valor. Tocar un articulo suelto listo rompe esa igualdad y el talle vuelve a
// mostrar el rango solo, sin que haga falta "limpiar" nada aparte.
//
// El boton de actualizar (y el indicador por fila) comparan cada valor tipeado
// contra el precio ORIGINAL del articulo (el que trajo el backend): si son
// iguales no cuenta como cambio, aunque haya una entrada en `preciosArticulo`
// (p. ej. se tipeo el mismo precio que ya tenia, o se cascadeo desde el talle
// a un articulo que ya valia eso).
//
// Los talles quedan ETIQUETADOS con la consulta que los produjo (mismo idiom
// que las opciones de filtro de ArticulosPage): lo que no corresponde al
// recorte actual simplemente no se usa.
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRECIO_MAX } from '@backend/types';
import type { TIPOS_DE_PAGO } from '@backend/types';
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
import { listarTiposDePago } from '@/api/tiposDePago';

const MAX_DIGITOS_PRECIO = String(PRECIO_MAX).length;

// Clave de la fila de los articulos sin talle. Es un NUL: el backend devuelve
// los talles ya recortados y nunca vacios, asi que no puede chocar con uno real.
const CLAVE_SIN_TALLE = ' ';

const claveDeTalle = (talle: string | null) => talle ?? CLAVE_SIN_TALLE;

/** Deja solo digitos y saca los ceros a la izquierda ("0012" -> "12"). */
const normalizarPrecio = (valor: string) => valor.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

// Los precios de la base son Float y se muestran tal cual: un entero ya se ve
// "1500" (sin decimales de relleno) y los que no lo son se ven completos. NO se
// redondea: hay articulos cargados con precios chiquitos (0.0021) que a dos
// decimales se verian como "0", o sea un precio que no es el que tienen.
const textoPrecio = (precio: number) => String(precio);

/**
 * Precio que muestra el input como placeholder: el precio comun, o el rango
 * "mas bajo - mas alto" cuando los articulos no valen todos lo mismo.
 */
const placeholderDePrecio = (precioMin: number, precioMax: number) =>
  precioMin === precioMax
    ? textoPrecio(precioMin)
    : `${textoPrecio(precioMin)} - ${textoPrecio(precioMax)}`;

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

const SIN_PRECIOS_ARTICULO: Record<number, string> = {};

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

  // Lo tipeado en el input de CADA ARTICULO (por id), etiquetado con el recorte
  // al que pertenece (dos recortes distintos pueden compartir un mismo id si
  // el usuario vuelve atras, aunque no deberia con la clave de mas abajo). Es
  // la UNICA fuente de lo que se manda y de lo que se muestra: no hay un
  // estado aparte para el input del talle, se deriva de estos en `filas`.
  const [preciosArticulo, setPreciosArticulo] = useState<{
    clave: string;
    valores: Record<number, string>;
  } | null>(null);
  // Talle desplegado (uno solo a la vez), tambien etiquetado con el recorte:
  // al cambiar de recorte no queda abierto un talle de la busqueda anterior.
  const [desplegado, setDesplegado] = useState<{ clave: string; claveTalle: string | null } | null>(
    null
  );
  const [confirmando, setConfirmando] = useState(false);
  const [exito, setExito] = useState<{ clave: string; texto: string } | null>(null);
  // Para el desglose por metodo de pago que muestra cada talle.
  const [metodosDePago, setMetodosDePago] = useState<TIPOS_DE_PAGO[]>([]);

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

    listarTiposDePago()
      .then(setMetodosDePago)
      .catch((error) => console.error('Error al obtener los metodos de pago:', error));
  }, [recorte, claveRecorte]);

  const tallesCargados =
    cargaTalles !== null && cargaTalles.clave === claveRecorte ? cargaTalles : null;
  const talles = tallesCargados?.talles ?? null;
  const errorTalles = tallesCargados?.error ?? null;
  const cargandoTalles = claveRecorte !== null && tallesCargados === null;

  // Los precios tipeados valen solo mientras siga el mismo recorte.
  const valoresPreciosArticulo =
    preciosArticulo !== null && preciosArticulo.clave === claveRecorte
      ? preciosArticulo.valores
      : SIN_PRECIOS_ARTICULO;
  const claveTalleAbierto =
    desplegado !== null && desplegado.clave === claveRecorte ? desplegado.claveTalle : null;

  // Mismo orden de talles que la DataGrid: numerico cuando se puede, y los
  // articulos sin talle al final.
  const filas: FilaPrecio[] = useMemo(() => {
    if (talles === null) return [];

    return [...talles]
      .sort((a, b) => compararTalles(a.talle, b.talle))
      .map((fila) => {
        // Precio EFECTIVO de cada articulo: lo tipeado si hay algo, si no el
        // de la base. `cambiado` compara contra el de la base (no contra si
        // hay o no una entrada tipeada): escribir el mismo precio que ya
        // tenia no cuenta como cambio.
        const articulos = fila.articulos.map((articulo) => {
          const tipeado = valoresPreciosArticulo[articulo.id];
          const efectivo = tipeado !== undefined ? Number(tipeado) : articulo.precio;
          return {
            id: articulo.id,
            descripcion: articulo.descripcion,
            valor: tipeado ?? textoPrecio(articulo.precio),
            efectivo,
            cambiado: tipeado !== undefined && efectivo !== articulo.precio,
          };
        });

        // El input del talle muestra un VALUE (precio concreto) solo cuando
        // todos sus articulos valen lo mismo; si no, cae a PLACEHOLDER con el
        // rango porque no hay un numero unico que mostrar como valor.
        let valorTalle = '';
        let placeholderTalle = '';
        if (articulos.length === 0) {
          placeholderTalle = placeholderDePrecio(fila.precioMin, fila.precioMax);
        } else {
          const min = Math.min(...articulos.map((a) => a.efectivo));
          const max = Math.max(...articulos.map((a) => a.efectivo));
          if (min === max) valorTalle = textoPrecio(min);
          else placeholderTalle = placeholderDePrecio(min, max);
        }

        return {
          clave: claveDeTalle(fila.talle),
          etiqueta: fila.talle ?? 'Sin Talle',
          cantidad: fila.ids.length,
          valor: valorTalle,
          placeholder: placeholderTalle,
          cambiado: articulos.some((a) => a.cambiado),
          articulos: articulos.map(({ id, descripcion, valor, cambiado }) => ({
            id,
            descripcion,
            valor,
            cambiado,
          })),
        };
      });
  }, [talles, valoresPreciosArticulo]);

  // Lo que se manda sale SIEMPRE de los precios por articulo (el input del
  // talle ya cascadeo su valor a los suyos), y SOLO de los que de verdad
  // cambiaron: tipear el mismo precio que ya tenia no genera una entrada. Se
  // agrupa por precio para no mandar una entrada por articulo: tras editar un
  // talle entero, todos sus articulos comparten el mismo numero.
  const actualizaciones = useMemo(() => {
    if (talles === null) return [];

    const porPrecio = new Map<number, number[]>();

    for (const articulo of talles.flatMap((fila) => fila.articulos)) {
      const tipeado = valoresPreciosArticulo[articulo.id];
      if (tipeado === undefined) continue;

      const precio = Number(tipeado);
      if (precio === articulo.precio) continue;

      const ids = porPrecio.get(precio);
      if (ids) ids.push(articulo.id);
      else porPrecio.set(precio, [articulo.id]);
    }

    return [...porPrecio].map(([precio, ids]) => ({ precio, ids }));
  }, [talles, valoresPreciosArticulo]);

  const articulosAActualizar = actualizaciones.reduce((total, { ids }) => total + ids.length, 0);
  const puedeActualizar = actualizaciones.length > 0;

  // Cuantos talles quedan tocados: no es `actualizaciones.length` (eso son
  // grupos de precio igual), pero es lo que el modal de confirmacion informa.
  const tallesAActualizar = useMemo(() => {
    if (talles === null) return 0;

    return talles.filter((fila) =>
      fila.articulos.some((articulo) => {
        const tipeado = valoresPreciosArticulo[articulo.id];
        return tipeado !== undefined && Number(tipeado) !== articulo.precio;
      })
    ).length;
  }, [talles, valoresPreciosArticulo]);

  // El aviso de "listo" es de la tanda recien guardada: sobrevive a la recarga
  // de los talles, pero no a un cambio de recorte.
  const claveDelExito =
    recorte === null ? '' : `${recorte.idLinea}|${recorte.idGrupo}|${recorte.idSubgrupo}`;
  const mensajeExito = exito !== null && exito.clave === claveDelExito ? exito.texto : null;

  // Si `limpio` es '' se BORRA la entrada en vez de guardarla vacia: asi un
  // articulo sin tipear cae directo a mostrar su precio de base (no queda un
  // input vacio "colgado"), y el chequeo de cambios (`tipeado !== undefined`)
  // no tiene que lidiar con un string vacio como caso especial.
  const conCambio = (
    valores: Record<number, string>,
    idArticulo: number,
    limpio: string
  ): Record<number, string> => {
    if (limpio === '') {
      const resto = { ...valores };
      delete resto[idArticulo];
      return resto;
    }
    return { ...valores, [idArticulo]: limpio };
  };

  const handleCambiarPrecio = (claveTalle: string, valor: string) => {
    if (claveRecorte === null || talles === null) return;
    const limpio = normalizarPrecio(valor);

    // El input del talle no tiene estado propio: es un atajo que pisa el
    // precio de todos sus articulos, que es lo unico que se guarda.
    const talle = talles.find((fila) => claveDeTalle(fila.talle) === claveTalle);
    if (talle === undefined) return;

    setPreciosArticulo((previos) => {
      let valores = previos !== null && previos.clave === claveRecorte ? previos.valores : {};
      for (const articulo of talle.articulos) valores = conCambio(valores, articulo.id, limpio);
      return { clave: claveRecorte, valores };
    });
  };

  const handleCambiarPrecioArticulo = (idArticulo: number, valor: string) => {
    if (claveRecorte === null) return;
    const limpio = normalizarPrecio(valor);

    setPreciosArticulo((previos) => ({
      clave: claveRecorte,
      valores: conCambio(
        previos !== null && previos.clave === claveRecorte ? previos.valores : {},
        idArticulo,
        limpio
      ),
    }));
  };

  const handleToggleTalle = (claveTalle: string) => {
    if (claveRecorte === null) return;

    setDesplegado((previo) => {
      const yaAbierto =
        previo !== null && previo.clave === claveRecorte && previo.claveTalle === claveTalle;
      return { clave: claveRecorte, claveTalle: yaAbierto ? null : claveTalle };
    });
  };

  const handleConfirmar = async () => {
    const { actualizados } = await actualizarPrecios(actualizaciones);

    setPreciosArticulo(null);
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
      className='rounded border px-4 py-2 font-semibold text-white bg-marca-500 whitespace-nowrap transition-colors duration-100 ease-in cursor-pointer hover:bg-marca-600'
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
          onCambiarPrecioArticulo={handleCambiarPrecioArticulo}
          abierto={claveTalleAbierto}
          onToggleTalle={handleToggleTalle}
          maxDigitos={MAX_DIGITOS_PRECIO}
          metodosDePago={metodosDePago}
          estadoVacio={
            <div className='flex flex-col items-center gap-3 py-10 text-center'>
              {recorte === null ? (
                <>
                  <p className='text-neutro-400 italic'>
                    Elegí una línea, un grupo y un subgrupo para ver sus talles.
                  </p>
                  {botonBuscarTalle}
                </>
              ) : cargandoTalles ? (
                <p className='text-neutro-400 italic'>Cargando talles...</p>
              ) : (
                <>
                  <p className='text-neutro-400 italic'>Este subgrupo no tiene artículos.</p>
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
            <span className='text-sm text-neutro-600'>
              {puedeActualizar
                ? `Se van a actualizar ${articulosAActualizar} ${
                    articulosAActualizar === 1 ? 'artículo' : 'artículos'
                  }.`
                : 'Cambiá el precio de al menos un artículo o talle para poder actualizar.'}
            </span>
            <button
              type='button'
              onClick={() => setConfirmando(true)}
              disabled={!puedeActualizar}
              className='rounded border px-3 py-1.5 lg:px-4 lg:py-2 font-semibold text-white bg-marca-500 whitespace-nowrap transition-colors duration-100 ease-in cursor-pointer hover:bg-marca-600 disabled:bg-marca-400 disabled:border-marca-400 disabled:cursor-not-allowed'
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
        cantidadTalles={tallesAActualizar}
        cantidadArticulos={articulosAActualizar}
        onConfirmar={handleConfirmar}
      />
    </SectionWrapper>
  );
}

export default PreciosPage;
