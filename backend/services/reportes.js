// "Imprimir Reporte" de Articulos: consulta -> PDF (pdfkit) -> archivo en
// REPORTES_DIR + fila en REPORTES.
//
// Dos formatos segun si se eligio un Colegio/Club:
//   - colegio: Descripcion / Talle / Cantidad / "Cantidad a producir".
//     La ultima columna es un campo de formulario (AcroForm): se completa en el
//     visor de Chrome/Edge y, impresa, queda como una caja vacia. Por eso pdfkit
//     y no pdfmake: pdfmake no genera campos de formulario.
//   - general: tabla cruzada Colegio/Club x talle con SUM(cant).
//
// Tope GLOBAL de MAX_REPORTES_GUARDADOS. Al reemplazar, primero se genera y
// escribe el nuevo y RECIEN DESPUES se borra el viejo: si algo falla en el medio
// se pierde a lo sumo el nuevo, nunca un reporte que ya existia.
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const PDFDocument = require('pdfkit');
const { Prisma } = require('../generated/prisma/client');
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const { construirWhere } = require('../lib/articulosConsulta');
const { valorOrdenTalle, compararTalles } = require('../lib/talles');
const { asegurarDirReportes, rutaDeArchivo } = require('../lib/rutaReportes');
const { MAX_REPORTES_GUARDADOS, CODIGO_LIMITE_REPORTES } = require('../constants/reportes');
const { ID_GRUPO_NO_ASIGNADO, IDS_GRUPOS_DE_CLIENTES } = require('../constants/agrupaciones');

const ETIQUETAS_TIPO = {
  colegio: 'Planilla de producción',
  general: 'Stock por talle',
};

const SIN_COLEGIO_CLUB = 'Sin Colegio/Club';
const SIN_TALLE = 'Sin Talle';
const SIN_DESCRIPCION = 'Sin Descripción';

// ============================================================
//  LOGICA PURA (exportada: test/reportes.test.js)
// ============================================================

const tipoDeReporte = (idCliente) => (idCliente === null ? 'general' : 'colegio');

/**
 * La consulta que entiende construirWhere, con SOLO los filtros de pagina del
 * reporte. Sin Colegio/Club no se filtra por cliente: entran tambien los
 * articulos sin ninguno (la fila "Sin Colegio/Club"). Entran vigentes y no
 * vigentes.
 */
const consultaDeReporte = ({ idLinea, idGrupo, idSubgrupo, idCliente }) => ({
  busqueda: '',
  idGrupo,
  idSubgrupo,
  idCliente,
  idAgrupacion: null,
  idLinea,
  filtros: {},
});

// Zona fija y no la del sistema operativo (ver "Zona horaria" en CLAUDE.md):
// un reporte de las 23:30 no puede decir que es del dia siguiente.
const FORMATO_FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const partesDeFecha = (fecha) =>
  Object.fromEntries(FORMATO_FECHA.formatToParts(fecha).map((parte) => [parte.type, parte.value]));

const formatearFecha = (fecha) => {
  const p = partesDeFecha(fecha);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
};

/** Titulo y lineas del encabezado. Se escribe "Colegio/Club", nunca "Colegio" solo. */
const lineasDeEncabezado = (tipo, nombres, fecha) => ({
  titulo: ETIQUETAS_TIPO[tipo],
  parametros: [
    `Línea: ${nombres.linea}`,
    `Grupo: ${nombres.grupo}`,
    `Subgrupo: ${nombres.subgrupo}`,
    `Colegio/Club: ${nombres.colegioClub ?? 'Todos'}`,
  ],
  generado: `Generado: ${formatearFecha(fecha)}`,
});

const textoONulo = (valor) => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null);

const compararTextos = (a, b) => {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
};

/** Filas de la planilla: por descripcion y, dentro de cada una, por talle. */
const ordenarFilasProduccion = (filas) =>
  [...filas]
    .sort(
      (a, b) =>
        compararTextos(textoONulo(a.descripcion), textoONulo(b.descripcion)) ||
        compararTalles(a.talle, b.talle) ||
        a.id_articulo - b.id_articulo
    )
    .map((fila) => ({
      id_articulo: fila.id_articulo,
      descripcion: textoONulo(fila.descripcion) ?? SIN_DESCRIPCION,
      talle: textoONulo(fila.talle) ?? SIN_TALLE,
      cant: fila.cant,
    }));

/**
 * Tabla cruzada a partir de filas `{ id_cliente, talle, total }` (un GROUP BY).
 * - Columnas: talles en el orden de compararTalles, "Sin Talle" al final.
 *   "M" y "M " son el mismo talle (se suman).
 * - Filas: Colegios/Clubes por nombre, "Sin Colegio/Club" al final.
 * - Las combinaciones que no existen valen 0.
 */
const armarTablaCruzada = (filas, nombresPorCliente) => {
  const claveTalle = (talle) => (valorOrdenTalle(talle) === null ? null : talle.trim());

  const clavesTalle = [...new Set(filas.map((fila) => claveTalle(fila.talle)))].sort(compararTalles);
  const indiceTalle = new Map(clavesTalle.map((clave, i) => [clave, i]));

  const celdasPorCliente = new Map();
  for (const fila of filas) {
    if (!celdasPorCliente.has(fila.id_cliente)) {
      celdasPorCliente.set(fila.id_cliente, new Array(clavesTalle.length).fill(0));
    }
    celdasPorCliente.get(fila.id_cliente)[indiceTalle.get(claveTalle(fila.talle))] += fila.total;
  }

  const nombreDe = (idCliente) =>
    idCliente === null ? SIN_COLEGIO_CLUB : nombresPorCliente.get(idCliente) ?? `Colegio/Club #${idCliente}`;

  const idsOrdenados = [...celdasPorCliente.keys()].sort((a, b) => {
    if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
    return compararTextos(nombreDe(a), nombreDe(b));
  });

  return {
    talles: clavesTalle.map((clave) => clave ?? SIN_TALLE),
    filas: idsOrdenados.map((idCliente) => ({
      colegioClub: nombreDe(idCliente),
      sinColegioClub: idCliente === null,
      celdas: celdasPorCliente.get(idCliente),
    })),
  };
};

/**
 * Anchos de la tabla cruzada en A4 horizontal. Con pocos talles las columnas
 * no se estiran de mas; con muchos se angosta la columna del Colegio/Club y
 * despues se achica la letra hasta 6pt (debajo de eso ya no se lee impreso).
 */
const anchosTablaCruzada = (cantidadTalles, anchoDisponible) => {
  const ANCHO_TALLE_MAX = 70;
  const ANCHO_TALLE_COMODO = 40;
  let anchoColegioClub = 170;
  let anchoTalle = (anchoDisponible - anchoColegioClub) / Math.max(cantidadTalles, 1);
  if (anchoTalle < ANCHO_TALLE_COMODO) {
    anchoColegioClub = 110;
    anchoTalle = (anchoDisponible - anchoColegioClub) / Math.max(cantidadTalles, 1);
  }
  anchoTalle = Math.min(anchoTalle, ANCHO_TALLE_MAX);
  const tamanoLetra = Math.max(6, Math.min(9, anchoTalle / 4.4));
  return { anchoColegioClub, anchoTalle, tamanoLetra };
};

/**
 * Parte los talles en bloques de columnas cuando no entran en una sola tabla:
 * cada bloque va en su propia pagina y repite la columna Colegio/Club. Los
 * bloques salen parejos (64 talles = 4 de 16, no 3 de 18 y uno de 10).
 * Devuelve pares [desde, hasta) sobre el indice de talles.
 */
const TALLES_POR_BLOQUE_MAX = 18;
const bloquesDeTalles = (cantidad, maximo = TALLES_POR_BLOQUE_MAX) => {
  const cantidadBloques = Math.max(1, Math.ceil(cantidad / maximo));
  const porBloque = Math.ceil(cantidad / cantidadBloques);
  return Array.from({ length: cantidadBloques }, (_, i) => [i * porBloque, Math.min((i + 1) * porBloque, cantidad)]);
};

const LARGO_MAX_PARTE_DE_NOMBRE = 30;

/**
 * Un nombre libre (linea, grupo, Colegio/Club...) como parte segura de un
 * nombre de archivo: sin acentos, solo letras, numeros y guiones. Es lo que
 * evita que una comilla rompa el Content-Disposition, que una barra mande el
 * archivo a una carpeta que no existe o que el nombre pase de 255 caracteres.
 */
const limpiarParaNombreDeArchivo = (texto) => {
  const limpio = String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LARGO_MAX_PARTE_DE_NOMBRE)
    .replace(/-+$/g, '');
  return limpio === '' ? 'sin-nombre' : limpio;
};

/**
 * Nombre unico del archivo: linea, grupo, subgrupo y Colegio/Club ("general"
 * si no hay), sello de fecha en hora argentina y un sufijo al azar.
 */
const nombreArchivoReporte = (nombres, fecha, sufijo = crypto.randomUUID().slice(0, 8)) => {
  const p = partesDeFecha(fecha);
  const partes = [nombres.linea, nombres.grupo, nombres.subgrupo].map(limpiarParaNombreDeArchivo);
  partes.push(nombres.colegioClub === null ? 'general' : limpiarParaNombreDeArchivo(nombres.colegioClub));
  return `reporte-${partes.join('-')}-${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}-${sufijo}.pdf`;
};

/**
 * 'reemplazo' si se indico que reporte reemplazar (vale aunque no se este en
 * el tope: es un pedido explicito), 'limite' si se llego al tope sin indicarlo,
 * 'ok' si hay lugar.
 */
const evaluarLimite = (total, maximo, idAReemplazar) => {
  if (idAReemplazar !== null) return 'reemplazo';
  return total >= maximo ? 'limite' : 'ok';
};

const parametrosDeReporte = ({ idLinea, idGrupo, idSubgrupo, idCliente }, nombres) => ({
  id_linea: idLinea,
  id_grupo: idGrupo,
  id_subgrupo: idSubgrupo,
  id_cliente: idCliente,
  nombres: {
    linea: nombres.linea,
    grupo: nombres.grupo,
    subgrupo: nombres.subgrupo,
    colegioClub: nombres.colegioClub,
  },
});

const urlArchivoReporte = (idReporte) => `/api/reportes/${idReporte}/archivo`;

/** Forma de un reporte en las respuestas de la API (listado, estado, 409). */
const aReporteListado = (fila) => ({
  id_reporte: fila.id_reporte,
  tipo: fila.tipo,
  fecha_generado: fila.fecha_generado,
  parametros: fila.parametros,
  cantidad_filas: fila.cantidad_filas,
  generado_por: fila.USUARIOS
    ? [fila.USUARIOS.nombre, fila.USUARIOS.apellido].filter(Boolean).join(' ') || null
    : null,
  url: urlArchivoReporte(fila.id_reporte),
});

// ============================================================
//  PDF (pdfkit)
// ============================================================

const MARGEN = 36;
const ALTO_FILA = 20;
const ESPACIO_PIE = 18;
const COLORES = {
  texto: '#26232b', // neutro-900
  tenue: '#a09a92', // neutro-400
  secundario: '#57524c', // neutro-600
  borde: '#e3dfda', // neutro-200
  fondoCabecera: '#f2f0ed', // neutro-100
  marca: '#5b3aa0', // marca-500
};

const anchoUtil = (doc) => doc.page.width - MARGEN * 2;
const limiteInferior = (doc) => doc.page.height - MARGEN - ESPACIO_PIE;

/** Recorta con "…" lo que no entra en el ancho (con la fuente ya elegida). */
const ajustarTexto = (doc, texto, ancho) => {
  if (doc.widthOfString(texto) <= ancho) return texto;
  let recortado = texto;
  while (recortado.length > 0 && doc.widthOfString(`${recortado}…`) > ancho) {
    recortado = recortado.slice(0, -1);
  }
  return `${recortado}…`;
};

const dibujarEncabezado = (doc, encabezado) => {
  let y = MARGEN;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORES.marca);
  doc.text(encabezado.titulo, MARGEN, y, { lineBreak: false });
  y += 24;

  doc.font('Helvetica').fontSize(10).fillColor(COLORES.texto);
  doc.text(encabezado.parametros.join('     '), MARGEN, y, { width: anchoUtil(doc) });
  y = doc.y + 3;

  doc.fontSize(9).fillColor(COLORES.secundario);
  const pie = encabezado.nota ? `${encabezado.generado}     ${encabezado.nota}` : encabezado.generado;
  doc.text(pie, MARGEN, y, { lineBreak: false });
  y += 18;

  doc.moveTo(MARGEN, y).lineTo(MARGEN + anchoUtil(doc), y).lineWidth(1).strokeColor(COLORES.borde).stroke();
  return y + 10;
};

/**
 * Una fila de celdas con borde. `celdas`: [{ x, ancho, texto, alinear, color,
 * fuente }]. Por defecto el texto va en una linea centrada y se recorta con "…"
 * si no entra; con `envolver` baja de linea dentro de `alto` (la cabecera de la
 * tabla cruzada: dos talles que empiezan igual no pueden verse iguales).
 */
const dibujarFila = (doc, y, celdas, { fondo = null, tamano = 9, alto = ALTO_FILA, envolver = false } = {}) => {
  for (const celda of celdas) {
    if (fondo) doc.rect(celda.x, y, celda.ancho, alto).fill(fondo);
    doc.rect(celda.x, y, celda.ancho, alto).lineWidth(0.5).strokeColor(COLORES.borde).stroke();
    if (celda.texto === undefined) continue;

    doc.font(celda.fuente ?? 'Helvetica').fontSize(tamano).fillColor(celda.color ?? COLORES.texto);
    const texto = String(celda.texto);
    if (envolver) {
      doc.text(texto, celda.x + 3, y + 4, {
        width: celda.ancho - 6,
        height: alto - 6,
        align: celda.alinear ?? 'left',
        ellipsis: true,
      });
      continue;
    }
    const anchoTexto = celda.ancho - 8;
    doc.text(ajustarTexto(doc, texto, anchoTexto), celda.x + 4, y + (alto - tamano) / 2 + 1, {
      width: anchoTexto,
      align: celda.alinear ?? 'left',
      lineBreak: false,
    });
  }
  return y + alto;
};

/** Alto de una cabecera con texto que baja de linea: hasta 3 lineas. */
const altoDeCabecera = (doc, textos, ancho, tamano) => {
  doc.font('Helvetica-Bold').fontSize(tamano);
  const altoLinea = doc.currentLineHeight(true);
  const lineas = Math.max(1, ...textos.map((texto) => Math.ceil(doc.heightOfString(texto, { width: ancho - 6 }) / altoLinea)));
  return Math.max(ALTO_FILA, Math.min(lineas, 3) * altoLinea + 8);
};

/**
 * Recorre las filas con salto de pagina: cuando la proxima no entra se agrega
 * una pagina y se repiten el encabezado del reporte y la cabecera de la tabla.
 */
const dibujarTablaPaginada = (doc, encabezado, dibujarCabecera, filas, dibujarFilaDeDatos) => {
  let y = dibujarCabecera(dibujarEncabezado(doc, encabezado));
  for (const fila of filas) {
    if (y + ALTO_FILA > limiteInferior(doc)) {
      doc.addPage();
      y = dibujarCabecera(dibujarEncabezado(doc, encabezado));
    }
    y = dibujarFilaDeDatos(y, fila);
  }
};

const dibujarProduccion = (doc, { encabezado, filas }) => {
  const anchoTalle = 70;
  const anchoCantidad = 70;
  const anchoProducir = 115;
  const anchoDescripcion = anchoUtil(doc) - anchoTalle - anchoCantidad - anchoProducir;
  const x = [MARGEN];
  for (const ancho of [anchoDescripcion, anchoTalle, anchoCantidad]) x.push(x[x.length - 1] + ancho);
  const anchos = [anchoDescripcion, anchoTalle, anchoCantidad, anchoProducir];

  // initForm toma la fuente actual como la de los campos; tamano 0 = auto.
  doc.font('Helvetica');
  doc.initForm();

  const cabecera = (y) =>
    dibujarFila(
      doc,
      y,
      ['Descripción', 'Talle', 'Cantidad', 'Cantidad a producir'].map((texto, i) => ({
        x: x[i],
        ancho: anchos[i],
        texto,
        alinear: i === 0 ? 'left' : 'center',
        fuente: 'Helvetica-Bold',
      })),
      { fondo: COLORES.fondoCabecera }
    );

  dibujarTablaPaginada(doc, encabezado, cabecera, filas, (y, fila) => {
    const siguiente = dibujarFila(doc, y, [
      { x: x[0], ancho: anchos[0], texto: fila.descripcion },
      { x: x[1], ancho: anchos[1], texto: fila.talle, alinear: 'center' },
      { x: x[2], ancho: anchos[2], texto: fila.cant, alinear: 'center' },
      { x: x[3], ancho: anchos[3] },
    ]);
    doc.font('Helvetica');
    doc.formText(`producir_${fila.id_articulo}`, x[3] + 2, y + 2, anchos[3] - 4, ALTO_FILA - 4, { align: 'center' });
    return siguiente;
  });
};

const dibujarStockPorTalle = (doc, { encabezado, tabla }) => {
  const bloques = bloquesDeTalles(tabla.talles.length);

  bloques.forEach(([desde, hasta], indiceBloque) => {
    if (indiceBloque > 0) doc.addPage();
    const talles = tabla.talles.slice(desde, hasta);
    const { anchoColegioClub, anchoTalle, tamanoLetra } = anchosTablaCruzada(talles.length, anchoUtil(doc));
    const xTalle = (i) => MARGEN + anchoColegioClub + i * anchoTalle;
    const encabezadoBloque =
      bloques.length > 1 ? { ...encabezado, nota: `Talles: parte ${indiceBloque + 1} de ${bloques.length}` } : encabezado;

    const altoCabecera = altoDeCabecera(doc, talles, anchoTalle, tamanoLetra);
    const cabecera = (y) =>
      dibujarFila(
        doc,
        y,
        [
          { x: MARGEN, ancho: anchoColegioClub, texto: 'Colegio/Club', fuente: 'Helvetica-Bold' },
          ...talles.map((talle, i) => ({
            x: xTalle(i),
            ancho: anchoTalle,
            texto: talle,
            alinear: 'center',
            fuente: 'Helvetica-Bold',
          })),
        ],
        { fondo: COLORES.fondoCabecera, tamano: tamanoLetra, alto: altoCabecera, envolver: true }
      );

    dibujarTablaPaginada(doc, encabezadoBloque, cabecera, tabla.filas, (y, fila) =>
      dibujarFila(
        doc,
        y,
        [
          {
            x: MARGEN,
            ancho: anchoColegioClub,
            texto: fila.colegioClub,
            fuente: fila.sinColegioClub ? 'Helvetica-Oblique' : 'Helvetica',
          },
          ...fila.celdas.slice(desde, hasta).map((valor, i) => ({
            x: xTalle(i),
            ancho: anchoTalle,
            texto: valor,
            alinear: 'center',
            color: valor === 0 ? COLORES.tenue : COLORES.texto,
          })),
        ],
        { tamano: tamanoLetra }
      )
    );
  });
};

/** "Pagina X de Y" al pie de cada pagina (requiere bufferPages). */
const numerarPaginas = (doc) => {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    // Sin margen inferior: si no, escribir por debajo de el agrega una pagina.
    const margenInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(COLORES.tenue);
    doc.text(`Página ${i + 1} de ${count}`, MARGEN, doc.page.height - MARGEN - 8, {
      width: anchoUtil(doc),
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = margenInferior;
  }
};

/** Arma el PDF completo en memoria. `definicion`: { tipo, encabezado, filas | tabla }. */
const renderizarPdf = (definicion) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: definicion.tipo === 'general' ? 'landscape' : 'portrait',
      margin: MARGEN,
      bufferPages: true,
      info: { Title: definicion.encabezado.titulo, Author: 'ED Indumentaria' },
    });
    const partes = [];
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    try {
      if (definicion.tipo === 'general') dibujarStockPorTalle(doc, definicion);
      else dibujarProduccion(doc, definicion);
      numerarPaginas(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });

// ============================================================
//  BASE Y ARCHIVOS
// ============================================================

const incluirUsuario = { USUARIOS: { select: { nombre: true, apellido: true } } };

/** Borra un PDF del disco. Nunca lanza: un archivo huerfano no justifica un error. */
const borrarArchivo = async (nombre) => {
  try {
    await fs.unlink(rutaDeArchivo(nombre));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(`No se pudo borrar el reporte ${nombre}:`, error);
  }
};

/**
 * Valida los ids y devuelve los nombres para el encabezado. El subgrupo tiene
 * que ser del grupo elegido (misma regla que la pagina de Articulos).
 */
const resolverNombres = async ({ idLinea, idGrupo, idSubgrupo, idCliente }) => {
  const [linea, grupo, subgrupo, cliente] = await Promise.all([
    prisma.LINEAS.findUnique({ where: { id_linea: idLinea } }),
    prisma.GRUPOS_DE_VENTA.findUnique({ where: { id_grupo: idGrupo } }),
    prisma.SUBGRUPOS_DE_VENTA.findUnique({ where: { id_subgrupo: idSubgrupo } }),
    idCliente === null ? null : prisma.CLIENTES_MAYORISTAS.findUnique({ where: { id_cliente: idCliente } }),
  ]);

  if (!linea) throw new HttpError(404, { message: 'La línea no existe.' });
  if (!grupo) throw new HttpError(404, { message: 'El grupo no existe.' });
  if (!subgrupo) throw new HttpError(404, { message: 'El subgrupo no existe.' });
  if (subgrupo.id_grupo !== idGrupo) {
    throw new HttpError(400, { message: 'El subgrupo no pertenece al grupo elegido.' });
  }
  if (idCliente !== null && !cliente) throw new HttpError(404, { message: 'El colegio/club no existe.' });

  return {
    linea: linea.nombre_linea,
    grupo: grupo.nombre_grupo,
    subgrupo: subgrupo.nombre_subgrupo,
    colegioClub: cliente?.nombre ?? null,
  };
};

const datosDeProduccion = async (where) => {
  const filas = await prisma.$queryRaw`
    SELECT a.id_articulo, a.descripcion, a.talle, a.cant FROM "ARTICULOS" a WHERE ${where}`;
  return ordenarFilasProduccion(filas);
};

const datosDeStockPorTalle = async (where) => {
  const filas = await prisma.$queryRaw`
    SELECT a.id_cliente, a.talle, SUM(a.cant)::int AS total, COUNT(*)::int AS articulos
      FROM "ARTICULOS" a WHERE ${where}
      GROUP BY a.id_cliente, a.talle`;

  const ids = [...new Set(filas.map((fila) => fila.id_cliente).filter((id) => id !== null))];
  const clientes = await prisma.CLIENTES_MAYORISTAS.findMany({
    where: { id_cliente: { in: ids } },
    select: { id_cliente: true, nombre: true },
  });

  return {
    tabla: armarTablaCruzada(filas, new Map(clientes.map((c) => [c.id_cliente, c.nombre]))),
    cantidadArticulos: filas.reduce((suma, fila) => suma + fila.articulos, 0),
  };
};

// El id del JWT puede ser de un usuario que ya no existe (la sesion vive hasta
// el proximo login): en ese caso el reporte queda sin autor en vez de fallar.
const idDeUsuarioExistente = async (idUsuario) => {
  if (!Number.isSafeInteger(idUsuario)) return null;
  const usuario = await prisma.USUARIOS.findUnique({ where: { id_usuario: idUsuario }, select: { id_usuario: true } });
  return usuario?.id_usuario ?? null;
};

/**
 * Las combinaciones grupo/subgrupo/Colegio-Club que tienen articulos en una
 * linea, para el recorrido en pasos del modal (Linea -> Grupo -> Subgrupo ->
 * Colegio/Club): cada paso ofrece solo lo que existe en el anterior, asi no hay
 * caminos que terminen en un reporte vacio.
 *
 * - Solo grupos "reales": ni "No Asignado" ni los grupos de Colegios/Clubes
 *   (no se listan en /api/grupos).
 * - Solo articulos con subgrupo, y de un subgrupo de SU grupo: el subgrupo es
 *   obligatorio y resolverNombres rechaza un subgrupo de otro grupo.
 * - id_cliente null = articulos sin Colegio/Club (cuentan para "Todos").
 */
const combinacionesDeLinea = (idLinea) =>
  prisma.$queryRaw`
    SELECT a.id_grupo, g.nombre_grupo AS grupo, a.id_subgrupo, s.nombre_subgrupo AS subgrupo,
           a.id_cliente, c.nombre AS colegio_club, count(*)::int AS articulos
      FROM "ARTICULOS" a
      JOIN "GRUPOS_DE_VENTA" g ON g.id_grupo = a.id_grupo
      JOIN "SUBGRUPOS_DE_VENTA" s ON s.id_subgrupo = a.id_subgrupo AND s.id_grupo = a.id_grupo
      LEFT JOIN "CLIENTES_MAYORISTAS" c ON c.id_cliente = a.id_cliente
      WHERE a.id_linea = ${idLinea}
        AND a.id_grupo NOT IN (${Prisma.join([ID_GRUPO_NO_ASIGNADO, ...IDS_GRUPOS_DE_CLIENTES])})
      GROUP BY a.id_grupo, g.nombre_grupo, a.id_subgrupo, s.nombre_subgrupo, a.id_cliente, c.nombre`;

const reporteMasAntiguo = async () => {
  const fila = await prisma.REPORTES.findFirst({
    orderBy: [{ fecha_generado: 'asc' }, { id_reporte: 'asc' }],
    include: incluirUsuario,
  });
  return fila ? aReporteListado(fila) : null;
};

const estadoReportes = async () => ({
  total: await prisma.REPORTES.count(),
  maximo: MAX_REPORTES_GUARDADOS,
  masAntiguo: await reporteMasAntiguo(),
});

const listarReportes = async ({ pagina, tamano }) => {
  const [filas, total] = await prisma.$transaction([
    prisma.REPORTES.findMany({
      orderBy: [{ fecha_generado: 'desc' }, { id_reporte: 'desc' }],
      skip: (pagina - 1) * tamano,
      take: tamano,
      include: incluirUsuario,
    }),
    prisma.REPORTES.count(),
  ]);
  return { reportes: filas.map(aReporteListado), total, maximo: MAX_REPORTES_GUARDADOS };
};

/**
 * Genera, guarda y registra un reporte. `ids`: { idLinea, idGrupo, idSubgrupo,
 * idCliente }. Con el tope alcanzado y sin `idAReemplazar` corta con 409 y
 * devuelve el reporte mas antiguo, para que el frontend ofrezca borrarlo.
 */
const generarReporteArticulos = async ({ ids, idUsuario, idAReemplazar }) => {
  const total = await prisma.REPORTES.count();
  if (evaluarLimite(total, MAX_REPORTES_GUARDADOS, idAReemplazar) === 'limite') {
    throw new HttpError(409, {
      message: `Se alcanzó el máximo de ${MAX_REPORTES_GUARDADOS} reportes guardados. Para generar uno nuevo hay que borrar al menos uno.`,
      codigo: CODIGO_LIMITE_REPORTES,
      masAntiguo: await reporteMasAntiguo(),
    });
  }

  const viejo =
    idAReemplazar === null ? null : await prisma.REPORTES.findUnique({ where: { id_reporte: idAReemplazar } });
  if (idAReemplazar !== null && !viejo) {
    throw new HttpError(404, { message: 'El reporte a reemplazar ya no existe.' });
  }

  const nombres = await resolverNombres(ids);
  const tipo = tipoDeReporte(ids.idCliente);
  const where = construirWhere(consultaDeReporte(ids));
  const fecha = new Date();
  const encabezado = lineasDeEncabezado(tipo, nombres, fecha);

  let definicion;
  let cantidadFilas;
  if (tipo === 'colegio') {
    const filas = await datosDeProduccion(where);
    definicion = { tipo, encabezado, filas };
    cantidadFilas = filas.length;
  } else {
    const { tabla, cantidadArticulos } = await datosDeStockPorTalle(where);
    definicion = { tipo, encabezado, tabla };
    cantidadFilas = cantidadArticulos;
  }

  if (cantidadFilas === 0) {
    throw new HttpError(400, { message: 'No hay artículos con esos parámetros: no se generó el reporte.' });
  }

  const buffer = await renderizarPdf(definicion);
  const nombreArchivo = nombreArchivoReporte(nombres, fecha);
  const dir = await asegurarDirReportes();
  await fs.writeFile(rutaDeArchivo(nombreArchivo, dir), buffer);

  const data = {
    tipo,
    id_usuario: await idDeUsuarioExistente(idUsuario),
    fecha_generado: fecha,
    parametros: parametrosDeReporte(ids, nombres),
    nombre_archivo: nombreArchivo,
    cantidad_filas: cantidadFilas,
  };

  let creado;
  try {
    creado = viejo
      ? (
          await prisma.$transaction([
            prisma.REPORTES.delete({ where: { id_reporte: viejo.id_reporte } }),
            prisma.REPORTES.create({ data }),
          ])
        )[1]
      : await prisma.REPORTES.create({ data });
  } catch (error) {
    await borrarArchivo(nombreArchivo);
    throw error;
  }

  if (viejo) await borrarArchivo(viejo.nombre_archivo);

  return { id_reporte: creado.id_reporte, url: urlArchivoReporte(creado.id_reporte) };
};

/** Primero la fila, despues el archivo: mejor un archivo huerfano que una fila rota. */
const eliminarReporte = async (idReporte) => {
  const fila = await prisma.REPORTES.delete({ where: { id_reporte: idReporte } });
  await borrarArchivo(fila.nombre_archivo);
};

module.exports = {
  tipoDeReporte,
  consultaDeReporte,
  formatearFecha,
  lineasDeEncabezado,
  ordenarFilasProduccion,
  armarTablaCruzada,
  anchosTablaCruzada,
  bloquesDeTalles,
  limpiarParaNombreDeArchivo,
  nombreArchivoReporte,
  evaluarLimite,
  parametrosDeReporte,
  urlArchivoReporte,
  aReporteListado,
  renderizarPdf,
  combinacionesDeLinea,
  estadoReportes,
  listarReportes,
  generarReporteArticulos,
  eliminarReporte,
};
