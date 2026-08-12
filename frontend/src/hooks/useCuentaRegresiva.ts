import { useEffect, useState } from 'react';

/**
 * Cuenta regresiva de confirmacion de los modales destructivos: arranca en
 * `segundosIniciales` cada vez que `activo` pasa a true y baja hasta 0.
 * Recien con 0 se habilita el boton de confirmar.
 */
export function useCuentaRegresiva(activo: boolean, segundosIniciales = 5) {
  const [segundos, setSegundos] = useState(segundosIniciales);

  useEffect(() => {
    if (!activo) return;

    setSegundos(segundosIniciales);
    const intervalo = setInterval(() => {
      setSegundos((actual) => (actual <= 1 ? 0 : actual - 1));
    }, 1000);

    return () => clearInterval(intervalo);
  }, [activo, segundosIniciales]);

  return segundos;
}
