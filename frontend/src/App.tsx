import { useState, useEffect, useMemo } from 'react';
import type { ArticuloConRelaciones } from '../../backend/types';
import type {
  GRUPOS_DE_ARTICULOS,
  CLIENTES,
  ARTICULOS_X_GRUPO,
  ARTICULOS_X_CLIENTES,
} from '../../backend/generated/prisma/client';

type Opcion = { id: number; nombre: string };

function FilterDropdown({
  label,
  opciones,
  selectedId,
  onSelect,
  onClear,
}: {
  label: string;
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
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center justify-between gap-2 px-4 py-2 rounded border min-w-[180px] ${
          seleccionada ? 'bg-white text-black' : 'bg-transparent text-white'
        }`}
      >
        <span>{seleccionada ? seleccionada.nombre : label}</span>
        {seleccionada && (
          <span
            role='button'
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setAbierto(false);
            }}
            className='font-bold px-1 hover:text-red-600'
          >
            X
          </span>
        )}
      </button>

      {abierto && (
        <ul className='absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white text-black rounded border shadow'>
          {opciones.map((o) => (
            <li
              key={o.id}
              onClick={() => {
                onSelect(o.id);
                setAbierto(false);
              }}
              className='px-4 py-2 cursor-pointer hover:bg-gray-100'
            >
              {o.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  const [datosBackend, setDatosBackend] = useState<ArticuloConRelaciones[]>([]);
  const [estado, setEstado] = useState('Cargando...');

  const [grupos, setGrupos] = useState<GRUPOS_DE_ARTICULOS[]>([]);
  const [clientes, setClientes] = useState<CLIENTES[]>([]);

  const [articulosXGrupo, setArticulosXGrupo] = useState<ARTICULOS_X_GRUPO[]>([]);
  const [articulosXClientes, setArticulosXClientes] = useState<ARTICULOS_X_CLIENTES[]>([]);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/articulos')
      .then((respuesta) => respuesta.json())
      .then((articulos) => {
        setDatosBackend(articulos);
        setEstado('¡Conexión Exitosa!');
      })
      .catch((error) => {
        console.error('Error al conectar con el backend:', error);
        setEstado('Error de conexión');
      });

    fetch('http://localhost:5000/api/grupos')
      .then((respuesta) => respuesta.json())
      .then((data) => setGrupos(data))
      .catch((error) => console.error('Error al obtener los grupos:', error));

    fetch('http://localhost:5000/api/clientes')
      .then((respuesta) => respuesta.json())
      .then((data) => setClientes(data))
      .catch((error) => console.error('Error al obtener los clientes:', error));

    fetch('http://localhost:5000/api/articulos-x-grupo')
      .then((respuesta) => respuesta.json())
      .then((data) => setArticulosXGrupo(data))
      .catch((error) => console.error('Error al obtener ARTICULOS_X_GRUPO:', error));

    fetch('http://localhost:5000/api/articulos-x-clientes')
      .then((respuesta) => respuesta.json())
      .then((data) => setArticulosXClientes(data))
      .catch((error) => console.error('Error al obtener ARTICULOS_X_CLIENTES:', error));
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
      <div className='flex flex-col items-center justify-center'>
        <h1 className='text-xl text-white'>{estado}</h1>

        <div className='flex gap-4 my-4'>
          <FilterDropdown
            label='Filtrar por Grupo'
            opciones={grupos.map((g) => ({
              id: g.id_grupo_articulo,
              nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo_articulo}`,
            }))}
            selectedId={grupoSeleccionado}
            onSelect={setGrupoSeleccionado}
            onClear={() => setGrupoSeleccionado(null)}
          />

          <FilterDropdown
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

        <div className='grid grid-cols-3 w-2xl'>
          <h1>Código de Barra</h1>
          <h1>Cantidad</h1>
          <h1>Talle</h1>
        </div>
        <ul className='w-2xl h-[600px] overflow-y-auto'>
          {articulosFiltrados.map((item) => (
            <li key={item.id_articulo} className='grid grid-cols-3'>
              <h1>#{item.barcode}</h1>
              <h1>{item.cant}</h1>
              <h1>{item.TALLES?.nombre_talle || 'No asignado'}</h1>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default App;
