import { useEffect, useMemo, useState } from 'react';
import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { listarTiposDePago } from '@/api/tiposDePago';
import { facturarRemito } from '@/api/remitos';
import { codigoRemito } from '@/features/ventas/codigoRemito';
import SelectorMetodoPago from '@/features/ventas/pago/SelectorMetodoPago';
import TablaPersonalizado from '@/features/ventas/pago/TablaPersonalizado';
import type { ValoresPago } from '@/features/ventas/pago/TablaPersonalizado';
import {
  formatearPesos,
  montoACobrar,
  montoInicialDesdeFinal,
  repartirEntreVacios,
  soloDigitos,
} from '@/features/ventas/pago/calculoPago';

interface MetodoPagoModalProps {
  abierto: boolean;
  /** Remito pendiente (id_estado = 1) que se va a cobrar. */
  remito: RemitoConDetalles | null;
  onCerrar: () => void;
  onFacturado: (remito: RemitoConDetalles) => void;
}

/**
 * Cobro de un remito. El metodo de pago es del REMITO, no de cada articulo: los
 * precios de los articulos no se muestran ni se modifican. Lo unico que se
 * decide aca es como se cubre el precio de la venta (`total_efectivo`):
 *
 *  - con un solo metodo, y el total final es el total de la venta para ese
 *    metodo (lo trae el backend en `totales_por_metodo`); o
 *  - repartido entre varios ("Personalizado"), donde cada parte paga el recargo
 *    de su metodo y el total final es la suma.
 *
 * Los metodos salen de la base, asi que agregar uno nuevo no toca este archivo.
 */
export default function MetodoPagoModal({
  abierto,
  remito,
  onCerrar,
  onFacturado,
}: MetodoPagoModalProps) {
  const [tipos, setTipos] = useState<TIPOS_DE_PAGO[]>([]);
  const [cargando, setCargando] = useState(false);
  const [personalizado, setPersonalizado] = useState(false);
  // null = todavia no se eligio: vale el primer metodo de la lista.
  const [metodoSimple, setMetodoSimple] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<number, ValoresPago>>({});

  const {
    cargando: finalizando,
    error,
    setError,
    ejecutar,
  } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo finalizar la venta.'),
  });

  // Reset al llegar un remito distinto (el modal queda montado entre usos).
  useResetAlCambiar(remito, () => {
    setValores({});
    setPersonalizado(false);
    setMetodoSimple(null);
    setError(null);
  });

  // Los recargos se leen al abrir: pueden haber cambiado en Configuracion
  // desde que se cargo la pagina.
  useEffect(() => {
    if (!abierto) return;

    let cancelado = false;
    setCargando(true);

    listarTiposDePago()
      .then((data) => {
        if (cancelado) return;
        setTipos([...data].sort((a, b) => a.id_tipos_de_pago - b.id_tipos_de_pago));
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener los tipos de pago:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar los métodos de pago.'));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [abierto, setError]);

  const totalEfectivo = remito?.total_efectivo ?? 0;
  // Cuanto sale la venta con cada metodo: lo calcula el backend sumando las
  // lineas ya redondeadas, y es el numero que manda cuando un metodo se lleva
  // todo (ver montoACobrar).
  const totalesDelRemito = useMemo(() => remito?.totales_por_metodo ?? {}, [remito]);

  const porId = useMemo(() => new Map(tipos.map((tipo) => [tipo.id_tipos_de_pago, tipo])), [tipos]);

  // Metodo del modo simple: el elegido o, si no se toco nada, el primero.
  const metodoElegido = personalizado ? null : metodoSimple ?? tipos[0]?.id_tipos_de_pago ?? null;

  const inicialDe = (idTipoDePago: number) => Number(valores[idTipoDePago]?.inicial || 0);

  const sumaIniciales = tipos.reduce((total, tipo) => total + inicialDe(tipo.id_tipos_de_pago), 0);
  const restante = totalEfectivo - sumaIniciales;

  const idsVacios = tipos
    .filter((tipo) => (valores[tipo.id_tipos_de_pago]?.inicial ?? '') === '')
    .map((tipo) => tipo.id_tipos_de_pago);
  const sugerencias = repartirEntreVacios(restante, idsVacios);

  const totalFinal = personalizado
    ? tipos.reduce((total, tipo) => total + Number(valores[tipo.id_tipos_de_pago]?.final || 0), 0)
    : totalesDelRemito[metodoElegido ?? -1] ?? totalEfectivo;

  // Con el reparto solo se cobra cuando el precio quedo cubierto exacto.
  const puedeFinalizar = personalizado ? restante === 0 : metodoElegido !== null;

  // Cuanto mas se puede imputar a un metodo sin pasarse del precio de la venta.
  const maximoPara = (idTipoDePago: number) =>
    Math.max(0, totalEfectivo - (sumaIniciales - inicialDe(idTipoDePago)));

  /**
   * Recalcula la columna "Monto a Cobrar" de TODAS las filas a partir de los
   * montos imputados. Se hace de una porque la regla del metodo unico depende
   * del conjunto: cargar una segunda fila cambia lo que cobra la primera.
   */
  const conFinalesRecalculados = (iniciales: Record<number, string>) => {
    const conMonto = tipos.filter((tipo) => Number(iniciales[tipo.id_tipos_de_pago] || 0) > 0);
    const esMetodoUnico = conMonto.length === 1;

    return Object.fromEntries(
      tipos.map((tipo) => {
        const inicial = iniciales[tipo.id_tipos_de_pago] ?? '';
        if (inicial === '') return [tipo.id_tipos_de_pago, { inicial: '', final: '' }];

        const final = montoACobrar({
          montoInicial: Number(inicial),
          recargo: tipo.recargo,
          esMetodoUnico,
          totalDelMetodo: totalesDelRemito[tipo.id_tipos_de_pago],
        });

        return [tipo.id_tipos_de_pago, { inicial, final: String(final) }];
      })
    ) as Record<number, ValoresPago>;
  };

  const inicialesActuales = (cambio?: { id: number; inicial: string }) => {
    const iniciales = Object.fromEntries(
      tipos.map((tipo) => [tipo.id_tipos_de_pago, valores[tipo.id_tipos_de_pago]?.inicial ?? ''])
    ) as Record<number, string>;

    if (cambio) iniciales[cambio.id] = cambio.inicial;
    return iniciales;
  };

  // Ninguno de los handlers corre dentro de un efecto y cada uno escribe el
  // estado de una sola vez: por eso completar una celda no puede disparar la
  // actualizacion de la otra en cadena.
  const handleCambiarInicial = (idTipoDePago: number, tipeado: string) => {
    const tipo = porId.get(idTipoDePago);
    if (!tipo) return;

    const digitos = soloDigitos(tipeado);
    const inicial =
      digitos === '' ? '' : String(Math.min(Number(digitos), maximoPara(idTipoDePago)));

    setValores(conFinalesRecalculados(inicialesActuales({ id: idTipoDePago, inicial })));
  };

  const handleCambiarFinal = (idTipoDePago: number, tipeado: string) => {
    const tipo = porId.get(idTipoDePago);
    if (!tipo) return;

    const digitos = soloDigitos(tipeado);
    if (digitos === '') {
      setValores(conFinalesRecalculados(inicialesActuales({ id: idTipoDePago, inicial: '' })));
      return;
    }

    const derivado = montoInicialDesdeFinal(Number(digitos), tipo.recargo);
    const maximo = maximoPara(idTipoDePago);

    // Pasarse del precio de la venta no se permite: se recorta al maximo y el
    // importe a cobrar se recalcula desde ahi.
    if (derivado > maximo) {
      setValores(conFinalesRecalculados(inicialesActuales({ id: idTipoDePago, inicial: String(maximo) })));
      return;
    }

    // Mientras se tipea se respeta lo escrito; al salir del campo se acomoda.
    const recalculado = conFinalesRecalculados(
      inicialesActuales({ id: idTipoDePago, inicial: String(derivado) })
    );
    setValores({ ...recalculado, [idTipoDePago]: { inicial: String(derivado), final: digitos } });
  };

  /**
   * Al salir del campo, el importe a cobrar vuelve a ser el que se va a cobrar
   * de verdad. Se acomoda aca y no en cada tecla porque si no, tipear "58825"
   * seria imposible: el primer "5" se convertiria en 0.
   */
  const handleSalirDeFinal = () => setValores(conFinalesRecalculados(inicialesActuales()));

  const handleFinalizar = () => {
    if (!remito || !puedeFinalizar) return;

    ejecutar(async () => {
      // Viajan TODOS los metodos: el backend descarta los que van en 0 y
      // recalcula los importes a cobrar (no confia en los de la pantalla).
      const pagos = tipos.map((tipo) => ({
        id_tipo_de_pago: tipo.id_tipos_de_pago,
        monto_inicial: personalizado
          ? inicialDe(tipo.id_tipos_de_pago)
          : tipo.id_tipos_de_pago === metodoElegido
          ? totalEfectivo
          : 0,
      }));

      onFacturado(await facturarRemito(remito.id_remito, pagos));
    });
  };

  const codigo = remito
    ? codigoRemito(remito.cod_mes, remito.cod_remito_final) ?? `#${remito.id_remito}`
    : '';

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={finalizando ? () => {} : onCerrar}
      titulo={
        <div className='flex items-center justify-between gap-4'>
          <span>Realizar Pago</span>
          <span className='text-2xl font-bold text-violet-600'>{codigo}</span>
        </div>
      }
      claseTitulo='text-2xl font-semibold leading-7 text-gray-900 mb-4'
      ancho='2xl'
      clasePanel='select-none'
      error={error ? { titulo: 'Error al finalizar la venta', detalle: error } : null}
      footer={
        <div className='flex w-full flex-col gap-3 sm:flex-row'>
          <button
            type='button'
            onClick={onCerrar}
            disabled={finalizando}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleFinalizar}
            disabled={finalizando || cargando || !puedeFinalizar}
            className='flex-1 px-4 py-2 text-sm font-medium text-white bg-violet-800 rounded-md hover:bg-violet-900 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors cursor-pointer'
          >
            {finalizando ? 'Finalizando...' : 'Finalizar Pago'}
          </button>
        </div>
      }
    >
      {/* min-h: el modal no cambia de alto al abrir y cerrar el reparto. */}
      <div className='flex min-h-[18rem] flex-col gap-3'>
        {cargando && <p className='text-sm text-gray-400'>Cargando métodos de pago...</p>}

        {!cargando && tipos.length === 0 && (
          <p className='text-sm italic text-gray-400'>No hay métodos de pago cargados.</p>
        )}

        {!cargando && tipos.length > 0 && (
          <>
            <SelectorMetodoPago
              tipos={tipos}
              seleccionado={metodoElegido}
              onSeleccionar={(id) => {
                setPersonalizado(false);
                setMetodoSimple(id);
              }}
              deshabilitado={finalizando}
            />

            <div>
              <button
                type='button'
                onClick={() => setPersonalizado((prev) => !prev)}
                disabled={finalizando}
                className={`flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                  personalizado
                    ? 'rounded-t-lg bg-violet-800 text-white'
                    : 'rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <span className='text-xs'>●</span>
                Personalizado
              </button>

              {personalizado && (
                <TablaPersonalizado
                  tipos={tipos}
                  valores={valores}
                  sugerencias={sugerencias}
                  restante={restante}
                  onCambiarInicial={handleCambiarInicial}
                  onCambiarFinal={handleCambiarFinal}
                  onSalirDeFinal={handleSalirDeFinal}
                  deshabilitado={finalizando}
                />
              )}
            </div>
          </>
        )}

        <div className='mt-auto flex items-end justify-between gap-4 pt-4'>
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-gray-400'>Total en Efectivo</span>
            <span className='text-2xl font-bold text-gray-900'>{formatearPesos(totalEfectivo)}</span>
          </div>
          <div className='flex flex-col items-end'>
            <span className='text-sm font-medium text-violet-400'>Total Final</span>
            <span className='text-3xl font-bold text-violet-600'>{formatearPesos(totalFinal)}</span>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
