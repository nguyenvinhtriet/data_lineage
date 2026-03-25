'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeMouseHandler,
  ReactFlowProvider,
  useReactFlow,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';
import { SwimlaneNode } from './SwimlaneNode';
import { getHighlightedElements, calculateLayout } from '@/lib/lineage';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';

interface GraphComponentProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  appliedNodeIds: string[];
  selectedNodeIds: string[];
  onNodeSelect: (nodeId: string | null) => void;
}

function GraphInner({ initialNodes, initialEdges, appliedNodeIds, selectedNodeIds, onNodeSelect }: GraphComponentProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  // Handle fitView only when appliedNodeIds changes
  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 50);
  }, [appliedNodeIds, fitView]);

  // Update state when props change
  useEffect(() => {
    if (initialNodes.length === 0) return;
    
    let currentNodes = initialNodes;
    let currentEdges = initialEdges;

    const activeIds = appliedNodeIds.length > 0 ? appliedNodeIds : selectedNodeIds;

    if (activeIds.length > 0) {
      const { primaryNodeIds, primaryEdgeIds, secondaryNodeIds, secondaryEdgeIds } = getHighlightedElements(activeIds, initialNodes, initialEdges);

      const allVisibleNodeIds = new Set([...primaryNodeIds, ...secondaryNodeIds]);
      const allVisibleEdgeIds = new Set([...primaryEdgeIds, ...secondaryEdgeIds]);

      if (appliedNodeIds.length > 0) {
        currentNodes = initialNodes.filter(n => allVisibleNodeIds.has(n.id) || n.type === 'swimlane');
        currentEdges = initialEdges.filter(e => allVisibleEdgeIds.has(e.id));
        
        // Recalculate layout to move items closer
        const { nodes: layoutedNodes, maxHeight } = calculateLayout(currentNodes.filter(n => n.type === 'medallion'));
        
        // Update swimlanes height
        const updatedSwimlanes = currentNodes.filter(n => n.type === 'swimlane').map(n => ({
          ...n,
          data: { ...n.data, height: Math.max(maxHeight, 300) + 100 }
        }));

        currentNodes = [...updatedSwimlanes, ...layoutedNodes];
      }

      currentNodes = currentNodes.map(n => {
        const isPrimary = primaryNodeIds.has(n.id);
        const isSecondary = secondaryNodeIds.has(n.id) && !isPrimary;
        const isRelated = isPrimary || isSecondary;

        return {
          ...n,
          data: {
            ...n.data,
            dimmed: appliedNodeIds.length === 0 && !isRelated,
            isSecondary
          }
        };
      });

      currentEdges = currentEdges.map(e => {
        const isPrimary = primaryEdgeIds.has(e.id);
        const isSecondary = secondaryEdgeIds.has(e.id) && !isPrimary;
        const isRelated = isPrimary || isSecondary;

        const highlightColor = (e.data?.highlightColor as string) || '#3b82f6';
        const secondaryColor = '#a855f7'; // Purple
        const defaultColor = (e.data?.defaultColor as string) || '#e2e8f0';
        
        let strokeColor = defaultColor;
        let strokeWidth = 1.5;
        let opacity = 0.2;
        let dashed = false;

        if (isPrimary) {
          strokeColor = highlightColor;
          strokeWidth = 2.5;
          opacity = 1;
        } else if (isSecondary) {
          strokeColor = secondaryColor;
          strokeWidth = 2;
          opacity = 0.8;
          dashed = true;
        } else if (appliedNodeIds.length > 0) {
          opacity = 1;
        }

        return {
          ...e,
          style: { 
            stroke: strokeColor, 
            strokeWidth, 
            opacity,
            strokeDasharray: dashed ? '5,5' : 'none'
          },
          markerEnd: {
            ...(e.markerEnd as any),
            color: strokeColor,
          },
          animated: isPrimary || isSecondary,
        };
      });
    } else {
      currentNodes = initialNodes.map(n => ({
        ...n,
        data: { ...n.data, dimmed: false, isSecondary: false }
      }));
      currentEdges = initialEdges.map(e => {
        const defaultColor = (e.data?.defaultColor as string) || '#94a3b8';
        return {
          ...e,
          style: { stroke: defaultColor, strokeWidth: 1.5, opacity: 1 },
          markerEnd: {
            ...(e.markerEnd as any),
            color: defaultColor,
          },
          animated: true,
        };
      });
    }

    // Apply selected state to nodes
    setNodes(currentNodes.map(n => ({
      ...n,
      data: { 
        ...n.data, 
        selected: selectedNodeIds.includes(n.id)
      }
    })));
    setEdges(currentEdges);

  }, [appliedNodeIds, selectedNodeIds, initialNodes, initialEdges, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({ medallion: CustomNode, swimlane: SwimlaneNode }), []);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (node.type === 'swimlane') return;
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const downloadImage = useCallback(() => {
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (element) {
      toPng(element, { 
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          width: '100%',
          height: '100%',
          transform: 'translate(0, 0) scale(1)'
        }
      }).then((dataUrl) => {
        const a = document.createElement('a');
        a.setAttribute('download', 'lineage-graph.png');
        a.setAttribute('href', dataUrl);
        a.click();
      });
    }
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-right"
      minZoom={0.05}
    >
      <Panel position="top-right" className="m-4">
        <button 
          onClick={downloadImage} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PNG
        </button>
      </Panel>
      <Background color="#ccc" gap={16} />
      <Controls />
    </ReactFlow>
  );
}

export default function GraphComponent(props: GraphComponentProps) {
  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlowProvider>
        <GraphInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
