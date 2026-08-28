// Sincroniza Prisma con la base de datos: introspecciona la estructura actual
// (prisma db pull) y regenera el cliente (prisma generate).
// Correr `npm run db:sync` despues de cada cambio en la estructura de la base.
const { execSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const backendDir = join(__dirname, '..');
const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: backendDir });

// Workaround de un bug de introspeccion de Prisma 7.9: las relaciones que
// apuntan a un modelo @@ignore (BONIFICACIONES_ARTICULOS no tiene clave
// primaria) deben marcarse @ignore, pero db pull no lo agrega y sin eso el
// schema es invalido (P1012). Se parchea antes del pull (para que db pull
// acepte el schema actual) y despues (para arreglar el schema recien escrito).
const schemaPath = join(backendDir, 'prisma', 'schema.prisma');
const patchIgnore = () => {
  const schema = readFileSync(schemaPath, 'utf8');
  const patched = schema.replace(/^(\s*\w+\s+BONIFICACIONES_ARTICULOS\[\])\s*$/m, '$1 @ignore');
  if (patched !== schema) writeFileSync(schemaPath, patched);
};

patchIgnore();
run('npx prisma db pull');
patchIgnore();
run('npx prisma generate');
