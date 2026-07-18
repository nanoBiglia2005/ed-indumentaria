import { useState, useEffect, useMemo } from 'react';
import type { ArticuloConRelaciones } from '../../../backend/types';
import type {
  GRUPOS_DE_ARTICULOS,
  CLIENTES,
  ARTICULOS_X_GRUPO,
  ARTICULOS_X_CLIENTES,
} from '../../../backend/generated/prisma/client';
import CreateArticleModal from '../CreateArticleModal';
import SelectListModal from '../SelectListModal';
import Sidebar from '../Sidebar';

type Opcion = { id: number; nombre: string };

function FilterDropdown({
  label,
  opciones,
  selectedId,
  textSize,
  onSelect,
  onClear,
}: {
  label: string;
  textSize: string;
  opciones: Opcion[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const seleccionada = opciones.find((o) => o.id === selectedId) ?? null;

  return (
    <div className='relative'>
      <button
        onClick={() => setAbierto(true)}
        className={`flex items-center justify-between gap-2 px-4 py-1 rounded border min-w-[140px] cursor-pointer font-semibold text-blue-500 hover:bg-blue-400
          hover:text-white transition-color duration-100 ease-in ${
          seleccionada ? 'bg-blue-400 text-white' : ''
        }`}
      >
        <span className={`text-${textSize}`}>{seleccionada ? seleccionada.nombre : label}</span>
        {seleccionada && (
          <span
            role='button'
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className='font-bold ps-1 hover:text-red-600'
          >
            X
          </span>
        )}
      </button>

      <SelectListModal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        title={label}
        opciones={opciones}
        onSelect={(opcion) => {
          onSelect(opcion.id);
          setAbierto(false);
        }}
      />
    </div>
  );
}

function New() {
  const [datosBackend, setDatosBackend] = useState<ArticuloConRelaciones[]>([]);

  const [grupos, setGrupos] = useState<GRUPOS_DE_ARTICULOS[]>([]);
  const [clientes, setClientes] = useState<CLIENTES[]>([]);

  const [articulosXGrupo, setArticulosXGrupo] = useState<ARTICULOS_X_GRUPO[]>([]);
  const [articulosXClientes, setArticulosXClientes] = useState<ARTICULOS_X_CLIENTES[]>([]);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  function getFecha( fecha : string  ){
    const fechaObj = new Date(fecha);
    
    return fechaObj.toLocaleDateString('es-AR')
  }

  const fetchArticulos = () => {
    fetch('/api/articulos')
      .then((respuesta) => respuesta.json())
      .then((articulos) => {
        setDatosBackend(articulos);
      })
      .catch((error) => {
        console.error('Error al conectar con el backend:', error);
      });
  };

  const fetchArticulosXGrupo = () => {
    fetch('/api/articulos-x-grupo')
      .then((respuesta) => respuesta.json())
      .then((data) => setArticulosXGrupo(data))
      .catch((error) => console.error('Error al obtener ARTICULOS_X_GRUPO:', error));
  };

  const fetchArticulosXClientes = () => {
    fetch('/api/articulos-x-clientes')
      .then((respuesta) => respuesta.json())
      .then((data) => setArticulosXClientes(data))
      .catch((error) => console.error('Error al obtener ARTICULOS_X_CLIENTES:', error));
  };

  const handleArticuloCreado = () => {
    fetchArticulos();
    fetchArticulosXGrupo();
    fetchArticulosXClientes();
  };

  useEffect(() => {
    fetchArticulos();

    fetch('/api/grupos')
      .then((respuesta) => respuesta.json())
      .then((data) => setGrupos(data))
      .catch((error) => console.error('Error al obtener los grupos:', error));

    fetch('/api/clientes')
      .then((respuesta) => respuesta.json())
      .then((data) => setClientes(data))
      .catch((error) => console.error('Error al obtener los clientes:', error));

    fetchArticulosXGrupo();
    fetchArticulosXClientes();
  }, []);

  const articulosFiltrados = useMemo(() => {
    let articulosFiltrados = datosBackend;

    if (grupoSeleccionado !== null) {
      const idsDelGrupo = new Set(
        articulosXGrupo
          .filter((registro) => registro.id_grupo === grupoSeleccionado)
          .map((registro) => registro.id_articulo)
      );
      articulosFiltrados = articulosFiltrados.filter((articulo) =>
        idsDelGrupo.has(articulo.id_articulo)
      );
    }

    if (clienteSeleccionado !== null) {
      const idsDelCliente = new Set(
        articulosXClientes
          .filter((registro) => registro.id_cliente === clienteSeleccionado)
          .map((registro) => registro.id_articulo)
      );
      articulosFiltrados = articulosFiltrados.filter((articulo) =>
        idsDelCliente.has(articulo.id_articulo)
      );
    }

    articulosFiltrados.sort((a,b) => {
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    })

    return articulosFiltrados;
  }, [datosBackend, articulosXGrupo, articulosXClientes, grupoSeleccionado, clienteSeleccionado]);

  const clientesFiltrados = useMemo(() => {
    if (grupoSeleccionado === null) return clientes;

    const idsDelGrupo = new Set(
      articulosXGrupo
        .filter((registro) => registro.id_grupo === grupoSeleccionado)
        .map((registro) => registro.id_articulo)
    );

    const idsClientesDelGrupo = new Set(
      articulosXClientes
        .filter((registro) => registro.id_cliente !== null && idsDelGrupo.has(registro.id_articulo))
        .map((registro) => registro.id_cliente)
    );

    return clientes.filter((cliente) => idsClientesDelGrupo.has(cliente.id_cliente));
  }, [grupoSeleccionado, articulosXGrupo, articulosXClientes, clientes]);

  useEffect(() => {
    if (
      clienteSeleccionado !== null &&
      !clientesFiltrados.some((cliente) => cliente.id_cliente === clienteSeleccionado)
    ) {
      setClienteSeleccionado(null);
    }
  }, [clientesFiltrados, clienteSeleccionado]);

  return (
    <>
      <div className='flex h-screen w-full'>
        <Sidebar />
        <div className='flex flex-col items-center justify-center flex-1'>
        <div className='border px-3 rounded-xl h-[600px]'>
        <div className='flex my-4 gap-4'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='rounded flex items-center py-2 px-3 text-white font-semibold text-lg border cursor-pointer bg-blue-500 transition-color
            duration-100 ease-in'
          >
            <span>Nuevo Articulo</span>
          </button>
          <div className='flex items-center gap-2'>
            <FilterDropdown
              label='Filtrar por Grupo'
              textSize='xl'
              opciones={grupos.map((g) => ({
                id: g.id_grupo_articulo,
                nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo_articulo}`,
              }))}
              selectedId={grupoSeleccionado}
              onSelect={setGrupoSeleccionado}
              onClear={() => setGrupoSeleccionado(null)}
            />

            <FilterDropdown
            textSize='xl'
              label='Filtrar por Colegio'
              opciones={clientesFiltrados.map((c) => ({
                id: c.id_cliente,
                nombre: c.nombre,
              }))}
              selectedId={clienteSeleccionado}
              onSelect={setClienteSeleccionado}
              onClear={() => setClienteSeleccionado(null)}
            />
          </div>
        </div>
        <div className='w-[1200px] max-h-[510px] overflow-y-auto border rounded-xl border-black/30 divide-y-1 divide-black/30'>
          <div className='grid grid-cols-26 sticky top-0 z-10 bg-stone-100 gap-x-3 ps-3 text-[15px] font-medium text-black divide-x-1 divide-black/30'>
            <span className='py-2 col-span-2'>Vigente</span>
            <span className='py-2 col-span-3'>Código de Barra</span>
            <span className='py-2 col-span-2'>Cantidad</span>
            <span className='py-2 col-span-4'>Cantidad Reservada</span>
            <span className='py-2 col-span-4'>Cantidad Minima</span>
            <span className='py-2 col-span-3'>Precio</span>
            <span className='py-2 col-span-3'>Talle</span>
            <span className='py-2 col-span-3'>Color</span>
            <span className='py-2 col-span-2'>Fecha</span>
          </div>
          <ul className='w-full flex flex-col justify-center divide-y-1 divide-black/30'>
            {articulosFiltrados.map((item) => (
              <li key={item.id_articulo} className='grid grid-cols-26 gap-x-3 divide-x-1 divide-black/30 ps-3 text-black text-sm hover:bg-blue-100 transition-color duration-100 ease-in'>
                <p className={`py-3 col-span-2 ${item.vigente ? 'text-green-500' : 'text-red-500'}`}>{item.vigente ? 'Vigente' : 'No Vigente'}</p>
                <p className='py-3 col-span-3'>{item.barcode ? '77900000'+item.barcode : 'No Asignado'}</p>
                <p className='py-3 col-span-2'>{item.cant}</p>
                <p className='py-3 col-span-4'>{item.cant_reservada}</p>
                <p className='py-3 col-span-4'>{item.stock_minimo}</p>
                <p className='py-3 col-span-3'>{item.precio}$</p>
                <p className='py-3 col-span-3'>{item.TALLES?.nombre_talle}</p>
                <p className='py-3 col-span-3'>{item.COLORES?.nombre_color}</p>
                <p className='py-3 col-span-2'>{getFecha(item.fecha_creacion)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
      </div>

      <CreateArticleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleArticuloCreado}
        grupos={grupos}
        clientes={clientes}
      />
    </>
    
  );
}

export default New;
