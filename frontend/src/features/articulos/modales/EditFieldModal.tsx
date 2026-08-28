import { useState, useEffect, useRef } from 'react';
import type { ARTICULOS, TIPOS_DE_PAGO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { actualizarArticulo } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { triggerShake } from '@/utils/formato';
import { BARCODE_MAX } from '@/utils/barcode';
import PreciosPorMetodo from '@/components/ui/PreciosPorMetodo';

const DESCRIPCION_MAX = 70;
const TALLE_MAX = 30;

export type CampoEditable =
  | 'barcode'
  | 'talle'
  | 'cant'
  | 'cant_reservada'
  | 'stock_minimo'
  | 'precio'
  | 'descripcion'
  | 'detalle';

const CAMPO_INFO: Record<
  CampoEditable,
  { titulo: string; tipo: 'numero' | 'precio' | 'barcode' | 'descripcion' | 'talle' | 'color'; placeholder?: string }
> = {
  cant: { titulo: 'Editar Cantidad', tipo: 'numero' },
  cant_reservada: { titulo: 'Editar Cantidad Reservada', tipo: 'numero' },
  stock_minimo: { titulo: 'Editar Cantidad Minima', tipo: 'numero' },
  precio: { titulo: 'Editar Precio', tipo: 'precio' },
  barcode: { titulo: 'Editar Código de Barra', tipo: 'barcode' },
  descripcion: { titulo: 'Editar Nombre', tipo: 'descripcion', placeholder: 'Nombre del artículo' },
  detalle: { titulo: 'Editar Detalle', tipo: 'descripcion', placeholder: 'Detalle del artículo' },
  talle: { titulo: 'Editar Talle', tipo: 'talle' },
};

interface EditFieldModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  articulo: ARTICULOS | null;
  campo: CampoEditable | null;
  metodosDePago: TIPOS_DE_PAGO[];
}

export default function EditFieldModal({
  abierto,
  onCerrar,
  onExito,
  articulo,
  campo,
  metodosDePago
}: EditFieldModalProps) {
  const [valorNumero, setValorNumero] = useState<number | null>(0);
  const [valorTexto, setValorTexto] = useState<string>('');
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err),
  });

  const descripcionRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto || !articulo || !campo) return;

    setError(null);

    switch (campo) {
      case 'cant':
        setValorNumero(articulo.cant);
        break;
      case 'cant_reservada':
        setValorNumero(articulo.cant_reservada ?? 0);
        break;
      case 'stock_minimo':
        setValorNumero(articulo.stock_minimo);
        break;
      case 'precio':
        setValorNumero(articulo.precio);
        break;
      case 'barcode':
        setValorTexto(articulo.barcode_tail ?? '');
        break;
      case 'descripcion':
        setValorTexto(articulo.descripcion ?? '');
        break;
      case 'detalle':
        setValorTexto(articulo.detalle ?? '');
        break;
      case 'talle':
        setValorTexto(articulo.talle ?? '');
        break;
    }
  }, [abierto, articulo, campo, setError]);

  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setValorNumero(valor === '' ? null : campo === 'precio' ? parseFloat(valor) : parseInt(valor, 10));
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloNumeros = e.target.value.replace(/[^0-9]/g, '');
    if (soloNumeros.length > BARCODE_MAX) {
      setValorTexto(soloNumeros.slice(0, BARCODE_MAX));
      triggerShake(barcodeRef.current);
      return;
    }
    setValorTexto(soloNumeros);
  };

  const handleDescripcionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    if (valor.length > DESCRIPCION_MAX) {
      setValorTexto(valor.slice(0, DESCRIPCION_MAX));
      triggerShake(descripcionRef.current);
      return;
    }
    setValorTexto(valor);
  };

  const handleConfirmar = () => {
    if (!articulo || !campo) return;

    let payload: Record<string, number | string | null>;
    switch (campo) {
      case 'cant':
      case 'cant_reservada':
      case 'stock_minimo':
        payload = { [campo]: valorNumero || 0 };
        break;
      case 'precio':
        payload = { precio: valorNumero || 0 };
        break;
      case 'barcode':
        payload = { barcode_tail: valorTexto.trim() === '' ? null : valorTexto.trim() };
        break;
      case 'descripcion':
        payload = { descripcion: valorTexto.trim() === '' ? null : valorTexto };
        break;
      case 'detalle':
        payload = { detalle: valorTexto.trim() === '' ? null : valorTexto };
        break;
      case 'talle':
        payload = { talle: valorTexto.trim() === '' ? null : valorTexto.trim() };
        break;
    }

    ejecutar(async () => {
      await actualizarArticulo(articulo.id_articulo, payload as Partial<ARTICULOS>);
      onExito();
      onCerrar();
    });
  };

  if (!campo) return null;

  const info = CAMPO_INFO[campo];
  const caracteresRestantes = DESCRIPCION_MAX - valorTexto.length;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={info.titulo}
      error={error ? { titulo: 'Error al editar el articulo', detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
          >
            Cerrar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cargando}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
          >
            {cargando ? 'Guardando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      {info.tipo === 'numero' && (
        <input
          type='number'
          value={valorNumero === null ? '' : valorNumero}
          onChange={handleNumeroChange}
          placeholder='0'
          className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
        />

      )}

      {info.tipo === 'precio' && (
      <div className='flex flex-col gap-y-3 items-center'>
        <input
          type='number'
          step='1'
          value={valorNumero === null ? '' : valorNumero}
          onChange={handleNumeroChange}
          placeholder='0.00'
          className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
        />
        <PreciosPorMetodo
        precio={valorNumero ?? 0}
        metodos={metodosDePago}
        tamanoIcono={20}
        tamanoTexto='md'
        claseContenedor='select-none flex items-center w-fit gap-y-1 rounded-md border bg-white border-gray-300 shadow-md divide-x divide-gray-300'
        />
      </div>
      )}

      {info.tipo === 'barcode' && (
        <div>
          <div className='flex items-center justify-end mb-1'>
            <span
              className={`text-xs transition-colors ${
                valorTexto.length >= BARCODE_MAX ? 'text-red-500 opacity-100' : 'text-gray-400 opacity-70'
              }`}
            >
              {valorTexto.length}/{BARCODE_MAX} dígitos
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <input
              ref={barcodeRef}
              type='text'
              value={valorTexto}
              onChange={handleBarcodeChange}
              placeholder='Sin numeración'
              maxLength={BARCODE_MAX}
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
            />
          </div>
        </div>
      )}

      {info.tipo === 'descripcion' && (
        <div>
          <div className='flex items-center justify-end mb-1'>
            <span
              className={`text-xs transition-colors ${
                caracteresRestantes <= 0 ? 'text-red-500 opacity-100' : 'text-gray-400 opacity-70'
              }`}
            >
              {caracteresRestantes} caracteres restantes
            </span>
          </div>
          <input
            ref={descripcionRef}
            type='text'
            value={valorTexto}
            onChange={handleDescripcionChange}
            placeholder={info.placeholder ?? 'Nombre del artículo'}
            className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
          />
        </div>
      )}

      {info.tipo === 'talle' && (
        <input
          type='text'
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value.slice(0, TALLE_MAX))}
          maxLength={TALLE_MAX}
          placeholder='Sin Talle'
          className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
        />
      )}
    </BaseModal>
  );
}
