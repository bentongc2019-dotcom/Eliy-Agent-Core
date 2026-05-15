/**
 * Eliy Avatar 组件 — 富老板实时动画
 *
 * 功能：
 * 1. 专业企业家形象（45岁亚洲男性）
 * 2. 基于 viseme 的唇同步动画
 * 3. 自然头部微动（idle animation）
 * 4. 说话时呼吸灯光效果
 * 5. 状态指示（听/说/思考）
 *
 * 纯 CSS + Canvas 实现，零框架依赖。
 * 此文件为 TSX 组件定义，供未来 React 集成使用。
 * 同时导出 vanilla JS 渲染函数供 MVP 页面直接调用。
 */

import type { VisemeEvent, VisemeId } from '../../../adapters/voice/realtime.js';

// === 唇形到嘴型参数的映射 ===
interface MouthShape {
  openY: number;     // 嘴巴张开高度 0-1
  width: number;     // 嘴巴宽度 0-1
  roundness: number; // 圆度 0-1
}

const VISEME_MOUTH_MAP: Record<VisemeId, MouthShape> = {
  sil:  { openY: 0,    width: 0.4, roundness: 0 },
  PP:   { openY: 0,    width: 0.3, roundness: 0 },
  FF:   { openY: 0.15, width: 0.5, roundness: 0 },
  TH:   { openY: 0.2,  width: 0.45, roundness: 0.1 },
  DD:   { openY: 0.25, width: 0.4, roundness: 0.1 },
  kk:   { openY: 0.35, width: 0.35, roundness: 0.2 },
  CH:   { openY: 0.3,  width: 0.45, roundness: 0.3 },
  SS:   { openY: 0.15, width: 0.5, roundness: 0.1 },
  nn:   { openY: 0.2,  width: 0.4, roundness: 0.1 },
  RR:   { openY: 0.3,  width: 0.35, roundness: 0.4 },
  aa:   { openY: 0.7,  width: 0.5, roundness: 0.3 },
  E:    { openY: 0.45, width: 0.55, roundness: 0.2 },
  I:    { openY: 0.25, width: 0.55, roundness: 0.1 },
  O:    { openY: 0.55, width: 0.35, roundness: 0.8 },
  U:    { openY: 0.4,  width: 0.3, roundness: 0.9 },
};

// === 头像状态 ===
export type AvatarStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

// === 头像属性 ===
export interface AvatarProps {
  imageSrc: string;
  status: AvatarStatus;
  viseme: VisemeEvent | null;
  size?: number;
}

// === React TSX 组件（供未来集成） ===
// 注意：当前 MVP 未安装 React，此组件定义供参考
/*
export function EliyAvatar({ imageSrc, status, viseme, size = 320 }: AvatarProps) {
  return (
    <div className={`eliy-avatar-container avatar-${status}`} style={{ width: size, height: size }}>
      <div className="avatar-glow" />
      <img src={imageSrc} alt="Eliy" className="avatar-image" />
      <canvas className="avatar-overlay" width={size} height={size} />
      <div className="avatar-status-ring" />
      <div className="avatar-status-label">{statusLabel(status)}</div>
    </div>
  );
}
*/

// === Vanilla JS 渲染器（MVP 直接使用） ===
export class EliyAvatarRenderer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement;
  private size: number;
  private status: AvatarStatus = 'idle';
  private currentMouth: MouthShape = VISEME_MOUTH_MAP.sil;
  private targetMouth: MouthShape = VISEME_MOUTH_MAP.sil;
  private headOffsetX = 0;
  private headOffsetY = 0;
  private breathPhase = 0;
  private animationId = 0;

  constructor(containerId: string, imageSrc: string, size = 320) {
    this.container = document.getElementById(containerId)!;
    this.size = size;

    // 创建 DOM 结构
    this.container.innerHTML = `
      <div class="eliy-avatar-wrap" style="width:${size}px;height:${size}px;position:relative;margin:0 auto;">
        <div class="avatar-glow-ring"></div>
        <div class="avatar-img-container" style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;position:relative;">
          <img src="${imageSrc}" alt="Eliy" style="width:100%;height:100%;object-fit:cover;object-position:center top;" />
          <canvas id="avatarOverlay" width="${size}" height="${size}" style="position:absolute;top:0;left:0;pointer-events:none;"></canvas>
        </div>
        <div class="avatar-status-indicator" id="avatarStatusBadge">
          <span class="status-dot"></span>
          <span class="status-text">就绪</span>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('avatarOverlay') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.image = this.container.querySelector('img')!;

    // 启动动画循环
    this.animate();
  }

  /** 更新 viseme（由语音引擎调用） */
  updateViseme(viseme: VisemeEvent): void {
    this.targetMouth = VISEME_MOUTH_MAP[viseme.visemeId] || VISEME_MOUTH_MAP.sil;
  }

  /** 更新状态 */
  setStatus(status: AvatarStatus): void {
    this.status = status;
    const badge = document.getElementById('avatarStatusBadge');
    if (!badge) return;
    const labels: Record<AvatarStatus, string> = {
      idle: '就绪', listening: '聆听中...', thinking: '思考中...', speaking: '说话中',
    };
    const colors: Record<AvatarStatus, string> = {
      idle: '#5b6abf', listening: '#34d399', thinking: '#fbbf24', speaking: '#60a5fa',
    };
    badge.querySelector('.status-text')!.textContent = labels[status];
    (badge.querySelector('.status-dot') as HTMLElement).style.background = colors[status];
  }

  /** 动画循环 */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.breathPhase += 0.02;

    // 平滑插值嘴型
    this.currentMouth.openY += (this.targetMouth.openY - this.currentMouth.openY) * 0.3;
    this.currentMouth.width += (this.targetMouth.width - this.currentMouth.width) * 0.3;
    this.currentMouth.roundness += (this.targetMouth.roundness - this.currentMouth.roundness) * 0.3;

    // 自然头部微动（idle animation）
    this.headOffsetX = Math.sin(this.breathPhase * 0.7) * 1.5;
    this.headOffsetY = Math.sin(this.breathPhase) * 1;

    // 应用头部微动到图片
    this.image.style.transform = `translate(${this.headOffsetX}px, ${this.headOffsetY}px)`;

    // 绘制嘴部叠加层（仅在说话时可见）
    this.drawMouthOverlay();
  };

  private drawMouthOverlay(): void {
    const { ctx, size } = this;
    ctx.clearRect(0, 0, size, size);

    if (this.status !== 'speaking' || this.currentMouth.openY < 0.05) return;

    // 嘴巴位置（头像下半部分）
    const mouthX = size * 0.5 + this.headOffsetX;
    const mouthY = size * 0.72 + this.headOffsetY;
    const mouthW = size * 0.12 * this.currentMouth.width;
    const mouthH = size * 0.06 * this.currentMouth.openY;

    // 半透明深色嘴部效果
    ctx.save();
    ctx.globalAlpha = 0.4 * this.currentMouth.openY;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 销毁 */
  destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

// 状态标签函数
function statusLabel(status: AvatarStatus): string {
  return { idle: '就绪', listening: '聆听中', thinking: '思考中', speaking: '说话中' }[status];
}
