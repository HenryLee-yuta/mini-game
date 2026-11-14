import type { GameSnapshot } from '../game/types';

interface PauseModalProps {
  snapshot: GameSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export function PauseModal({
  snapshot,
  onResume,
  onRestart,
  onTitle,
}: PauseModalProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#2A1F1B]/38 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="w-full max-w-[300px] rounded-3xl border border-[#D9C0AB] bg-[#FFFDF9] p-6 text-center shadow-[0_18px_40px_rgba(42,31,27,0.24)]">
        <span className="font-display text-xs font-medium tracking-wider text-[#9D6B53]">
          Pause
        </span>
        <h2 id="pause-title" className="mt-0.5 text-xl font-bold text-[#4A2E23]">
          遊戲暫停
        </h2>

        <p className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-[#7A5848] tabular-nums">
          <span>目前 {snapshot.height} 層</span>
          <span aria-hidden="true">·</span>
          <span>{snapshot.score} 分</span>
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex min-h-[46px] w-full items-center justify-center whitespace-nowrap rounded-2xl bg-[#B83B5E] px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:bg-[#A03050] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B83B5E]"
          >
            繼續遊戲
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex min-h-[44px] w-full items-center justify-center whitespace-nowrap rounded-2xl border border-[#D9C0AB] bg-[#FAF2E8] px-5 py-2.5 text-sm font-semibold text-[#5C4033] transition-transform duration-150 hover:bg-[#F3E5D5] active:scale-[0.98]"
          >
            重新開始
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="flex min-h-[44px] w-full items-center justify-center whitespace-nowrap rounded-2xl px-5 py-2 text-sm font-medium text-[#8B6B5A] transition-colors hover:text-[#4A2E23]"
          >
            回到主畫面
          </button>
        </div>
      </div>
    </div>
  );
}
