import type { LINEAS } from '@backend/types';
import type { ColumnaTabla, OpcionFiltro } from '@/components/tabla/tipos';
import type { CampoEditable } from '@/features/articulos/modales/EditFieldModal';
import type { ArticuloListado } from '@/api/articulos';
import { codigoBarcodeCompleto } from '@/utils/barcode';

// Medidas historicas de la tabla de articulos.
export const ALTO_LINEA = 20;
const PADDING_VERTICAL_FILA = 24;
const BORDE_FILA = 1;
export const MAX_LINEAS_CELDA = 4;
export const ROW_HEIGHT = MAX_LINEAS_CELDA * ALTO_LINEA + PADDING_VERTICAL_FILA + BORDE_FILA;
export const ANCHO_COL_SELECCION = 44;

const CHIP_MAXIMO = 2;

/** Chips con limite: muestra los primeros y un "+N" con el resto. */
export function ListaDeChips({ nombres, vacioTexto }: { nombres: string[]; vacioTexto: string }) {
  if (nombres.length === 0) {
    return <span className='text-gray-400 text-sm italic'>{vacioTexto}</span>;
  }

  const visibles = nombres.slice(0, CHIP_MAXIMO);
  const restantes = nombres.length - visibles.length;

  return (
    <span className='flex flex-wrap items-center gap-1'>
      {visibles.map((nombre) => (
        <span
          key={nombre}
          className='px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700'
        >
          {nombre}
        </span>
      ))}
      {restantes > 0 && <span className='text-xs text-gray-500 font-medium'>+{restantes}</span>}
    </span>
  );
}

/** Version texto de la misma regla, para busqueda/orden. */
const formatearListaConLimite = (nombres: string[], maximo = 2) => {
  if (nombres.length === 0) return null;
  if (nombres.length <= maximo) return nombres.join(', ');
  return `${nombres.slice(0, maximo).join(', ')} +${nombres.length - maximo}`;
};

interface DepsColumnas {
  lineas: LINEAS[];
  /** Grupo del articulo: siempre hay uno (a lo sumo "No Asignado"). */
  grupoDeArticulo: (articulo: ArticuloListado) => OpcionFiltro | null;
  /** Subgrupo del articulo: uno o ninguno. */
  subgrupoDeArticulo: (articulo: ArticuloListado) => OpcionFiltro | null;
  abrirEdicionGrupo: (articulo: ArticuloListado) => void;
  abrirEdicionClientes: (articulo: ArticuloListado) => void;
  abrirEdicionSubgrupo: (articulo: ArticuloListado) => void;
  abrirEdicionLinea: (articulo: ArticuloListado) => void;
  abrirEdicionCampo: (articulo: ArticuloListado, campo: CampoEditable) => void;
  onToggleVigente: (articulo: ArticuloListado) => void;
}

/** Envuelve un valor unico (o su ausencia) en la lista que espera el filtro. */
const comoValores = (opcion: OpcionFiltro | null): OpcionFiltro[] => (opcion ? [opcion] : []);

/**
 * Las 13 columnas de la tabla de articulos. Las columnas editables abren su
 * modal correspondiente via onClick (editor de campo, o el modal de la
 * asociacion). Para agregar una columna nueva: agregar una entrada aca.
 *
 * El filtrado y el orden NO corren en memoria: los resuelve la base. `filtro` y
 * `ordenValor` se conservan igual porque son la definicion que el backend
 * traduce a SQL a partir del `filtroKey` de cada columna (ver
 * backend/lib/articulosConsulta.js): una columna nueva necesita su entrada alla
 * para poder filtrarse y ordenarse.
 */
export function crearColumnasArticulos({
  lineas,
  grupoDeArticulo,
  subgrupoDeArticulo,
  abrirEdicionGrupo,
  abrirEdicionClientes,
  abrirEdicionSubgrupo,
  abrirEdicionLinea,
  abrirEdicionCampo,
  onToggleVigente,
}: DepsColumnas): ColumnaTabla<ArticuloListado>[] {
  const nombresDeClientes = (item: ArticuloListado) => item.clientes.map((c) => c.nombre);

  return [
    {
      header: 'Código',
      render: (item) => codigoBarcodeCompleto(item.barcode_tail) ?? 'No Asignado',
      extraClassName: (item) => (!item.barcode_tail ? 'text-gray-400 text-sm flex justify-center' : ''),
      onClick: (item) => abrirEdicionCampo(item, 'barcode'),
      width: 120,
      filtroKey: 'codigo',
      filtro: { tipo: 'texto' },
      // El codigo se guarda como string, pero es un numero: se ordena por su
      // valor numerico para que 100 quede despues de 20 en vez de antes.
      ordenValor: (item) => {
        const codigo = codigoBarcodeCompleto(item.barcode_tail);
        if (!codigo) return null;
        const numero = Number(codigo);
        return Number.isNaN(numero) ? codigo : numero;
      },
    },
    {
      header: 'Colegios/Clubes',
      render: (item) => formatearListaConLimite(nombresDeClientes(item)) ?? 'Sin Colegios/Clubes',
      renderCell: (item) => (
        <ListaDeChips nombres={nombresDeClientes(item)} vacioTexto='Sin Colegios/Clubes' />
      ),
      onClick: (item) => abrirEdicionClientes(item),
      width: 175,
      filtroKey: 'colegios',
      filtro: { tipo: 'seleccion', getValores: (item) => item.clientes },
    },
    {
      header: 'Línea',
      render: (item) => lineas.find((l) => l.id_linea === item.id_linea)?.nombre_linea ?? 'Sin Línea',
      extraClassName: (item) =>
        item.id_linea === null ? 'text-gray-400 text-sm flex justify-center' : 'font-semibold text-[14px]',
      onClick: (item) => abrirEdicionLinea(item),
      width: 120,
      filtroKey: 'linea',
      filtro: {
        tipo: 'seleccion',
        getValores: (item) => {
          const linea = lineas.find((l) => l.id_linea === item.id_linea);
          return linea ? [{ id: linea.id_linea, nombre: linea.nombre_linea }] : [];
        },
      },
    },
    {
      // Un articulo pertenece a UN grupo: siempre un solo chip.
      header: 'Grupo',
      render: (item) => grupoDeArticulo(item)?.nombre ?? 'Sin Grupo',
      renderCell: (item) => (
        <ListaDeChips
          nombres={comoValores(grupoDeArticulo(item)).map((o) => o.nombre)}
          vacioTexto='Sin Grupo'
        />
      ),
      onClick: (item) => abrirEdicionGrupo(item),
      width: 120,
      filtroKey: 'grupos',
      filtro: { tipo: 'seleccion', getValores: (item) => comoValores(grupoDeArticulo(item)) },
    },
    {
      // Un articulo tiene a lo sumo UN subgrupo (el de su grupo, o ninguno).
      header: 'Subgrupo',
      render: (item) => subgrupoDeArticulo(item)?.nombre ?? 'Sin Subgrupo',
      renderCell: (item) => (
        <ListaDeChips
          nombres={comoValores(subgrupoDeArticulo(item)).map((o) => o.nombre)}
          vacioTexto='Sin Subgrupo'
        />
      ),
      onClick: (item) => abrirEdicionSubgrupo(item),
      width: 140,
      filtroKey: 'subgrupos',
      filtro: { tipo: 'seleccion', getValores: (item) => comoValores(subgrupoDeArticulo(item)) },
    },
    {
      header: 'Color/Modelo',
      render: (item) => item.detalle ?? 'Sin Detalle',
      extraClassName: (item) => (!item.detalle ? 'text-gray-400 text-sm flex justify-center' : ''),
      onClick: (item) => abrirEdicionCampo(item, 'detalle'),
      width: 160,
      filtroKey: 'detalle',
      filtro: { tipo: 'texto' },
    },
    {
      header: 'Detalle',
      render: (item) => item.descripcion ?? 'Sin Nombre',
      extraClassName: (item) => (!item.descripcion ? 'text-gray-400 text-sm flex justify-center' : ''),
      onClick: (item) => abrirEdicionCampo(item, 'descripcion'),
      width: 180,
      filtroKey: 'nombre',
      filtro: { tipo: 'texto' },
    },
    {
      header: 'Talle',
      render: (item) => item.talle ?? 'Sin Talle',
      extraClassName: (item) => (!item.talle ? 'text-gray-400 text-sm flex justify-center' : ''),
      onClick: (item) => abrirEdicionCampo(item, 'talle'),
      width: 105,
      filtroKey: 'talle',
      filtro: { tipo: 'texto' },
    },
    {
      header: 'Cantidad',
      render: (item) => item.cant,
      onClick: (item) => abrirEdicionCampo(item, 'cant'),
      width: 130,
      filtroKey: 'cant',
      filtro: { tipo: 'rango', getValor: (item) => item.cant },
    },
    {
      header: 'Precio Unitario',
      render: (item) => `${item.precio}$`,
      onClick: (item) => abrirEdicionCampo(item, 'precio'),
      width: 170,
      filtroKey: 'precio',
      filtro: { tipo: 'rango', getValor: (item) => item.precio },
    },
    {
      header: 'C. Reservada',
      render: (item) => item.cant_reservada,
      onClick: (item) => abrirEdicionCampo(item, 'cant_reservada'),
      width: 155,
      filtroKey: 'cant_reservada',
      filtro: { tipo: 'rango', getValor: (item) => item.cant_reservada ?? 0 },
    },
    {
      header: 'C. Minima',
      render: (item) => item.stock_minimo,
      onClick: (item) => abrirEdicionCampo(item, 'stock_minimo'),
      width: 140,
      filtroKey: 'stock_minimo',
      filtro: { tipo: 'rango', getValor: (item) => item.stock_minimo },
    },
    {
      header: 'Vigente',
      render: (item) => (item.vigente ? 'Vigente' : 'No Vigente'),
      extraClassName: (item) =>
        (item.vigente ? 'text-green-500' : 'text-red-500') + ' text-[15px] flex items-center justify-center',
      onClick: (item) => onToggleVigente(item),
      width: 120,
      filtroKey: 'vigente',
      filtro: {
        tipo: 'seleccion',
        getValores: (item) => [{ id: item.vigente ? 1 : 0, nombre: item.vigente ? 'Vigente' : 'No Vigente' }],
        opcionesEstaticas: [
          { id: 1, nombre: 'Vigente' },
          { id: 0, nombre: 'No Vigente' },
        ],
      },
    },
  ];
}
