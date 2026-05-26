/**
 * Google TTS 瀏覽器代理客戶端 (v0.2.1 輕量版)
 * 
 * 功能：
 * 將語音合成請求轉發至 Cloudflare Workers 代理端點，
 * 由代理端點安全地注入 Google API Key，保護敏感金鑰並減少前端運算開銷。
 */

class GoogleTTS {
  constructor(proxyUrl) {
    // 預設使用相對路徑，但也支持傳入自定義代理伺服器 URL
    this.proxyUrl = proxyUrl || '/api/tts';
    this.voiceName = 'cmn-CN-Wavenet-B';
  }

  async speak(text) {
    let endpoint = this.proxyUrl;
    
    // 如果傳入的是自定義域名，自動補全路由路徑
    if (endpoint.startsWith('http') && !endpoint.includes('/api/tts')) {
      endpoint = endpoint.replace(/\/+$/, '') + '/api/tts';
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          text: text,
          voice: this.voiceName
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Google TTS 代理呼叫失敗: ${err.error || response.statusText}`);
      }

      const data = await response.json();
      if (!data.audioContent) {
        throw new Error('代理未返回有效 audioContent 音頻內容');
      }

      // 載入 MP3 Base64 數據並播放
      const audioSrc = 'data:audio/mp3;base64,' + data.audioContent;
      const audio = new Audio(audioSrc);
      
      await audio.play();
      return audio;
    } catch (error) {
      console.error('[GoogleTTS] 代理合成異常:', error);
      throw error;
    }
  }
}

// 導出供 voice.html 使用
window.GoogleTTS = GoogleTTS;
