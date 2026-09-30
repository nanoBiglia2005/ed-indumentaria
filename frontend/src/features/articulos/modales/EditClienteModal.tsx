import { useState, useMemo } from 'react';
import type { ARTICULOS, CLIENTES_MAYORISTAS } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { actualizarArticulo } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';
import { ordenarPorNombre } from '@/utils/texto';

interface EditClienteModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  articulo: ARTICULOS | null;
  clientes: CLIENTES_MAYORISTAS[];
}

/** Un articulo es de UN colegio/club (o de ninguno): se reemplaza, no se suma. */
export default function EditClienteModal({
  abierto,
  onCerrar,
  onExito,
  articulo,
  clientes,
}: EditClienteModalProps) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) =>
      mensajeDetallesPrimero(err, 'No se pudo actualizar el colegio/club del artículo.'),
  });

  const reiniciar = () => {
    if (!abierto || !articulo) return;
    setClienteSeleccionado(articulo.id_cliente);
    setError(null);
  };
  useResetAlCambiar(abierto, reiniciar);
  useResetAlCambiar(articulo, reiniciar);

  const opciones = useMemo(
    () => ordenarPorNombre(clientes.map((c) => ({ id: c.id_cliente, nombre: c.nombre }))),
    [clientes]
  );

  const handleGuardar = () => {
    if (!articulo) return;

    ejecutar(async () => {
      await actualizarArticulo(articulo.id_articulo, { id_cliente: clienteSeleccionado });
      onExito();
      onCerrar();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='Editar Colegio/Club'
      permitirDesborde
      error={error ? { titulo: 'Error al editar el articulo', detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer'
          >
            Cerrar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 transition-colors'
          >
            {cargando ? 'Guardando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      <div>
        <label className='block text-sm font-medium text-neutro-600 mb-2'>Colegio/Club</label>
        <InlineFilterDropdown
          label='Sin colegio/club'
          opciones={opciones}
          selectedId={clienteSeleccionado}
          onSelect={setClienteSeleccionado}
          onClear={() => setClienteSeleccionado(null)}
          conBuscador
        />
      </div>
    </BaseModal>
  );
}
