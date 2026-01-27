
import React from 'react';
import { Icons } from '../constants';

const KnowledgeGraph: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#c9d1d9] transition-colors duration-200">
      <div className="p-6 border-b border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117] flex justify-between items-center transition-colors duration-200">
        <div>
           <h2 className="text-xl font-bold text-[#24292f] dark:text-[#f0f6fc]">知识图谱浏览器 (KG Explorer)</h2>
           <p className="text-xs text-[#57606a] dark:text-[#8b949e] mt-1">可视化战术资产、单位编制与地理情报的关联网络</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 border border-[#d0d7de] dark:border-[#30363d] rounded-md text-xs font-semibold bg-white dark:bg-[#21262d] text-[#24292f] dark:text-[#c9d1d9] hover:bg-[#f6f8fa] dark:hover:bg-[#30363d]">重置视角</button>
          <button className="px-3 py-1.5 border border-[#d0d7de] dark:border-[#30363d] rounded-md text-xs font-semibold bg-[#0366d6] dark:bg-[#1f6feb] text-white hover:opacity-90 transition-opacity">导出本体架构</button>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#0d1117] transition-colors duration-200">
        {/* 背景网格 */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        <svg width="100%" height="100%" className="relative">
           <defs>
             <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
               <polygon points="0 0, 10 3.5, 0 7" className="fill-[#d0d7de] dark:fill-[#30363d]" />
             </marker>
           </defs>
           
           {/* 连线 */}
           <line x1="300" y1="300" x2="500" y2="400" stroke="currentColor" strokeWidth="1.5" className="text-[#d0d7de] dark:text-[#30363d]" markerEnd="url(#arrowhead)" />
           <line x1="500" y1="400" x2="450" y2="600" stroke="currentColor" strokeWidth="1.5" className="text-[#d0d7de] dark:text-[#30363d]" />
           <line x1="300" y1="300" x2="250" y2="550" stroke="currentColor" strokeWidth="1.5" className="text-[#d0d7de] dark:text-[#30363d]" />
           <line x1="500" y1="400" x2="700" y2="350" stroke="currentColor" strokeWidth="1.5" className="text-[#d0d7de] dark:text-[#30363d]" />
           
           {/* 实体节点 */}
           <g transform="translate(300, 300)" className="cursor-pointer group">
              <circle r="35" className="fill-[#0366d6] dark:fill-[#1f6feb] group-hover:opacity-80 transition-opacity" />
              <text y="55" textAnchor="middle" className="text-[11px] font-bold fill-[#24292f] dark:fill-[#c9d1d9]">DF-17 导弹系统</text>
              <text y="0" dominantBaseline="middle" textAnchor="middle" fill="white" className="text-[10px] font-bold">核心</text>
           </g>
           
           <g transform="translate(500, 400)" className="cursor-pointer group">
              <circle r="30" className="fill-[#cf222e] dark:fill-[#da3633] group-hover:opacity-80 transition-opacity" />
              <text y="50" textAnchor="middle" className="text-[11px] font-bold fill-[#24292f] dark:fill-[#c9d1d9]">南部战区司令部</text>
           </g>

           <g transform="translate(250, 550)" className="cursor-pointer group">
              <circle r="22" className="fill-white dark:fill-[#161b22] stroke-[#d0d7de] dark:stroke-[#30363d]" strokeWidth="2" />
              <text y="40" textAnchor="middle" className="text-[10px] font-medium fill-[#57606a] dark:fill-[#8b949e]">高超音速滑翔飞行器</text>
           </g>

           <g transform="translate(700, 350)" className="cursor-pointer group">
              <circle r="22" className="fill-white dark:fill-[#161b22] stroke-[#d0d7de] dark:stroke-[#30363d]" strokeWidth="2" />
              <text y="40" textAnchor="middle" className="text-[10px] font-medium fill-[#57606a] dark:fill-[#8b949e]">04 号后勤枢纽</text>
           </g>
        </svg>

        {/* 悬浮实体详情面板 */}
        <div className="absolute top-6 right-6 w-72 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md shadow-lg dark:shadow-2xl p-5 transition-colors duration-200">
           <div className="flex items-center gap-3 mb-5 border-b border-[#f0f2f4] dark:border-[#30363d] pb-3">
              <div className="bg-[#f6f8fa] dark:bg-[#0d1117] p-2 rounded-md border border-[#d0d7de] dark:border-[#30363d] text-[#0366d6] dark:text-[#58a6ff]">
                <Icons.Database />
              </div>
              <h3 className="font-bold text-sm text-[#24292f] dark:text-[#f0f6fc]">实体情报详情</h3>
           </div>
           
           <div className="space-y-5">
              <div>
                <label className="text-[10px] uppercase font-black text-[#57606a] dark:text-[#8b949e] tracking-widest block mb-1">规范名称</label>
                <p className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">东风-17 (DF-17)</p>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-[#57606a] dark:text-[#8b949e] tracking-widest block mb-1">涉密等级</label>
                <span className="text-[10px] font-bold text-[#735c0f] dark:text-[#d29922] bg-[#fff8c5] dark:bg-[rgba(187,128,9,0.15)] border border-[#d4a72c]/30 dark:border-[rgba(187,128,9,0.4)] px-2 py-1 rounded-md">机密 (SECRET)</span>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-[#57606a] dark:text-[#8b949e] tracking-widest block mb-1">关联关系 (5)</label>
                <ul className="text-xs space-y-2 mt-2">
                  <li className="flex justify-between items-center bg-[#f6f8fa] dark:bg-[#0d1117] p-1.5 rounded border border-[#d0d7de]/50 dark:border-[#30363d]">
                    <span className="text-[#57606a] dark:text-[#8b949e]">部署载荷:</span> 
                    <span className="text-[#0366d6] dark:text-[#58a6ff] font-bold">HGV-202</span>
                  </li>
                  <li className="flex justify-between items-center bg-[#f6f8fa] dark:bg-[#0d1117] p-1.5 rounded border border-[#d0d7de]/50 dark:border-[#30363d]">
                    <span className="text-[#57606a] dark:text-[#8b949e]">指挥链:</span> 
                    <span className="text-[#0366d6] dark:text-[#58a6ff] font-bold">火箭军某部</span>
                  </li>
                </ul>
              </div>
              <button className="w-full py-2 text-xs font-bold bg-[#24292f] dark:bg-[#21262d] text-white dark:text-[#c9d1d9] border border-[#d0d7de] dark:border-[#30363d] rounded-md hover:bg-[#1b1f23] dark:hover:bg-[#30363d] transition-colors shadow-sm">
                分析邻域拓扑
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
