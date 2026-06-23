import fs from 'node:fs';
import path from 'node:path';

function dirExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function toSkillRecord(rootDir, { id, name, status, active, enabled, available }) {
  const skillRoot = path.join(rootDir, 'skills', id);
  const skillMdPath = path.join(skillRoot, 'SKILL.md');
  const referencesPath = path.join(skillRoot, 'references');
  const skillMd = readText(skillMdPath);
  const skillLoaded = Boolean(skillMd.trim()) && dirExists(referencesPath);

  return {
    id,
    name,
    status,
    enabled,
    available,
    active,
    skillMdPath,
    referencesPath,
    skillLoaded
  };
}

export function buildSkillRegistry(rootDir, activeSkill = 'default') {
  const normalizedActiveSkill = activeSkill === 'sfocus' ? 'sfocus' : 'default';
  const skills = [
    toSkillRecord(rootDir, {
      id: 'default',
      name: 'Default',
      status: 'active',
      active: normalizedActiveSkill === 'default',
      enabled: true,
      available: true
    }),
    toSkillRecord(rootDir, {
      id: 'sfocus',
      name: "S’FOCUS",
      status: 'shell',
      active: normalizedActiveSkill === 'sfocus',
      enabled: true,
      available: true
    })
  ];

  return {
    registry: 'filesystem',
    registryLoaded: true,
    activeSkill: normalizedActiveSkill,
    skills
  };
}

export function buildRuntimeStatus({
  runtimeConfig,
  activeSkill = 'default',
  modelMode = 'generic_fallback',
  requestedModelMode = modelMode,
  realLlmEnabled,
  modelProvider = 'shell',
  fallbackReason = null,
  lastModelErrorRedacted = false
} = {}) {
  const normalizedModelMode = String(modelMode).trim() || 'generic_fallback';
  const normalizedRequestedModelMode = String(requestedModelMode).trim() || normalizedModelMode;
  const effectiveModelMode = normalizedModelMode;
  const isRealLlmEnabled = typeof realLlmEnabled === 'boolean' ? realLlmEnabled : effectiveModelMode === 'real_llm';

  return {
    environment: 'owner_test',
    version: 'beta2',
    stage: 'p0_foundation_agent_harness_shell',
    modelMode: effectiveModelMode,
    realLlmEnabled: isRealLlmEnabled,
    agentHarnessEnabled: true,
    skillRegistryEnabled: true,
    oOrderWorkbench: 'shell',
    oOrderRuntimeEnabled: false,
    activeSkill: activeSkill === 'sfocus' ? 'sfocus' : 'default',
    requestedModelMode: normalizedRequestedModelMode,
    modelProvider,
    fallbackReason: fallbackReason || null,
    lastModelErrorRedacted: Boolean(lastModelErrorRedacted),
    host: runtimeConfig?.host || '127.0.0.1',
    port: runtimeConfig?.port || 3001,
    publicBaseUrl: runtimeConfig?.publicBaseUrl || `http://localhost:${runtimeConfig?.port || 3001}`,
    runtimeDataDir: runtimeConfig?.paths?.runtimeDataDir || null,
    accountStorageDir: runtimeConfig?.paths?.accountStorageDir || null,
    transcriptsDir: runtimeConfig?.paths?.transcriptsDir || null,
    memoryDir: runtimeConfig?.paths?.memoryDir || null,
    reportsDir: runtimeConfig?.paths?.reportsDir || null,
    stateDir: runtimeConfig?.paths?.stateDir || null,
    evidenceDir: runtimeConfig?.paths?.hlamtEvidenceDir || null
  };
}

export function buildOOrderWorkbenchSchema() {
  return {
    workbench: 'o_order',
    status: 'shell',
    runtimeEnabled: false,
    fields: [
      { key: 'goal', label: '目标', description: '当前希望达成的结果' },
      { key: 'plan', label: '计划', description: '达成目标的简要安排' },
      { key: 'actions', label: '要做的几件事', description: '可执行的最小动作集合' },
      { key: 'owner', label: '负责人', description: '这项工作由谁负责' },
      { key: 'time', label: '时间', description: '执行与检查时间' },
      { key: 'followUps', label: '跟进记录', description: '后续进展与依赖项' },
      { key: 'review', label: '检讨 / 调整', description: '复盘与修正结论' },
      { key: 'evidence', label: '证据', description: '支持判断的证据材料' },
      { key: 'status', label: '状态', description: '当前工作台状态' }
    ]
  };
}
