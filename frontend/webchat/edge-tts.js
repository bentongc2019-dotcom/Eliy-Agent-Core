/**
 * Edge TTS 浏览器端客户端 —— 纯前端，零依赖
 *
 * 原理：通过 WebSocket 直连微软 Edge 的 TTS 服务端点
 * 声音自然度远超浏览器内置 SpeechSynthesis
 *
 * 推荐中文男声：
 * - zh-CN-YunxiNeural     （年轻男性，自然清晰）
 * - zh-CN-YunjianNeural   （成熟男性，沉稳权威 ← 推荐 Eliy 用这个）
 * - zh-CN-YunyeNeural     （叙事型男声）
 */

class EdgeTTS {
  constructor(voice = 'zh-CN-YunjianNeural', rate = '+0%', pitch = '+0Hz', volume = '+0%') {
    this.voice = voice;
    this.rate = rate;
    this.pitch = pitch;
    this.volume = volume;
    // 微软 Edge TTS WebSocket 端点
    this.WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
    this.TOKEN_URL = 'https://edge.microsoft.com/nedrpc/v1/stt/token';
  }

  /**
   * 生成用于标识请求的 UUID
   */
  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /**
   * 生成 SSML（语音合成标记语言）
   */
  _buildSSML(text) {
    // 转义 XML 特殊字符
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
   * 将文本转为语音并返回 AudioBuffer
   * @param {string} text - 要合成的文本
   * @returns {Promise<Blob>} - 音频 Blob（mp3 格式）
   */
  async synthesize(text) {
    return new Promise((resolve, reject) => {
      const requestId = this._uuid().replace(/-/g, '');
      const timestamp = new Date().toISOString();
      const audioChunks = [];

      // 构造 WebSocket URL（含 Sec-MS-GEC token 参数）
      const wsUrl = `${this.WS_URL}?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${requestId}`;

      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      // 超时保护（15秒）
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Edge TTS 连接超时'));
      }, 15000);

      ws.onopen = () => {
        // 发送配置消息
        ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{
          "context": {
            "synthesis": {
              "audio": {
                "metadataoptions": { "sentenceBoundaryEnabled": "false", "wordBoundaryEnabled": "true" },
                "outputFormat": "audio-24khz-96kbitrate-mono-mp3"
              }
            }
          }
        }`);

        // 发送 SSML 合成请求
        const ssml = this._buildSSML(text);
        ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}\r\nPath:ssml\r\n\r\n${ssml}`);
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // 二进制消息 = 音频数据
          // 头部包含 "Path:audio\r\n" 等元信息，需要跳过
          const view = new DataView(event.data);
          const headerLen = view.getInt16(0);
          const audioData = event.data.slice(headerLen + 2);
          if (audioData.byteLength > 0) {
            audioChunks.push(audioData);
          }
        } else if (typeof event.data === 'string') {
          // 文本消息：检查是否结束
          if (event.data.includes('Path:turn.end')) {
            clearTimeout(timeout);
            ws.close();
            const blob = new Blob(audioChunks, { type: 'audio/mp3' });
            resolve(blob);
          }
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        reject(new Error('Edge TTS WebSocket 错误'));
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        if (audioChunks.length > 0) {
          const blob = new Blob(audioChunks, { type: 'audio/mp3' });
          resolve(blob);
        }
      };
    });
  }

  /**
   * 合成文本并直接播放
   * @param {string} text - 要播放的文本
   * @returns {Promise<HTMLAudioElement>} - 正在播放的 Audio 元素
   */
  async speak(text) {
    const blob = await this.synthesize(text);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve(audio);
      };
      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('音频播放失败'));
      };
      audio.play().catch(reject);
    });
  }

  /**
   * 停止当前播放
   */
  stop() {
    // 由外部管理 audio 元素的停止
  }
}

// 导出供 voice.html 使用
window.EdgeTTS = EdgeTTS;
