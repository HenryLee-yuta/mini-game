/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import salonBackdropImg from './assets/images/patisserie_salon_backdrop_1794633812286.jpg';
import { GameHud } from './components/GameHud';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { patisserieAudio } from './game/audio';
import { CakeStackEngine } from './game/CakeStackEngine';
import { PATISSERIE_FLAVORS } from './game/flavors';
import { loadPersistentStats, savePersistentStats } from './game/storage';
import type { GameSnapshot, PersistentStats } from './game/types';

const INITIAL_SNAPSHOT: GameSnapshot = {
  gameState: 'TITLE_MENU',
  score: 0,
  height: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  widthPercent: 100,
  currentFlavor: PATISSERIE_FLAVORS[0],
  isNewBest: false,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CakeStackEngine | null>(null);

  const [stats, setStats] = useState<PersistentStats>(() => {
    const loaded = loadPersistentStats();
    patisserieAudio.setMuted(loaded.isMuted);
    return loaded;
  });
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [backdropFailed, setBackdropFailed] = useState(false);

  const statsRef = useRef(stats);
  statsRef.current = stats;

  const handleGameOver = useCallback((finalSnap: GameSnapshot) => {
    patisserieAudio.setMusicDucked(true);
    setStats((prev) => {
      const updated: PersistentStats = {
        ...prev,
        bestScore: Math.max(prev.bestScore, finalSnap.score),
        bestHeight: Math.max(prev.bestHeight, finalSnap.height),
        bestCombo: Math.max(prev.bestCombo, finalSnap.maxCombo),
      };
      savePersistentStats(updated);
      engineRef.current?.setBestScore(updated.bestScore);
      return updated;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new CakeStackEngine(
      canvas,
      {
        onSnapshot: (snap) => setSnapshot(snap),
        onGameOver: handleGameOver,
      },
      statsRef.current.bestScore
    );
    engineRef.current = engine;

    return () => {
      patisserieAudio.stopMusic();
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleGameOver]);

  const handleStartGame = useCallback(() => {
    patisserieAudio.unlock();
    patisserieAudio.playUiTap();
    patisserieAudio.setMusicDucked(false);
    patisserieAudio.startMusic();
    engineRef.current?.startNewGame();
  }, []);

  const handleToggleMute = useCallback(() => {
    patisserieAudio.unlock();
    setStats((prev) => {
      const nextMuted = !prev.isMuted;
      patisserieAudio.setMuted(nextMuted);
      if (!nextMuted) {
        patisserieAudio.playUiTap();
        patisserieAudio.startMusic();
      }
      const updated = { ...prev, isMuted: nextMuted };
      savePersistentStats(updated);
      return updated;
    });
  }, []);

  const handlePause = useCallback(() => {
    patisserieAudio.playUiTap();
    patisserieAudio.setMusicPaused(true);
    engineRef.current?.setPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    patisserieAudio.unlock();
    patisserieAudio.playUiTap();
    patisserieAudio.setMusicPaused(false);
    engineRef.current?.setPaused(false);
  }, []);

  const handleReturnTitle = useCallback(() => {
    patisserieAudio.playUiTap();
    patisserieAudio.setMusicPaused(false);
    patisserieAudio.setMusicDucked(true);
    engineRef.current?.returnToTitle();
  }, []);

  const handlePlayfieldPointerDown = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    patisserieAudio.unlock();
    if (engine.getGameState() === 'TITLE_MENU') {
      patisserieAudio.setMusicDucked(true);
      patisserieAudio.startMusic();
      return;
    }
    if (engine.getGameState() === 'PLAYING') {
      patisserieAudio.setMusicDucked(false);
      patisserieAudio.startMusic();
      engine.dropCake();
    }
  }, []);

  // Keyboard shortcuts + automatic pause on window blur
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const engine = engineRef.current;
      if (!engine) return;
      const state = engine.getGameState();

      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
        if (state === 'TITLE_MENU') {
          e.preventDefault();
          handleStartGame();
        } else if (state === 'PLAYING') {
          e.preventDefault();
          patisserieAudio.unlock();
          engine.dropCake();
        } else if (state === 'GAME_OVER' && e.code !== 'ArrowDown') {
          e.preventDefault();
          handleStartGame();
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (state === 'PLAYING') {
          e.preventDefault();
          handlePause();
        } else if (state === 'PAUSED') {
          e.preventDefault();
          handleResume();
        }
      }
    };

    const onWindowBlur = () => {
      const engine = engineRef.current;
      if (engine && engine.getGameState() === 'PLAYING') {
        patisserieAudio.setMusicPaused(true);
        engine.setPaused(true);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        patisserieAudio.setMusicPaused(true);
      } else {
        const engine = engineRef.current;
        if (engine && engine.getGameState() !== 'PAUSED') {
          patisserieAudio.setMusicPaused(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handlePause, handleResume, handleStartGame]);

  return (
    <main className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#3A2821] via-[#4D362C] to-[#281B16]">
      {/* Desktop Ambient French Patisserie Salon Backdrop */}
      {!backdropFailed && (
        <img
          src={salonBackdropImg}
          alt="法式甜點屋背景"
          referrerPolicy="no-referrer"
          onError={() => setBackdropFailed(true)}
          className="pointer-events-none absolute inset-0 hidden h-full w-full scale-105 object-cover opacity-55 blur-[3px] md:block"
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-[#2A1C16]/55 via-[#2A1C16]/35 to-[#1E130F]/70 md:block"
      />

      {/* Centered Mobile Portrait Frame on Desktop / Fullscreen on Mobile */}
      <div className="relative h-dvh w-full overflow-hidden bg-[#FBF1E4] md:h-[min(92dvh,844px)] md:w-auto md:aspect-[9/16] md:max-w-[430px] md:rounded-[38px] md:border-[8px] md:border-[#3A2821] md:shadow-[0_28px_72px_rgba(18,10,7,0.58)]">
        {/* Subtle top speaker notch purely decorative on desktop frame */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-2 z-40 hidden h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#3A2821]/20 md:block"
        />

        {/* Isolated 60fps Canvas Playfield */}
        <div
          onPointerDown={handlePlayfieldPointerDown}
          className="relative h-full w-full cursor-pointer touch-manipulation"
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            aria-label="蛋糕疊疊樂遊戲畫布"
          />
        </div>

        {/* Game State UI Overlays */}
        {snapshot.gameState === 'TITLE_MENU' && (
          <TitleScreen
            stats={stats}
            onStart={handleStartGame}
            onToggleMute={handleToggleMute}
          />
        )}

        {(snapshot.gameState === 'PLAYING' || snapshot.gameState === 'PAUSED') && (
          <GameHud
            snapshot={snapshot}
            bestScore={stats.bestScore}
            isMuted={stats.isMuted}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
          />
        )}

        {snapshot.gameState === 'PAUSED' && (
          <PauseModal
            snapshot={snapshot}
            onResume={handleResume}
            onRestart={handleStartGame}
            onTitle={handleReturnTitle}
          />
        )}

        {snapshot.gameState === 'GAME_OVER' && (
          <GameOverModal
            snapshot={snapshot}
            stats={stats}
            onRestart={handleStartGame}
            onTitle={handleReturnTitle}
          />
        )}
      </div>
    </main>
  );
}
