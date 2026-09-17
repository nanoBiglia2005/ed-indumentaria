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
import ConfiguracionTabs from '@/features/configuracion/ConfiguracionTabs';
import { TABS_CONFIGURACION } from '@/features/configuracion/tabsConfiguracion';
import type { TabConfiguracionId } from '@/features/configuracion/tabsConfiguracion';
import { useSession } from '@/hooks/useSession';
import { ROLES_ADMINISTRAN_IMPRESORAS } from '@backend/types';

function ConfiguracionPage() {
  // Esconder la seccion es cosmetico: la API rechaza igual a quien no puede
  // administrar impresoras (routes/impresoras.js con requireRol). Un admin
  // sigue pudiendo ELEGIR a que impresora imprime en Articulos/Ventas
  // (ROLES_ELIGEN_IMPRESORA); administrar el registro es superadmin-only.
  const { user } = useSession();
  const puedeAdministrarImpresoras = ROLES_ADMINISTRAN_IMPRESORAS.includes(user?.rol ?? '');

  // Mismo criterio que antes: si no puede administrar impresoras, la seccion
  // (ahora la pestaña) no existe para él.
  const tabsVisibles = useMemo(
    () => TABS_CONFIGURACION.filter((tab) => tab.id !== 'impresoras' || puedeAdministrarImpresoras),
    [puedeAdministrarImpresoras]
  );

  const [tabActivo, setTabActivo] = useState<TabConfiguracionId>('medios');

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

  // Separados en dos listas: cada una alimenta su propia AgrupacionSection,
  // así el tipo no se elige en el modal (ya lo dice la sección) y no se muestra
  // como subtítulo redundante en cada fila.
  const itemsColegios: ItemAgrupacion[] = useMemo(
    () =>
      clientes
        .filter((c) => c.grupo_venta_exclusivo !== 2)
        .map((c) => ({ id: c.id_cliente, nombre: c.nombre, tipoCliente: 1 as const })),
    [clientes]
  );

  const itemsClubes: ItemAgrupacion[] = useMemo(
    () =>
      clientes
        .filter((c) => c.grupo_venta_exclusivo === 2)
        .map((c) => ({ id: c.id_cliente, nombre: c.nombre, tipoCliente: 2 as const })),
    [clientes]
  );

  const itemsLineas: ItemAgrupacion[] = useMemo(
    () => lineas.map((l) => ({ id: l.id_linea, nombre: l.nombre_linea })),
    [lineas]
  );

  return (
    <SectionWrapper>
      <div className='flex flex-col w-full h-full px-2 pt-6 sm:px-5 sm:pt-10 overflow-y-auto'>
        <ConfiguracionTabs tabs={tabsVisibles} activo={tabActivo} onSeleccionar={setTabActivo} />

        {tabActivo === 'medios' && (
          <div className='flex flex-col'>
            <span className='text-h1 font-semibold text-neutro-900 mb-5'>Medios de Pago</span>

            {cargando && <span className='text-neutro-400'>Cargando medios de pago...</span>}

            {!cargando && error && <span className='text-red-500'>{error}</span>}

            {!cargando && !error && tiposDePago.length === 0 && (
              <span className='text-neutro-400'>No hay medios de pago registrados.</span>
            )}

            {!cargando && !error && tiposDePago.length > 0 && (
              <div className='w-full flex flex-wrap gap-4'>
                {tiposDePago.map((tipoDePago) => (
                  <div
                    key={tipoDePago.id_tipos_de_pago}
                    className='w-full sm:w-[200px] group relative h-fit hover:border-marca-500 transition-all duration-150 ease-out px-4 py-4 border-marca-500/40 border flex flex-col rounded text-neutro-900'
                  >
                    <span className='text-h2 font-semibold truncate' title={tipoDePago.nombre_tipo_de_pago}>
                      {tipoDePago.nombre_tipo_de_pago ?? 'Sin nombre'}
                    </span>
                    <span className='text-body text-neutro-600'>
                      Recargo: {tipoDePago.recargo}
                      {tipoDePago.signo ? '%' : ''}
                    </span>
                    {tipoDePago.modificable && (
                      <div className='px-1 overflow-hidden max-h-0 opacity-0 -translate-y-1 group-hover:max-h-12 group-hover:opacity-100 group-hover:translate-y-0 group-hover:mt-3 transition-all duration-200 ease-in-out'>
                        <button
                          type='button'
                          onClick={() => abrirEdicionRecargo(tipoDePago)}
                          className='border border-transparent transition-colors duration-100 ease-in bg-marca-500 hover:bg-marca-600 text-white rounded w-full py-1 text-sm text-center cursor-pointer'
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tabActivo === 'impresoras' && puedeAdministrarImpresoras && <ImpresorasSection />}

        {/* Las secciones de una sola lista se limitan en ancho: una fila de 1600px
            con el nombre a la izquierda y los botones al otro extremo no se lee. */}
        {tabActivo === 'lineas' && (
          <div className='w-full'>
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
        )}

        {/* Grupos y Subgrupos comparten pestaña: en pantalla ancha van lado a lado
            (un subgrupo se lee mirando su grupo), y apilados abajo de lg. */}
        {tabActivo === 'grupos' && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-start'>
            <div className='min-w-0 w-full'>
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

            <div className='min-w-0 w-full'>
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
          </div>
        )}

        {tabActivo === 'colegios' && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-start'>
            <div className='min-w-0 w-full'>
              <AgrupacionSection
                titulo='Colegios'
                tipo='colegio'
                crearLabel='Crear Colegio'
                emptyMessage='No hay colegios registrados.'
                items={itemsColegios}
                grupos={grupos}
                onRefrescar={fetchClientes}
                tipoClienteFijo={1}
                tituloModalCrear='Crear Colegio'
                tituloModalEditar='Editar Colegio'
              />
            </div>

            <div className='min-w-0 w-full'>
              <AgrupacionSection
                titulo='Clubes'
                tipo='colegio'
                crearLabel='Crear Club'
                emptyMessage='No hay clubes registrados.'
                items={itemsClubes}
                grupos={grupos}
                onRefrescar={fetchClientes}
                tipoClienteFijo={2}
                tituloModalCrear='Crear Club'
                tituloModalEditar='Editar Club'
              />
            </div>
          </div>
        )}
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
