import { Pause, Volume2, VolumeX } from 'lucide-react';
import type { GameSnapshot } from '../game/types';

interface GameHudProps {
  snapshot: GameSnapshot;
  bestScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export function GameHud({
  snapshot,
  bestScore,
  isMuted,
  onToggleMute,
  onPause,
}: GameHudProps) {
  const displayBest = Math.max(bestScore, snapshot.score);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
      {/* Top-Left: Score, Height & Combo Readout (Unboxed, Tabular) */}
      <div className="flex flex-col gap-0.5 rounded-2xl border border-[#C9A88E]/40 bg-[#FFFDF9]/90 px-3.5 py-2 shadow-sm">
        <div className="flex items-baseline gap-2.5">
          <div className="flex items-baseline gap-1">
            <span className="font-mono-num text-2xl font-bold leading-none text-[#4A2E23]">
              {snapshot.height}
            </span>
            <span className="text-xs font-medium text-[#7A5848]">層</span>
          </div>
          <span aria-hidden="true" className="text-xs text-[#C5A58E]">
            ·
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono-num text-lg font-semibold leading-none text-[#B83B5E]">
              {snapshot.score}
            </span>
            <span className="text-xs font-medium text-[#7A5848]">分</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-medium text-[#8B6B5A]">
          <span className="tabular-nums">最佳 {displayBest} 分</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">寬度 {snapshot.widthPercent}%</span>
        </div>

        {snapshot.combo >= 2 && (
          <div className="mt-0.5 text-[11px] font-semibold text-[#B83B5E] tabular-nums">
            {snapshot.combo >= 3
              ? `完美連擊 ×${snapshot.combo} · 寬度加成啟動`
              : `完美連擊 ×${snapshot.combo} · 再 1 次加寬`}
          </div>
        )}
      </div>

      {/* Top-Right: Audio & Pause Controls (>=44px touch targets) */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          aria-label={isMuted ? '開啟音效' : '靜音'}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#C9A88E]/45 bg-[#FFFDF9]/92 text-[#5C4033] shadow-sm transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B83B5E]"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onPause();
          }}
          aria-label="暫停遊戲"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-[#C9A88E]/45 bg-[#FFFDF9]/92 text-[#5C4033] shadow-sm transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B83B5E]"
        >
          <Pause className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
