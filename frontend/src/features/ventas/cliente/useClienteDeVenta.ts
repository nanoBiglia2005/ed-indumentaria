import { useMemo, useState } from 'react';
import type { CLIENTES } from '@backend/types';
import type { CampoCliente, DatosCliente } from './formatoCliente';
import { CLIENTE_VACIO, camposModificados, desdeCliente, validarCliente } from './formatoCliente';

/**
 * Cliente asignado a la venta que se esta armando.
 *
 * Guarda dos cosas a la vez: la fila tal como esta en la base (`asignado`) y lo
 * que se ve en los inputs (`borrador`). La diferencia entre las dos es lo que
 * se pinta en amarillo y lo que hay que actualizar al confirmar la venta.
 *
 * El estado vive aca (y no adentro de SeccionCliente) porque el modal de la
 * venta necesita las dos cosas para armar el remito.
 */
export function useClienteDeVenta() {
  const [asignado, setAsignado] = useState<CLIENTES | null>(null);
  const [borrador, setBorrador] = useState<DatosCliente>(CLIENTE_VACIO);

  const modificados = useMemo(
    () => (asignado ? camposModificados(borrador, asignado) : new Set<CampoCliente>()),
    [asignado, borrador]
  );

  // Solo importa mientras haya un cliente asignado: sin asignar no hay nada que
  // guardar y el formulario de alta valida por su cuenta.
  const errorDeDatos = asignado ? validarCliente(borrador) : null;

  const asignar = (cliente: CLIENTES) => {
    setAsignado(cliente);
    setBorrador(desdeCliente(cliente));
  };

  const quitar = () => {
    setAsignado(null);
    setBorrador(CLIENTE_VACIO);
  };

  const cambiarCampo = (campo: CampoCliente, valor: string) =>
    setBorrador((prev) => ({ ...prev, [campo]: valor }));

  return {
    asignado,
    borrador,
    modificados,
    /** Hay ediciones sin guardar: al confirmar la venta se pisan en la base. */
    hayCambios: modificados.size > 0,
    errorDeDatos,
    asignar,
    quitar,
    cambiarCampo,
  };
}

export type ClienteDeVenta = ReturnType<typeof useClienteDeVenta>;
