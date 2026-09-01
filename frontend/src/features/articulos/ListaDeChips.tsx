/**
 * Chips con limite: muestra los primeros y un "+N" con el resto.
 *
 * Vive en su propio archivo (y no dentro de columnas.tsx, su unico consumidor)
 * porque un modulo que define un componente no puede exportar ademas constantes
 * ni funciones sin romper Fast Refresh: columnas.tsx exporta ROW_HEIGHT,
 * ALTO_LINEA y la factory crearColumnasArticulos.
 *
 * `formatearListaConLimite` en columnas.tsx es la version texto de esta misma
 * regla, para busqueda y orden: si cambia CHIP_MAXIMO, revisar tambien aquella.
 */
const CHIP_MAXIMO = 2;

export default function ListaDeChips({
  nombres,
  vacioTexto,
}: {
  nombres: string[];
  vacioTexto: string;
}) {
  if (nombres.length === 0) {
    return <span className='text-gray-400 text-sm italic'>{vacioTexto}</span>;
  }

  const visibles = nombres.slice(0, CHIP_MAXIMO);
  const restantes = nombres.length - visibles.length;

  return (
    <span className='flex flex-wrap items-center gap-1'>
      {visibles.map((nombre) => (
        <span
          key={nombre}
          className='px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-gray-700 shadow-sm'
        >
          {nombre}
        </span>
      ))}
      {restantes > 0 && <span className='text-gray-500 font-medium'>+{restantes}</span>}
    </span>
  );
}
