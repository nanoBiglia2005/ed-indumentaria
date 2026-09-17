import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RemitoConDetalles, RemitoCreado, TIPOS_DE_PAGO } from '@backend/types';
import { listarTiposDePago } from '@/api/tiposDePago';
import { useTablaServidor } from '@/components/tabla/useTablaServidor';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import Paginador from '@/components/tabla/Paginador';
import { listarRemitosPendientesPagina } from '@/api/remitos';
import type { ParamsRemitos } from '@/api/remitos';
import ConfirmarAccionRemitoModal from '@/features/ventas/modales/ConfirmarAccionRemitoModal';
import { ACCION_ANULAR } from '@/features/ventas/modales/accionesDeRemito';
import ListaDeRemitos from '@/features/ventas/ListaDeRemitos';
import RemitoDestacado from '@/features/ventas/RemitoDestacado';
import { idRemitoDeQuery } from '@/features/ventas/deepLinkRemito';
import { useOpcionesDeFiltro } from '@/features/ventas/useOpcionesDeFiltro';
import type { OpcionesCargadas } from '@/features/ventas/useOpcionesDeFiltro';
import { camposVentasPendientes } from '@/features/ventas/campos';
import MetodoPagoModal from '@/features/ventas/modales/MetodoPagoModal';
import NuevaVentaModal from '@/features/ventas/modales/NuevaVentaModal';
import CrearPresupuestoModal from '@/features/ventas/modales/CrearPresupuestoModal';
import Notificacion from '@/components/ui/Notificacion';
import SectionWrapper from '@/components/layout/SectionWrapper';
import VentaExitosaModal from '@/features/ventas/modales/VentaExitosaModal';
import { codigoRemito } from '@/features/ventas/codigoRemito';
import { useNotificacion } from '@/hooks/useNotificacion';

const TAMANO_PAGINA = 30;

/** Como se nombra la venta en los avisos: "Venta 0812", o sin codigo si no tiene. */
const textoDelRemito = (remito: RemitoConDetalles) => {
  const codigo = codigoRemito(remito.cod_mes, remito.cod_remito_final);
  return codigo ? `Venta ${codigo}` : 'La venta';
};

function VentasPage() {
  const [pendientes, setPendientes] = useState<RemitoConDetalles[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  // Opciones del filtro de seleccion recien abierto (hoy solo "Cliente"): el
  // estado vive aca, ANTES de useTablaServidor, porque este lo necesita de
  // entrada — ver el comentario de cabecera de useOpcionesDeFiltro.
  const [opciones, setOpciones] = useState<OpcionesCargadas | null>(null);

  // Deep-link `?remito=<id>`: una venta puntual por encima de la lista, sin
  // tocar filtros ni paginacion (ver deepLinkRemito.ts).
  const [searchParams, setSearchParams] = useSearchParams();
  const idRemitoDestacado = idRemitoDeQuery(searchParams);

  // Estado de filtros por columna + multi-orden (sin filtrar en memoria):
  // Ventas no ofrece Estado ni Fecha de emision (ver campos.ts).
  const tabla = useTablaServidor({ columnas: camposVentasPendientes, opciones: opciones?.valores ?? [] });

  // Cambia de identidad solo cuando cambia algun filtro o el orden.
  const params = useMemo<ParamsRemitos>(
    () => ({ filtros: tabla.filtrosColumna, orden: tabla.ordenColumnas }),
    [tabla.filtrosColumna, tabla.ordenColumnas]
  );

  const opcionesListas = useOpcionesDeFiltro('pendientes', params, tabla.columnaAbierta, opciones, setOpciones);

  // Cualquier cambio de filtro/orden vuelve a la primera pagina.
  useResetAlCambiar(params, () => setPagina(1));

  // Cualquier disparador de una consulta nueva (filtro/orden, pagina o
  // recarga) marca "cargando" y limpia el error ya en este render — evita
  // setState sincronico dentro del efecto (react-hooks/set-state-in-effect).
  const marcarCargando = () => {
    setCargando(true);
    setError(null);
  };
  useResetAlCambiar(params, marcarCargando);
  useResetAlCambiar(pagina, marcarCargando);
  useResetAlCambiar(recarga, marcarCargando);

  // Las respuestas pueden llegar desordenadas: solo se acepta la de la ultima
  // peticion disparada.
  const secuencia = useRef(0);

  useEffect(() => {
    const peticion = ++secuencia.current;

    listarRemitosPendientesPagina(params, pagina, TAMANO_PAGINA)
      .then((respuesta) => {
        if (peticion !== secuencia.current) return;
        setPendientes(respuesta.remitos);
        setTotal(respuesta.total);
        const ultima = Math.max(1, Math.ceil(respuesta.total / TAMANO_PAGINA));
        if (pagina > ultima) setPagina(ultima);
      })
      .catch((err) => {
        if (peticion !== secuencia.current) return;
        console.error('Error al obtener las ventas pendientes:', err);
        setError('No se pudieron cargar las ventas pendientes.');
      })
      .finally(() => {
        if (peticion === secuencia.current) setCargando(false);
      });
  }, [params, pagina, recarga]);

  const fetchPendientes = () => setRecarga((n) => n + 1);

  const [isNuevaVentaOpen, setIsNuevaVentaOpen] = useState(false);
  const [isPresupuestoOpen, setIsPresupuestoOpen] = useState(false);
  // Remito recien registrado: se pregunta si se sigue al pago.
  const [ventaRegistrada, setVentaRegistrada] = useState<RemitoCreado | null>(null);
  // Remito que se esta cobrando / anulando.
  const [remitoACobrar, setRemitoACobrar] = useState<RemitoConDetalles | null>(null);
  const [remitoAAnular, setRemitoAAnular] = useState<RemitoConDetalles | null>(null);
  const [metodos, setMetodos] = useState<TIPOS_DE_PAGO[]>([]);
  const { notificacion, mostrar: mostrarNotificacion } = useNotificacion();

  // Los metodos (y sus recargos) se leen al abrir: pueden haber cambiado en
  // Configuracion desde que se cargo la pagina.
  useEffect(() => {
    if (cargando) return;

    let cancelado = false;

    listarTiposDePago()
      .then((data) => {
        if (cancelado) return;
        setMetodos([...data].sort((a, b) => a.id_tipos_de_pago - b.id_tipos_de_pago));
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener los tipos de pago:', err);
      });

    return () => {
      cancelado = true;
    };
  }, [cargando]);

  // El metodo sin recargo cobra el precio base, que ya se muestra aparte.
  const metodosConRecargo = useMemo(() => metodos.filter((metodo) => metodo.recargo > 0), [metodos]);

  const handleVentaRegistrada = (remito: RemitoCreado) => {
    setIsNuevaVentaOpen(false);
    fetchPendientes();
    setVentaRegistrada(remito);
  };

  // Un presupuesto no se persiste ni entra en Ventas Pendientes: no hay nada
  // que recargar, el aviso es lo unico que confirma que el ticket salio.
  const handlePresupuestoImpreso = () => {
    setIsPresupuestoOpen(false);
    mostrarNotificacion('Presupuesto impreso con éxito.');
  };

  const handleSeguirAlPago = (remito: RemitoCreado) => {
    setVentaRegistrada(null);
    setRemitoACobrar(remito);
  };

  // Ya no esta pendiente: sale de la lista y pasa al historial. Como al cobrar
  // se cierra todo y no queda ningun modal a la vista, el aviso es lo unico que
  // confirma que la venta se finalizo.
  const handleFacturado = (remito: RemitoConDetalles) => {
    setRemitoACobrar(null);
    fetchPendientes();
    mostrarNotificacion(`${textoDelRemito(remito)} finalizada con éxito.`);
  };

  // Igual que al cobrar: la venta sale de la lista y no queda ningun modal
  // abierto, asi que el aviso es lo unico que confirma que se anulo.
  const handleAnulado = (remito: RemitoConDetalles) => {
    setRemitoAAnular(null);
    fetchPendientes();
    mostrarNotificacion(`${textoDelRemito(remito)} anulada.`);
  };

  return (
    <SectionWrapper>
      <Notificacion mensaje={notificacion} posicion='pagina' />

      <div className='flex flex-col w-full h-full px-2 sm:px-5 sm:pt-10 pt-6 min-h-0 items-center'>
        {/* Dos acciones de arranque: la venta es la principal (boton lleno) y
            el presupuesto la alternativa (contorno de marca). */}
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <button
            type='button'
            onClick={() => setIsNuevaVentaOpen(true)}
            className='rounded flex items-center text-[25px] w-fit py-2 px-4 text-white font-semibold border cursor-pointer bg-marca-500 hover:bg-marca-600 active:bg-marca-700 transition-colors duration-100 ease-in'
          >
            Iniciar Nueva Venta
          </button>
          <button
            type='button'
            onClick={() => setIsPresupuestoOpen(true)}
            className='rounded flex items-center text-[25px] w-fit py-2 px-4 font-semibold border border-marca-600 text-marca-600 cursor-pointer hover:bg-marca-500 hover:text-white active:bg-marca-600 transition-colors duration-100 ease-in'
          >
            Crear Presupuesto
          </button>
        </div>

        <span className='text-2xl font-semibold text-black w-full mt-10 mb-4 shrink-0'>
          Ventas Pendientes
        </span>

        {idRemitoDestacado !== null && (
          <RemitoDestacado
            idRemito={idRemitoDestacado}
            onCerrar={() => setSearchParams({})}
          />
        )}

        <ListaDeRemitos
          remitos={pendientes}
          cargando={cargando && pendientes.length === 0}
          error={error}
          textoCargando='Cargando ventas pendientes...'
          textoVacio='No hay ventas pendientes que coincidan con los filtros.'
          anchoCompleto
          onPagar={setRemitoACobrar}
          onAnular={setRemitoAAnular}
          campos={camposVentasPendientes}
          filtrosColumna={tabla.filtrosColumna}
          ordenColumnas={tabla.ordenColumnas}
          onClickHeader={tabla.handleClickHeader}
          onClickOrdenar={tabla.handleClickOrdenar}
          columnaAbierta={tabla.columnaAbierta}
          opcionesFiltroAbierto={tabla.opcionesFiltroAbierto}
          opcionesListas={opcionesListas}
          onCerrarFiltro={() => tabla.setColumnaFiltroAbierta(null)}
          onAplicarFiltro={tabla.handleAplicarFiltro}
        />

        <div className='w-full'>
          <Paginador
            pagina={pagina}
            tamano={TAMANO_PAGINA}
            total={total}
            cargando={cargando}
            onCambiarPagina={setPagina}
          />
        </div>
      </div>

      <NuevaVentaModal
        abierto={isNuevaVentaOpen}
        metodosConRecargo={metodosConRecargo}
        onCerrar={() => setIsNuevaVentaOpen(false)}
        onVentaRegistrada={handleVentaRegistrada}
      />

      <CrearPresupuestoModal
        abierto={isPresupuestoOpen}
        metodosConRecargo={metodosConRecargo}
        onCerrar={() => setIsPresupuestoOpen(false)}
        onPresupuestoImpreso={handlePresupuestoImpreso}
      />

      <VentaExitosaModal
        abierto={ventaRegistrada !== null}
        remito={ventaRegistrada}
        metodosConRecargo={metodosConRecargo}
        onCerrar={() => setVentaRegistrada(null)}
        onSeguirAlPago={handleSeguirAlPago}
      />

      <MetodoPagoModal
        abierto={remitoACobrar !== null}
        remito={remitoACobrar}
        onCerrar={() => setRemitoACobrar(null)}
        onFacturado={handleFacturado}
      />

      <ConfirmarAccionRemitoModal
        abierto={remitoAAnular !== null}
        remito={remitoAAnular}
        accion={ACCION_ANULAR}
        onCerrar={() => setRemitoAAnular(null)}
        onHecho={handleAnulado}
      />
    </SectionWrapper>
  );
}

export default VentasPage;
