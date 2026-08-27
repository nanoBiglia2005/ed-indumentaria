import { useEffect, useState, useMemo} from 'react';
import type { RemitoConDetalles, RemitoCreado, TIPOS_DE_PAGO } from '@backend/types';
import { listarTiposDePago } from '@/api/tiposDePago';
import { useFetchLista } from '@/hooks/useFetchLista';
import { listarRemitosPendientes } from '@/api/remitos';
import ConfirmarAccionRemitoModal from '@/features/ventas/modales/ConfirmarAccionRemitoModal';
import { ACCION_ANULAR } from '@/features/ventas/modales/accionesDeRemito';
import ListaDeRemitos from '@/features/ventas/ListaDeRemitos';
import MetodoPagoModal from '@/features/ventas/modales/MetodoPagoModal';
import NuevaVentaModal from '@/features/ventas/modales/NuevaVentaModal';
import Notificacion from '@/components/ui/Notificacion';
import SectionWrapper from '@/components/layout/SectionWrapper';
import VentaExitosaModal from '@/features/ventas/modales/VentaExitosaModal';
import { codigoRemito } from '@/features/ventas/codigoRemito';
import { useNotificacion } from '@/hooks/useNotificacion';

/** Como se nombra la venta en los avisos: "Venta 0812", o sin codigo si no tiene. */
const textoDelRemito = (remito: RemitoConDetalles) => {
  const codigo = codigoRemito(remito.cod_mes, remito.cod_remito_final);
  return codigo ? `Venta ${codigo}` : 'La venta';
};

function VentasPage() {
  const {
    datos: pendientes,
    cargando,
    error,
    recargar: fetchPendientes,
  } = useFetchLista(
    listarRemitosPendientes,
    'No se pudieron cargar las ventas pendientes.',
    'Error al obtener las ventas pendientes'
  );

  const [isNuevaVentaOpen, setIsNuevaVentaOpen] = useState(false);
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

      <div className='flex flex-col w-full h-full px-5 pt-10 min-h-0 items-center'>
        <button
          type='button'
          onClick={() => setIsNuevaVentaOpen(true)}
          className='rounded flex items-center text-[25px] w-fit py-2 px-4 text-white font-semibold border cursor-pointer bg-violet-500 hover:bg-violet-600 active:bg-violet-700 transition-colors duration-100 ease-in'
        >
          Iniciar Nueva Venta
        </button>

        <span className='text-2xl font-semibold text-black w-full mt-10 mb-4 shrink-0'>
          Ventas Pendientes
        </span>

        <ListaDeRemitos
          remitos={pendientes}
          cargando={cargando}
          error={error}
          textoCargando='Cargando ventas pendientes...'
          textoVacio='No hay ventas pendientes de cobro.'
          anchoCompleto
          onPagar={setRemitoACobrar}
          onAnular={setRemitoAAnular}
        />
      </div>

      <NuevaVentaModal
        abierto={isNuevaVentaOpen}
        metodosConRecargo={metodosConRecargo}
        onCerrar={() => setIsNuevaVentaOpen(false)}
        onVentaRegistrada={handleVentaRegistrada}
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
