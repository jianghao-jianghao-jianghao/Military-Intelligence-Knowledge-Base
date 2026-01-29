
import React, { useState, useRef } from 'react';
import { processDocument } from '../services/geminiService.ts';
import { ApiService } from '../services/api.ts';
import { Icons } from '../constants.tsx';

type Mode = 'write' | 'optimize' | 'proofread' | 'format';

interface ProofreadSuggestion {
  id: number;
  type: string;
  original: string;
  suggestion: string;
  reason: string;
  status?: 'accepted' | 'rejected' | 'pending';
}

const DocProcessingView: React.FC = () => {
  const [mode, setMode] = useState<Mode>('write');
  const [inputContent, setInputContent] = useState('');
  const [extraContext, setExtraContext] = useState(''); // Used as Reference Doc for Proofread
  const [outputContent, setOutputContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // File Import Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTarget, setImportTarget] = useState<'primary' | 'context'>('primary');

  // Specific state for "Writing" mode
  const [writeTopic, setWriteTopic] = useState('');
  const [writePoints, setWritePoints] = useState('');

  // Specific state for "Format" mode
  const [docType, setDocType] = useState('公文 (Official Red-Head Doc)');

  // Specific state for "Proofread" Agent Mode
  const [suggestions, setSuggestions] = useState<ProofreadSuggestion[]>([]);

  // --- Handlers ---

  const handleFileClick = (target: 'primary' | 'context') => {
    setImportTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    
    try {
        const response = await ApiService.parseFile(file);
        const { content, metadata } = response.data;
        
        if (importTarget === 'primary') {
            setInputContent(content);
        } else {
            // If it's context/reference, maybe format it a bit
            const contextPrefix = metadata?.detectedType 
                ? `[系统提示: 已加载 ${metadata.detectedType} 类型的参考标准]\n` 
                : `[系统提示: 已加载标准范文 ${file.name}]\n`;
            
            // For demo context, if content is short we use it, otherwise keep abstract
            setExtraContext(contextPrefix + content.slice(0, 500) + (content.length > 500 ? '...' : ''));
        }
    } catch (err) {
        console.error("File import failed", err);
        alert("文件解析失败，请检查网络或文件格式。");
    } finally {
        setIsImporting(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setSuggestions([]); 
    let primaryInput = inputContent;
    let contextInput = extraContext;

    // Adapt inputs based on mode
    if (mode === 'write') {
      primaryInput = writeTopic;
      contextInput = writePoints;
      if (!writeTopic.trim()) {
        alert("请输入文档主题");
        setIsProcessing(false);
        return;
      }
    } else if (mode === 'format') {
       // For format, primary input is the content, context is doc type
       contextInput = docType;
    }

    if (mode !== 'write' && !primaryInput.trim()) {
        alert("请输入需要处理的文本内容");
        setIsProcessing(false);
        return;
    }

    try {
      // Logic for Proofreading (Agent Mode)
      if (mode === 'proofread') {
          const resultJson = await processDocument(mode, primaryInput, contextInput);
          const parsedSuggestions = JSON.parse(resultJson);
          setSuggestions(parsedSuggestions.map((s: any) => ({ ...s, status: 'pending' })));
          // Initially, the output content is the same as input, we will patch it
          setOutputContent(primaryInput);
      } else {
          // Standard Text/HTML Generation
          const result = await processDocument(mode, primaryInput, contextInput, docType);
          setOutputContent(result);
      }
    } catch (e) {
      console.error(e);
      setOutputContent("系统处理发生错误，请稍后重试。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySuggestion = (id: number, accept: boolean) => {
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: accept ? 'accepted' : 'rejected' } : s));
      
      if (accept) {
          const sug = suggestions.find(s => s.id === id);
          if (sug) {
              // Simple string replace for demo purposes. 
              setOutputContent(prev => prev.replace(sug.original, sug.suggestion));
          }
      }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputContent);
    alert("结果已复制到剪贴板");
  };

  // Helper to pre-fill content for demo
  const fillDemoData = () => {
      if (mode === 'format') {
          setInputContent(`# 关于成立兵工研制大脑项目组的通知\n\n各相关部门：\n\n为了加快我单位数字化转型步伐，提升装备研制效率，经研究决定，成立“兵工研制大脑”项目专项工作组。\n\n## 一、 工作目标\n构建集知识检索、图谱分析、文档生成于一体的智能中台。\n\n## 二、 组织架构\n组长：陆研工\n副组长：王分析\n\n特此通知。\n\n二〇二四年三月二十六日`);
      } else if (mode === 'proofread') {
          setInputContent(`关于举行2024年度装备质量评审会的痛知\n\n各位领导：\n兹定于2024年3月32日召开质量评审会，会议地点设在综合楼301。\n\n请大家准时参会，带好笔记本。`);
          setExtraContext(`标准格式：\n标题应为《关于xxxx的通知》\n时间必须准确\n地点应包含具体楼层指引\n落款应包含发文单位`);
      }
  };

  return (
    <div className="flex h-full bg-[#f6f8fa] dark:bg-[#0d1117] flex-col overflow-hidden">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.txt,.md"
      />

      {/* Header Tabs */}
      <div className="px-6 py-4 bg-white dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-2">
           <div className="bg-purple-600 text-white p-2 rounded-lg"><Icons.File /></div>
           <h2 className="text-lg font-bold">智能文档工坊</h2>
        </div>
        
        <div className="flex bg-[#f6f8fa] dark:bg-[#0d1117] p-1 rounded-lg border border-[#d0d7de] dark:border-[#30363d]">
          {[
            { id: 'write', label: '智能写作' },
            { id: 'optimize', label: '文案优化' },
            { id: 'format', label: '智能排版' },
            { id: 'proofread', label: 'Agent 智能校对' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id as Mode); setOutputContent(''); setSuggestions([]); setInputContent(''); setExtraContext(''); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                mode === tab.id 
                  ? 'bg-white dark:bg-[#21262d] text-purple-600 dark:text-purple-400 shadow-sm' 
                  : 'text-[#57606a] dark:text-[#8b949e] hover:text-[#24292f] dark:hover:text-[#c9d1d9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Input Panel */}
        <div className="flex-1 flex flex-col p-6 border-r border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#0d1117] min-w-[400px] max-w-[500px]">
           <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-black text-[#8b949e] uppercase flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                 输入配置区
               </h3>
               {(mode === 'format' || mode === 'proofread') && (
                   <button onClick={fillDemoData} className="text-[10px] text-blue-500 hover:underline">填充测试数据</button>
               )}
           </div>
           
           <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
              
              {/* WRITE MODE */}
              {mode === 'write' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">文档主题</label>
                      <input 
                        value={writeTopic}
                        onChange={(e) => setWriteTopic(e.target.value)}
                        placeholder="例如：关于2024年第一季度装甲研发进度的总结报告"
                        className="w-full bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg px-4 py-3 text-sm focus:border-purple-500 outline-none transition-colors"
                      />
                   </div>
                   <div className="space-y-2 flex-1 flex flex-col">
                      <label className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">核心要点 / 提纲</label>
                      <textarea 
                        value={writePoints}
                        onChange={(e) => setWritePoints(e.target.value)}
                        placeholder="1. 概述本季度主要任务..."
                        className="w-full flex-1 min-h-[300px] bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg px-4 py-3 text-sm focus:border-purple-500 outline-none transition-colors resize-none"
                      />
                   </div>
                </div>
              )}

              {/* OPTIMIZE MODE */}
              {mode === 'optimize' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 h-full flex flex-col">
                   <div className="space-y-2 flex-1 flex flex-col">
                      <label className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">待优化文本</label>
                      <textarea 
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        placeholder="粘贴需要润色或修改的原始文本..."
                        className="w-full flex-1 bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg px-4 py-3 text-sm focus:border-purple-500 outline-none transition-colors resize-none"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">优化指令</label>
                      <input 
                        value={extraContext}
                        onChange={(e) => setExtraContext(e.target.value)}
                        placeholder="例如：将语气调整得更加委婉..."
                        className="w-full bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg px-4 py-2 text-sm focus:border-purple-500 outline-none"
                      />
                   </div>
                </div>
              )}

              {/* FORMAT MODE */}
              {mode === 'format' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 h-full flex flex-col">
                   <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                      ℹ️ 智能排版引擎将根据 Markdown 语义，自动生成符合 GB/T 9704 标准的红头公文样式。
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">排版标准</label>
                      <select 
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg px-4 py-2 text-sm focus:border-purple-500 outline-none"
                      >
                         <option value="公文 (Official Red-Head Doc)">公文 (红头文件标准)</option>
                         <option value="技术报告 (Technical Report)">技术报告 (GB/T 7713)</option>
                         <option value="合同 (Legal Contract)">法律合同 (严谨排版)</option>
                      </select>
                   </div>
                   <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">文档内容</label>
                        <button 
                            onClick={() => handleFileClick('primary')} 
                            className="text-[10px] bg-white dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] px-2 py-1 rounded hover:border-blue-500 flex items-center gap-1 transition-colors"
                        >
                            <Icons.Upload /> 导入 Word/PDF
                        </button>
                      </div>
                      <textarea 
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        placeholder="# 输入标题&#10;## 输入章节&#10;输入正文内容..."
                        className="w-full flex-1 bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg px-4 py-3 text-sm focus:border-purple-500 outline-none transition-colors resize-none font-mono"
                      />
                   </div>
                </div>
              )}

              {/* PROOFREAD AGENT MODE */}
              {mode === 'proofread' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 h-full flex flex-col">
                   <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-3 rounded-lg text-xs text-purple-800 dark:text-purple-200">
                      🤖 <b>校对 Agent 已就绪</b><br/>上传草稿与标准范文，Agent 将自动比对并提供红头文件预览效果。
                   </div>
                   
                   <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">待校对草稿 (Draft)</label>
                        <button 
                            onClick={() => handleFileClick('primary')} 
                            className="text-[10px] bg-white dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] px-2 py-1 rounded hover:border-blue-500 flex items-center gap-1 transition-colors"
                        >
                            <Icons.Upload /> 导入 Word/PDF
                        </button>
                      </div>
                      <textarea 
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        placeholder="粘贴或导入您起草的文档内容..."
                        className="w-full flex-1 bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg px-4 py-3 text-sm focus:border-purple-500 outline-none transition-colors resize-none"
                      />
                   </div>

                   <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9]">标准范文/依据 (Reference)</label>
                        <button 
                            onClick={() => handleFileClick('context')} 
                            className="text-[10px] bg-white dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] px-2 py-1 rounded hover:border-blue-500 flex items-center gap-1 transition-colors"
                        >
                            <Icons.Upload /> 导入标准库
                        </button>
                      </div>
                      <textarea 
                        value={extraContext}
                        onChange={(e) => setExtraContext(e.target.value)}
                        placeholder="粘贴标准范文或上传格式要求..."
                        className="w-full flex-1 bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-lg px-4 py-3 text-sm focus:border-purple-500 outline-none transition-colors resize-none"
                      />
                   </div>
                </div>
              )}

           </div>

           <div className="pt-6 mt-auto">
              <button 
                onClick={handleProcess}
                disabled={isProcessing || isImporting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isProcessing || isImporting ? (
                   <>
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     {isImporting ? '正在解析文件...' : (mode === 'proofread' ? 'Agent 正在分析差异...' : '正在处理...')}
                   </>
                ) : (
                   <>
                     <span>✨</span> {mode === 'proofread' ? '启动智能比对' : mode === 'format' ? '生成排版预览' : '开始执行'}
                   </>
                )}
              </button>
           </div>
        </div>

        {/* Right Output Panel */}
        <div className="flex-[1.5] flex flex-col bg-[#e1e4e8] dark:bg-[#010409] p-8 overflow-hidden relative">
           {/* Background Grid */}
           <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#8b949e 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
           
           <div className="flex justify-between items-center mb-4 z-10">
              <h3 className="text-xs font-black text-[#57606a] dark:text-[#8b949e] uppercase flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 {mode === 'proofread' ? '交互式校对工作台 (Official Preview)' : '文档预览 (Print View)'}
              </h3>
              {outputContent && mode !== 'proofread' && (
                 <div className="flex gap-2">
                     <button className="text-xs font-bold bg-white dark:bg-[#21262d] px-3 py-1.5 rounded border border-[#d0d7de] dark:border-[#30363d] shadow-sm">打印</button>
                     <button onClick={copyToClipboard} className="text-xs font-bold bg-purple-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-purple-700">复制</button>
                 </div>
              )}
           </div>
           
           {/* Content Area */}
           <div className="flex-1 overflow-hidden relative flex gap-6">
              
              <div className="flex-1 overflow-y-auto flex justify-center pb-10">
                  {outputContent || (mode === 'proofread' && suggestions.length > 0) ? (
                     mode === 'format' ? (
                        // A4 Paper Simulation for Format Mode (Pure HTML from LLM)
                        <div 
                          className="bg-white text-black w-[210mm] min-h-[297mm] shadow-2xl p-[20mm] origin-top transform scale-90 sm:scale-100 transition-transform"
                          dangerouslySetInnerHTML={{ __html: outputContent }}
                        />
                     ) : mode === 'proofread' ? (
                         // Proofread Result View with Red Head Simulation
                         <div className="w-full h-full flex gap-4">
                             {/* Left: Official Document View (Live Updated) */}
                             <div className="flex-1 bg-white text-black rounded-xl shadow-lg overflow-y-auto border border-[#d0d7de] relative">
                                 {/* Paper Container */}
                                 <div className="w-full min-h-full p-[20mm] bg-white">
                                     {/* Red Header Template */}
                                     <div className="text-center mb-12 select-none">
                                        <h1 className="text-red-600 font-serif text-3xl font-bold tracking-[0.2em] mb-4" style={{fontFamily: '"SimSun", serif'}}>中国兵器工业集团有限公司文件</h1>
                                        <div className="h-[2px] bg-red-600 w-full mb-[2px]"></div>
                                        <div className="h-[1px] bg-red-600 w-full"></div>
                                        <div className="flex justify-between text-xs font-serif mt-2 text-black">
                                            <span>兵工研字〔2024〕26号</span>
                                            <span>签发人：陆研工</span>
                                        </div>
                                     </div>
                                     
                                     {/* Document Content */}
                                     <div className="font-serif whitespace-pre-wrap leading-loose text-lg text-black" style={{fontFamily: '"FangSong", "FangSong_GB2312", serif'}}>
                                         {outputContent}
                                     </div>
                                 </div>
                             </div>
                             
                             {/* Right: Agent Suggestions Stream */}
                             <div className="w-80 flex flex-col gap-3 overflow-y-auto pr-2">
                                {suggestions.map((s) => (
                                    <div key={s.id} className={`p-4 rounded-xl border shadow-sm transition-all animate-in slide-in-from-right-10 ${
                                        s.status === 'accepted' ? 'bg-green-50 border-green-200 opacity-50' :
                                        s.status === 'rejected' ? 'bg-gray-50 border-gray-200 opacity-50' :
                                        'bg-white dark:bg-[#161b22] border-purple-200 dark:border-purple-800 ring-1 ring-purple-500/20'
                                    }`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{s.type}</span>
                                            {s.status && <span className="text-[10px] font-bold uppercase">{s.status}</span>}
                                        </div>
                                        <div className="text-xs text-[#57606a] dark:text-[#8b949e] mb-1 line-through">{s.original}</div>
                                        <div className="text-sm font-bold text-[#24292f] dark:text-[#c9d1d9] mb-2 flex items-center gap-2">
                                            <span>→</span>
                                            <span className="text-green-600 dark:text-green-400">{s.suggestion}</span>
                                        </div>
                                        <p className="text-[11px] text-[#57606a] dark:text-[#8b949e] italic mb-3">"{s.reason}"</p>
                                        
                                        {s.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApplySuggestion(s.id, true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded text-xs font-bold shadow-sm">采纳</button>
                                                <button onClick={() => handleApplySuggestion(s.id, false)} className="flex-1 bg-gray-200 dark:bg-[#30363d] hover:bg-gray-300 text-[#24292f] dark:text-[#c9d1d9] py-1.5 rounded text-xs font-bold">忽略</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {suggestions.length === 0 && (
                                    <div className="text-center p-4 text-[#8b949e] text-xs">AI 正在对比分析文档差异...</div>
                                )}
                             </div>
                         </div>
                     ) : (
                        // Standard Plain Text View
                        <div className="bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] w-full max-w-3xl rounded-xl shadow-lg p-8 whitespace-pre-wrap leading-loose text-[#24292f] dark:text-[#c9d1d9] font-serif text-base">
                           {outputContent}
                        </div>
                     )
                  ) : (
                     <div className="h-full flex flex-col items-center justify-center text-[#8b949e] opacity-50 space-y-4 select-none">
                        <div className="w-20 h-20 border-2 border-dashed border-[#d0d7de] dark:border-[#30363d] rounded-full flex items-center justify-center">
                           <Icons.File />
                        </div>
                        <p className="text-sm font-bold">等待任务启动</p>
                        <p className="text-xs">
                            {isImporting ? '正在解析文档...' : '左侧配置完成后点击执行，此处将显示结果'}
                        </p>
                     </div>
                  )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DocProcessingView;
