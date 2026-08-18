import { useState } from 'react';
import type { RemitoConDetalles, RemitoCreadoConCliente } from '@backend/types';
import { useFetchLista } from '@/hooks/useFetchLista';
import { listarRemitosPendientes } from '@/api/remitos';
import AnularRemitoModal from '@/features/ventas/modales/AnularRemitoModal';
import ListaDeRemitos from '@/features/ventas/ListaDeRemitos';
import MetodoPagoModal from '@/features/ventas/modales/MetodoPagoModal';
import NuevaVentaModalPrueba from '@/features/ventas/modales/NuevaVentaModalPrueba';
import SectionWrapper from '@/components/layout/SectionWrapper';
import VentaExitosaModalPrueba from '@/features/ventas/modales/VentaExitosaModalPrueba';

/**
 * COPIA DE PRUEBA de VentasPage (la original sigue en uso, sin tocar). Lo unico
 * que cambia es el modal de alta: NuevaVentaModalPrueba en vez de
 * NuevaVentaModal. El resto del circuito (pendientes, cobro, anulacion) es el
 * mismo y usa los mismos componentes, no copias.
 *
 * Solo la ven los ROLES_PRUEBA: la ruta esta detras de un RolGuard y las
 * llamadas nuevas responden 403 al resto.
 */
function VentasPagePrueba() {
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
  const [ventaRegistrada, setVentaRegistrada] = useState<RemitoCreadoConCliente | null>(null);
  // Remito que se esta cobrando / anulando.
  const [remitoACobrar, setRemitoACobrar] = useState<RemitoConDetalles | null>(null);
  const [remitoAAnular, setRemitoAAnular] = useState<RemitoConDetalles | null>(null);

  const handleVentaRegistrada = (remito: RemitoCreadoConCliente) => {
    setIsNuevaVentaOpen(false);
    fetchPendientes();
    setVentaRegistrada(remito);
  };

  const handleSeguirAlPago = (remito: RemitoCreadoConCliente) => {
    setVentaRegistrada(null);
    setRemitoACobrar(remito);
  };

  // Ya no esta pendiente: sale de la lista y pasa al historial.
  const handleFacturado = () => {
    setRemitoACobrar(null);
    fetchPendientes();
  };

  const handleAnulado = () => {
    setRemitoAAnular(null);
    fetchPendientes();
  };

  return (
    <SectionWrapper>
      <div className='flex flex-col w-full h-full px-5 pt-10 min-h-0 items-center'>
        {/* Las ventas que se registren desde aca son REALES: el aviso es para
            que quede claro que lo unico de prueba es la pantalla. */}
        <div className='mb-6 w-full rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700'>
          <span className='font-semibold'>Versión de prueba.</span> Las ventas que confirmes acá se
          registran igual que en la página de Ventas.
        </div>

        <button
          type='button'
          onClick={() => setIsNuevaVentaOpen(true)}
          className='rounded flex items-center text-[25px] w-fit py-2 px-4 text-white font-semibold border cursor-pointer bg-violet-500 hover:bg-violet-600 active:bg-violet-700 transition-color duration-100 ease-in'
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

      <NuevaVentaModalPrueba
        abierto={isNuevaVentaOpen}
        onCerrar={() => setIsNuevaVentaOpen(false)}
        onVentaRegistrada={handleVentaRegistrada}
      />

      <VentaExitosaModalPrueba
        abierto={ventaRegistrada !== null}
        remito={ventaRegistrada}
        onCerrar={() => setVentaRegistrada(null)}
        onSeguirAlPago={handleSeguirAlPago}
      />

      <MetodoPagoModal
        abierto={remitoACobrar !== null}
        remito={remitoACobrar}
        onCerrar={() => setRemitoACobrar(null)}
        onFacturado={handleFacturado}
      />

      <AnularRemitoModal
        abierto={remitoAAnular !== null}
        remito={remitoAAnular}
        onCerrar={() => setRemitoAAnular(null)}
        onAnulado={handleAnulado}
      />
    </SectionWrapper>
  );
}

export default VentasPagePrueba;
