// Fuente unica: shared/reportes.json. La lee este modulo (CommonJS, para las
// rutas) y tambien backend/types.ts (para el frontend). No duplicar valores.
//
// MAX_REPORTES_GUARDADOS: tope GLOBAL de PDFs guardados en REPORTES (y en
// REPORTES_DIR). Con el tope alcanzado, POST /api/reportes/articulos responde
// 409 salvo que se indique que reporte reemplazar (routes/reportes.js). El
// aviso del frontend es solo informativo: quien corta es el backend.
//
// CODIGO_LIMITE_REPORTES: el `codigo` de ese 409. El frontend lo reconoce para
// ofrecer borrar el reporte mas antiguo en vez de mostrar un error.
const reportes = require('../shared/reportes.json');

module.exports = {
  MAX_REPORTES_GUARDADOS: reportes.MAX_REPORTES_GUARDADOS,
  CODIGO_LIMITE_REPORTES: reportes.CODIGO_LIMITE_REPORTES,
};
