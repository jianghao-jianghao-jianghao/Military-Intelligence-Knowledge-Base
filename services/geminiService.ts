
import { GoogleGenAI, Type } from "@google/genai";
import { QAResponse } from "../types.ts";

export const performQA = async (query: string): Promise<QAResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    用户查询: ${query}
    任务: 你是一个专业的军事智能分析员。请根据你的知识库回答用户的问题，并提供句子级的来源证据（假定来源）。
    格式: 返回符合以下结构的 JSON 对象。
    
    结构示例:
    {
      "answer": "这里是详细的中文回答内容...",
      "provenance": [{ 
        "sentence_id": "s1", 
        "source_uri": "doc-2024-01.pdf", 
        "source_name": "2024年度防务白皮书", 
        "start": 0, 
        "end": 50, 
        "text": "此处是证据原文片段", 
        "score": 0.98 
      }],
      "confidence": 0.92,
      "meta": { "latency": "1.2s", "tokens": 500, "model": "gemini-3-flash-preview" }
    }
    
    约束: 必须使用简体中文回答，语气严肃、准确、客观。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            meta: {
              type: Type.OBJECT,
              properties: {
                latency: { type: Type.STRING },
                tokens: { type: Type.NUMBER },
                model: { type: Type.STRING }
              }
            },
            provenance: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sentence_id: { type: Type.STRING },
                  source_uri: { type: Type.STRING },
                  source_name: { type: Type.STRING },
                  start: { type: Type.NUMBER },
                  end: { type: Type.NUMBER },
                  text: { type: Type.STRING },
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
    console.error("Gemini QA 失败:", error);
    return {
      answer: "无法连接到战术后端。请检查 API 密钥配置及网络连接。",
      provenance: [],
      confidence: 0,
      meta: { latency: "0ms", tokens: 0, model: "无" }
    };
  }
};
