
import React, { useState } from 'react';
import { Icons } from '../constants.tsx';

const KnowledgeGraph: React.FC = () => {
  const [mode, setMode] = useState<'normal' | 'path' | 'time'>('normal');
  const [selectedEntity, setSelectedEntity] = useState<string | null>('15式轻型坦克');

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0d1117] transition-colors duration-200 overflow-hidden">
      <div className="p-6 border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center bg-white dark:bg-[#0d1117] z-20">
        <div className="flex items-center gap-3">
           <h2 className="text-xl font-bold">装备本体图谱浏览器</h2>
           <span className="text-[10px] px-2 py-0.5 bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded text-[#57606a] dark:text-[#8b949e]">实体: 24,192 | 关系: 82,041</span>
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
             <button onClick={() => setMode('normal')} className="text-xs text-red-500 font-bold px-3">退出模式</button>
           )}
        </div>
      </div>
      
      <div className="flex-1 relative bg-white dark:bg-[#0d1117] overflow-hidden">
        {/* 背景网格 */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>

        {/* Path Discovery Interface Overlay */}
        {mode === 'path' && (
          <div className="absolute top-6 left-6 z-30 bg-[#1c2128] border border-blue-500/50 p-4 rounded-xl shadow-2xl w-72 animate-in slide-in-from-left-4">
             <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">路径发现引擎 (Path-Finder)</h4>
             <div className="space-y-3">
                <input type="text" className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs" placeholder="起点: 15式坦克" />
                <div className="flex justify-center text-[#484f58]">↓</div>
                <input type="text" className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs" placeholder="终点: 北方工业" />
                <button className="w-full bg-blue-600 text-white font-bold py-2 rounded text-xs mt-2">计算最短路径</button>
             </div>
          </div>
        )}

        {/* Temporal Evolution Slider Overlay */}
        {mode === 'time' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#1c2128] border border-[#30363d] p-6 rounded-2xl shadow-2xl w-[600px] animate-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold">装备谱系时序演进 (2010 - 2024)</h4>
                <span className="text-blue-500 font-mono text-sm">2021-06-15</span>
             </div>
             <input type="range" className="w-full accent-blue-600" min="0" max="100" defaultValue="75" />
             <div className="flex justify-between text-[9px] text-[#8b949e] mt-2 font-mono">
                <span>PROJECT_INIT</span>
                <span>PROTOTYPE</span>
                <span>FIELD_TEST</span>
                <span>IN_SERVICE</span>
             </div>
          </div>
        )}

        <svg width="100%" height="100%" className="relative cursor-move">
           <g transform="translate(400, 300)">
              {/* Connecting lines */}
              <line x1="0" y1="0" x2="200" y2="-100" className="stroke-[#30363d] stroke-2" strokeDasharray="4 2" />
              <line x1="0" y1="0" x2="180" y2="120" className="stroke-[#30363d] stroke-2" />
              
              {/* Central Node */}
              <circle r="45" className="fill-[#0366d6] dark:fill-[#1f6feb] shadow-[0_0_20px_rgba(31,111,235,0.4)] cursor-pointer" />
              <text y="5" textAnchor="middle" className="text-xs font-bold fill-white pointer-events-none">15式轻型坦克</text>
              
              {/* Related Nodes */}
              <g transform="translate(200, -100)">
                 <circle r="30" className="fill-[#1c2128] stroke-[#30363d] stroke-2" />
                 <text y="5" textAnchor="middle" className="text-[10px] fill-[#8b949e]">北方工业</text>
              </g>
              <g transform="translate(180, 120)">
                 <circle r="35" className="fill-[#1c2128] stroke-[#30363d] stroke-2" />
                 <text y="5" textAnchor="middle" className="text-[10px] fill-[#8b949e]">先进动力系统</text>
              </g>
           </g>
        </svg>

        {/* Right Entity Panel */}
        {selectedEntity && (
          <div className="absolute top-6 right-6 w-80 bg-white dark:bg-[#1c2128] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-2xl p-0 overflow-hidden animate-in fade-in slide-in-from-right-4">
             <div className="p-4 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🛡️</span>
                  <h3 className="font-bold text-sm">实体画像: {selectedEntity}</h3>
                </div>
                <button onClick={() => setSelectedEntity(null)} className="text-[#8b949e]">✕</button>
             </div>
             
             <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="w-full h-40 bg-[#0d1117] rounded-lg overflow-hidden relative border border-[#30363d]">
                   <div className="absolute inset-0 flex items-center justify-center text-[#484f58] font-bold text-xs italic text-center p-4">
                      [ 装备实体三维预览 / 实景图片 ]<br/>
                      <span className="text-[9px] font-normal mt-2">点击启用 WebGL 加速查看器</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-[#f6f8fa] dark:bg-[#0d1117] p-2 rounded border border-[#d0d7de]/50 dark:border-[#30363d]">
                      <p className="text-[9px] font-black text-[#57606a] dark:text-[#8b949e] uppercase">研制单位</p>
                      <p className="text-xs font-bold">北方工业</p>
                   </div>
                   <div className="bg-[#f6f8fa] dark:bg-[#0d1117] p-2 rounded border border-[#d0d7de]/50 dark:border-[#30363d]">
                      <p className="text-[9px] font-black text-[#57606a] dark:text-[#8b949e] uppercase">密级</p>
                      <span className="text-[9px] font-bold text-[#735c0f] dark:text-[#d29922] bg-[#fff8c5] dark:bg-yellow-900/20 px-1.5 py-0.5 rounded">机密级</span>
                   </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-[#57606a] dark:text-[#8b949e] uppercase tracking-widest mb-2">多跳关联关系</p>
                  <div className="space-y-2">
                     {[
                       { rel: '动力系统', target: '先进涡轮发动机', type: 'COMPONENTS' },
                       { rel: '火力系统', target: '105mm 膛线炮', type: 'ARMAMENT' },
                       { rel: '防护系统', target: '复合附加装甲', type: 'DEFENSE' },
                     ].map((item, i) => (
                       <div key={i} className="flex items-center justify-between text-xs p-2 hover:bg-[#f6f8fa] dark:hover:bg-[#1c2128] rounded border border-transparent hover:border-[#d0d7de] dark:hover:border-[#30363d] transition-colors cursor-pointer group">
                          <span className="text-[#57606a] dark:text-[#8b949e]">{item.rel}</span>
                          <span className="text-[#0366d6] dark:text-[#58a6ff] font-bold group-hover:underline">{item.target}</span>
                       </div>
                     ))}
                  </div>
                </div>

                <button className="w-full py-2 bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-md text-xs font-bold hover:bg-[#30363d] transition-colors">
                  展开所有时序事件
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph;
