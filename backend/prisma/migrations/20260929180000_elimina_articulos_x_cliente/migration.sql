-- Segundo deploy de "cliente unico en articulos": el codigo ya no lee ni escribe
-- ARTICULOS_X_CLIENTE (el cliente vive en ARTICULOS.id_cliente, ver la migracion
-- 20260929120000_cliente_unico_en_articulos), asi que la tabla se elimina.
--
-- DESTRUCTIVA e irreversible: antes de aplicarla se verifico en produccion que
-- ARTICULOS.id_cliente coincide con la tabla vieja. Sus FK caen con ella.

DROP TABLE "ARTICULOS_X_CLIENTE";
