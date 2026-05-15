/**
 * Eliy Agent Core — 方法论内核入口
 *
 * 统一导出所有方法论引擎和类型，
 * 供 runtime 层和 adapters 层调用。
 */

// 共享类型
export * from './types.js';

// 方法论引擎
export { TPLiteEngine } from './tp_lite.js';
export { SFocusEngine } from './sfocus.js';
export { HaystackFilterEngine } from './haystack_filter.js';

// === 方法论注册表 ===
import { type MethodologyEngine } from './types.js';
import { TPLiteEngine } from './tp_lite.js';
import { SFocusEngine } from './sfocus.js';
import { HaystackFilterEngine } from './haystack_filter.js';

/** 获取所有已注册的方法论引擎 */
export function getRegisteredEngines(): MethodologyEngine[] {
  return [
    new TPLiteEngine(),
    new SFocusEngine(),
    new HaystackFilterEngine(),
  ];
}

/** 通过 ID 获取方法论引擎 */
export function getEngineById(id: 'TPL' | 'SFC' | 'HSF'): MethodologyEngine {
  const engines: Record<string, () => MethodologyEngine> = {
    TPL: () => new TPLiteEngine(),
    SFC: () => new SFocusEngine(),
    HSF: () => new HaystackFilterEngine(),
  };
  const factory = engines[id];
  if (!factory) throw new Error(`未知的方法论 ID: ${id}`);
  return factory();
}
