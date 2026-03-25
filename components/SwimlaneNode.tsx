import { memo } from 'react';

export const SwimlaneNode = memo(({ data }: any) => {
  return (
    <div 
      className={`rounded-xl border-2 border-dashed ${data.colorClass} pointer-events-none relative`} 
      style={{ width: data.width, height: data.height }}
    >
      <div className="text-lg font-bold text-slate-600 absolute top-2 left-4 uppercase tracking-widest bg-white/90 px-3 py-1 rounded shadow-sm border border-slate-200">
        {data.label}
      </div>
    </div>
  );
});
