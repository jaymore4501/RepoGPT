'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Loader2, 
  Search, 
  Filter, 
  HelpCircle, 
  Database, 
  ShieldCheck, 
  Folder, 
  FileCode,
  Network,
  Download,
  ChevronDown
} from 'lucide-react';
import { toPng, toSvg, toJpeg } from 'html-to-image';
import { VisualRelation } from '@/lib/storage';

import { FileInspector } from '@/components/FileInspector';

// 1. Custom Node Types for Custom Styling
const CustomNode = ({ data }: { data: any }) => {
  const getStyle = () => {
    if (data.isHeatmap) {
      if (data.type === 'dir' || data.type === 'service' || data.type === 'db' || data.type === 'module') {
        return 'border-slate-800 bg-slate-900/50 text-slate-500 opacity-50'; // Dim non-files in heatmap
      }
      const score = data.complexityScore || 0;
      if (score >= 50) return 'border-rose-500/80 bg-rose-950 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'; // Critical
      if (score >= 30) return 'border-orange-500/80 bg-orange-950 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]'; // High
      if (score >= 15) return 'border-amber-500/60 bg-amber-950 text-amber-300'; // Moderate
      return 'border-emerald-500/40 bg-emerald-950 text-emerald-300'; // Low
    }
    
    switch (data.type) {
      case 'dir':
        return 'border-indigo-500/40 bg-indigo-950/95 text-indigo-300';
      case 'db':
        return 'border-cyan-500/50 bg-cyan-950/95 text-cyan-300 shadow-[0_0_15px_rgba(6,180,212,0.2)]';
      case 'service': // Auth
        return 'border-violet-500/50 bg-violet-950/95 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]';
      case 'module': // API
        return 'border-emerald-500/40 bg-emerald-950/95 text-emerald-300';
      default: // File
        return 'border-slate-700 bg-slate-900 text-slate-300';
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case 'dir':
        return <Folder className="w-3.5 h-3.5" />;
      case 'db':
        return <Database className="w-3.5 h-3.5 animate-pulse" />;
      case 'service':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'module':
        return <Network className="w-3.5 h-3.5" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 max-w-[190px] relative ${getStyle()}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: '#475569', width: '6px', height: '6px', borderRadius: '50%', border: '1px solid #0f172a' }} 
      />
      <span className="shrink-0">{getIcon()}</span>
      <span className="truncate">{data.label}</span>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: '#475569', width: '6px', height: '6px', borderRadius: '50%', border: '1px solid #0f172a' }} 
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function VisualizePage() {
  const params = useParams();
  const repoId = params.repoId as string;

  const [loading, setLoading] = useState(true);
  const [relations, setRelations] = useState<VisualRelation | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'dependencies' | 'hierarchy' | 'flows' | 'heatmap'>('all');
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  const [isInteractive, setIsInteractive] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Layout calculations in concentric rings
  const calculateLayout = useCallback((data: VisualRelation, mode: typeof filterMode) => {
    const rawNodes = data.nodes;
    let rawLinks = data.links;

    // Apply filters based on mode
    let filteredNodes = rawNodes;
    if (mode === 'dependencies') {
      // Exclude directory nodes, keep only files and core flows
      filteredNodes = rawNodes.filter(n => n.type !== 'dir');
      rawLinks = rawLinks.filter(l => l.type === 'imports' || l.type === 'queries' || l.type === 'implements' || l.type === 'serves');
    } else if (mode === 'hierarchy') {
      // Exclude service, db flows, show file tree contains logic only
      filteredNodes = rawNodes.filter(n => !n.id.startsWith('flow::'));
      rawLinks = rawLinks.filter(l => l.type === 'contains');
    } else if (mode === 'flows') {
      // Show only core service/flow nodes and the direct files connected to them
      const coreIds = new Set(['flow::authentication', 'flow::database', 'flow::api']);
      const linkedNodeIds = new Set<string>();
      
      rawLinks.forEach(l => {
        if (coreIds.has(l.target)) linkedNodeIds.add(l.source);
        if (coreIds.has(l.source)) linkedNodeIds.add(l.target);
      });

      filteredNodes = rawNodes.filter(n => coreIds.has(n.id) || linkedNodeIds.has(n.id));
      rawLinks = rawLinks.filter(l => coreIds.has(l.target) || coreIds.has(l.source));
    }

    const calculatedNodes: Node[] = [];
    const centerX = 400;
    const centerY = 350;

    // 1. ALL MODE LAYOUT (Concentric directories and files)
    if (mode === 'all') {
      const dirNodes = filteredNodes.filter(n => n.type === 'dir' || n.id.startsWith('flow::'));
      const fileNodes = filteredNodes.filter(n => n.type === 'file');
      const numDirs = dirNodes.length;
      const centerRadius = 250;

      dirNodes.forEach((node, idx) => {
        const angle = (idx / numDirs) * 2 * Math.PI;
        calculatedNodes.push({
          id: node.id,
          type: 'custom',
          position: {
            x: centerX + centerRadius * Math.cos(angle),
            y: centerY + centerRadius * Math.sin(angle),
          },
          data: { label: node.label, type: node.type, id: node.id, size: node.size }
        });
      });

      const numFiles = fileNodes.length;
      const outerRadius = 450;

      fileNodes.forEach((node, idx) => {
        const parts = node.id.split('/');
        let parentNode: Node | undefined;
        if (parts.length > 1) {
          const parentPath = parts.slice(0, -1).join('/');
          parentNode = calculatedNodes.find(n => n.id === parentPath);
        }

        if (parentNode) {
          const siblings = fileNodes.filter(f => {
            const pParts = f.id.split('/');
            if (pParts.length > 1) {
              return pParts.slice(0, -1).join('/') === parentNode!.id;
            }
            return false;
          });
          const siblingIdx = siblings.findIndex(f => f.id === node.id);
          const numSiblings = siblings.length;
          const radius = 90;
          const angle = (siblingIdx / numSiblings) * 2 * Math.PI + Math.PI / 4;
          
          calculatedNodes.push({
            id: node.id,
            type: 'custom',
            position: {
              x: parentNode.position.x + radius * Math.cos(angle),
              y: parentNode.position.y + radius * Math.sin(angle),
            },
            data: { label: node.label, type: node.type, id: node.id, size: node.size }
          });
        } else {
          const angle = (idx / numFiles) * 2 * Math.PI;
          calculatedNodes.push({
            id: node.id,
            type: 'custom',
            position: {
              x: centerX + outerRadius * Math.cos(angle) * (1.1 + (idx % 2) * 0.1),
              y: centerY + outerRadius * Math.sin(angle) * (1.1 + (idx % 2) * 0.1),
            },
            data: { label: node.label, type: node.type, id: node.id, size: node.size }
          });
        }
      });
    }

    // 2. DEPENDENCIES / IMPORTS ONLY LAYOUT (Files group by directory in circle)
    else if (mode === 'dependencies') {
      const fileFolders = new Set<string>();
      filteredNodes.forEach(node => {
        if (node.type === 'file') {
          const parts = node.id.split('/');
          if (parts.length > 1) {
            fileFolders.add(parts.slice(0, -1).join('/'));
          } else {
            fileFolders.add('root');
          }
        } else {
          fileFolders.add('flows');
        }
      });

      const folderList = Array.from(fileFolders);
      const folderAngles: Record<string, number> = {};
      folderList.forEach((folder, idx) => {
        folderAngles[folder] = (idx / folderList.length) * 2 * Math.PI;
      });

      const baseRadius = 350;
      const folderFiles: Record<string, typeof filteredNodes> = {};
      filteredNodes.forEach(node => {
        let folder = 'root';
        if (node.type === 'file') {
          const parts = node.id.split('/');
          if (parts.length > 1) {
            folder = parts.slice(0, -1).join('/');
          }
        } else {
          folder = 'flows';
        }
        if (!folderFiles[folder]) {
          folderFiles[folder] = [];
        }
        folderFiles[folder].push(node);
      });

      Object.entries(folderFiles).forEach(([folder, nodes]) => {
        const folderAngle = folderAngles[folder] || 0;
        const numNodes = nodes.length;
        
        nodes.forEach((node, idx) => {
          const spreadAngle = folderAngle + (idx - (numNodes - 1) / 2) * 0.15;
          const radius = baseRadius + (idx % 2 === 0 ? 0 : 60);
          
          calculatedNodes.push({
            id: node.id,
            type: 'custom',
            position: {
              x: centerX + radius * Math.cos(spreadAngle),
              y: centerY + radius * Math.sin(spreadAngle),
            },
            data: { label: node.label, type: node.type, id: node.id, size: node.size }
          });
        });
      });
    }

    // 3. FILE TREE HIERARCHY LAYOUT (Top-down Tree structure)
    else if (mode === 'hierarchy') {
      const depthGroups: Record<number, typeof filteredNodes> = {};
      filteredNodes.forEach(node => {
        const depth = node.id.includes('/') ? node.id.split('/').length : 0;
        if (!depthGroups[depth]) {
          depthGroups[depth] = [];
        }
        depthGroups[depth].push(node);
      });

      const depthLevels = Object.keys(depthGroups).map(Number).sort((a, b) => a - b);
      const levelHeight = 160;
      const nodeSpacing = 200;

      depthLevels.forEach(depth => {
        const levelNodes = depthGroups[depth];
        const numNodes = levelNodes.length;
        const levelY = 80 + depth * levelHeight;
        
        levelNodes.forEach((node, idx) => {
          const totalWidth = (numNodes - 1) * nodeSpacing;
          const levelX = centerX - totalWidth / 2 + idx * nodeSpacing;
          calculatedNodes.push({
            id: node.id,
            type: 'custom',
            position: { x: levelX, y: levelY },
            data: { label: node.label, type: node.type, id: node.id, size: node.size }
          });
        });
      });
    }

    // 4. CORE FLOWS LAYOUT (Service Hub clusters)
    else if (mode === 'flows') {
      const coreIds = new Set(['flow::authentication', 'flow::database', 'flow::api']);
      const coreX: Record<string, number> = {
        'flow::authentication': 200,
        'flow::database': 500,
        'flow::api': 800
      };
      const coreY = 200;

      const activeCoreNodes = filteredNodes.filter(n => coreIds.has(n.id));
      activeCoreNodes.forEach(node => {
        calculatedNodes.push({
          id: node.id,
          type: 'custom',
          position: { x: coreX[node.id] || 500, y: coreY },
          data: { label: node.label, type: node.type, id: node.id, size: node.size }
        });
      });

      const connectedFiles = filteredNodes.filter(n => !coreIds.has(n.id));
      const coreClusters: Record<string, string[]> = {
        'flow::authentication': [],
        'flow::database': [],
        'flow::api': []
      };

      connectedFiles.forEach(file => {
        rawLinks.forEach(link => {
          if (link.source === file.id && coreIds.has(link.target)) {
            coreClusters[link.target].push(file.id);
          } else if (link.target === file.id && coreIds.has(link.source)) {
            coreClusters[link.source].push(file.id);
          }
        });
      });

      const placedSet = new Set<string>();
      Object.entries(coreClusters).forEach(([coreId, fileIds]) => {
        const numFiles = fileIds.length;
        if (numFiles === 0) return;

        const clusterX = coreX[coreId] || 500;
        const clusterY = coreY;
        const radius = 150;

        fileIds.forEach((fileId, idx) => {
          if (placedSet.has(fileId)) return;
          placedSet.add(fileId);
          
          const fileNode = connectedFiles.find(n => n.id === fileId);
          if (!fileNode) return;

          const angle = Math.PI / 6 + (idx / (numFiles - 1 || 1)) * (Math.PI * 2 / 3);
          calculatedNodes.push({
            id: fileNode.id,
            type: 'custom',
            position: {
              x: clusterX + radius * Math.cos(angle),
              y: clusterY + radius * Math.sin(angle) + 80
            },
            data: { label: fileNode.label, type: fileNode.type, id: fileNode.id, size: fileNode.size }
          });
        });
      });
    }

    // 3. Build edge links
    const calculatedEdges: Edge[] = rawLinks.map((link, idx) => {
      const isFlow = link.source.startsWith('flow::') || link.target.startsWith('flow::');
      const isImport = link.type === 'imports';
      const isContains = link.type === 'contains';

      return {
        id: `e-${idx}`,
        source: link.source,
        target: link.target,
        animated: isFlow || isImport, // Animate dependencies & flow connections
        type: isContains ? 'default' : 'smoothstep',
        markerEnd: isContains ? undefined : {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: isFlow ? '#22d3ee' : '#8b5cf6',
        },
        style: {
          stroke: isContains 
            ? 'rgba(71, 85, 105, 0.25)' 
            : isFlow 
              ? 'rgba(6, 180, 212, 0.65)' 
              : 'rgba(139, 92, 246, 0.55)',
          strokeWidth: isContains ? 1.2 : 2.2,
          strokeDasharray: isContains ? '4 4' : undefined,
        }
      };
    });

    const finalNodes = calculatedNodes.map(cn => {
      const origNode = rawNodes.find(n => n.id === cn.id);
      return {
        ...cn,
        data: {
          ...cn.data,
          isHeatmap: mode === 'heatmap',
          complexityScore: origNode?.complexityScore,
          maintainabilityScore: origNode?.maintainabilityScore,
          smells: origNode?.smells,
        }
      };
    });

    setNodes(finalNodes);
    setEdges(calculatedEdges);
  }, [setNodes, setEdges]);

  // Load Graph Data
  useEffect(() => {
    async function fetchRelations() {
      const startTime = Date.now();
      try {
        const res = await fetch(`/api/visualize?repoId=${repoId}`);
        if (!res.ok) throw new Error('Failed to load relationships');
        const data = await res.json();
        setRelations(data);
        calculateLayout(data, 'all');
      } catch (err) {
        console.error(err);
      } finally {
        // Dynamic minimum loading delay based on node count to show premium spinner smoothly
        const elapsed = Date.now() - startTime;
        const minDelay = 800; // minimum duration in ms
        const remaining = Math.max(0, minDelay - elapsed);
        setTimeout(() => {
          setLoading(false);
        }, remaining);
      }
    }
    if (repoId) {
      fetchRelations();
    }
  }, [repoId, calculateLayout]);

  // Handle filter buttons
  const handleFilterChange = (mode: typeof filterMode) => {
    setFilterMode(mode);
    if (relations) {
      calculateLayout(relations, mode === 'heatmap' ? 'all' : mode);
    }
  };

  // Node Clicking Inspection
  const onNodeClick = (_: any, node: Node) => {
    if (filterMode === 'heatmap' && node.data?.type === 'file') {
      setSelectedNodeData(node.data);
      setInspectorOpen(true);
    } else {
      setSelectedNodeData(node.data);
    }
  };

  // Node search highlights
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      // Clear highlights
      setNodes(prev => prev.map(n => ({
        ...n,
        style: {}
      })));
      return;
    }

    setNodes(prev => prev.map(n => {
      const match = String((n.data as any).label || '').toLowerCase().includes(searchQuery.toLowerCase());
      return {
        ...n,
        style: match 
          ? { border: '2px solid #22d3ee', boxShadow: '0 0 20px #06b6d4' } 
          : { opacity: 0.3 }
      };
    }));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setNodes(prev => prev.map(n => ({
      ...n,
      style: {}
    })));
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const exportImage = async (format: 'png' | 'jpeg' | 'svg') => {
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element) return;
    
    try {
      let dataUrl = '';
      const filename = `architecture-${filterMode}-${repoId}.${format === 'jpeg' ? 'jpg' : format}`;
      
      const options = {
        backgroundColor: '#030712',
        quality: 0.95,
        pixelRatio: 3, // 3x scale for crisp high-definition quality
      };

      if (format === 'png') {
        dataUrl = await toPng(element, options);
      } else if (format === 'jpeg') {
        dataUrl = await toJpeg(element, options);
      } else if (format === 'svg') {
        dataUrl = await toSvg(element);
      }
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Image export failed:', error);
    }
  };

  const exportData = (format: 'json' | 'mermaid' | 'plantuml' | 'drawio' | 'dot') => {
    let content = '';
    let filename = `architecture-${filterMode}-${repoId}`;
    let type = 'text/plain';

    switch (format) {
      case 'json':
        content = JSON.stringify({ nodes, edges }, null, 2);
        filename += '.json';
        type = 'application/json';
        break;
        
      case 'mermaid':
        content = 'flowchart TD\n';
        nodes.forEach(n => {
          const label = String(n.data?.label || n.id).replace(/"/g, '\\"');
          content += `  ${n.id}["${label}"]\n`;
        });
        edges.forEach(e => {
          content += `  ${e.source} --> ${e.target}\n`;
        });
        filename += '.md';
        break;

      case 'plantuml':
        content = '@startuml\n';
        nodes.forEach(n => {
          const label = String(n.data?.label || n.id);
          const safeId = n.id.replace(/[^a-zA-Z0-9]/g, '_');
          content += `rectangle "${label}" as ${safeId}\n`;
        });
        edges.forEach(e => {
          const src = e.source.replace(/[^a-zA-Z0-9]/g, '_');
          const tgt = e.target.replace(/[^a-zA-Z0-9]/g, '_');
          content += `${src} --> ${tgt}\n`;
        });
        content += '@enduml\n';
        filename += '.puml';
        break;

      case 'drawio':
        content = `<mxfile host="RepoGPT" modified="${new Date().toISOString()}" agent="RepoGPT" version="1.0">\n`;
        content += `  <diagram id="diagram_1" name="Architecture Map">\n`;
        content += `    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169">\n`;
        content += `      <root>\n`;
        content += `        <mxCell id="0" />\n`;
        content += `        <mxCell id="1" parent="0" />\n`;
        
        nodes.forEach((n) => {
          const label = String(n.data?.label || n.id);
          const x = Math.round(n.position.x);
          const y = Math.round(n.position.y);
          const width = 150;
          const height = 40;
          
          let style = "rounded=1;whiteSpace=wrap;html=1;fillColor=#1e1b4b;strokeColor=#8b5cf6;fontColor=#ffffff;";
          if (n.data?.type === 'dir') {
            style = "rounded=1;whiteSpace=wrap;html=1;fillColor=#312e81;strokeColor=#6366f1;fontColor=#ffffff;";
          } else if (n.data?.type === 'db') {
            style = "shape=cylinder;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#083344;strokeColor=#06b6d4;fontColor=#ffffff;";
          } else if (n.data?.type === 'service') {
            style = "rounded=1;whiteSpace=wrap;html=1;fillColor=#2e1065;strokeColor=#a78bfa;fontColor=#ffffff;";
          }
          
          content += `        <mxCell id="${n.id}" value="${label}" style="${style}" vertex="1" parent="1">\n`;
          content += `          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />\n`;
          content += `        </mxCell>\n`;
        });
        
        edges.forEach((e, idx) => {
          content += `        <mxCell id="edge_${idx}" value="" style="endArrow=classic;html=1;strokeColor=#8b5cf6;edgeStyle=orthogonalEdgeStyle;rounded=1;" edge="1" parent="1" source="${e.source}" target="${e.target}">\n`;
          content += `          <mxGeometry width="50" height="50" relative="1" as="geometry" />\n`;
          content += `        </mxCell>\n`;
        });
        
        content += `      </root>\n`;
        content += `    </mxGraphModel>\n`;
        content += `  </diagram>\n`;
        content += `</mxfile>\n`;
        filename += '.drawio';
        type = 'application/xml';
        break;

      case 'dot':
        content = 'digraph G {\n';
        content += '  node [shape=box, style=filled, color="#8b5cf6", fillcolor="#1e1b4b", fontcolor="#ffffff"];\n';
        nodes.forEach(n => {
          const label = String(n.data?.label || n.id);
          content += `  "${n.id}" [label="${label}"];\n`;
        });
        edges.forEach(e => {
          content += `  "${e.source}" -> "${e.target}";\n`;
        });
        content += '}\n';
        filename += '.dot';
        break;
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-center space-y-4 select-none animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-wide mt-6">Preparing Workspace...</h2>
        <p className="text-sm text-slate-400 max-w-md px-6">Loading codebase assets, graphs, and indexing maps</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-slate-950">
      
      {/* Top Controller Panel */}
      <div className="px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20">
        
        {/* Navigation & Title */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-200">System Architecture Visualizer</h2>
          <p className="text-xs text-slate-500">Explore file relationships, dependencies, and core system lifecycle maps.</p>
        </div>

        {/* Filter / Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 outline-none w-48 focus:border-violet-500/50 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" />
            {searchQuery && (
              <button 
                type="button" 
                onClick={clearSearch} 
                className="absolute right-2.5 text-xs text-slate-500 hover:text-slate-200 font-bold"
              >
                ×
              </button>
            )}
          </form>

          {/* Filter Toggles */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-[2px]">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-slate-950 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('dependencies')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'dependencies' ? 'bg-slate-950 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Imports Only
            </button>
            <button
              onClick={() => handleFilterChange('hierarchy')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'hierarchy' ? 'bg-slate-950 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              File Tree
            </button>
            <button
              onClick={() => handleFilterChange('flows')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'flows' ? 'bg-slate-950 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Core Flows
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export Diagram
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            
            {exportDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-950 border border-slate-800 shadow-2xl p-1.5 z-50 space-y-0.5">
                  <div className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Image Formats</div>
                  <button
                    onClick={() => { exportImage('png'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                  >
                    PNG Image (.png)
                  </button>
                  <button
                    onClick={() => { exportImage('jpeg'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                  >
                    JPEG Image (.jpg)
                  </button>
                  <button
                    onClick={() => { exportImage('svg'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                  >
                    SVG Vector (.svg)
                  </button>
                  
                  <div className="border-t border-slate-900 my-1" />
                  
                  <div className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Data & Layout Code</div>
                  <button
                    onClick={() => { exportData('json'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 hover:text-slate-100 transition-all cursor-pointer font-mono"
                  >
                    React Flow JSON
                  </button>
                  <button
                    onClick={() => { exportData('mermaid'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                  >
                    Mermaid Flowchart (.md)
                  </button>
                  <button
                    onClick={() => { exportData('plantuml'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                  >
                    PlantUML Diagram (.puml)
                  </button>
                  <button
                    onClick={() => { exportData('drawio'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                  >
                    draw.io XML (.drawio)
                  </button>
                  <button
                    onClick={() => { exportData('dot'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                  >
                    Graphviz DOT (.dot)
                  </button>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Main Graph Workspace */}
      <div className="flex-1 w-full h-full relative z-10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={isInteractive}
          nodesConnectable={isInteractive}
          elementsSelectable={isInteractive}
          panOnDrag={isInteractive}
          zoomOnScroll={isInteractive}
          zoomOnPinch={isInteractive}
          zoomOnDoubleClick={isInteractive}
          className="bg-slate-950/20"
        >
          <Background color="#1e1b4b" gap={16} size={1} />
          <Controls 
            showInteractive={true}
            onInteractiveChange={(interactive) => setIsInteractive(interactive)}
            className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg shadow-lg [&>button]:border-slate-800 [&>button]:bg-slate-950 hover:[&>button]:bg-slate-900 [&_svg]:fill-slate-400" 
          />
          <MiniMap 
            nodeColor={() => '#1e1b4b'}
            maskColor="rgba(3, 7, 18, 0.7)"
            className="bg-slate-950/50 border border-slate-900 rounded-lg shadow-lg"
          />
        </ReactFlow>
      </div>

      {/* Floating Node Detail Overlay */}
      {selectedNodeData && (
        <div className="absolute bottom-6 right-6 w-80 glass-panel border border-violet-500/20 rounded-xl p-5 shadow-2xl z-30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Node Details</h3>
            <button 
              onClick={() => setSelectedNodeData(null)}
              className="text-xs text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-slate-500 font-mono block">IDENTIFIER</span>
              <span className="text-xs font-semibold text-slate-300 break-all">{selectedNodeData.id}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono block">NODE LABEL</span>
              <span className="text-sm font-bold text-slate-200">{selectedNodeData.label}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono block">TYPE</span>
              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-cyan-400 border border-slate-800 uppercase font-semibold">
                {selectedNodeData.type}
              </span>
            </div>
            {selectedNodeData.type === 'file' && (
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">FILE SIZE</span>
                <span className="text-xs font-bold text-slate-300">{formatSize(selectedNodeData.size)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Instruction Banner */}
      <div className="absolute bottom-6 left-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/80 text-[10px] text-slate-500 font-semibold z-20">
        <HelpCircle className="w-3.5 h-3.5" /> Hold Shift to box-select • Double click/Scroll to zoom • Click nodes to inspect
      </div>

      <FileInspector 
        isOpen={inspectorOpen} 
        onClose={() => setInspectorOpen(false)} 
        file={selectedNodeData ? {
          name: selectedNodeData.label,
          path: selectedNodeData.id,
          language: 'mixed',
          size: selectedNodeData.size,
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          dependencies: [],
          complexityScore: selectedNodeData.complexityScore,
          maintainabilityScore: selectedNodeData.maintainabilityScore,
          smells: selectedNodeData.smells
        } : null} 
        repoId={repoId} 
      />

    </div>
  );
}
