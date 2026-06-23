const DEFAULT_MODEL_MODE = 'generic_fallback';
const DEFAULT_PROVIDER = 'beta2-unconfigured';
const REDACTED_REASON = 'redacted';

function hasTestSignalMarkers(text = '') {
  const value = String(text || '');
  return (
    value.includes('NEXT_CONTEXT') ||
    value.includes('接续') || value.includes('接續') ||
    value.includes('test') ||
    value.includes('测试') || value.includes('測試') ||
    value.includes('ping') ||
    value.includes('hello')
  );
}

function hasBusinessMarkers(text = '') {
  const value = String(text || '');
  return (
    /老板|老闆|经营|經營|团队|團隊|执行|執行|结果|結果|计划|計劃|瓶颈|瓶頸|判断|判斷|业务|業務|问题|問題|目标|目標|先看|下一步|结果|結果/.test(value)
  );
}

export function classifyBeta2IdentityPrompt(userText = '') {
  const text = String(userText || '');
  const trimmed = text.trim();
  const testSignals = hasTestSignalMarkers(trimmed);
  const businessSignals = hasBusinessMarkers(trimmed);

  if (!trimmed) return 'pure_test_signal';
  if (testSignals && businessSignals) return 'mixed_test_and_business';
  if (testSignals) return 'pure_test_signal';
  if (businessSignals) return 'business_question';
  return 'business_question';
}

export function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

export function normalizeBeta2ModelMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'real_llm' || normalized === 'real-llm' || normalized === 'real') return 'real_llm';
  return DEFAULT_MODEL_MODE;
}

export function resolveBeta2ProviderConfig(env = process.env, { allowGlobalFallback = false } = {}) {
  const provider = String(
    env.ELIY_BETA2_LLM_PROVIDER ||
    (allowGlobalFallback ? env.DEEPSEEK_PROVIDER : '') ||
    DEFAULT_PROVIDER
  ).trim() || DEFAULT_PROVIDER;

  const model = String(
    env.ELIY_BETA2_LLM_MODEL ||
    (allowGlobalFallback ? env.DEEPSEEK_MODEL : '') ||
    ''
  ).trim();

  const baseURL = String(
    env.ELIY_BETA2_LLM_BASE_URL ||
    (allowGlobalFallback ? env.DEEPSEEK_BASE_URL : '') ||
    ''
  ).trim();

  const apiKey = String(
    env.ELIY_BETA2_LLM_API_KEY ||
    (allowGlobalFallback ? env.DEEPSEEK_API_KEY : '') ||
    (allowGlobalFallback ? env.OPENAI_API_KEY : '') ||
    ''
  ).trim();

  return {
    provider,
    model,
    baseURL,
    apiKey,
    apiKeyPresent: Boolean(apiKey)
  };
}

export function resolveBeta2ModelRouterState({ env = process.env, lastModelErrorRedacted = false } = {}) {
  const requestedModelMode = normalizeBeta2ModelMode(env.ELIY_BETA2_MODEL_MODE);
  const explicitRealLlmRequested = requestedModelMode === 'real_llm' || parseBooleanEnv(env.ELIY_BETA2_REAL_LLM_ENABLED, false);
  const providerConfig = resolveBeta2ProviderConfig(env, { allowGlobalFallback: explicitRealLlmRequested });
  const providerName = providerConfig.provider.toLowerCase();
  const providerConfigComplete = providerName === 'fake'
    || providerName === 'mock'
    || providerName === 'fail'
    || (providerConfig.apiKeyPresent && providerConfig.baseURL && providerConfig.model);
  const realLlmEnabled = Boolean(explicitRealLlmRequested && providerConfigComplete);
  const modelMode = realLlmEnabled ? 'real_llm' : 'generic_fallback';
  const fallbackReason = !realLlmEnabled && explicitRealLlmRequested ? REDACTED_REASON : null;

  return {
    requestedModelMode: explicitRealLlmRequested ? 'real_llm' : requestedModelMode,
    realLlmRequested: explicitRealLlmRequested,
    realLlmEnabled,
    modelMode,
    modelProvider: providerConfig.provider,
    modelModel: providerConfig.model,
    modelBaseUrl: providerConfig.baseURL,
    modelApiKeyPresent: providerConfig.apiKeyPresent,
    fallbackReason,
    lastModelErrorRedacted: Boolean(lastModelErrorRedacted)
  };
}

export function buildBeta2IdentityInstruction({ activeSkill = 'default', userText = '' } = {}) {
  const routingIntent = classifyBeta2IdentityPrompt(userText);
  const routingRules = routingIntent === 'pure_test_signal'
    ? '如果用户只是输入纯测试/连通性确认、没有明确经营问题，可以简短说明已进入 Beta 2.0 real LLM 对话链路，然后保持简洁。'
    : routingIntent === 'mixed_test_and_business'
      ? '如果用户输入同时包含测试语义和明确经营问题，必须优先回答经营问题，不得只回复测试确认。'
      : '如果用户提出经营问题，直接围绕经营判断回答。先归纳问题、识别关键变量，再给出可执行的下一步。';

  return [
    'Eliy 是面向老板与经营者的主体型商业智能体。',
    'Eliy 的任务不是替代老板判断，而是帮助老板厘清问题、识别经营瓶颈、形成可确认的下一步。',
    'Eliy 保留用户判断权，避免替用户做不可委托的关键经营判断。',
    '回复风格：直接、清楚、少空话、少泛泛鼓励，面向经营行动。',
    '先归纳用户真正要解决的经营问题，再识别关键变量，并给出可执行的下一步。',
    '信息不足时，提炼需要补充的关键点，但不要把所有问题都推回给用户。',
    routingRules,
    activeSkill === 'sfocus'
      ? 'S’FOCUS 仍是 shell 状态，不要假装完整 runtime 已接回。'
      : 'O 单仍是 shell / schema ready，不要假装完整 runtime 已接回。'
  ].join('\n');
}

export function buildBeta2IdentityReply(userText, { activeSkill = 'default' } = {}) {
  const prompt = String(userText || '').trim();
  const routingIntent = classifyBeta2IdentityPrompt(prompt);
  if (routingIntent === 'pure_test_signal') {
    return [
      '收到。这是系统接续测试信号。',
      '我已经进入 Eliy Beta 2.0 real LLM 对话链路。',
      '如果你要，我可以继续处理下一条真业务输入。'
    ].join('\n\n');
  }

  const lead = prompt
    ? `你这个问题可以先拆成三层：现状、关键变量、下一步。当前输入是“${prompt.slice(0, 120)}”。`
    : '你现在在测试 Eliy Beta 2.0 的对话链路。';

  const baseReply = [
    '我是 Eliy。我的角色是帮老板把经营问题说清楚、把关键变量拆出来、再把下一步收敛到可执行动作。',
    lead,
    '我会保留老板的最终判断权，不替你做不可委托的关键经营决定。',
    activeSkill === 'sfocus'
      ? '当前 S’FOCUS 仍是 shell 状态；如果你要，我可以先用文字帮你收敛瓶颈。'
      : '如果你愿意，我可以继续把问题拆成 1–3 个关键变量，再给你一个最小下一步。'
  ].join('\n\n');

  return ensureBeta2IdentityBusinessSignals(baseReply, prompt, routingIntent);
}

function hasEliyIdentitySignal(text = '') {
  const value = String(text || '');
  return /我是\s*Eliy|我是Eliy|我是\s*艾利|我是艾利|Eliy|艾利/.test(value);
}

function hasBusinessFramingSignal(text = '') {
  const value = String(text || '');
  return /经营|經營/.test(value);
}

export function ensureBeta2IdentityBusinessSignals(reply, userText, routingIntent = classifyBeta2IdentityPrompt(userText)) {
  const text = String(reply || '').trim();
  if (!text || routingIntent === 'pure_test_signal') return text;

  const needsIdentity = !hasEliyIdentitySignal(text);
  const needsBusiness = !hasBusinessFramingSignal(text);
  if (!needsIdentity && !needsBusiness) return text;

  const prefixParts = [];
  if (needsIdentity) prefixParts.push('我是 Eliy。');
  if (needsBusiness) prefixParts.push('这个问题我会先当成老板的经营判断问题处理。');

  return `${prefixParts.join(' ')}\n\n${text}`;
}

async function callOpenAICompatibleChatCompletion({ providerConfig, messages, temperature = 0.7, maxTokens = 1024 }) {
  const response = await fetch(`${providerConfig.baseURL.replace(/\/+$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerConfig.apiKey}`
    },
    body: JSON.stringify({
      model: providerConfig.model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const preview = String(errText || '').replace(/\s+/g, ' ').slice(0, 240);
    throw new Error(`HTTP ${response.status}${preview ? `: ${preview}` : ''}`);
  }

  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || '');
}

export async function runBeta2RealLlmAdapter({
  modelState,
  messages,
  userText,
  activeSkill = 'default',
  temperature = 0.7,
  maxTokens = 1024
} = {}) {
  const state = modelState || resolveBeta2ModelRouterState();

  if (!state.realLlmEnabled) {
    return {
      reply: buildBeta2IdentityReply(userText, { activeSkill }),
      modelState: {
        ...state,
        fallbackReason: state.fallbackReason || null
      }
    };
  }

  if (state.modelProvider === 'fake' || state.modelProvider === 'mock') {
    return {
      reply: buildBeta2IdentityReply(userText, { activeSkill }),
      modelState: {
        ...state,
        modelMode: 'real_llm',
        realLlmEnabled: true,
        fallbackReason: null,
        lastModelErrorRedacted: false
      }
    };
  }

  if (state.modelProvider === 'fail') {
    throw new Error('Beta2 real_llm provider failure (redacted)');
  }

  const reply = await callOpenAICompatibleChatCompletion({
    providerConfig: {
      provider: state.modelProvider,
      baseURL: state.modelBaseUrl,
      model: state.modelModel,
      apiKey: process.env.ELIY_BETA2_LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || ''
    },
    messages,
    temperature,
    maxTokens
  });

  return {
    reply,
    modelState: {
      ...state,
      modelMode: 'real_llm',
      realLlmEnabled: true,
      fallbackReason: null,
      lastModelErrorRedacted: false
    }
  };
}

export function markBeta2FallbackModelState(modelState = resolveBeta2ModelRouterState()) {
  return {
    ...modelState,
    modelMode: 'generic_fallback',
    realLlmEnabled: false,
    fallbackReason: REDACTED_REASON,
    lastModelErrorRedacted: true
  };
}
