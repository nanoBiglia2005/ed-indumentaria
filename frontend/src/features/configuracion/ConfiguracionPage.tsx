import { useEffect, useMemo, useState } from 'react';
import type {
  TIPOS_DE_PAGO,
  GRUPOS_DE_VENTA,
  SUBGRUPOS_DE_VENTA,
  CLIENTES_MAYORISTAS,
  LINEAS,
} from '@backend/types';
import { ID_GRUPO_NO_ASIGNADO } from '@backend/types';
import { useFetchLista } from '@/hooks/useFetchLista';
import { listarTiposDePago } from '@/api/tiposDePago';
import {
  listarGrupos,
  listarSubgrupos,
  listarClientes,
  listarLineas,
} from '@/api/agrupaciones';
import EditRecargoModal from '@/features/configuracion/modales/EditRecargoModal';
import SectionWrapper from '@/components/layout/SectionWrapper';
import AgrupacionSection from '@/features/configuracion/AgrupacionSection';
import type { ItemAgrupacion } from '@/features/configuracion/AgrupacionSection';
import ImpresorasSection from '@/features/configuracion/ImpresorasSection';
import { useSession } from '@/hooks/useSession';
import { ROLES_ADMINISTRAN_IMPRESORAS } from '@backend/types';

function ConfiguracionPage() {
  // Esconder la seccion es cosmetico: la API rechaza igual a quien no puede
  // administrar impresoras (routes/impresoras.js con requireRol). Un admin
  // sigue pudiendo ELEGIR a que impresora imprime en Articulos/Ventas
  // (ROLES_ELIGEN_IMPRESORA); administrar el registro es superadmin-only.
  const { user } = useSession();
  const puedeAdministrarImpresoras = ROLES_ADMINISTRAN_IMPRESORAS.includes(user?.rol ?? '');

  const {
    datos: tiposDePago,
    cargando,
    error,
    setDatos: setTiposDePago,
  } = useFetchLista(
    listarTiposDePago,
    'No se pudieron cargar los medios de pago.',
    'Error al obtener los tipos de pago'
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tipoDePagoAEditar, setTipoDePagoAEditar] = useState<TIPOS_DE_PAGO | null>(null);

  const [grupos, setGrupos] = useState<GRUPOS_DE_VENTA[]>([]);
  const [subgrupos, setSubgrupos] = useState<SUBGRUPOS_DE_VENTA[]>([]);
  const [clientes, setClientes] = useState<CLIENTES_MAYORISTAS[]>([]);
  const [lineas, setLineas] = useState<LINEAS[]>([]);

  // Listas de apoyo: si fallan solo se loguea (la pagina sigue usable).
  const fetchGrupos = () => {
    listarGrupos()
      .then(setGrupos)
      .catch((error) => console.error('Error al obtener los grupos:', error));
  };

  const fetchSubgrupos = () => {
    listarSubgrupos()
      .then(setSubgrupos)
      .catch((error) => console.error('Error al obtener los subgrupos:', error));
  };

  const fetchClientes = () => {
    listarClientes()
      .then(setClientes)
      .catch((error) => console.error('Error al obtener los colegios/clubes:', error));
  };

  const fetchLineas = () => {
    listarLineas()
      .then(setLineas)
      .catch((error) => console.error('Error al obtener las líneas:', error));
  };

  useEffect(() => {
    fetchGrupos();
    fetchSubgrupos();
    fetchClientes();
    fetchLineas();
  }, []);

  const refrescarGrupos = () => {
    fetchGrupos();
  };

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

  // "No Asignado" lo administra la base (es el destino de los articulos cuando
  // se borra su grupo): no se crea, ni se renombra, ni se elimina desde acá.
  const itemsGrupos: ItemAgrupacion[] = useMemo(() => {
    return grupos
      .filter((g) => g.id_grupo !== ID_GRUPO_NO_ASIGNADO)
      .map((g) => ({
        id: g.id_grupo,
        nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}`,
      }));
  }, [grupos]);

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

  const itemsLineas: ItemAgrupacion[] = useMemo(
    () => lineas.map((l) => ({ id: l.id_linea, nombre: l.nombre_linea })),
    [lineas]
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
                      className='border transition-colors duration-100 ease-in bg-violet-500 hover:bg-violet-600 text-white rounded w-full py-1 text-sm text-center cursor-pointer'
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {puedeAdministrarImpresoras && (
          <div className='mb-10'>
            <ImpresorasSection />
          </div>
        )}

        <div className='flex flex-col lg:flex-row lg:flex-wrap gap-8 w-full items-start'>
          <div className='flex-1 min-w-[260px] w-full'>
            <AgrupacionSection
              titulo='Líneas'
              tipo='linea'
              crearLabel='Crear Línea'
              emptyMessage='No hay líneas registradas.'
              items={itemsLineas}
              grupos={grupos}
              onRefrescar={fetchLineas}
            />
          </div>

          <div className='flex-1 min-w-[260px] w-full'>
            <AgrupacionSection
              titulo='Grupos'
              tipo='grupo'
              crearLabel='Crear Grupo'
              emptyMessage='No hay grupos registrados.'
              items={itemsGrupos}
              grupos={grupos}
              onRefrescar={refrescarGrupos}
              lineasDisponibles={lineas}
            />
          </div>

          <div className='flex-1 min-w-[260px] w-full'>
            <AgrupacionSection
              titulo='Subgrupos'
              tipo='subgrupo'
              crearLabel='Crear Subgrupo'
              emptyMessage='No hay subgrupos registrados.'
              items={itemsSubgrupos}
              grupos={grupos}
              onRefrescar={fetchSubgrupos}
            />
          </div>

          <div className='flex-1 min-w-[260px] w-full'>
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
        </div>
      </div>

      <EditRecargoModal
        abierto={isEditModalOpen}
        onCerrar={() => setIsEditModalOpen(false)}
        onExito={handleRecargoActualizado}
        tipoDePago={tipoDePagoAEditar}
      />
    </SectionWrapper>
  );
}

export default ConfiguracionPage;
