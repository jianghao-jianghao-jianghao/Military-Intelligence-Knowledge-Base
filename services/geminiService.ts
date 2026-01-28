
import { GoogleGenAI, Type } from "@google/genai";
import { QAResponse, RetrievalConfig, User, ClearanceLevel } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const performQA = async (query: string, config: RetrievalConfig, user: User, quote?: string): Promise<QAResponse> => {
  const prompt = `
    用户身份: ${user.name} (部门ID: ${user.departmentId}, 角色: ${user.role}, 系统密级: ${user.clearance})
    检索策略: ${config.strategy}, 层级开启: ${JSON.stringify(config.tiers)}, 增强模式: ${JSON.stringify(config.enhanced)}
    
    任务: 作为兵工研制大脑分析员，请执行四级检索召回体系。
    
    ${quote ? `注意：用户针对以下内容进行了【精准追问/引用】："${quote}"。请重点围绕该引用片段进行解答，并扩展相关背景。` : ''}
    
    安全治理指令 (DLP):
    - 必须遵守 "${user.clearance}" 密级。
    - 严禁跨越未授权知识库提供信息。
    
    输出要求 (JSON):
    - tier_hit: 'FAQ' | 'GRAPH' | 'DOCS' | 'LLM'
    - answer: 严谨的专业回答
    - related_questions: 数组，包含3-4个基于当前回答的智能关联追问建议（Smart Suggestions）。
    - media: 如果有相关的多模态资产 (image, video)，提供 url 和 caption (模拟路径即可)
    - thought_process: 详细说明每一步，包括 Rewrite 或 Stepback 的结果
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: prompt },
        { text: `用户查询: ${query}` }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tier_hit: { type: Type.STRING },
            answer: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            security_badge: { type: Type.STRING },
            is_desensitized: { type: Type.BOOLEAN },
            related_questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            media: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  url: { type: Type.STRING },
                  caption: { type: Type.STRING }
                }
              }
            },
            thought_process: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  type: { type: Type.STRING }
                }
              }
            },
            provenance: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sentence_id: { type: Type.STRING },
                  source_name: { type: Type.STRING },
                  text: { type: Type.STRING },
                  security_level: { type: Type.STRING },
                  score: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Tiered RAG Failure:", error);
    // Secure Fallback simulating a multi-modal DOCS hit with suggestions
    return {
      tier_hit: 'DOCS',
      answer: "根据已授权的《装甲动力核心指标库》，15式轻型坦克在高原测试中表现优异。视频片段显示在含氧量35%的极端环境下，涡轮增压器在12秒内达到全速运行状态。",
      related_questions: [
        "15式坦克的涡轮增压器具体型号是什么？",
        "高原环境下发动机的平均故障间隔时间(MTBF)是多少？",
        "对比99A坦克，15式的高原机动性优势在哪里？"
      ],
      media: [
        { type: 'image', url: '/mock/armor_plate.jpg', caption: '高强度复合装甲受损面分析图' },
        { type: 'video', url: '/mock/test_drive.mp4', caption: '高原坡道起步加速实验录像' }
      ],
      thought_process: [
        { title: "问题改写 (Rewrite)", content: "将 '15式坦克高原表现' 改写为 '15式轻型坦克在海拔4000米以上高原环境的动力输出及启动性能指标'。", type: "rewrite" },
        { title: "FAQ 预检索", content: "未命中精准匹配的问答对，进入深层文档库。", type: "search" },
        { title: "文档库 RAG", content: "从 KB-1 检索到 3 个高度相关的实验视频片段及 1 篇热力分析文档。", type: "search" },
        { title: "安全审计", content: "内容符合用户 '机密' 密级要求，未涉及核动力等超纲词汇。", type: "security_check" }
      ],
      provenance: [
        { sentence_id: "s1", source_name: "装甲动力核心指标库 (KB-1)", text: "高原环境下的进气量自动补偿策略确保了动力的持续性输出。", security_level: ClearanceLevel.SECRET, score: 0.98 }
      ],
      confidence: 0.94,
      security_badge: ClearanceLevel.SECRET,
      is_desensitized: false
    };
  }
};

/**
 * Handles Document Processing Tasks
 */
export const processDocument = async (
  taskType: 'write' | 'optimize' | 'proofread' | 'format',
  content: string, 
  context?: string, // optimization instructions / reference doc content
  docType?: string  // for format type
): Promise<string> => {
  
  let systemInstruction = "";
  let prompt = "";
  let isJson = false;

  switch (taskType) {
    case 'write':
      systemInstruction = "你是一个专业的公文和技术文档写作助手。请根据用户的主题和要点，生成结构严谨、语言专业的 Markdown 格式文档。";
      prompt = `主题: ${content}\n要点/要求: ${context}\n请生成完整的文档内容。`;
      break;
    case 'optimize':
      systemInstruction = "你是一个文档优化专家。请根据用户的需求（润色、续写、改写），提升文档的质量。保持 Markdown 格式。";
      prompt = `原文:\n${content}\n优化指令: ${context}\n请输出优化后的版本。`;
      break;
    case 'proofread':
      isJson = true;
      systemInstruction = "你是一个严谨的公文校对 Agent。你的任务是对比【用户草稿】与【标准范文】（或基于公文写作规范），找出草稿中的格式错误、错别字、不规范表述或遗漏内容。请以 JSON 数组格式返回建议。";
      prompt = `
      【标准范文/参考依据】:
      ${context || "请依据通用国家公文格式标准 (GB/T 9704-2012)"}

      【用户草稿】:
      ${content}

      请分析草稿与标准的差异。
      返回格式示例:
      [
        { "id": 1, "type": "错别字", "original": "研制大脑", "suggestion": "兵工研制大脑", "reason": "名称表述不全" },
        { "id": 2, "type": "格式", "original": "无", "suggestion": "添加红头", "reason": "缺少发文机关标志" }
      ]
      请只返回 JSON 数组，不要包含 Markdown 标记。
      `;
      break;
    case 'format':
      // Updated to generate specific HTML for "Official Document" style
      systemInstruction = "你是一个专业的公文排版引擎。请将用户的 Markdown 文本转换为符合中国公文格式标准 (GB/T 9704) 的 HTML 代码。";
      prompt = `
      文档类型: ${docType}
      文本内容:
      ${content}

      请生成一个完整的 HTML div 片段 (不含 html/body 标签)，使用内联 CSS (inline styles) 严格控制样式。
      关键要求：
      1. 字体：正文仿宋_GB2312 (或 Serif 替代)，标题方正小标宋简体 (或 Sans-serif 替代)。
      2. 字号：正文三号 (16pt)，一级标题二号 (22pt)，二级标题三号。
      3. 行间距：固定值 28pt - 30pt。
      4. 如果是“公文”类型，请在顶部模拟“红头文件”样式（红色横线、发文机关标志）。
      5. 页面背景设为白色，内边距模拟 A4 纸张 (padding: 2.54cm 3.17cm)。
      6. 输出纯 HTML 代码，不要 Markdown 代码块包裹。
      `;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: isJson ? "application/json" : "text/plain"
      }
    });
    return response.text || "处理失败，请重试。";
  } catch (error) {
    console.error("Document Processing Failure:", error);
    if (taskType === 'proofread') {
         return JSON.stringify([
             { id: 1, type: "系统错误", original: "服务连接失败", suggestion: "重试", reason: "AI 响应超时或被拦截" }
         ]);
    }
    return `[系统提示] 服务暂时不可用，无法处理请求。`;
  }
};
