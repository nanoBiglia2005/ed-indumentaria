import { useFetchLista } from '@/hooks/useFetchLista';
import { listarRemitos } from '@/api/remitos';
import ListaDeRemitos from '@/features/ventas/ListaDeRemitos';
import SectionWrapper from '@/components/layout/SectionWrapper';

function HistorialPage() {
  const {
    datos: remitos,
    cargando,
    error,
  } = useFetchLista(listarRemitos, 'No se pudieron cargar las ventas.', 'Error al obtener las ventas');

  return (
    <SectionWrapper>
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
        />
      </div>
    </SectionWrapper>
  );
}

export default HistorialPage;
