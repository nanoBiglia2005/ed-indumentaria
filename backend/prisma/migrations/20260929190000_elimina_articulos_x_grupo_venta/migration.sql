-- ARTICULOS_X_GRUPO_VENTA es un resto de una version vieja: el grupo y el
-- subgrupo de un articulo son campos propios (ARTICULOS.id_grupo / id_subgrupo).
-- Ningun codigo la lee ni la escribe, y sus datos quedaron desactualizados
-- (los grupos se reclasificaron despues, solo sobre ARTICULOS).
--
-- DESTRUCTIVA e irreversible. Sus FK caen con ella.

DROP TABLE "ARTICULOS_X_GRUPO_VENTA";
