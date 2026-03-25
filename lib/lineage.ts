import * as XLSX from 'xlsx';
import { Node, Edge, MarkerType } from '@xyflow/react';
import * as d3 from 'd3-force';

export interface LineageRow {
  ID: string;
  Label: string;
  Layer: 'Source' | 'Silver' | 'Gold' | 'Semantic';
  TargetIDs: string;
}

export const generateComplexData = (): LineageRow[] => {
  const data: LineageRow[] = [];
  
  // 15 Source tables
  const sourceIds: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const id = `src_table_${i}`;
    sourceIds.push(id);
    data.push({ ID: id, Label: `Source Table ${i}`, Layer: 'Source', TargetIDs: '' });
  }

  // 10 Silver tables
  const silverIds: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const id = `sil_clean_${i}`;
    silverIds.push(id);
    data.push({ ID: id, Label: `Clean Data ${i}`, Layer: 'Silver', TargetIDs: '' });
  }

  // 10 Gold tables (5 Dim, 5 Fact)
  const goldDimIds: string[] = [];
  const goldFactIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const dimId = `gld_dim_${i}`;
    goldDimIds.push(dimId);
    data.push({ ID: dimId, Label: `Dim Model ${i}`, Layer: 'Gold', TargetIDs: '' });

    const factId = `gld_fact_${i}`;
    goldFactIds.push(factId);
    data.push({ ID: factId, Label: `Fact Model ${i}`, Layer: 'Gold', TargetIDs: '' });
  }
  const goldIds = [...goldDimIds, ...goldFactIds];

  // 3 Semantic dashboards
  const semanticIds: string[] = ['sem_exec', 'sem_marketing', 'sem_finance'];
  data.push({ ID: 'sem_exec', Label: 'Executive Dashboard', Layer: 'Semantic', TargetIDs: '' });
  data.push({ ID: 'sem_marketing', Label: 'Marketing Dashboard', Layer: 'Semantic', TargetIDs: '' });
  data.push({ ID: 'sem_finance', Label: 'Finance Dashboard', Layer: 'Semantic', TargetIDs: '' });

  // Connect Source -> Silver (1-2 sources per silver)
  let sourceIndex = 0;
  silverIds.forEach(sil => {
    const numSources = Math.random() > 0.5 ? 2 : 1;
    for (let i = 0; i < numSources; i++) {
      if (sourceIndex < sourceIds.length) {
        const src = sourceIds[sourceIndex++];
        const row = data.find(r => r.ID === src);
        if (row) {
          const targets = row.TargetIDs ? row.TargetIDs.split(',') : [];
          if (!targets.includes(sil)) targets.push(sil);
          row.TargetIDs = targets.join(',');
        }
      }
    }
  });
  // If any sources left, attach them to random silvers
  while(sourceIndex < sourceIds.length) {
    const src = sourceIds[sourceIndex++];
    const sil = silverIds[Math.floor(Math.random() * silverIds.length)];
    const row = data.find(r => r.ID === src);
    if (row) {
      const targets = row.TargetIDs ? row.TargetIDs.split(',') : [];
      if (!targets.includes(sil)) targets.push(sil);
      row.TargetIDs = targets.join(',');
    }
  }

  // Connect Silver -> Gold Dim (1 silver per dim)
  goldDimIds.forEach((dim, idx) => {
    const sil = silverIds[idx % silverIds.length];
    const row = data.find(r => r.ID === sil);
    if (row) {
      const targets = row.TargetIDs ? row.TargetIDs.split(',') : [];
      if (!targets.includes(dim)) targets.push(dim);
      row.TargetIDs = targets.join(',');
    }
  });

  // Connect Silver -> Gold Fact (1-2 silvers per fact)
  goldFactIds.forEach((fact, idx) => {
    const sil1 = silverIds[(idx + 5) % silverIds.length];
    const sil2 = silverIds[(idx + 6) % silverIds.length];
    [sil1, sil2].forEach(sil => {
      const row = data.find(r => r.ID === sil);
      if (row) {
        const targets = row.TargetIDs ? row.TargetIDs.split(',') : [];
        if (!targets.includes(fact)) targets.push(fact);
        row.TargetIDs = targets.join(',');
      }
    });
  });

  // Connect Gold Dim -> Gold Fact (each fact gets 1-2 random dims)
  goldFactIds.forEach(fact => {
    const numDims = Math.random() > 0.5 ? 2 : 1;
    const dims = Array.from({length: numDims}, () => goldDimIds[Math.floor(Math.random() * goldDimIds.length)]);
    dims.forEach(dim => {
      const row = data.find(r => r.ID === dim);
      if (row) {
        const targets = row.TargetIDs ? row.TargetIDs.split(',') : [];
        if (!targets.includes(fact)) targets.push(fact);
        row.TargetIDs = targets.join(',');
      }
    });
  });

  // Connect Gold Fact -> Semantic (make sure all fact tables have 1 or 2 semantic models)
  goldFactIds.forEach((fact, idx) => {
    const sem = semanticIds[idx % semanticIds.length];
    const row = data.find(r => r.ID === fact);
    if (row) {
      const targets = row.TargetIDs ? row.TargetIDs.split(',') : [];
      if (!targets.includes(sem)) targets.push(sem);
      row.TargetIDs = targets.join(',');
    }
    // Optionally add a second semantic model
    if (Math.random() > 0.5) {
      const sem2 = semanticIds[(idx + 1) % semanticIds.length];
      if (sem !== sem2) {
         const targets = row!.TargetIDs ? row!.TargetIDs.split(',') : [];
         if (!targets.includes(sem2)) targets.push(sem2);
         row!.TargetIDs = targets.join(',');
      }
    }
  });

  return data;
};

export const generateTemplate = () => {
  const data = generateComplexData();
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lineage');
  XLSX.writeFile(wb, 'Lineage_Template.xlsx');
};

export const parseExcel = async (file: File): Promise<LineageRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames.includes('Lineage') ? 'Lineage' : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<LineageRow>(worksheet);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const LAYER_X_MAP: Record<string, number> = {
  'Source': 0,
  'Silver': 400,
  'Gold': 800,
  'Semantic': 1200,
};

export const calculateLayout = (nodes: Node[]) => {
  const layerGroups: Record<string, Node[]> = {
    'Source': [], 'Silver': [], 'Gold': [], 'Semantic': []
  };
  
  nodes.forEach(n => {
    if (n.type === 'medallion' && n.data.layer) {
      layerGroups[n.data.layer as string]?.push(n);
    }
  });

  const newNodes = [...nodes];
  let maxHeight = 0;

  Object.entries(layerGroups).forEach(([layer, layerNodes]) => {
    // Sort to keep consistent ordering
    layerNodes.sort((a, b) => (a.data.label as string).localeCompare(b.data.label as string));
    const totalHeight = layerNodes.length * 80;
    if (totalHeight > maxHeight) maxHeight = totalHeight;
    
    layerNodes.forEach((node, index) => {
      const n = newNodes.find(x => x.id === node.id);
      if (n) {
        n.position = {
          x: LAYER_X_MAP[layer] || 0,
          y: index * 80
        };
      }
    });
  });

  return { nodes: newNodes, maxHeight };
};

export const convertToGraph = (data: LineageRow[]) => {
  const edges: Edge[] = [];

  const connectedNodeIds = new Set<string>();

  // Create edges first
  data.forEach((row) => {
    if (row.TargetIDs) {
      const targets = row.TargetIDs.split(',').map(s => s.trim()).filter(Boolean);
      targets.forEach(targetId => {
        connectedNodeIds.add(row.ID);
        connectedNodeIds.add(targetId);

        const targetRow = data.find(r => r.ID === targetId);
        const isGoldToGold = row.Layer === 'Gold' && targetRow?.Layer === 'Gold';
        const defaultColor = isGoldToGold ? '#f59e0b' : '#94a3b8'; // amber-500 for gold-to-gold
        const highlightColor = isGoldToGold ? '#d97706' : '#3b82f6'; // darker amber for highlight, blue for normal

        edges.push({
          id: `e-${row.ID}-${targetId}`,
          source: row.ID,
          target: targetId,
          animated: true,
          data: { 
            isGoldToGold,
            defaultColor,
            highlightColor
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: defaultColor,
          },
          style: { stroke: defaultColor, strokeWidth: 1.5, opacity: 1 },
        });
      });
    }
  });

  const filteredData = data.filter(row => row.Layer !== 'Source' || connectedNodeIds.has(row.ID));

  const rawNodes: Node[] = filteredData.map((row) => {
    let subType = '';
    if (row.Layer === 'Gold') {
      if (row.Label.toLowerCase().includes('dim')) subType = 'Dim';
      if (row.Label.toLowerCase().includes('fact')) subType = 'Fact';
    }

    return {
      id: row.ID,
      position: { x: 0, y: 0 },
      data: { label: row.Label, layer: row.Layer || 'Source', subType, dimmed: false },
      type: 'medallion',
    };
  });

  const { nodes: layoutedNodes, maxHeight } = calculateLayout(rawNodes);

  // Create swimlanes
  const swimlanes: Node[] = [
    { id: 'bg-source', type: 'swimlane', position: { x: -50, y: -50 }, data: { label: 'Source', colorClass: 'bg-slate-50 border-slate-200', width: 300, height: Math.max(maxHeight, 500) + 100 }, zIndex: -1, selectable: false },
    { id: 'bg-silver', type: 'swimlane', position: { x: 350, y: -50 }, data: { label: 'Silver', colorClass: 'bg-zinc-50 border-zinc-200', width: 300, height: Math.max(maxHeight, 500) + 100 }, zIndex: -1, selectable: false },
    { id: 'bg-gold', type: 'swimlane', position: { x: 750, y: -50 }, data: { label: 'Gold', colorClass: 'bg-amber-50 border-amber-200', width: 300, height: Math.max(maxHeight, 500) + 100 }, zIndex: -1, selectable: false },
    { id: 'bg-semantic', type: 'swimlane', position: { x: 1150, y: -50 }, data: { label: 'Semantic', colorClass: 'bg-emerald-50 border-emerald-200', width: 300, height: Math.max(maxHeight, 500) + 100 }, zIndex: -1, selectable: false },
  ];

  return { nodes: [...swimlanes, ...layoutedNodes], edges };
};

export const getHighlightedElements = (selectedIds: string[], nodes: Node[], edges: Edge[]) => {
  const primaryNodeIds = new Set<string>(selectedIds);
  const primaryEdgeIds = new Set<string>();
  const secondaryNodeIds = new Set<string>();
  const secondaryEdgeIds = new Set<string>();

  if (selectedIds.length === 0) {
    return { primaryNodeIds, primaryEdgeIds, secondaryNodeIds, secondaryEdgeIds };
  }

  const getNode = (id: string) => nodes.find(n => n.id === id);

  // Find descendants
  let queue: { id: string, isSecondary: boolean }[] = selectedIds.map(id => ({ id, isSecondary: false }));
  const visitedDesc = new Set<string>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visitedDesc.has(curr.id)) continue;
    visitedDesc.add(curr.id);

    edges.forEach(edge => {
      if (edge.source === curr.id) {
        primaryEdgeIds.add(edge.id);
        primaryNodeIds.add(edge.target);
        queue.push({ id: edge.target, isSecondary: false });
      }
    });
  }

  // Find ancestors
  queue = selectedIds.map(id => ({ id, isSecondary: false }));
  const visitedAnc = new Map<string, boolean>();

  while (queue.length > 0) {
    const curr = queue.shift()!;
    
    if (visitedAnc.has(curr.id) && visitedAnc.get(curr.id) === false && curr.isSecondary) {
        continue;
    }
    visitedAnc.set(curr.id, curr.isSecondary);

    edges.forEach(edge => {
      if (edge.target === curr.id) {
        const sourceNode = getNode(edge.source);
        const isSourceDim = sourceNode?.data?.subType === 'Dim';
        
        const isEdgeSecondary = curr.isSecondary || isSourceDim;
        
        if (isEdgeSecondary) {
          secondaryEdgeIds.add(edge.id);
          if (!primaryNodeIds.has(edge.source)) {
            secondaryNodeIds.add(edge.source);
          }
        } else {
          primaryEdgeIds.add(edge.id);
          primaryNodeIds.add(edge.source);
        }
        
        queue.push({ id: edge.source, isSecondary: isEdgeSecondary });
      }
    });
  }

  return { primaryNodeIds, primaryEdgeIds, secondaryNodeIds, secondaryEdgeIds };
};
