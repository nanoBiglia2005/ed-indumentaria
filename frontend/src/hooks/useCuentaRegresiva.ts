import { useEffect, useState } from 'react';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';

/**
 * Cuenta regresiva de confirmacion de los modales destructivos: arranca en
 * `segundosIniciales` cada vez que `activo` pasa a true y baja hasta 0.
 * Recien con 0 se habilita el boton de confirmar.
 */
export function useCuentaRegresiva(activo: boolean, segundosIniciales = 5) {
  const [segundos, setSegundos] = useState(segundosIniciales);

  // El reinicio del contador se ajusta DURANTE el render (antes de que corra
  // el efecto de abajo), no dentro del efecto: evita setState sincronico ahi
  // (react-hooks/set-state-in-effect).
  const reiniciar = () => {
    if (activo) setSegundos(segundosIniciales);
  };
  useResetAlCambiar(activo, reiniciar);
  useResetAlCambiar(segundosIniciales, reiniciar);

  useEffect(() => {
    if (!activo) return;

    const intervalo = setInterval(() => {
      setSegundos((actual) => (actual <= 1 ? 0 : actual - 1));
    }, 1000);

    return () => clearInterval(intervalo);
  }, [activo, segundosIniciales]);

  return segundos;
}
