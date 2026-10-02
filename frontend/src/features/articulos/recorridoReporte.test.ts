// Tests de recorridoReporte.ts — los pasos del modal "Imprimir Reporte".
//
// QUE REGLA PROTEGE: cada paso ofrece SOLO lo que existe con lo elegido antes.
// Si un paso ofreciera un subgrupo de otro grupo o un Colegio/Club sin
// articulos en ese subgrupo, el usuario llegaria al final para recibir un "no
// hay articulos" (o un 400 del backend) despues de elegir todo.
import { describe, it, expect } from 'vitest';
import type { CombinacionReporte } from '@/types/reportes';
import {
  articulosDelRecorrido,
  colegiosDelRecorrido,
  gruposDelRecorrido,
  subgruposDelRecorrido,
} from './recorridoReporte';

const c = (
  id_grupo: number,
  id_subgrupo: number,
  id_cliente: number | null,
  articulos: number
): CombinacionReporte => ({
  id_grupo,
  grupo: { 1: 'Remeras', 2: 'Buzos' }[id_grupo] ?? '',
  id_subgrupo,
  subgrupo: { 10: 'Manga corta', 11: 'Manga larga', 20: 'Canguro' }[id_subgrupo] ?? '',
  id_cliente,
  colegio_club: id_cliente === null ? null : { 7: 'San Martín', 8: 'Almafuerte' }[id_cliente] ?? null,
  articulos,
});

const combinaciones = [c(1, 10, 7, 5), c(1, 10, 8, 3), c(1, 10, null, 4), c(1, 11, 7, 2), c(2, 20, 8, 6)];

describe('gruposDelRecorrido', () => {
  it('sin repetidos y por nombre', () => {
    expect(gruposDelRecorrido(combinaciones)).toEqual([
      { id: 2, nombre: 'Buzos' },
      { id: 1, nombre: 'Remeras' },
    ]);
  });
});

describe('subgruposDelRecorrido', () => {
  it('solo los subgrupos del grupo elegido', () => {
    expect(subgruposDelRecorrido(combinaciones, 1)).toEqual([
      { id: 10, nombre: 'Manga corta' },
      { id: 11, nombre: 'Manga larga' },
    ]);
  });
});

describe('colegiosDelRecorrido', () => {
  it('solo los Colegios/Clubes con articulos en ese subgrupo, sin el "sin Colegio/Club"', () => {
    expect(colegiosDelRecorrido(combinaciones, 1, 10)).toEqual([
      { id: 8, nombre: 'Almafuerte' },
      { id: 7, nombre: 'San Martín' },
    ]);
    expect(colegiosDelRecorrido(combinaciones, 1, 11)).toEqual([{ id: 7, nombre: 'San Martín' }]);
  });
});

describe('articulosDelRecorrido', () => {
  it('con Colegio/Club cuenta solo los suyos', () => {
    expect(articulosDelRecorrido(combinaciones, 1, 10, 7)).toBe(5);
  });

  it('sin Colegio/Club cuenta todo el subgrupo, incluidos los que no tienen ninguno', () => {
    expect(articulosDelRecorrido(combinaciones, 1, 10, null)).toBe(12);
  });
});
