// Donde viven los PDFs de "Imprimir Reporte".
//
// SIEMPRE fuera del repo: el deploy hace `git reset --hard origin/main`, asi que
// un archivo escrito dentro del working directory desaparece en el proximo
// merge a main. En produccion se fija REPORTES_DIR en el .env del backend; sin
// ella se usa ~/ed-reportes, que tambien queda fuera del repo en cualquier maquina.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const dirReportes = () => path.resolve(process.env.REPORTES_DIR || path.join(os.homedir(), 'ed-reportes'));

const asegurarDirReportes = async () => {
  const dir = dirReportes();
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

// basename: aunque nombre_archivo lo arma siempre el backend, un valor
// manipulado en la base no puede leer ni borrar nada fuera de la carpeta.
const rutaDeArchivo = (nombre, dir = dirReportes()) => path.join(dir, path.basename(nombre));

module.exports = { dirReportes, asegurarDirReportes, rutaDeArchivo };
