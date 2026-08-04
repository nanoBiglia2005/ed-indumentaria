import { useEffect, useMemo, useState } from 'react';
import type {
  TIPOS_DE_PAGO,
  GRUPOS_DE_VENTA,
  SUBGRUPOS_DE_VENTA,
  CLIENTES,
} from '../../../backend/generated/prisma/client';
import EditRecargoModal from '../EditRecargoModal';
import SectionWrapper from '../SectionWrapper';
import AgrupacionSection from '../AgrupacionSection';
import type { ItemAgrupacion } from '../AgrupacionSection';

function ConfiguracionPage() {
  const [tiposDePago, setTiposDePago] = useState<TIPOS_DE_PAGO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tipoDePagoAEditar, setTipoDePagoAEditar] = useState<TIPOS_DE_PAGO | null>(null);

  const [grupos, setGrupos] = useState<GRUPOS_DE_VENTA[]>([]);
  const [subgrupos, setSubgrupos] = useState<SUBGRUPOS_DE_VENTA[]>([]);
  const [clientes, setClientes] = useState<CLIENTES[]>([]);

  const fetchTiposDePago = () => {
    setCargando(true);
    fetch('/api/tipos-de-pago')
      .then((respuesta) => respuesta.json())
      .then((data) => {
        setTiposDePago(data);
        setError(null);
      })
      .catch((error) => {
        console.error('Error al obtener los tipos de pago:', error);
        setError('No se pudieron cargar los medios de pago.');
      })
      .finally(() => setCargando(false));
  };

  const fetchGrupos = () => {
    fetch('/api/grupos')
      .then((respuesta) => respuesta.json())
      .then((data) => setGrupos(data))
      .catch((error) => console.error('Error al obtener los grupos:', error));
  };

  const fetchSubgrupos = () => {
    fetch('/api/subgrupos')
      .then((respuesta) => respuesta.json())
      .then((data) => setSubgrupos(data))
      .catch((error) => console.error('Error al obtener los subgrupos:', error));
  };

  const fetchClientes = () => {
    fetch('/api/clientes')
      .then((respuesta) => respuesta.json())
      .then((data) => setClientes(data))
      .catch((error) => console.error('Error al obtener los colegios/clubes:', error));
  };

  useEffect(() => {
    fetchTiposDePago();
    fetchGrupos();
    fetchSubgrupos();
    fetchClientes();
  }, []);

  const abrirEdicionRecargo = (tipoDePago: TIPOS_DE_PAGO) => {
    setTipoDePagoAEditar(tipoDePago);
    setIsEditModalOpen(true);
  };

  const handleRecargoActualizado = (tipoDePagoActualizado: TIPOS_DE_PAGO) => {
    setTiposDePago((actual) =>
      actual.map((t) =>
        t.id_tipos_de_pago === tipoDePagoActualizado.id_tipos_de_pago ? tipoDePagoActualizado : t
      )
    );
  };

  const itemsGrupos: ItemAgrupacion[] = useMemo(
    () => grupos.map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` })),
    [grupos]
  );

  const itemsSubgrupos: ItemAgrupacion[] = useMemo(() => {
    const nombreGrupoPorId = new Map(grupos.map((g) => [g.id_grupo, g.nombre_grupo ?? `Grupo ${g.id_grupo}`]));
    return subgrupos.map((s) => ({
      id: s.id_subgrupo,
      nombre: s.nombre_subgrupo,
      subtitulo: nombreGrupoPorId.get(s.id_grupo) ?? `Grupo ${s.id_grupo}`,
      idGrupo: s.id_grupo,
    }));
  }, [subgrupos, grupos]);

  const itemsColegios: ItemAgrupacion[] = useMemo(
    () =>
      clientes.map((c) => ({
        id: c.id_cliente,
        nombre: c.nombre,
        subtitulo: c.grupo_venta_exclusivo === 2 ? 'Club' : c.grupo_venta_exclusivo === 1 ? 'Colegio' : 'Sin tipo',
        tipoCliente: c.grupo_venta_exclusivo === 2 ? 2 : 1,
      })),
    [clientes]
  );

  return (
    <SectionWrapper>
      <div className='flex flex-col w-full h-full px-5 pt-10 overflow-y-auto'>
        <span className='text-2xl font-semibold text-black mb-5'>Medios de Pago</span>

        {cargando && <span className='text-gray-400'>Cargando medios de pago...</span>}

        {!cargando && error && <span className='text-red-500'>{error}</span>}

        {!cargando && !error && tiposDePago.length === 0 && (
          <span className='text-gray-400'>No hay medios de pago registrados.</span>
        )}

        {!cargando && !error && tiposDePago.length > 0 && (
          <div className='w-full flex flex-wrap gap-4 mb-10'>
            {tiposDePago.map((tipoDePago) => (
              <div
                key={tipoDePago.id_tipos_de_pago}
                className='w-[200px] group relative h-fit hover:shadow-lg transition-all duration-100 ease-in px-4 py-4 border-violet-500 border flex flex-col rounded text-black'
              >
                <span className='text-xl font-semibold truncate' title={tipoDePago.nombre_tipo_de_pago}>
                  {tipoDePago.nombre_tipo_de_pago ?? 'Sin nombre'}
                </span>
                <span className='text-md text-gray-600'>
                  Recargo: {tipoDePago.recargo}
                  {tipoDePago.signo ? '%' : ''}
                </span>
                {tipoDePago.modificable && (
                  <div className='px-1 overflow-hidden max-h-0 opacity-0 -translate-y-1 group-hover:max-h-12 group-hover:opacity-100 group-hover:translate-y-0 group-hover:mt-3 transition-all duration-200 ease-in-out'>
                    <button
                      type='button'
                      onClick={() => abrirEdicionRecargo(tipoDePago)}
                      className='border transition-color duration-100 ease-in bg-violet-500 hover:bg-violet-600 text-white rounded w-full py-1 text-sm text-center cursor-pointer'
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <AgrupacionSection
          titulo='Grupos'
          tipo='grupo'
          crearLabel='Crear Grupo'
          emptyMessage='No hay grupos registrados.'
          items={itemsGrupos}
          grupos={grupos}
          onRefrescar={fetchGrupos}
        />

        <AgrupacionSection
          titulo='Subgrupos'
          tipo='subgrupo'
          crearLabel='Crear Subgrupo'
          emptyMessage='No hay subgrupos registrados.'
          items={itemsSubgrupos}
          grupos={grupos}
          onRefrescar={fetchSubgrupos}
        />

        <AgrupacionSection
          titulo='Colegios/Clubes'
          tipo='colegio'
          crearLabel='Crear Colegio/Club'
          emptyMessage='No hay colegios/clubes registrados.'
          items={itemsColegios}
          grupos={grupos}
          onRefrescar={fetchClientes}
        />
      </div>

      <EditRecargoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleRecargoActualizado}
        tipoDePago={tipoDePagoAEditar}
      />
    </SectionWrapper>
  );
}

export default ConfiguracionPage;
