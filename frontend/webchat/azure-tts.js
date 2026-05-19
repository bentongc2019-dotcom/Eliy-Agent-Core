/**
 * Azure TTS 浏览器端客户端 —— 官方 REST API，零依赖
 *
 * 使用微软 Azure Cognitive Services Speech REST API
 * 同样支持 YunjianNeural 成熟男声，稳定可靠
 *
 * 免费层 F0：每月 50 万字符
 */

class AzureTTS {
  /**
   * @param {string} subscriptionKey - Azure Speech 订阅密钥
   * @param {string} region - Azure 区域（如 eastasia, southeastasia, eastus）
   * @param {string} voice - 语音名称
   * @param {object} prosody - 语音参数
   */
  constructor(subscriptionKey, region, voice = 'zh-CN-YunjianNeural', prosody = {}) {
    this.subscriptionKey = subscriptionKey;
    this.region = region;
    this.voice = voice;
    this.rate = prosody.rate || '+0%';
    this.pitch = prosody.pitch || '-2Hz';
    this.volume = prosody.volume || '+0%';
    // 官方 REST API 端点
    this.endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    // Token 端点（用于浏览器 CORS 兼容）
    this.tokenEndpoint = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    // 缓存 token
    this._token = null;
    this._tokenExpiry = 0;
  }

  /**
   * 获取访问令牌（有效期 10 分钟，缓存 9 分钟）
   */
  async _getToken() {
    const now = Date.now();
    if (this._token && now < this._tokenExpiry) {
      return this._token;
    }

    const resp = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'Content-Length': '0'
      }
    });

    if (!resp.ok) {
      throw new Error(`Azure Token 获取失败: ${resp.status} ${resp.statusText}`);
    }

    this._token = await resp.text();
    this._tokenExpiry = now + 9 * 60 * 1000; // 缓存 9 分钟
    return this._token;
  }

  /**
   * 构建 SSML
   */
  _buildSSML(text) {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>
      <voice name='${this.voice}'>
        <prosody rate='${this.rate}' pitch='${this.pitch}' volume='${this.volume}'>
          ${escaped}
        </prosody>
      </voice>
    </speak>`;
  }

  /**
   * 将文本合成为语音
   * @param {string} text - 要合成的文本
   * @returns {Promise<Blob>} - 音频 Blob（MP3 格式）
   */
  async synthesize(text) {
    // 优先使用 Token（更安全，避免暴露 key）
    let authHeader;
    try {
      const token = await this._getToken();
      authHeader = { 'Authorization': `Bearer ${token}` };
    } catch (e) {
      // Token 获取失败时直接使用 Key（可能 CORS 限制）
      console.warn('[Azure TTS] Token 获取失败，直接使用 Key:', e.message);
      authHeader = { 'Ocp-Apim-Subscription-Key': this.subscriptionKey };
    }

    const ssml = this._buildSSML(text);

    const resp = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        'User-Agent': 'EliyVoiceAgent/1.0'
      },
      body: ssml
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => '');
      throw new Error(`Azure TTS 合成失败: ${resp.status} ${resp.statusText} ${errorText}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    return new Blob([arrayBuffer], { type: 'audio/mp3' });
  }

  /**
   * 合成并直接播放
   * @param {string} text
   * @returns {Promise<HTMLAudioElement>}
   */
  async speak(text) {
    const blob = await this.synthesize(text);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    return new Promise((resolve, reject) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(audio); };
      audio.onerror = (e) => { URL.revokeObjectURL(url); reject(new Error('音频播放失败')); };
      audio.play().catch(reject);
    });
  }

  /**
   * 验证配置是否有效
   * @returns {Promise<boolean>}
   */
  async validate() {
    try {
      await this._getToken();
      return true;
    } catch (e) {
      return false;
    }
  }
}

// 导出
window.AzureTTS = AzureTTS;
