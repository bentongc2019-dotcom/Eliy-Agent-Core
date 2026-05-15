/**
 * Eliy WebChat — 实时语音通话页面（React TSX 定义）
 *
 * 功能：
 * 1. 默认进入语音通话模式（类似 Gemini Live）
 * 2. 全双工：用户可随时说话，Eliy 自然接话
 * 3. 富老板头像实时唇同步
 * 4. 文字聊天作为备用模式
 * 5. 投料阶段可视化 + 雷达图
 *
 * 此文件为 React TSX 组件定义，供 Next.js 集成。
 * 实际可运行 MVP 见同目录 voice.html
 */

// React 组件定义（需 Next.js 环境）
/*
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EliyAvatar } from './components/Avatar';

type Mode = 'voice' | 'text';
type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';
type Phase = 'INTAKE' | 'FRAMING' | 'DIAGNOSIS' | 'PRESCRIPTION' | 'FOLLOW_UP';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function EliyVoicePage() {
  const [mode, setMode] = useState<Mode>('voice');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [phase, setPhase] = useState<Phase>('INTAKE');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [radarScores, setRadarScores] = useState({
    '获客能力': 0, '转化效率': 0, '交付质量': 0,
    '客户留存': 0, '团队能力': 0, '财务健康': 0,
  });

  const startCall = useCallback(async () => {
    setIsCallActive(true);
    setVoiceStatus('speaking');
    // 播放欢迎语...
  }, []);

  const endCall = useCallback(() => {
    setIsCallActive(false);
    setVoiceStatus('idle');
  }, []);

  return (
    <div className="voice-page">
      <aside className="voice-sidebar">
        <PhaseIndicator phase={phase} />
        <RadarChart scores={radarScores} />
      </aside>
      <main className="voice-main">
        <EliyAvatar
          imageSrc="./assets/eli_y_avatar.png"
          status={voiceStatus}
          viseme={null}
          size={320}
        />
        <div className="subtitle-area">{currentSubtitle}</div>
        <div className="voice-controls">
          {!isCallActive ? (
            <button className="call-btn start" onClick={startCall}>
              开始通话
            </button>
          ) : (
            <button className="call-btn end" onClick={endCall}>
              结束通话
            </button>
          )}
          <button className="mode-toggle" onClick={() => setMode(m => m === 'voice' ? 'text' : 'voice')}>
            {mode === 'voice' ? '切换文字' : '切换语音'}
          </button>
        </div>
        {mode === 'text' && <TextChatFallback messages={messages} />}
      </main>
    </div>
  );
}
*/

// 导出类型供其他模块使用
export type VoicePageMode = 'voice' | 'text';
export type VoicePageStatus = 'idle' | 'listening' | 'thinking' | 'speaking';
