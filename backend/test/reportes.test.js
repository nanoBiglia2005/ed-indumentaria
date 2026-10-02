// Tests de la parte pura de services/reportes.js ("Imprimir Reporte" de Articulos).
//
// QUE REGLAS PROTEGE:
// - La tabla cruzada suma bien y deja "Sin Colegio/Club" como ULTIMA fila y
//   "Sin Talle" como ULTIMA columna: si no, el stock sin asignar se mezcla con
//   el de un Colegio/Club y el reporte miente.
// - El encabezado dice "Colegio/Club" (pedido del cliente) y la fecha va en hora
//   argentina: un reporte de las 23:30 no puede decir que es del dia siguiente.
// - El tope de reportes: sin indicar cual reemplazar, llegar al maximo corta.
// - La planilla de produccion lleva un CAMPO DE FORMULARIO por articulo: es la
//   razon por la que se usa pdfkit. Si alguien lo cambia por un rectangulo
//   dibujado, la planilla se sigue viendo igual pero deja de poder completarse.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  tipoDeReporte,
  consultaDeReporte,
  lineasDeEncabezado,
  ordenarFilasProduccion,
  armarTablaCruzada,
  anchosTablaCruzada,
  bloquesDeTalles,
  limpiarParaNombreDeArchivo,
  nombreArchivoReporte,
  evaluarLimite,
  aReporteListado,
  renderizarPdf,
} = require('../services/reportes');
const { construirWhere } = require('../lib/articulosConsulta');

const nombres = { linea: 'Invierno', grupo: 'Chombas', subgrupo: 'Manga larga', colegioClub: 'San Martín' };
// 23:30 del 29/09 en Buenos Aires = 02:30 del 30/09 en UTC.
const nocheArgentina = new Date('2026-09-30T02:30:00Z');

describe('tipoDeReporte', () => {
  it('con Colegio/Club es la planilla de produccion; sin el, el stock por talle', () => {
    assert.equal(tipoDeReporte(7), 'colegio');
    assert.equal(tipoDeReporte(null), 'general');
  });
});

describe('consultaDeReporte', () => {
  it('sirve tal cual para construirWhere (sin busqueda ni filtros de columna)', () => {
    const consulta = consultaDeReporte({ idLinea: 1, idGrupo: 3, idSubgrupo: 4, idCliente: null });
    assert.equal(consulta.busqueda, '');
    assert.deepEqual(consulta.filtros, {});
    assert.equal(consulta.idCliente, null);
    assert.doesNotThrow(() => construirWhere(consulta));
  });
});

describe('lineasDeEncabezado', () => {
  it('escribe "Colegio/Club", nunca "Colegio" solo', () => {
    const { parametros } = lineasDeEncabezado('colegio', nombres, nocheArgentina);
    assert.ok(parametros.includes('Colegio/Club: San Martín'));
    assert.ok(parametros.every((linea) => !/Colegio(?!\/Club)/.test(linea)));
  });

  it('sin Colegio/Club dice "Todos"', () => {
    const { titulo, parametros } = lineasDeEncabezado('general', { ...nombres, colegioClub: null }, nocheArgentina);
    assert.equal(titulo, 'Stock por talle');
    assert.ok(parametros.includes('Colegio/Club: Todos'));
  });

  it('la fecha va en hora argentina, no en UTC', () => {
    const { generado } = lineasDeEncabezado('general', nombres, nocheArgentina);
    assert.equal(generado, 'Generado: 29/09/2026 23:30');
  });
});

describe('ordenarFilasProduccion', () => {
  it('ordena por descripcion y despues por talle numerico, con los vacios al final', () => {
    const filas = ordenarFilasProduccion([
      { id_articulo: 1, descripcion: 'Remera', talle: '10', cant: 1 },
      { id_articulo: 2, descripcion: null, talle: '2', cant: 1 },
      { id_articulo: 3, descripcion: 'Remera', talle: '2', cant: 1 },
      { id_articulo: 4, descripcion: 'Buzo', talle: null, cant: 1 },
    ]);
    assert.deepEqual(
      filas.map((f) => [f.descripcion, f.talle]),
      [
        ['Buzo', 'Sin Talle'],
        ['Remera', '2'],
        ['Remera', '10'],
        ['Sin Descripción', '2'],
      ]
    );
  });
});

describe('armarTablaCruzada', () => {
  const nombresPorCliente = new Map([
    [1, 'Belgrano'],
    [2, 'Almafuerte'],
  ]);
  const tabla = armarTablaCruzada(
    [
      { id_cliente: 1, talle: '10', total: 5 },
      { id_cliente: 1, talle: '2', total: 3 },
      { id_cliente: null, talle: '2', total: 4 },
      { id_cliente: 2, talle: null, total: 6 },
      { id_cliente: 2, talle: '10 ', total: 1 }, // mismo talle que '10'
      { id_cliente: 2, talle: '10', total: 2 },
    ],
    nombresPorCliente
  );

  it('columnas: talles en orden numerico y "Sin Talle" al final', () => {
    assert.deepEqual(tabla.talles, ['2', '10', 'Sin Talle']);
  });

  it('filas: Colegios/Clubes por nombre y "Sin Colegio/Club" al final', () => {
    assert.deepEqual(
      tabla.filas.map((f) => f.colegioClub),
      ['Almafuerte', 'Belgrano', 'Sin Colegio/Club']
    );
  });

  it('suma cada combinacion y deja en 0 las que no existen', () => {
    const porNombre = Object.fromEntries(tabla.filas.map((f) => [f.colegioClub, f.celdas]));
    assert.deepEqual(porNombre.Almafuerte, [0, 3, 6]);
    assert.deepEqual(porNombre.Belgrano, [3, 5, 0]);
    assert.deepEqual(porNombre['Sin Colegio/Club'], [4, 0, 0]);
  });
});

describe('anchosTablaCruzada', () => {
  it('la tabla nunca es mas ancha que la pagina', () => {
    for (const cantidad of [1, 5, 15, 30]) {
      const { anchoColegioClub, anchoTalle } = anchosTablaCruzada(cantidad, 770);
      assert.ok(anchoColegioClub + anchoTalle * cantidad <= 770);
    }
  });

  it('la letra no baja de 6pt ni sube de 9pt', () => {
    assert.equal(anchosTablaCruzada(3, 770).tamanoLetra, 9);
    assert.equal(anchosTablaCruzada(60, 770).tamanoLetra, 6);
  });
});

describe('bloquesDeTalles', () => {
  it('si entran, un solo bloque', () => {
    assert.deepEqual(bloquesDeTalles(18), [[0, 18]]);
    assert.deepEqual(bloquesDeTalles(0), [[0, 0]]);
  });

  it('si no entran, bloques parejos que cubren todos los talles sin repetir', () => {
    // 64 talles es un caso real de la base local (talles cargados con texto libre).
    assert.deepEqual(bloquesDeTalles(64), [[0, 16], [16, 32], [32, 48], [48, 64]]);
    assert.deepEqual(bloquesDeTalles(19), [[0, 10], [10, 19]]);
  });

  it('ningun bloque supera el maximo', () => {
    for (let cantidad = 1; cantidad <= 100; cantidad++) {
      assert.ok(bloquesDeTalles(cantidad).every(([desde, hasta]) => hasta - desde <= 18));
    }
  });
});

describe('limpiarParaNombreDeArchivo', () => {
  it('saca acentos y deja solo letras, numeros y guiones', () => {
    assert.equal(limpiarParaNombreDeArchivo('Medias Deportivas'), 'Medias-Deportivas');
    assert.equal(limpiarParaNombreDeArchivo('San Martín de Tours'), 'San-Martin-de-Tours');
  });

  it('neutraliza lo que rompe un nombre de archivo o un header', () => {
    // "ELIMINAR" (con comillas) es un Colegio/Club real de la base.
    assert.equal(limpiarParaNombreDeArchivo('"ELIMINAR"'), 'ELIMINAR');
    assert.equal(limpiarParaNombreDeArchivo('Remeras/Buzos\\..'), 'Remeras-Buzos');
    assert.equal(limpiarParaNombreDeArchivo('a\r\nb'), 'a-b');
  });

  it('un nombre sin ningun caracter usable queda como "sin-nombre"', () => {
    assert.equal(limpiarParaNombreDeArchivo('***'), 'sin-nombre');
    assert.equal(limpiarParaNombreDeArchivo(null), 'sin-nombre');
  });

  it('recorta los nombres largos sin dejar un guion al final', () => {
    const largo = limpiarParaNombreDeArchivo('abcdefghi '.repeat(10));
    assert.ok(largo.length <= 30);
    assert.ok(!largo.endsWith('-'));
  });
});

describe('nombreArchivoReporte', () => {
  const nombresDeEjemplo = {
    linea: 'Deportiva',
    grupo: 'Medias',
    subgrupo: 'Medias Deportivas',
    colegioClub: 'San Martín',
  };

  it('arma linea, grupo, subgrupo, Colegio/Club, fecha argentina y sufijo', () => {
    assert.equal(
      nombreArchivoReporte(nombresDeEjemplo, nocheArgentina, 'abcd1234'),
      'reporte-Deportiva-Medias-Medias-Deportivas-San-Martin-20260929-233000-abcd1234.pdf'
    );
  });

  it('sin Colegio/Club termina en "general"', () => {
    assert.match(
      nombreArchivoReporte({ ...nombresDeEjemplo, colegioClub: null }, nocheArgentina, 'x'),
      /-Medias-Deportivas-general-20260929-/
    );
  });

  it('con nombres hostiles el archivo es un nombre simple y corto', () => {
    const nombre = nombreArchivoReporte(
      { linea: '../../etc', grupo: '"x"\r\ny', subgrupo: 'a/b', colegioClub: '"ELIMINAR"'.repeat(20) },
      nocheArgentina
    );
    assert.match(nombre, /^[A-Za-z0-9.-]+$/);
    assert.ok(!nombre.includes('..'));
    assert.ok(nombre.length < 255);
  });

  it('dos reportes en el mismo segundo no pisan el mismo archivo', () => {
    assert.notEqual(
      nombreArchivoReporte(nombresDeEjemplo, nocheArgentina),
      nombreArchivoReporte(nombresDeEjemplo, nocheArgentina)
    );
  });
});

describe('evaluarLimite', () => {
  it('con lugar, ok', () => {
    assert.equal(evaluarLimite(49, 50, null), 'ok');
  });

  it('en el tope y sin indicar cual reemplazar, corta', () => {
    assert.equal(evaluarLimite(50, 50, null), 'limite');
    assert.equal(evaluarLimite(51, 50, null), 'limite');
  });

  it('indicando cual reemplazar, reemplaza', () => {
    assert.equal(evaluarLimite(50, 50, 3), 'reemplazo');
  });
});

describe('aReporteListado', () => {
  it('arma el autor y la url del archivo', () => {
    const listado = aReporteListado({
      id_reporte: 9,
      tipo: 'general',
      fecha_generado: nocheArgentina,
      parametros: {},
      cantidad_filas: 12,
      USUARIOS: { nombre: 'Ana', apellido: null },
    });
    assert.equal(listado.generado_por, 'Ana');
    assert.equal(listado.url, '/api/reportes/9/archivo');
  });

  it('sin usuario (borrado), el autor es null', () => {
    assert.equal(aReporteListado({ id_reporte: 1, USUARIOS: null }).generado_por, null);
  });
});

describe('renderizarPdf', () => {
  const encabezado = lineasDeEncabezado('colegio', nombres, nocheArgentina);

  it('la planilla de produccion tiene un campo editable por articulo', async () => {
    const filas = Array.from({ length: 60 }, (_, i) => ({
      id_articulo: i + 1,
      descripcion: 'Chomba',
      talle: String(i),
      cant: i,
    }));
    const pdf = (await renderizarPdf({ tipo: 'colegio', encabezado, filas })).toString('latin1');

    assert.ok(pdf.startsWith('%PDF'));
    assert.ok(pdf.includes('/AcroForm'));
    assert.ok(pdf.includes('(producir_1)'));
    assert.ok(pdf.includes('(producir_60)'));
  });

  it('la tabla cruzada genera un PDF sin campos de formulario', async () => {
    const tabla = armarTablaCruzada([{ id_cliente: null, talle: 'M', total: 2 }], new Map());
    const pdf = (
      await renderizarPdf({ tipo: 'general', encabezado: { ...encabezado, titulo: 'Stock por talle' }, tabla })
    ).toString('latin1');

    assert.ok(pdf.startsWith('%PDF'));
    assert.ok(!pdf.includes('/AcroForm'));
  });
});
