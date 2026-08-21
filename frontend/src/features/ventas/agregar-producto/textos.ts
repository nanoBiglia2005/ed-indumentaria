// Textos del recorrido que se arman con nombres que salen de la base, y que
// necesitan tanto el paso que los muestra como las migas que los repiten.
import { pluralizar } from '@/utils/texto';

/**
 * Como se lee elegir una agrupacion entera en el paso 2: "Todos los colegios",
 * "Todos los clubes". El nombre viene de GRUPOS_DE_VENTA en singular.
 */
export const textoTodaLaAgrupacion = (nombreGrupo: string) =>
  `Todos los ${pluralizar(nombreGrupo)}`;
