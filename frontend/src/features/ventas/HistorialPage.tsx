import { useState } from 'react';
import type { RemitoConDetalles } from '@backend/types';
import { useFetchLista } from '@/hooks/useFetchLista';
import { useNotificacion } from '@/hooks/useNotificacion';
import { listarRemitos } from '@/api/remitos';
import ListaDeRemitos from '@/features/ventas/ListaDeRemitos';
import ConfirmarAccionRemitoModal from '@/features/ventas/modales/ConfirmarAccionRemitoModal';
import { ACCION_DEVOLVER } from '@/features/ventas/modales/accionesDeRemito';
import { codigoRemito } from '@/features/ventas/codigoRemito';
import Notificacion from '@/components/ui/Notificacion';
import SectionWrapper from '@/components/layout/SectionWrapper';

function HistorialPage() {
  const {
    datos: remitos,
    cargando,
    error,
    recargar: fetchRemitos,
  } = useFetchLista(listarRemitos, 'No se pudieron cargar las ventas.', 'Error al obtener las ventas');

  // Venta facturada que se esta devolviendo.
  const [remitoADevolver, setRemitoADevolver] = useState<RemitoConDetalles | null>(null);
  const { notificacion, mostrar: mostrarNotificacion } = useNotificacion();

  // La venta no se va de la lista (el historial las muestra todas): cambia de
  // estado, asi que hay que recargar para que la tarjeta se repinte.
  const handleDevuelto = (remito: RemitoConDetalles) => {
    setRemitoADevolver(null);
    fetchRemitos();

    const codigo = codigoRemito(remito.cod_mes, remito.cod_remito_final);
    mostrarNotificacion(codigo ? `Venta ${codigo} devuelta.` : 'Venta devuelta.');
  };

  return (
    <SectionWrapper>
      <Notificacion mensaje={notificacion} posicion='pagina' />

      <div className='flex flex-col w-full h-full px-5 pt-10 min-h-0'>
        <div className='flex items-center justify-between mb-5 shrink-0'>
          <span className='text-2xl font-semibold text-black'>Ventas</span>
        </div>

        <ListaDeRemitos
          remitos={remitos}
          cargando={cargando}
          error={error}
          textoCargando='Cargando ventas...'
          textoVacio='No hay ventas registradas.'
          onDevolver={setRemitoADevolver}
        />
      </div>

      <ConfirmarAccionRemitoModal
        abierto={remitoADevolver !== null}
        remito={remitoADevolver}
        accion={ACCION_DEVOLVER}
        onCerrar={() => setRemitoADevolver(null)}
        onHecho={handleDevuelto}
      />
    </SectionWrapper>
  );
}

export default HistorialPage;
