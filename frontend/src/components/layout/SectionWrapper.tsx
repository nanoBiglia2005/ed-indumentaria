import type { ReactNode } from "react";

function SectionWrapper({children} : {children : ReactNode}) {
    return (
      <div className='flex flex-col justify-center flex-1 min-w-0 min-h-0 md:px-5 md:py-6'>
        {/* min-h-0 (en este div Y en el de adentro) es lo que deja que el
            contenido scrollee en vez de desbordar la tarjeta: por debajo de
            "md" Layout apila con flex-col, y como flex item en el eje
            principal este div queda con min-height:auto por default, que
            ignora el flex-1 y crece para mostrar toda la tabla en vez de
            recortarla. Sin justify-center: al desbordar, el contenido se
            escapaba por arriba y por abajo y la parte de arriba quedaba inalcanzable. */}
        {/* Marco neutro y quieto: el acento fuerte se gasta en la franja de
            BaseModal y en los estados activos, no en el marco de cada pagina. */}
        <div className='border px-3 md:rounded md:border-neutro-200 h-full min-h-0 min-w-0 flex flex-col text-neutro-400 select-none'>
            {children}
        </div>
      </div>
    );
  }
  
  export default SectionWrapper;