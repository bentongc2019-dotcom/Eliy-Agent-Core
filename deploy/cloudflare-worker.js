/**
 * Eliy Core — 輕量後端代理 (Cloudflare Workers)
 * 
 * 功能：
 * 1. 代理 DeepSeek API，完整支持 CORS 與 Stream 流式傳輸。
 * 2. 代理 Google Cloud TTS API，保護 API Key，提供極速語音合成轉發。
 * 
 * 配置環境變量 (Cloudflare Workers Settings -> Variables)：
 * - DEEPSEEK_API_KEY: 你的 DeepSeek 密鑰 (sk-...)
 * - GOOGLE_CLOUD_API_KEY: 你的 Google Cloud API 密鑰 (AIzaSy...)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 處理 OPTIONS 跨域預檢請求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      // 2. 路由分發
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return await handleChat(request, env);
      } 
      
      if (url.pathname === '/api/tts' && request.method === 'POST') {
        return await handleTTS(request, env);
      }

      // 404 兜底
      return new Response(JSON.stringify({ error: '未找到對應的代理路由' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      console.error('[Worker Error]', err);
      return new Response(JSON.stringify({ error: '代理伺服器內部異常', details: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
};

/**
 * 代理 DeepSeek 聊天請求 (支持 Stream 流式響應)
 */
async function handleChat(request, env) {
  if (!env.DEEPSEEK_API_KEY) {
    return new Response(JSON.stringify({ error: '後端未配置 DEEPSEEK_API_KEY 環境變數' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 複製前端請求內容
  const requestBody = await request.json();

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  // 如果前端請求了 stream 傳輸，則直接流式轉發 body
  const isStream = requestBody.stream === true;
  
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': isStream ? 'text/event-stream' : 'application/json',
  };

  if (isStream) {
    responseHeaders['Cache-Control'] = 'no-cache';
    responseHeaders['Connection'] = 'keep-alive';
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

/**
 * 代理 Google Cloud TTS 語音合成請求
 */
async function handleTTS(request, env) {
  if (!env.GOOGLE_CLOUD_API_KEY) {
    return new Response(JSON.stringify({ error: '後端未配置 GOOGLE_CLOUD_API_KEY 環境變數' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { text, voice } = await request.json();

  if (!text) {
    return new Response(JSON.stringify({ error: 'text 參數不能為空' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 呼叫 Google Cloud TTS API
  const googleEndpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${env.GOOGLE_CLOUD_API_KEY}`;
  
  const googleRequestBody = {
    input: { text: text },
    voice: { languageCode: 'cmn-CN', name: voice || 'cmn-CN-Wavenet-B' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 },
  };

  const response = await fetch(googleEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(googleRequestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: 'Google TTS 呼叫失敗', details: errorText }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 原樣轉發 Google TTS 的 Base64 音頻結果，前端 google-tts.js 可以直接解析
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
