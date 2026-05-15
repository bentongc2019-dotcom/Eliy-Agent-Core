/**
 * Eliy Agent Core — 会话管理器
 * 管理会话状态、HLAMT 记忆接入、HITL 确认记录
 */

import type { ReleasePhase } from '../methodology/types.js';
import type { LLMMessage } from '../../adapters/llm/types.js';
import type { RelationalStorage } from '../../adapters/storage/types.js';

// === 会话状态 ===
export interface SessionState {
  id: string;
  userId: string;
  startedAt: string;
  currentPhase: ReleasePhase;
  summary?: string;
  methodologyExecutionIds: string[];
  /** 能力雷达图分数 */
  radarScores: Record<string, number>;
  /** 上下文数据 */
  context: Record<string, unknown>;
  /** HITL 确认记录 */
  hitlDecisions: Array<{
    judgmentId: string;
    decision: 'APPROVE' | 'REJECT' | 'MODIFY';
    modification?: string;
    timestamp: string;
  }>;
  /** 待确认的判断 ID */
  pendingConfirmations: string[];
}

// === 会话管理器 ===
export class SessionManager {
  private currentSession: SessionState | null = null;
  private conversationHistory: LLMMessage[] = [];
  private storage?: RelationalStorage;

  constructor(storage?: RelationalStorage) {
    this.storage = storage;
  }

  /** 创建新会话 */
  async createSession(userId: string): Promise<SessionState> {
    this.currentSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      startedAt: new Date().toISOString(),
      currentPhase: 'INTAKE',
      methodologyExecutionIds: [],
      radarScores: {
        '获客能力': 0, '转化效率': 0, '交付质量': 0,
        '客户留存': 0, '团队能力': 0, '财务健康': 0,
      },
      context: {},
      hitlDecisions: [],
      pendingConfirmations: [],
    };
    this.conversationHistory = [];
    return this.currentSession;
  }

  getCurrentSession(): SessionState | null { return this.currentSession; }

  /** 添加消息到对话历史 */
  addMessage(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });
  }

  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  /** 更新上下文 */
  updateContext(key: string, value: unknown): void {
    if (this.currentSession) this.currentSession.context[key] = value;
  }

  /** 更新投料阶段 */
  updatePhase(phase: ReleasePhase): void {
    if (this.currentSession) this.currentSession.currentPhase = phase;
  }

  /** 更新雷达图分数 */
  updateRadarScore(dimension: string, score: number): void {
    if (this.currentSession) {
      this.currentSession.radarScores[dimension] = Math.max(0, Math.min(1, score));
    }
  }

  getRadarScores(): Record<string, number> {
    return { ...(this.currentSession?.radarScores ?? {}) };
  }

  /** 记录方法论执行 */
  recordMethodologyExecution(executionId: string): void {
    this.currentSession?.methodologyExecutionIds.push(executionId);
  }

  /** 记录 HITL 确认决策 */
  recordHITLDecision(judgmentId: string, decision: 'APPROVE' | 'REJECT' | 'MODIFY', modification?: string): void {
    if (!this.currentSession) return;
    this.currentSession.hitlDecisions.push({
      judgmentId, decision, modification, timestamp: new Date().toISOString(),
    });
    // 从待确认列表移除
    this.currentSession.pendingConfirmations = this.currentSession.pendingConfirmations.filter(id => id !== judgmentId);
  }

  /** 获取待确认的判断 */
  getPendingConfirmations(): string[] {
    return this.currentSession?.pendingConfirmations ?? [];
  }

  /** 结束会话 */
  endSession(): void {
    this.currentSession = null;
    this.conversationHistory = [];
  }
}
