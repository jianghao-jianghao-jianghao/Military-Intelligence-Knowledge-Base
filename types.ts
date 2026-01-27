
export enum ClearanceLevel {
  UNCLASSIFIED = '非涉密',
  RESTRICTED = '内部公开',
  CONFIDENTIAL = '秘密',
  SECRET = '机密',
  TOP_SECRET = '绝密'
}

export interface Provenance {
  sentence_id: string;
  source_uri: string;
  source_name: string;
  start: number;
  end: number;
  text: string;
  score: number;
  page?: number;
}

export interface QAResponse {
  answer: string;
  provenance: Provenance[];
  confidence: number;
  meta: {
    latency: string;
    tokens: number;
    model: string;
  };
}

export interface Entity {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  relations: Relation[];
}

export interface Relation {
  targetId: string;
  type: string;
  description: string;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  clearance: ClearanceLevel;
  type: 'document' | 'image' | 'video' | 'entity';
  score: number;
  lastUpdated: string;
}
