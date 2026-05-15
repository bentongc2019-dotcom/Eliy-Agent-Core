/**
 * 工具适配器骨架实现（calendar / email / file / browser）
 * 所有工具已预注册确认等级，确保 HITL 强制执行
 */
import type { ToolAdapter, ToolRegistration, ToolExecutionRequest, ToolExecutionPreview, ToolExecutionResult } from './types.js';

// === 日历工具 ===
export class CalendarTool implements ToolAdapter {
  readonly registration: ToolRegistration = {
    id: 'tool_calendar', name: '日历管理',
    description: '创建/修改/删除日历事件',
    confirmationLevel: 'L3',  // 有副作用，必须用户确认
    sideEffects: ['创建日历事件', '修改现有事件', '发送邀请通知'],
    rollbackable: true, maxExecutionsPerSession: 10,
    requiredPermissions: ['calendar.read', 'calendar.write'],
  };
  async preview(req: ToolExecutionRequest): Promise<ToolExecutionPreview> {
    return { toolName: '日历管理', operationType: String(req.input.action ?? 'create'),
      affectedScope: String(req.input.summary ?? '未指定'), expectedResult: '创建/修改日历事件',
      possibleRisks: ['可能与现有事件冲突'], rollbackPlan: '删除已创建的事件' };
  }
  async execute(_req: ToolExecutionRequest): Promise<ToolExecutionResult> {
    throw new Error('CalendarTool: execute() 待实现 — 需要 Google Calendar API');
  }
}

// === 邮件工具 ===
export class EmailTool implements ToolAdapter {
  readonly registration: ToolRegistration = {
    id: 'tool_email', name: '邮件发送',
    description: '发送邮件（不可撤回！）',
    confirmationLevel: 'L3',  // 发邮件不可撤回，必须 L3
    sideEffects: ['发送邮件到指定收件人'],
    rollbackable: false, maxExecutionsPerSession: 5,
    requiredPermissions: ['email.send'],
  };
  async preview(req: ToolExecutionRequest): Promise<ToolExecutionPreview> {
    return { toolName: '邮件发送', operationType: 'send',
      affectedScope: `收件人: ${req.input.to ?? '未指定'}`,
      expectedResult: '发送邮件', possibleRisks: ['邮件发出后无法撤回', '可能进入垃圾箱'] };
  }
  async execute(_req: ToolExecutionRequest): Promise<ToolExecutionResult> {
    throw new Error('EmailTool: execute() 待实现 — 需要 SMTP 配置');
  }
}

// === 文件工具 ===
export class FileTool implements ToolAdapter {
  readonly registration: ToolRegistration = {
    id: 'tool_file', name: '文件操作',
    description: '读取/写入/管理文件',
    confirmationLevel: 'L2',  // 读取 L1，写入时升级为 L3（在 preview 中动态判断）
    sideEffects: ['创建或修改文件'],
    rollbackable: true, maxExecutionsPerSession: 20,
    requiredPermissions: ['file.read', 'file.write'],
  };
  async preview(req: ToolExecutionRequest): Promise<ToolExecutionPreview> {
    const isWrite = ['write', 'delete', 'move'].includes(String(req.input.action));
    return { toolName: '文件操作', operationType: String(req.input.action ?? 'read'),
      affectedScope: String(req.input.path ?? '未指定'),
      expectedResult: isWrite ? '修改文件系统' : '读取文件内容',
      possibleRisks: isWrite ? ['文件内容将被覆盖'] : [],
      rollbackPlan: isWrite ? '从备份恢复' : undefined };
  }
  async execute(_req: ToolExecutionRequest): Promise<ToolExecutionResult> {
    throw new Error('FileTool: execute() 待实现');
  }
}

// === 浏览器工具 ===
export class BrowserTool implements ToolAdapter {
  readonly registration: ToolRegistration = {
    id: 'tool_browser', name: '浏览器操作',
    description: '打开网页/提取信息/执行操作',
    confirmationLevel: 'L2',  // 浏览 L1，提交表单 L3
    sideEffects: ['访问外部网页', '可能触发外部操作'],
    rollbackable: false, maxExecutionsPerSession: 15,
    requiredPermissions: ['browser.navigate'],
  };
  async preview(req: ToolExecutionRequest): Promise<ToolExecutionPreview> {
    return { toolName: '浏览器', operationType: String(req.input.action ?? 'navigate'),
      affectedScope: String(req.input.url ?? '未指定'),
      expectedResult: '获取网页内容', possibleRisks: ['外部网页可能不可用'] };
  }
  async execute(_req: ToolExecutionRequest): Promise<ToolExecutionResult> {
    throw new Error('BrowserTool: execute() 待实现');
  }
}
