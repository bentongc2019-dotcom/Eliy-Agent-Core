class GoogleTTS {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    this.voiceName = 'cmn-CN-Wavenet-B'; // 或者 cmn-CN-Standard-B, cmn-TW-Wavenet-B 等
  }

  async speak(text) {
    if (!this.apiKey) {
      throw new Error('Google TTS API Key is missing.');
    }

    const requestBody = {
      input: { text: text },
      voice: { languageCode: 'cmn-CN', name: this.voiceName },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 }
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      // data.audioContent is base64 encoded mp3
      const audioSrc = 'data:audio/mp3;base64,' + data.audioContent;
      const audio = new Audio(audioSrc);
      
      // 返回 Promise 以便处理 ended 事件
      await audio.play();
      return audio;
    } catch (error) {
      console.error('[GoogleTTS]', error);
      throw error;
    }
  }
}
