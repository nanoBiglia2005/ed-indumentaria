import { useCallback, useMemo, useState } from 'react';
import { normalizarBusqueda } from '@/utils/texto';
import {
  SIN_ASIGNAR_ID,
  type ColumnaTabla,
  type CriterioOrden,
  type FiltroColumna,
  type OpcionFiltro,
} from './tipos';

/** ¿La fila pasa el filtro puesto en esa columna? */
function coincideFiltroColumna<T>(item: T, columna: ColumnaTabla<T>, filtro: FiltroColumna): boolean {
  if (columna.filtro.tipo === 'texto' && filtro.tipo === 'texto') {
    const termino = normalizarBusqueda(filtro.valor.trim());
    if (termino === '') return true;
    return normalizarBusqueda(String(columna.render(item) ?? '')).includes(termino);
  }

  if (columna.filtro.tipo === 'rango' && filtro.tipo === 'rango') {
    const valor = columna.filtro.getValor(item);
    if (valor === null) return false;
    if (filtro.desde !== null && valor < filtro.desde) return false;
    if (filtro.hasta !== null && valor > filtro.hasta) return false;
    return true;
  }

  if (columna.filtro.tipo === 'seleccion' && filtro.tipo === 'seleccion') {
    const valores = columna.filtro.getValores(item);
    if (valores.length === 0) return filtro.ids.includes(SIN_ASIGNAR_ID);
    return valores.some((valor) => filtro.ids.includes(valor.id));
  }

  return true;
}

/** Valor por el que se ordena una fila en una columna, y si esta "vacia"
 *  (los vacios siempre van al final, sin importar la direccion). */
function valorOrdenable<T>(
  item: T,
  columna: ColumnaTabla<T>
): { vacio: boolean; valor: string | number } {
  if (columna.ordenValor) {
    const valor = columna.ordenValor(item);
    return valor === null || valor === '' ? { vacio: true, valor: 0 } : { vacio: false, valor };
  }

  if (columna.filtro.tipo === 'rango') {
    const valor = columna.filtro.getValor(item);
    return valor === null ? { vacio: true, valor: 0 } : { vacio: false, valor };
  }

  if (columna.filtro.tipo === 'seleccion') {
    const nombre = columna.filtro.getValores(item)[0]?.nombre;
    return nombre ? { vacio: false, valor: nombre } : { vacio: true, valor: '' };
  }

  const valor = String(columna.render(item) ?? '');
  return { vacio: valor.trim() === '', valor };
}

interface UseTablaFiltrableParams<T> {
  /** Filas base, ya pasadas por los filtros propios de la pagina y la busqueda global. */
  filas: T[];
  columnas: ColumnaTabla<T>[];
  /** Desempate final del sort (cada tabla ordena el talle a su manera). */
  desempate: (a: T, b: T) => number;
  /**
   * Fuente para las opciones del filtro de seleccion abierto. Si no se pasa,
   * se usan las filas visibles con los DEMAS filtros de columna aplicados
   * (comportamiento de ArticulosPage); si se pasa una lista, se usa tal cual
   * (AgregarProductoModal usa todos los articulos cargados).
   */
  filasParaOpciones?: T[];
}

/**
 * Motor de filtros por columna + multi-orden de las tablas de articulos.
 * Click en el nombre del header: abre el filtro (o lo quita si ya habia).
 * Click en el icono de orden: apila la columna como criterio (asc -> desc ->
 * quitar); shift+click la vuelve el unico criterio.
 */
export function useTablaFiltrable<T>({
  filas,
  columnas,
  desempate,
  filasParaOpciones,
}: UseTablaFiltrableParams<T>) {
  const [filtrosColumna, setFiltrosColumna] = useState<Record<string, FiltroColumna>>({});
  const [columnaFiltroAbierta, setColumnaFiltroAbierta] = useState<string | null>(null);
  // Lista de criterios de orden ordenada por prioridad: el primero es el
  // criterio principal, los siguientes desempatan en orden.
  const [ordenColumnas, setOrdenColumnas] = useState<CriterioOrden[]>([]);

  const aplicarFiltrosColumna = useCallback(
    (lista: T[], excluirFiltroKey?: string) => {
      const entradas = Object.entries(filtrosColumna).filter(([key]) => key !== excluirFiltroKey);
      if (entradas.length === 0) return lista;

      return lista.filter((item) =>
        entradas.every(([key, filtro]) => {
          const columna = columnas.find((c) => c.filtroKey === key);
          if (!columna) return true;
          return coincideFiltroColumna(item, columna, filtro);
        })
      );
    },
    [filtrosColumna, columnas]
  );

  const filasVisibles = useMemo(() => {
    const resultado = aplicarFiltrosColumna(filas);

    // Resuelve cada criterio de orden a su columna una sola vez, en el mismo
    // orden de prioridad en que fueron agregados.
    const criterios = ordenColumnas
      .map((criterio) => {
        const columna = columnas.find((c) => c.filtroKey === criterio.key);
        return columna ? { columna, direccion: criterio.direccion } : null;
      })
      .filter((c): c is { columna: ColumnaTabla<T>; direccion: 'asc' | 'desc' } => c !== null);

    return [...resultado].sort((a, b) => {
      for (const { columna, direccion } of criterios) {
        const { vacio: vacioA, valor: valorA } = valorOrdenable(a, columna);
        const { vacio: vacioB, valor: valorB } = valorOrdenable(b, columna);
        if (vacioA && vacioB) continue;
        if (vacioA) return 1;
        if (vacioB) return -1;
        const comparacion =
          typeof valorA === 'number' && typeof valorB === 'number'
            ? valorA - valorB
            : String(valorA).localeCompare(String(valorB));
        if (comparacion !== 0) return direccion === 'asc' ? comparacion : -comparacion;
      }
      return desempate(a, b);
    });
  }, [filas, aplicarFiltrosColumna, ordenColumnas, columnas, desempate]);

  const columnaAbierta = columnas.find((c) => c.filtroKey === columnaFiltroAbierta) ?? null;

  const opcionesFiltroAbierto = useMemo(() => {
    if (!columnaAbierta || columnaAbierta.filtro.tipo !== 'seleccion') return [];
    const filtroDef = columnaAbierta.filtro;
    if (filtroDef.opcionesEstaticas) return filtroDef.opcionesEstaticas;

    const origen =
      filasParaOpciones ?? aplicarFiltrosColumna(filas, columnaAbierta.filtroKey);

    const mapa = new Map<number, OpcionFiltro>();
    let haySinAsignar = false;

    for (const item of origen) {
      const valores = filtroDef.getValores(item);
      if (valores.length === 0) {
        haySinAsignar = true;
        continue;
      }
      for (const valor of valores) {
        if (!mapa.has(valor.id)) mapa.set(valor.id, valor);
      }
    }

    const opciones = [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (haySinAsignar) opciones.push({ id: SIN_ASIGNAR_ID, nombre: 'Sin asignar' });
    return opciones;
  }, [columnaAbierta, filas, filasParaOpciones, aplicarFiltrosColumna]);

  // Click en el header: abre el filtro, o lo quita si ya estaba puesto.
  const handleClickHeader = (columna: ColumnaTabla<T>) => {
    if (filtrosColumna[columna.filtroKey]) {
      setFiltrosColumna((prev) => {
        const siguiente = { ...prev };
        delete siguiente[columna.filtroKey];
        return siguiente;
      });
      return;
    }
    setColumnaFiltroAbierta(columna.filtroKey);
  };

  // Click normal: apila la columna como un criterio mas de orden (o cicla su
  // direccion / la quita si ya estaba). Shift+click: la vuelve el unico
  // criterio de orden, descartando los demas.
  const handleClickOrdenar = (columna: ColumnaTabla<T>, event: React.MouseEvent) => {
    setOrdenColumnas((prev) => {
      const indice = prev.findIndex((c) => c.key === columna.filtroKey);

      if (event.shiftKey) {
        if (indice === -1 || prev.length > 1) return [{ key: columna.filtroKey, direccion: 'asc' }];
        if (prev[indice].direccion === 'asc') return [{ key: columna.filtroKey, direccion: 'desc' }];
        return [];
      }

      if (indice === -1) return [...prev, { key: columna.filtroKey, direccion: 'asc' }];
      if (prev[indice].direccion === 'asc') {
        const siguiente = [...prev];
        siguiente[indice] = { key: columna.filtroKey, direccion: 'desc' };
        return siguiente;
      }
      return prev.filter((c) => c.key !== columna.filtroKey);
    });
  };

  const handleAplicarFiltro = (filtro: FiltroColumna | null) => {
    if (columnaFiltroAbierta === null) return;
    const key = columnaFiltroAbierta;
    setFiltrosColumna((prev) => {
      const siguiente = { ...prev };
      if (filtro === null) {
        delete siguiente[key];
      } else {
        siguiente[key] = filtro;
      }
      return siguiente;
    });
  };

  /** Reset total (p. ej. al cargar otra tanda de articulos en el wizard). */
  const resetear = () => {
    setFiltrosColumna({});
    setOrdenColumnas([]);
  };

  return {
    filasVisibles,
    filtrosColumna,
    ordenColumnas,
    columnaFiltroAbierta,
    setColumnaFiltroAbierta,
    columnaAbierta,
    opcionesFiltroAbierto,
    handleClickHeader,
    handleClickOrdenar,
    handleAplicarFiltro,
    resetear,
  };
}
