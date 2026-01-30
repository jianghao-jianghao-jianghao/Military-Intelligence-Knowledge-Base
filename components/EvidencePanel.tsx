
import React from 'react';
import { Provenance } from '../types.ts';

interface EvidencePanelProps {
  provenance: Provenance[];
  onEvidenceClick?: (p: Provenance) => void;
  activeId?: string;
  onOpenDocument?: (docId: string) => void; 
  onDownloadPackage?: () => void; // Added prop for download
}

const EvidencePanel: React.FC<EvidencePanelProps> = ({ provenance, onEvidenceClick, activeId, onOpenDocument, onDownloadPackage }) => {
  return (
    <div className="w-[340px] border-l border-[#d0d7de] dark:border-[#30363d] bg-[#f6f8fa] dark:bg-[#0d1117] flex flex-col h-full overflow-hidden transition-colors duration-200">
      <div className="p-4 border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center bg-white dark:bg-[#161b22] h-14">
        <h3 className="font-bold text-sm text-[#24292f] dark:text-[#f0f6fc]">可溯源证据链 (Provenance)</h3>
        <span className="text-[10px] bg-[#0366d6] dark:bg-[#1f6feb] text-white px-2 py-0.5 rounded-full font-bold">
          {provenance.length} 条记录
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {provenance.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-[#afb8c1] dark:text-[#484f58] space-y-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <p className="text-xs italic">当前视图无关联证据</p>
          </div>
        ) : (
          provenance.map((p) => (
            <div 
              key={p.sentence_id}
              onClick={() => onEvidenceClick?.(p)}
              className={`p-4 rounded-md border text-[12px] leading-relaxed cursor-pointer transition-all duration-200 group ${
                activeId === p.sentence_id 
                  ? 'border-[#0366d6] dark:border-[#58a6ff] bg-white dark:bg-[#161b22] ring-1 ring-[#0366d6] dark:ring-[#58a6ff] shadow-sm' 
                  : 'border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117] hover:border-[#8c959f] dark:hover:border-[#484f58]'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 overflow-hidden">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#0366d6] dark:bg-[#58a6ff]"></div>
                   <span className="font-bold text-[#0366d6] dark:text-[#58a6ff] truncate">{p.source_name}</span>
                </div>
                <span className="bg-[#dafbe1] dark:bg-[rgba(63,185,80,0.1)] text-[#1a7f37] dark:text-[#3fb950] px-1.5 py-0.5 rounded text-[9px] font-black border border-[#2da44e]/10 dark:border-[rgba(63,185,80,0.2)]">{(p.score * 100).toFixed(0)}% 关联度</span>
              </div>
              <p className="text-[#24292f] dark:text-[#c9d1d9] mb-3 bg-[#f6f8fa] dark:bg-[#161b22] p-2 rounded italic group-hover:bg-[#f3f4f6] dark:group-hover:bg-[#21262d] transition-colors border border-transparent dark:group-hover:border-[#30363d]">
                "{p.text}"
              </p>
              <div className="flex justify-between items-center text-[10px] text-[#57606a] dark:text-[#8b949e] font-mono border-t border-[#f0f2f4] dark:border-[#30363d] pt-3">
                <span className="flex items-center gap-1">
                  偏移量: {p.start} - {p.end}
                </span>
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (p.doc_id && onOpenDocument) onOpenDocument(p.doc_id);
                        else alert("该片段来源为非结构化数据，无法跳转原件。");
                    }} 
                    className="text-[#0366d6] dark:text-[#58a6ff] font-bold hover:underline flex items-center gap-1"
                >
                    定位原文 ↗
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-4 bg-white dark:bg-[#161b22] border-t border-[#d0d7de] dark:border-[#30363d]">
         <button 
            onClick={onDownloadPackage}
            disabled={provenance.length === 0}
            className="w-full py-2.5 text-xs font-bold text-[#24292f] dark:text-[#c9d1d9] bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] rounded-md hover:bg-[#eaeef2] dark:hover:bg-[#30363d] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
         >
           <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"></path></svg>
           打包下载完整证据集
         </button>
      </div>
    </div>
  );
};

export default EvidencePanel;
