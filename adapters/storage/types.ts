/**
 * Eliy Agent Core — 存储适配器抽象接口
 *
 * 包含：
 * 1. 关系型存储（PostgreSQL）—— 用户画像、会话记录、执行日志
 * 2. 向量存储 —— 语义搜索、记忆检索、知识库
 *
 * 记忆写入治理：所有持久化写入必须经过 agency_policy.md §2 的审查
 */

// ============================================================
// 关系型存储接口
// ============================================================

export interface RelationalStorage {
  readonly name: string;

  /** 连接检查 */
  healthCheck(): Promise<{ connected: boolean; latencyMs: number }>;

  // === 会话管理 ===
  saveSession(session: SessionRecord): Promise<void>;
  getSession(sessionId: string): Promise<SessionRecord | null>;
  listSessions(userId: string, limit?: number): Promise<SessionRecord[]>;

  // === 用户画像（写入需治理审查） ===
  saveProfile(profile: ProfileRecord): Promise<void>;
  getProfile(userId: string): Promise<ProfileRecord | null>;

  // === 执行日志（不可篡改） ===
  appendLog(log: ExecutionLogRecord): Promise<void>;
  queryLogs(filter: LogFilter): Promise<ExecutionLogRecord[]>;

  // === 工件元数据 ===
  saveArtifactMeta(meta: ArtifactMetaRecord): Promise<void>;
  getArtifactMeta(artifactId: string): Promise<ArtifactMetaRecord | null>;
}

export interface SessionRecord {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  releasePhase: string;
  /** 会话摘要 */
  summary?: string;
  /** 方法论执行 ID 列表 */
  methodologyExecutions: string[];
}

export interface ProfileRecord {
  userId: string;
  data: Record<string, unknown>;
  /** 写入治理等级（agency_policy.md §2.1） */
  memoryType: 'SESSION' | 'PROFILE' | 'INSIGHT' | 'METHODOLOGY';
  /** 数据来源必须是 USER_EXPLICIT */
  dataSource: 'USER_EXPLICIT';
  version: number;
  updatedAt: string;
  /** 审查状态 */
  governanceStatus: 'AUTO_APPROVED' | 'PENDING_USER' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
}

export interface ExecutionLogRecord {
  id: string;
  timestamp: string;
  type: 'LLM_CALL' | 'TOOL_EXECUTION' | 'METHODOLOGY_RUN' | 'MEMORY_WRITE';
  sessionId: string;
  userId: string;
  data: Record<string, unknown>;
}

export interface ArtifactMetaRecord {
  id: string;
  type: string;
  sessionId: string;
  version: number;
  createdAt: string;
  dataSourceIds: string[];
  confidenceLevel: string;
}

export interface LogFilter {
  sessionId?: string;
  userId?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

// ============================================================
// 向量存储接口
// ============================================================

export interface VectorStorage {
  readonly name: string;

  healthCheck(): Promise<{ connected: boolean }>;

  /** 存储向量 */
  upsert(entries: VectorEntry[]): Promise<void>;

  /** 语义搜索 */
  search(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;

  /** 删除 */
  delete(ids: string[]): Promise<void>;
}

export interface VectorEntry {
  id: string;
  content: string;
  /** 预计算的向量（可选，不提供则由存储端计算） */
  vector?: number[];
  metadata: Record<string, unknown>;
  /** 命名空间隔离（如按用户隔离） */
  namespace?: string;
}

export interface VectorSearchOptions {
  topK?: number;
  namespace?: string;
  filter?: Record<string, unknown>;
  minScore?: number;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

// ============================================================
// 骨架实现
// ============================================================

export class PostgresStorage implements RelationalStorage {
  readonly name = 'PostgreSQL';
  constructor(private connectionUrl: string) {}
  async healthCheck() { return { connected: false, latencyMs: 0 }; }
  async saveSession(_s: SessionRecord) { throw new Error('PostgresStorage: 待实现'); }
  async getSession(_id: string) { return null; }
  async listSessions(_uid: string) { return []; }
  async saveProfile(_p: ProfileRecord) { throw new Error('PostgresStorage: 待实现'); }
  async getProfile(_uid: string) { return null; }
  async appendLog(_l: ExecutionLogRecord) { throw new Error('PostgresStorage: 待实现'); }
  async queryLogs(_f: LogFilter) { return []; }
  async saveArtifactMeta(_m: ArtifactMetaRecord) { throw new Error('PostgresStorage: 待实现'); }
  async getArtifactMeta(_id: string) { return null; }
}

export class VectorStore implements VectorStorage {
  readonly name = 'VectorStore';
  constructor(private endpoint: string) {}
  async healthCheck() { return { connected: false }; }
  async upsert(_entries: VectorEntry[]) { throw new Error('VectorStore: 待实现'); }
  async search(_query: string) { return []; }
  async delete(_ids: string[]) { throw new Error('VectorStore: 待实现'); }
}
