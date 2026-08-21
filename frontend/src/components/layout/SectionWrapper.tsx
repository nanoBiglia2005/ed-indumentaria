import type { ReactNode } from "react";

function SectionWrapper({children} : {children : ReactNode}) {
    return (
      <div className='flex flex-col justify-center flex-1 min-w-0 md:px-10 md:py-6'>
        {/* min-h-0 es lo que deja que el contenido de adentro scrollee en vez de
            desbordar la tarjeta. Sin justify-center: al desbordar, el contenido se
            escapaba por arriba y por abajo y la parte de arriba quedaba inalcanzable. */}
        <div className='border px-3 md:rounded-xl md:border-violet-500 h-full min-h-0 min-w-0 flex flex-col gap-2 shadow-xl text-gray-400 select-none'>
            {children}
        </div>
      </div>
    );
  }
  
  export default SectionWrapper;