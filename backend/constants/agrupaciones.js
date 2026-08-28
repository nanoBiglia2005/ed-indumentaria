// Fuente unica: shared/agrupaciones.json. La lee este modulo (CommonJS, para las
// rutas) y tambien backend/types.ts (para el frontend). No duplicar valores.
//
// ID_GRUPO_NO_ASIGNADO es el grupo "No Asignado": la base lo pone sola en
// ARTICULOS.id_grupo (default + ON DELETE SET DEFAULT) cuando se borra el grupo
// al que el articulo pertenecia. NUNCA se asigna a mano, ni al crear ni al
// editar un articulo; solo se puede FILTRAR por el.
//
// IDS_GRUPOS_DE_CLIENTES son los grupos Colegios/Clubes, que no se listan ni se
// administran desde Configuracion.
const agrupaciones = require('../shared/agrupaciones.json');

module.exports = {
  ID_GRUPO_NO_ASIGNADO: agrupaciones.ID_GRUPO_NO_ASIGNADO,
  IDS_GRUPOS_DE_CLIENTES: agrupaciones.IDS_GRUPOS_DE_CLIENTES,
};
