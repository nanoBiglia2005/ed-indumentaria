import type { ReactNode } from 'react';

export function resaltarCoincidencia(texto: string, termino: string): ReactNode {
  if (!termino) return texto;

  const escapado = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const partes = texto.split(new RegExp(`(${escapado})`, 'gi'));
  if (partes.length === 1) return texto;

  const terminoLower = termino.toLowerCase();
  return partes.map((parte, i) =>
    parte.toLowerCase() === terminoLower ? (
      <mark key={i} className='bg-violet-300 text-inherit rounded-sm'>
        {parte}
      </mark>
    ) : (
      <span key={i}>{parte}</span>
    )
  );
}
