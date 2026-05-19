class GoogleTTS {
  /**
   * 支持传入 API Key 或者完整的 Service Account JSON
   * @param {string|object} credentials - 字符串代表 API Key，对象代表 Service Account JSON
   */
  constructor(credentials) {
    this.credentials = credentials;
    this.voiceName = 'cmn-CN-Wavenet-B';
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async getAccessToken() {
    // 如果是直接提供的 API Key，无需 Token
    if (typeof this.credentials === 'string') {
      return null;
    }
    
    // 检查缓存的 Token 是否仍然有效 (留 60 秒缓冲)
    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && this.tokenExpiry > now + 60) {
      return this.accessToken;
    }

    console.log('[GoogleTTS] 正在生成 OAuth2 Token...');
    const json = this.credentials;
    
    if (!window.KJUR) {
      throw new Error('缺少 jsrsasign 库，无法在纯前端签署 JWT。请在 HTML 中引入。');
    }

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: json.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: json.token_uri,
      exp: now + 3600,
      iat: now
    };

    const sHeader = JSON.stringify(header);
    const sPayload = JSON.stringify(payload);
    
    try {
      const sJWT = KJUR.jws.JWS.sign("RS256", sHeader, sPayload, json.private_key);

      const res = await fetch(json.token_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${sJWT}`
      });

      if (!res.ok) {
        throw new Error('获取 Access Token 失败: ' + res.statusText);
      }

      const tokenData = await res.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = now + tokenData.expires_in;
      return this.accessToken;
    } catch (err) {
      console.error('[GoogleTTS] Token 获取异常:', err);
      throw err;
    }
  }

  async speak(text) {
    if (!this.credentials) {
      throw new Error('未提供 Google TTS 凭证。');
    }

    let endpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize';
    let headers = { 'Content-Type': 'application/json' };

    // 如果凭证是字符串，当做 API_KEY 处理
    if (typeof this.credentials === 'string') {
      endpoint += `?key=${this.credentials}`;
    } else {
      // 否则当做 Service Account JSON 处理
      const token = await this.getAccessToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    const requestBody = {
      input: { text: text },
      voice: { languageCode: 'cmn-CN', name: this.voiceName },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Google TTS Error: ${err.error?.message || response.statusText}`);
      }

      const data = await response.json();
      if (!data.audioContent) {
        throw new Error('No audio content returned from Google TTS.');
      }

      const audioSrc = 'data:audio/mp3;base64,' + data.audioContent;
      const audio = new Audio(audioSrc);
      
      await audio.play();
      return audio;
    } catch (error) {
      console.error('[GoogleTTS] 合成异常:', error);
      throw error;
    }
  }
}
