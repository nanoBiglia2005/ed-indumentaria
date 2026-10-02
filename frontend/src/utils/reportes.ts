import type { tipo_reporte } from '@backend/types';
import type { ParametrosReporte } from '@/types/reportes';

/** Mismos nombres que el titulo del PDF (services/reportes.js). */
export const ETIQUETAS_TIPO_REPORTE: Record<tipo_reporte, string> = {
  colegio: 'Reporte de Colegio/Club',
  general: 'Reporte General',
};

/** "Línea · Grupo · Subgrupo · Colegio/Club" en una linea, para listados. */
export const resumenParametros = ({ nombres }: ParametrosReporte) =>
  [nombres.linea, nombres.grupo, nombres.subgrupo, nombres.colegioClub ?? 'Todos los Colegios/Clubes'].join(' · ');
