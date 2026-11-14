import { Volume2, VolumeX } from 'lucide-react';
import type { PersistentStats } from '../game/types';

interface TitleScreenProps {
  stats: PersistentStats;
  onStart: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({ stats, onStart, onToggleMute }: TitleScreenProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
      {/* Top Row: Quiet Mute Button */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={stats.isMuted ? '開啟音效' : '靜音'}
          className="pointer-events-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#C9A88E]/45 bg-[#FFFDF9]/92 text-[#5C4033] shadow-sm transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B83B5E]"
        >
          {stats.isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Center Lockup positioned below the swinging pendulum cake so top display stays clear */}
      <div className="pointer-events-auto mx-auto mt-auto mb-5 flex w-full max-w-[306px] flex-col items-center rounded-3xl border border-[#D9C0AB]/70 bg-[#FFFDF9]/92 px-5 py-5 text-center shadow-[0_14px_34px_rgba(92,58,40,0.12)]">
        {/* Bespoke Inline SVG French Patisserie Crest */}
        <svg
          width="46"
          height="46"
          viewBox="0 0 56 56"
          fill="none"
          aria-hidden="true"
          className="mb-2"
        >
          <circle cx="28" cy="28" r="26" fill="#FDF3E7" stroke="#D4AF37" strokeWidth="1.5" />
          {/* Top pendulum line */}
          <line x1="28" y1="6" x2="28" y2="16" stroke="#8C5E32" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="28" cy="16" r="2.3" fill="#D4AF37" stroke="#6E4B26" strokeWidth="1.2" />
          {/* Top mini strawberry */}
          <ellipse cx="28" cy="21" rx="3.4" ry="2.7" fill="#D63D5C" />
          {/* Upper tier */}
          <rect x="18" y="23.5" width="20" height="8" rx="3" fill="#F38CA2" stroke="#B36B5E" strokeWidth="1.3" />
          <rect x="18" y="27.5" width="20" height="2" fill="#FFF7F5" />
          {/* Lower tier */}
          <rect x="13" y="32.5" width="30" height="9.5" rx="3.5" fill="#F4CE97" stroke="#A87444" strokeWidth="1.3" />
          <rect x="13" y="36.8" width="30" height="2.2" fill="#FFF7F5" />
          {/* Cake stand */}
          <path d="M10 43.5H46" stroke="#8C5E32" strokeWidth="2" strokeLinecap="round" />
          <path d="M23 44L21 48H35L33 44" fill="#EFE2D4" stroke="#8C5E32" strokeWidth="1.2" />
        </svg>

        <span className="font-display text-sm font-medium tracking-wide text-[#9D6B53]">
          Maison Meringue
        </span>
        <h1 className="mt-0.5 text-balance text-2xl font-bold tracking-tight text-[#4A2E23]">
          法式蛋糕疊疊樂
        </h1>

        {stats.bestScore > 0 ? (
          <p className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-[#7A5848] tabular-nums">
            <span>最佳 {stats.bestHeight} 層</span>
            <span aria-hidden="true">·</span>
            <span>{stats.bestScore} 分</span>
            <span aria-hidden="true">·</span>
            <span>連擊 ×{stats.bestCombo}</span>
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-[#7A5848]">
            看準上方擺鐘節奏，層層疊出法式千層塔
          </p>
        )}

        <button
          type="button"
          onClick={onStart}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center whitespace-nowrap rounded-2xl bg-[#B83B5E] px-6 py-3 text-base font-semibold text-white shadow-[0_6px_16px_rgba(184,59,94,0.28)] transition-all duration-150 hover:bg-[#A03050] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B83B5E]"
        >
          開始疊蛋糕
        </button>
      </div>

      {/* Bottom Single Control Hint Line */}
      <div className="mx-auto text-center">
        <p className="rounded-xl bg-[#FFFDF9]/82 px-3.5 py-1.5 text-xs font-medium text-[#6B4A3A] shadow-xs">
          點擊螢幕或按空白鍵放下蛋糕 · 連續 3 次完美對齊可加寬
        </p>
      </div>
    </div>
  );
}
