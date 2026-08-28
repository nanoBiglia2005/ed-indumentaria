import type { ReactNode } from 'react';

/**
 * Normaliza texto para busquedas mas permisivas: minusculas y sin espacios,
 * asi "camisa roja" y "CamisaRoja" se consideran la misma busqueda.
 */
export function normalizarBusqueda(texto: string): string {
  return texto.toLowerCase().replace(/\s+/g, '');
}

/**
 * Plural de una palabra suelta, para armar textos con nombres que salen de la
 * base ("Colegio" -> "colegios", "Club" -> "clubes"). Devuelve en minusculas
 * porque se usa dentro de una frase ("Todos los clubes").
 *
 * Es la regla general del castellano, no un diccionario: alcanza para nombres
 * de agrupaciones y grupos, que es donde se usa.
 */
export function pluralizar(palabra: string): string {
  const texto = palabra.trim().toLowerCase();
  if (texto === '') return texto;

  if (texto.endsWith('z')) return `${texto.slice(0, -1)}ces`;
  if (texto.endsWith('s')) return texto;
  return /[aeiou]$/.test(texto) ? `${texto}s` : `${texto}es`;
}

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
