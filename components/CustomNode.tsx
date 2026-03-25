import { Handle, Position } from '@xyflow/react';

const layerColors: Record<string, string> = {
  Source: 'bg-blue-50 border-blue-500 text-blue-900',
  Silver: 'bg-slate-50 border-slate-500 text-slate-900',
  Gold: 'bg-amber-50 border-amber-500 text-amber-900',
  Semantic: 'bg-emerald-50 border-emerald-500 text-emerald-900',
};

export function CustomNode({ data }: any) {
  const layer = data.layer as keyof typeof layerColors;
  const colorClass = layerColors[layer] || 'bg-white border-gray-300';
  const isDimmed = data.dimmed;
  const isSelected = data.selected;
  const subType = data.subType;
  const isSecondary = data.isSecondary;
  
  return (
    <div className={`px-4 py-2 shadow-sm rounded-md border-2 ${colorClass} ${isDimmed ? 'opacity-30 grayscale' : 'opacity-100'} ${isSelected ? 'ring-4 ring-blue-400 ring-opacity-50' : ''} ${isSecondary ? 'border-dashed opacity-75' : 'border-solid'} transition-all duration-300 min-w-[150px] relative`}>
      {isSecondary && (
        <div className="absolute -top-2 -left-2 bg-slate-200 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-slate-300 z-10">
          INDIRECT
        </div>
      )}
      {layer !== 'Source' && <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-gray-400" />}
      <div className="font-semibold text-sm truncate pr-8">{data.label}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{layer}</div>
      
      {subType && (
        <div className={`absolute top-2 right-2 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${subType === 'Fact' ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'}`}>
          {subType}
        </div>
      )}

      {layer !== 'Semantic' && <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-gray-400" />}
    </div>
  );
}
