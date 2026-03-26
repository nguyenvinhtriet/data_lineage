'use client';

import { useState, useRef, useMemo } from 'react';
import { Upload, Download, Play, Database, Filter, X, Search } from 'lucide-react';
import GraphComponent from '@/components/GraphComponent';
import { generateTemplate, parseExcel, convertToGraph, generateComplexData } from '@/lib/lineage';
import { Node, Edge } from '@xyflow/react';

const initialData = generateComplexData();
const initialGraph = convertToGraph(initialData);

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>(initialGraph.nodes);
  const [edges, setEdges] = useState<Edge[]>(initialGraph.edges);
  const [selectedLayer, setSelectedLayer] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [appliedNodeIds, setAppliedNodeIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadExampleData = () => {
    const data = generateComplexData();
    const { nodes: newNodes, edges: newEdges } = convertToGraph(data);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodeIds([]);
    setAppliedNodeIds([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcel(file);
      const { nodes: newNodes, edges: newEdges } = convertToGraph(data);
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeIds([]);
      setAppliedNodeIds([]);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      alert('Failed to parse Excel file. Please ensure it follows the template structure.');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNodeSelect = (nodeId: string | null) => {
    if (nodeId) {
      setSelectedNodeIds(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
    } else {
      setSelectedNodeIds([]);
    }
  };

  const handleApply = () => {
    setAppliedNodeIds(selectedNodeIds);
  };

  const handleClear = () => {
    setSelectedNodeIds([]);
    setAppliedNodeIds([]);
  };

  const filteredNodes = useMemo(() => {
    let result = nodes.filter(n => n.type !== 'swimlane');
    if (selectedLayer !== 'All') {
      result = result.filter(n => n.data.layer === selectedLayer);
    }
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(n => (n.data.label as string)?.toLowerCase().includes(lowerQuery));
    }
    return result;
  }, [nodes, selectedLayer, searchQuery]);

  const toggleNodeSelection = (id: string) => {
    setSelectedNodeIds(prev => prev.includes(id) ? prev.filter(nid => nid !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold tracking-tight">Data Lineage Explorer</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={generateTemplate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          
          <button
            onClick={loadExampleData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Play className="w-4 h-4" />
            Example Data
          </button>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors pointer-events-none">
              <Upload className="w-4 h-4" />
              Upload My Data
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Filter */}
        <aside className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-500" />
                <h2 className="font-semibold text-slate-700">Filter & Select</h2>
              </div>
              <button 
                onClick={handleApply}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tables..."
                    className="w-full border border-slate-300 rounded-md pl-10 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Layer</label>
                <select 
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Layers</option>
                  <option value="Source">Source</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Semantic">Semantic</option>
                </select>
              </div>

              {(selectedNodeIds.length > 0 || appliedNodeIds.length > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Selected ({selectedNodeIds.length})</label>
                    <button onClick={handleClear} className="text-xs text-blue-600 hover:text-blue-800">Clear All</button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                    {selectedNodeIds.map(id => {
                      const node = nodes.find(n => n.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {node?.data.label as string || id}
                          <button onClick={() => toggleNodeSelection(id)} className="hover:bg-blue-200 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Nodes ({filteredNodes.length})</label>
            <div className="space-y-4">
              {['Source', 'Silver', 'Gold', 'Semantic'].map(layer => {
                const layerNodes = filteredNodes.filter(n => n.data.layer === layer);
                if (layerNodes.length === 0) return null;
                return (
                  <div key={layer}>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{layer} ({layerNodes.length})</h4>
                    <div className="space-y-1">
                      {layerNodes.map(node => {
                        const isSelected = selectedNodeIds.includes(node.id);
                        return (
                          <button
                            key={node.id}
                            onClick={() => toggleNodeSelection(node.id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-200 text-slate-700'}`}
                          >
                            <div className="truncate">{node.data.label as string}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {filteredNodes.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">
                  No tables found.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative">
          <GraphComponent 
            initialNodes={nodes} 
            initialEdges={edges} 
            appliedNodeIds={appliedNodeIds}
            selectedNodeIds={selectedNodeIds}
            onNodeSelect={handleNodeSelect}
          />
        </main>
      </div>
    </div>
  );
}
