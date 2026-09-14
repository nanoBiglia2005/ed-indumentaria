import { useState, useRef } from 'react';
import type { ARTICULOS, TIPOS_DE_PAGO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { actualizarArticulo, ajustarCantidadArticulo } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { triggerShake } from '@/utils/formato';
import { BARCODE_MAX } from '@/utils/barcode';
import { leerPreferencia, guardarPreferencia } from '@/utils/preferencias';
import PreciosPorMetodo from '@/components/ui/PreciosPorMetodo';
import SegmentedToggle from '@/components/ui/SegmentedToggle';
import InputCantidad from '@/components/ui/InputCantidad';

const DESCRIPCION_MAX = 70;
const TALLE_MAX = 30;

/**
 * Solo `cant` tiene los dos modos de edicion: escribir la cantidad final
 * ('manual') o sumar/restar sobre la actual ('ajuste', el movimiento de stock
 * real del local). `cant_reservada` y `stock_minimo` siguen con el input simple.
 */
type ModoCantidad = 'manual' | 'ajuste';
type SentidoAjuste = 'subida' | 'baja';

const OPCIONES_MODO = [
  { valor: 'manual' as const, etiqueta: 'Manual' },
  { valor: 'ajuste' as const, etiqueta: 'Entrada y salida' },
] as const;

const OPCIONES_SENTIDO = [
  { valor: 'subida' as const, etiqueta: 'Entrada (+)' },
  { valor: 'baja' as const, etiqueta: 'Salida (−)' },
] as const;

// El modo elegido se recuerda entre aperturas: quien carga stock a mano usa
// siempre el mismo y reelegirlo en cada articulo es friccion pura. Es comodidad
// por navegador, no dato de negocio: no viaja al backend.
const CLAVE_MODO_CANTIDAD = 'ed-indumentaria:editCantidad:modo';
const MODOS_CANTIDAD = ['manual', 'ajuste'] as const;

const leerModoGuardado = () =>
  leerPreferencia<ModoCantidad>(CLAVE_MODO_CANTIDAD, MODOS_CANTIDAD, 'manual');

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
  const [modoCantidad, setModoCantidad] = useState<ModoCantidad>(leerModoGuardado);
  const [sentido, setSentido] = useState<SentidoAjuste>('subida');
  const [ajuste, setAjuste] = useState<number | null>(null);
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err),
  });

  const descripcionRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Reset al abrir / cambiar de articulo o de campo: se ajusta DURANTE el render
  // (useResetAlCambiar) en vez de con un useEffect, segun la convencion del repo.
  const reiniciar = () => {
    if (!abierto || !articulo || !campo) return;

    setError(null);
    setModoCantidad(leerModoGuardado());
    setSentido('subida');
    setAjuste(null);

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
  };

  useResetAlCambiar(abierto, reiniciar);
  useResetAlCambiar(articulo, reiniciar);
  useResetAlCambiar(campo, reiniciar);

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

  // Cantidad actual del articulo y resultado del modo entrada/salida. La salida
  // NO se recorta mientras se tipea: recortarla mostraba un numero distinto al
  // que el usuario escribia. En cambio se deja ver la cuenta en negativo, se
  // explica el problema y se bloquea Confirmar.
  const cantActual = articulo?.cant ?? 0;
  const ajusteAplicado = Math.max(0, ajuste ?? 0);
  const cantResultante =
    sentido === 'baja' ? cantActual - ajusteAplicado : cantActual + ajusteAplicado;

  const salidaExcedida = modoCantidad === 'ajuste' && cantResultante < 0;

  const handleConfirmar = () => {
    if (!articulo || !campo) return;
    // Cinturon de seguridad: el boton ya esta deshabilitado, pero el payload
    // nunca puede llevar un stock negativo.
    if (campo === 'cant' && salidaExcedida) return;

    // El modo entrada/salida no manda el valor final calculado aca: manda el
    // delta al endpoint atomico (increment en la base), asi dos cajas ajustando
    // el mismo articulo a la vez se suman entre si en vez de pisarse. Un delta
    // en 0 es un no-op: ni el backend lo acepta (lo rechaza con 400) ni hace
    // falta llamarlo.
    if (campo === 'cant' && modoCantidad === 'ajuste') {
      const delta = sentido === 'baja' ? -ajusteAplicado : ajusteAplicado;
      if (delta === 0) {
        onCerrar();
        return;
      }
      ejecutar(async () => {
        await ajustarCantidadArticulo(articulo.id_articulo, delta);
        onExito();
        onCerrar();
      });
      return;
    }

    let payload: Record<string, number | string | null>;
    switch (campo) {
      case 'cant':
        payload = { cant: valorNumero || 0 };
        break;
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
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer'
          >
            Cerrar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cargando || (campo === 'cant' && salidaExcedida)}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 disabled:cursor-not-allowed transition-colors'
          >
            {cargando ? 'Guardando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      {info.tipo === 'numero' && campo !== 'cant' && (
        <input
          type='number'
          value={valorNumero === null ? '' : valorNumero}
          onChange={handleNumeroChange}
          placeholder='0'
          className='w-full px-3 py-2 border border-neutro-200 rounded focus:outline-none focus:ring-2 focus:ring-marca-500'
        />

      )}

      {campo === 'cant' && (
        <div className='flex flex-col gap-4'>
          <SegmentedToggle<ModoCantidad>
            valor={modoCantidad}
            opciones={OPCIONES_MODO}
            onChange={(nuevo) => {
              setModoCantidad(nuevo);
              guardarPreferencia(CLAVE_MODO_CANTIDAD, nuevo);
            }}
          />

          {modoCantidad === 'manual' ? (
            <InputCantidad
              valor={valorNumero}
              onChange={setValorNumero}
              etiquetaAccesible='Cantidad final'
            />
          ) : (
            <div className='flex flex-col gap-3'>
              <div>
                <label className='block text-sm font-medium text-neutro-600 mb-1'>
                  {sentido === 'baja' ? 'Cantidad a retirar' : 'Cantidad a ingresar'}
                </label>
                <InputCantidad
                  valor={ajuste}
                  onChange={setAjuste}
                  etiquetaAccesible={
                    sentido === 'baja' ? 'Cantidad a retirar' : 'Cantidad a ingresar'
                  }
                />
              </div>

              {/* Selector secundario: va debajo del input y acotado en ancho para
                  que no compita visualmente con el control principal. */}
              <div className='mx-auto w-full max-w-[15rem]'>
                <SegmentedToggle<SentidoAjuste>
                  valor={sentido}
                  opciones={OPCIONES_SENTIDO}
                  onChange={setSentido}
                  compacto
                />
              </div>

              {/* La cuenta explicita: el usuario ve el resultado ANTES de guardar,
                  incluso cuando da negativo (ahi el borde se pone rojo y Confirmar
                  queda bloqueado). */}
              <div
                className={`rounded border px-3 py-3 ${
                  salidaExcedida ? 'border-red-400 bg-red-50' : 'border-neutro-200 bg-neutro-50'
                }`}
              >
                <span className='block text-caption text-neutro-600 mb-1'>
                  Cantidad final
                </span>
                <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-h2 text-neutro-900'>
                  <span
                    className={`font-semibold ${
                      sentido === 'baja' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {cantResultante}
                  </span>
                </div>
              </div>

              {/* Error bloqueante (rojo literal, semantica de resultado) vs aviso
                  informativo (tokens acento-*), segun la convencion del repo. */}
              {salidaExcedida && (
                <p className='rounded border border-red-400 bg-red-100 px-3 py-2 text-caption text-red-700'>
                  No podés retirar más de lo que hay: solo quedan {cantActual}{' '}
                  {cantActual === 1 ? 'unidad' : 'unidades'} y la cuenta daría{' '}
                  {cantResultante}.
                </p>
              )}

              {!salidaExcedida && sentido === 'baja' && cantActual > 0 && cantResultante === 0 && (
                <p className='rounded border border-acento-500 bg-acento-100 px-3 py-2 text-caption text-acento-800'>
                  Con esta salida el artículo queda sin stock.
                </p>
              )}

              {sentido === 'baja' && cantActual === 0 && ajusteAplicado === 0 && (
                <p className='rounded border border-acento-500 bg-acento-100 px-3 py-2 text-caption text-acento-800'>
                  El artículo ya está en 0: no hay stock para retirar.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {info.tipo === 'precio' && (
      <div className='flex flex-col gap-y-3 items-center'>
        <input
          type='number'
          step='1'
          value={valorNumero === null ? '' : valorNumero}
          onChange={handleNumeroChange}
          placeholder='0.00'
          className='w-full px-3 py-2 border border-neutro-200 rounded focus:outline-none focus:ring-2 focus:ring-marca-500'
        />
        <PreciosPorMetodo
        precio={valorNumero ?? 0}
        metodos={metodosDePago}
        tamanoIcono={20}
        tamanoTexto='md'
        claseContenedor='select-none flex items-center w-fit gap-y-1 rounded border bg-white border-neutro-200 divide-x divide-neutro-200'
        />
      </div>
      )}

      {info.tipo === 'barcode' && (
        <div>
          <div className='flex items-center justify-end mb-1'>
            <span
              className={`text-xs transition-colors ${
                valorTexto.length >= BARCODE_MAX ? 'text-red-500 opacity-100' : 'text-neutro-400 opacity-70'
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
              className='w-full px-3 py-2 border border-neutro-200 rounded text-neutro-900 focus:outline-none focus:ring-2 focus:ring-marca-500'
            />
          </div>
        </div>
      )}

      {info.tipo === 'descripcion' && (
        <div>
          <div className='flex items-center justify-end mb-1'>
            <span
              className={`text-xs transition-colors ${
                caracteresRestantes <= 0 ? 'text-red-500 opacity-100' : 'text-neutro-400 opacity-70'
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
            className='w-full px-3 py-2 border border-neutro-200 rounded focus:outline-none focus:ring-2 focus:ring-marca-500'
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
          className='w-full px-3 py-2 border border-neutro-200 rounded focus:outline-none focus:ring-2 focus:ring-marca-500'
        />
      )}
    </BaseModal>
  );
}
