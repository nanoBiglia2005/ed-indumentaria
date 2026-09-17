import type { ReactNode } from 'react';
import { CreditCardIcon } from '@phosphor-icons/react/dist/csr/CreditCard';
import { PrinterIcon } from '@phosphor-icons/react/dist/csr/Printer';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { FoldersIcon } from '@phosphor-icons/react/dist/csr/Folders';
import { BuildingsIcon } from '@phosphor-icons/react/dist/csr/Buildings';

/**
 * Definicion de las pestañas de Configuracion.
 *
 * Vive en su propio archivo (y no dentro de ConfiguracionTabs) porque un modulo
 * que define un componente no puede exportar ademas constantes: rompe Fast Refresh.
 *
 * Los iconos son de @phosphor-icons/react (misma libreria que ya usan
 * AgrupacionSection, ImpresorasSection, SearchInput, SelectorImpresora y
 * PaymentIcon): una sola fuente de iconos en todo el proyecto.
 */

const TAMANO_ICONO = 20;

export type TabConfiguracionId = 'medios' | 'impresoras' | 'lineas' | 'grupos' | 'colegios';

export interface TabConfiguracion {
  id: TabConfiguracionId;
  nombre: string;
  icono: ReactNode;
}

export const TABS_CONFIGURACION: readonly TabConfiguracion[] = [
  {
    id: 'medios',
    nombre: 'Medios de Pago',
    icono: <CreditCardIcon size={TAMANO_ICONO} />,
  },
  {
    id: 'impresoras',
    nombre: 'Impresoras',
    icono: <PrinterIcon size={TAMANO_ICONO} />,
  },
  {
    id: 'lineas',
    nombre: 'Líneas',
    icono: <ListIcon size={TAMANO_ICONO} />,
  },
  {
    id: 'grupos',
    nombre: 'Grupos y Subgrupos',
    icono: <FoldersIcon size={TAMANO_ICONO} />,
  },
  {
    id: 'colegios',
    nombre: 'Colegios/Clubes',
    icono: <BuildingsIcon size={TAMANO_ICONO} />,
  },
];
