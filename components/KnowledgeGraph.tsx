
import React, { useState, useEffect } from 'react';
import { Icons } from '../constants.tsx';
import { GraphService } from '../services/api.ts';
import { GraphData, EntityDetail, GraphNode, GraphEdge, EvolutionSnapshot } from '../types.ts';

const KnowledgeGraph: React.FC = () => {
  const [mode, setMode] = useState<'normal' | 'path' | 'time'>('normal');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedEntity, setSelectedEntity] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Path Mode State
  const [startNode, setStartNode] = useState('15式轻型坦克');
  const [endNode, setEndNode] = useState('北方工业');
  
  // Evolution Mode State
  const [timeValue, setTimeValue] = useState(100);
  const [evolutionEvents, setEvolutionEvents] = useState<EvolutionSnapshot['events']>([]);

  // Initial Load
  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const res = await GraphService.queryGraph();
      setGraphData(res.data);
    } catch (e) {
      console.error("Failed to load graph", e);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (node: GraphNode) => {
    try {
      const res = await GraphService.getEntityDetail(node.id);
      setSelectedEntity(res.data);
    } catch (e) {
      console.error("Failed to get entity detail", e);
    }
  };

  const handlePathSearch = async () => {
    setLoading(true);
    try {
        const res = await GraphService.findPath({ start_entity_id: startNode, end_entity_id: endNode });
        // For demo, just replace graph with the found path
        if (res.data.paths.length > 0) {
            setGraphData(res.data.paths[0]);
        } else {
            alert("未找到关联路径");
        }
    } catch (e) {
        alert("路径计算失败");
    } finally {
        setLoading(false);
    }
  };

  const handleEvolutionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      setTimeValue(val);
      // Debounce logic would be better here in real app
      try {
          // Map slider 0-100 to some date range, e.g. 2010-2024
          const year = 2010 + Math.floor((val / 100) * 14);
          const res = await GraphService.getEvolution({ entity_id: 'n1', date: `${year}-01-01` });
          setGraphData(res.data.snapshot);
          setEvolutionEvents(res.data.events);
      } catch (e) {
          console.error(e);
      }
  };

  const resetView = () => {
      setMode('normal');
      loadGraph();
      setSelectedEntity(null);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0d1117] transition-colors duration-200 overflow-hidden">
      <div className="p-6 border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center bg-white dark:bg-[#0d1117] z-20">
        <div className="flex items-center gap-3">
           <h2 className="text-xl font-bold">装备本体图谱浏览器</h2>
           <span className="text-[10px] px-2 py-0.5 bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded text-[#57606a] dark:text-[#8b949e]">
               Nodes: {graphData.nodes.length} | Edges: {graphData.edges.length}
           </span>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setMode('path')}
            className={`text-xs font-bold px-3 py-1.5 border border-[#d0d7de] dark:border-[#30363d] rounded-md transition-all flex items-center gap-2 ${mode === 'path' ? 'bg-[#0366d6] text-white' : 'hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]'}`}>
             <span>🔍</span> 路径发现
           </button>
           <button 
            onClick={() => setMode('time')}
            className={`text-xs font-bold px-3 py-1.5 border border-[#d0d7de] dark:border-[#30363d] rounded-md transition-all flex items-center gap-2 ${mode === 'time' ? 'bg-[#0366d6] text-white' : 'hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]'}`}>
             <span>🕒</span> 时序演进
           </button>
           {mode !== 'normal' && (
             <button onClick={resetView} className="text-xs text-red-500 font-bold px-3">退出模式</button>
           )}
        </div>
      </div>
      
      <div className="flex-1 relative bg-white dark:bg-[#0d1117] overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
        
        {loading && <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm text-xs font-bold">加载图数据中...</div>}

        {/* Path Discovery Interface Overlay */}
        {mode === 'path' && (
          <div className="absolute top-6 left-6 z-30 bg-[#1c2128] border border-blue-500/50 p-4 rounded-xl shadow-2xl w-72 animate-in slide-in-from-left-4">
             <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">路径发现引擎 (Path-Finder)</h4>
             <div className="space-y-3">
                <input value={startNode} onChange={e => setStartNode(e.target.value)} type="text" className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs" placeholder="起点: 15式坦克" />
                <div className="flex justify-center text-[#484f58]">↓</div>
                <input value={endNode} onChange={e => setEndNode(e.target.value)} type="text" className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs" placeholder="终点: 北方工业" />
                <button onClick={handlePathSearch} className="w-full bg-blue-600 text-white font-bold py-2 rounded text-xs mt-2">计算最短路径</button>
             </div>
          </div>
        )}

        {/* Temporal Evolution Slider Overlay */}
        {mode === 'time' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#1c2128] border border-[#30363d] p-6 rounded-2xl shadow-2xl w-[600px] animate-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold">装备谱系时序演进 (2010 - 2024)</h4>
                <span className="text-blue-500 font-mono text-sm">{2010 + Math.floor((timeValue / 100) * 14)} 年</span>
             </div>
             <input type="range" className="w-full accent-blue-600" min="0" max="100" value={timeValue} onChange={handleEvolutionChange} />
             <div className="flex justify-between text-[9px] text-[#8b949e] mt-2 font-mono">
                <span>PROJECT_INIT</span>
                <span>PROTOTYPE</span>
                <span>FIELD_TEST</span>
                <span>IN_SERVICE</span>
             </div>
             {evolutionEvents.length > 0 && (
                 <div className="mt-4 pt-4 border-t border-[#30363d] grid grid-cols-3 gap-2">
                     {evolutionEvents.map((ev, i) => (
                         <div key={i} className="text-[10px] text-[#8b949e]">
                             <span className="font-bold text-white">{ev.date}</span>: {ev.title}
                         </div>
                     ))}
                 </div>
             )}
          </div>
        )}

        {/* Dynamic SVG Graph Rendering */}
        <svg width="100%" height="100%" className="relative cursor-move">
           <g transform="translate(400, 300)">
              {/* Render Edges */}
              {graphData.edges.map(edge => {
                  const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                  const targetNode = graphData.nodes.find(n => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  return (
                      <g key={edge.id}>
                        <line 
                            x1={sourceNode.x || 0} y1={sourceNode.y || 0} 
                            x2={targetNode.x || 0} y2={targetNode.y || 0} 
                            className="stroke-[#30363d] stroke-2" 
                        />
                        <text 
                            x={((sourceNode.x || 0) + (targetNode.x || 0)) / 2} 
                            y={((sourceNode.y || 0) + (targetNode.y || 0)) / 2}
                            textAnchor="middle"
                            className="text-[9px] fill-[#8b949e]"
                        >
                            {edge.label}
                        </text>
                      </g>
                  );
              })}
              
              {/* Render Nodes */}
              {graphData.nodes.map(node => (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x || 0}, ${node.y || 0})`}
                    onClick={() => handleNodeClick(node)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                     <circle 
                        r={node.id === 'n1' ? 45 : 30} 
                        fill={node.color || (node.id === 'n1' ? '#0366d6' : '#1c2128')} 
                        className="stroke-[#30363d] stroke-2 shadow-lg" 
                     />
                     <text y="4" textAnchor="middle" className="text-[10px] font-bold fill-white pointer-events-none max-w-[50px] overflow-hidden text-ellipsis">
                         {node.label}
                     </text>
                  </g>
              ))}
           </g>
        </svg>

        {/* Right Entity Panel */}
        {selectedEntity && (
          <div className="absolute top-6 right-6 w-80 bg-white dark:bg-[#1c2128] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-2xl p-0 overflow-hidden animate-in fade-in slide-in-from-right-4">
             <div className="p-4 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🛡️</span>
                  <h3 className="font-bold text-sm">实体画像</h3>
                </div>
                <button onClick={() => setSelectedEntity(null)} className="text-[#8b949e]">✕</button>
             </div>
             
             <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <h3 className="font-bold text-lg">{selectedEntity.name}</h3>
                
                <div className="w-full h-40 bg-[#0d1117] rounded-lg overflow-hidden relative border border-[#30363d]">
                   <div className="absolute inset-0 flex items-center justify-center text-[#484f58] font-bold text-xs italic text-center p-4">
                      [ 装备实体三维预览 / 实景图片 ]<br/>
                      <span className="text-[9px] font-normal mt-2">点击启用 WebGL 加速查看器</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                   {selectedEntity.attributes.map((attr, idx) => (
                       <div key={idx} className="bg-[#f6f8fa] dark:bg-[#0d1117] p-2 rounded border border-[#d0d7de]/50 dark:border-[#30363d] flex justify-between items-center">
                          <span className="text-[9px] font-black text-[#57606a] dark:text-[#8b949e] uppercase">{attr.key}</span>
                          <span className="text-xs font-bold">{attr.value}</span>
                       </div>
                   ))}
                </div>

                {selectedEntity.related_docs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-[#57606a] dark:text-[#8b949e] uppercase tracking-widest mb-2">关联技术档案</p>
                      <div className="space-y-2">
                         {selectedEntity.related_docs.map(doc => (
                           <div key={doc.id} className="flex items-center gap-2 text-xs p-2 hover:bg-[#f6f8fa] dark:hover:bg-[#1c2128] rounded border border-transparent hover:border-[#d0d7de] dark:hover:border-[#30363d] cursor-pointer">
                              <Icons.File />
                              <span className="truncate">{doc.title}</span>
                           </div>
                         ))}
                      </div>
                    </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph;
