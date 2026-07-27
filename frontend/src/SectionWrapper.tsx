import type { ReactNode } from "react";

function SectionWrapper({children} : {children : ReactNode}) {
    return (
      <div className='flex flex-col justify-center flex-1 min-w-0 px-10 py-6'>
        <div className='border px-3 rounded-xl border-violet-500 h-full min-w-0 flex flex-col items-center justify-center gap-2 shadow-xl text-gray-400 select-none'>
            {children}
        </div>
      </div>
    );
  }
  
  export default SectionWrapper;