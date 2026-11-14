import type { GameSnapshot, PersistentStats } from '../game/types';

interface GameOverModalProps {
  snapshot: GameSnapshot;
  stats: PersistentStats;
  onRestart: () => void;
  onTitle: () => void;
}

export function GameOverModal({
  snapshot,
  stats,
  onRestart,
  onTitle,
}: GameOverModalProps) {
  const missMessage =
    snapshot.lastMissReason === 'missed_stand'
      ? '蛋糕沒有落到點心盤上'
      : '蛋糕沒有疊到上一層';

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#2A1F1B]/42 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="w-full max-w-[316px] rounded-3xl border border-[#D9C0AB] bg-[#FFFDF9] p-6 text-center shadow-[0_20px_44px_rgba(42,31,27,0.28)]">
        <span className="font-display text-xs font-medium tracking-wider text-[#B83B5E]">
          {snapshot.isNewBest ? 'Nouveau Record · 破紀錄' : 'Fin de Service'}
        </span>
        <h2 id="gameover-title" className="mt-0.5 text-2xl font-bold text-[#4A2E23]">
          蛋糕倒塌了！
        </h2>
        <p className="mt-1 text-xs text-[#8B6B5A]">{missMessage}</p>

        {/* Clean 3-stat horizontal grid with hairline dividers */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-[#EBDCCB] border-y border-[#EBDCCB] py-3.5">
          <div className="flex flex-col items-center px-2">
            <span className="text-[11px] font-medium text-[#8B6B5A]">疊高層數</span>
            <span className="font-mono-num mt-1 text-xl font-bold text-[#4A2E23]">
              {snapshot.height}
            </span>
          </div>
          <div className="flex flex-col items-center px-2">
            <span className="text-[11px] font-medium text-[#8B6B5A]">總分數</span>
            <span className="font-mono-num mt-1 text-xl font-bold text-[#B83B5E]">
              {snapshot.score}
            </span>
          </div>
          <div className="flex flex-col items-center px-2">
            <span className="text-[11px] font-medium text-[#8B6B5A]">最高連擊</span>
            <span className="font-mono-num mt-1 text-xl font-bold text-[#4A2E23]">
              ×{snapshot.maxCombo}
            </span>
          </div>
        </div>

        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[#8B6B5A] tabular-nums">
          <span>完美對齊 {snapshot.perfectCount} 次</span>
          <span aria-hidden="true">·</span>
          <span>歷史最高 {Math.max(stats.bestScore, snapshot.score)} 分</span>
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRestart}
            className="flex min-h-[48px] w-full items-center justify-center whitespace-nowrap rounded-2xl bg-[#B83B5E] px-6 py-3 text-base font-semibold text-white shadow-[0_6px_16px_rgba(184,59,94,0.28)] transition-transform duration-150 hover:bg-[#A03050] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B83B5E]"
          >
            再玩一次
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="flex min-h-[44px] w-full items-center justify-center whitespace-nowrap rounded-2xl border border-[#D9C0AB] bg-[#FAF2E8] px-5 py-2.5 text-sm font-semibold text-[#5C4033] transition-transform duration-150 hover:bg-[#F3E5D5] active:scale-[0.98]"
          >
            回到主畫面
          </button>
        </div>
      </div>
    </div>
  );
}
