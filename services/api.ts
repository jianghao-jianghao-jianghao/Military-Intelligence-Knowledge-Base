
import { FileParseResult, WeaponDocument, ApiResponse, ClearanceLevel } from "../types.ts";
import { MOCK_DOCS } from "../constants.tsx";

/**
 * Service Layer: api.ts
 * This file acts as the interface for backend interactions. 
 * Currently simulates async calls with Mock Data, but is structured to be easily replaced by real Fetch/Axios calls.
 */

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const ApiService = {
  
  /**
   * Simulates parsing a file (PDF/Word/Image) and extracting text.
   * Endpoint: POST /api/v1/files/parse
   */
  async parseFile(file: File): Promise<ApiResponse<FileParseResult>> {
    await delay(1500); // Simulate upload and processing time

    // Mock extraction logic based on filename
    let content = "";
    let metadata = {};

    if (file.name.includes("通知")) {
        content = `[系统提取成功: ${file.name}]\n\n关于兵工研制大脑项目组成立的通知（草案）\n\n各相关部门：\n为了加快数字化转型，经研究决定，拟成立“兵工研制大脑”专项工作组。\n\n一、工作目标\n构建集知识检索、图谱分析于一体的智能中台。\n\n二、人员安排\n组长：陆研工\n副组长：王分析\n\n特此通知。\n\n二〇二四年三月二十六日`;
        metadata = { detectedType: 'Official Document', author: '陆研工' };
    } else if (file.name.includes("手册") || file.name.includes("Manual")) {
        content = `[系统提取成功: ${file.name}]\n\n第一章：安全操作规范\n1.1 启动前检查\n在启动动力系统前，必须检查冷却液液位是否位于刻度线以上...\n1.2 紧急制动\n遇到红灯报警时，立即按下主控台红色按钮。`;
        metadata = { detectedType: 'Technical Manual', pageCount: 42 };
    } else {
        content = `[系统提取成功: ${file.name}]\n\n（此处模拟从 PDF/Word 中提取的纯文本内容...）\n\n这是文档的第一段。\n这是文档的第二段，包含一些技术参数：\n- 参数A: 1200\n- 参数B: 35.5\n\n文档结束。`;
        metadata = { pageCount: 5 };
    }

    return {
      code: 200,
      message: "File parsed successfully",
      timestamp: new Date().toISOString(),
      data: {
        fileName: file.name,
        fileType: file.type,
        content: content,
        metadata: metadata
      }
    };
  },

  /**
   * Fetches a single document details.
   * Endpoint: GET /api/v1/documents/:id
   */
  async getDocumentById(id: string): Promise<ApiResponse<WeaponDocument | null>> {
      await delay(300);
      const doc = MOCK_DOCS.find(d => d.id === id);
      return {
          code: doc ? 200 : 404,
          message: doc ? "Success" : "Not Found",
          data: doc || null,
          timestamp: new Date().toISOString()
      };
  },

  /**
   * Simulates document upload to a Knowledge Base.
   * Endpoint: POST /api/v1/documents
   */
  async uploadDocument(file: File, meta: { kbId: string, clearance: ClearanceLevel }): Promise<ApiResponse<boolean>> {
      await delay(2000); // Audit scanning delay
      return {
          code: 200,
          message: "Uploaded to audit queue",
          data: true,
          timestamp: new Date().toISOString()
      };
  }
};
