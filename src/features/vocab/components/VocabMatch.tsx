import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Trophy, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getLabels } from '../../../utils/i18n';
import { KT } from '../../../components/mobile/ksoft/ksoft';

interface VocabItem {
  id: string;
  korean: string;
  english: string;
  unit: number;
}

interface VocabMatchProps {
  readonly words: readonly VocabItem[];
  readonly onComplete?: (time: number, moves: number) => void;
  readonly onClose?: () => void;
}

interface MatchCard {
  readonly id: string;
  readonly content: string;
  readonly pairId: string;
  readonly type: 'korean' | 'english';
  readonly isMatched: boolean;
}

type CardState = 'normal' | 'selected' | 'matched' | 'wrong';
type GameState = 'PLAYING' | 'COMPLETE';

interface LeaderboardEntry {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly moves: number;
  readonly time: number;
  readonly completedAt: number;
}

const TOTAL_PAIRS = 8;
const MATCH_LEADERBOARD_STORAGE_KEY = 'vocab.match.leaderboard.v1';

function scheduleMicrotask(callback: () => void) {
  if (typeof globalThis.queueMicrotask === 'function') {
    globalThis.queueMicrotask(callback);
    return;
  }
  globalThis.setTimeout(callback, 0);
}

function shuffleArray<T>(array: readonly T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.score === 'number' &&
    typeof entry.moves === 'number' &&
    typeof entry.time === 'number' &&
    typeof entry.completedAt === 'number'
  );
}

function getLeaderboardFromStorage(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(MATCH_LEADERBOARD_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLeaderboardEntry);
  } catch {
    return [];
  }
}

function persistLeaderboard(entries: readonly LeaderboardEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MATCH_LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
}

function sortLeaderboard(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.time - b.time;
  });
}

export default function VocabMatch({ words, onComplete, onClose }: VocabMatchProps) {
  const { language, user } = useAuth();
  const labels = getLabels(language);
  const playerName = user?.name?.trim() || labels.common?.you || 'You';

  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [timer, setTimer] = useState(0);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [isLocked, setIsLocked] = useState(false);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [hintCount, setHintCount] = useState(2);
  const [timeCount, setTimeCount] = useState(2);
  const [shuffleCount, setShuffleCount] = useState(1);
  const [hintedCardIds, setHintedCardIds] = useState<readonly string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    getLeaderboardFromStorage()
  );

  const wordsKey = words.map(w => w.id).join(',');
  const wordsKeyRef = useRef(wordsKey);
  const hasInitialized = useRef(false);
  const hintTimeoutRef = useRef<number | null>(null);
  const hasPersistedResultRef = useRef(false);

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current !== null) {
        window.clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  const initializeCards = useCallback(() => {
    const selectedWords = shuffleArray(words).slice(0, TOTAL_PAIRS);
    const cardList: MatchCard[] = selectedWords.flatMap(word => [
      {
        id: `kr-${word.id}`,
        content: word.korean,
        pairId: word.id,
        type: 'korean',
        isMatched: false,
      },
      {
        id: `en-${word.id}`,
        content: word.english,
        pairId: word.id,
        type: 'english',
        isMatched: false,
      },
    ]);

    const shuffled = shuffleArray(cardList);
    const initialStates: Record<string, CardState> = {};
    shuffled.forEach(card => {
      initialStates[card.id] = 'normal';
    });

    setCards(shuffled);
    setCardStates(initialStates);
    setSelectedCards([]);
    setTimer(0);
    setMoves(0);
    setMatchedPairs(0);
    setGameState('PLAYING');
    setIsLocked(false);
    setCombo(0);
    setScore(0);
    setHintCount(2);
    setTimeCount(2);
    setShuffleCount(1);
    setHintedCardIds([]);
    hasPersistedResultRef.current = false;
  }, [words]);

  useEffect(() => {
    if (!hasInitialized.current || wordsKeyRef.current !== wordsKey) {
      wordsKeyRef.current = wordsKey;
      hasInitialized.current = true;
      scheduleMicrotask(() => initializeCards());
    }
  }, [wordsKey, initializeCards]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = window.setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => window.clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'COMPLETE' || hasPersistedResultRef.current) return;
    const entryId = `match:${wordsKey}:${score}:${moves}:${timer}`;
    const entry: LeaderboardEntry = {
      id: entryId,
      name: playerName,
      score,
      moves,
      time: timer,
      completedAt: 0,
    };
    const next = sortLeaderboard([...leaderboard, entry]).slice(0, 10);
    scheduleMicrotask(() => {
      setLeaderboard(next);
      persistLeaderboard(next);
      hasPersistedResultRef.current = true;
    });
  }, [gameState, leaderboard, moves, playerName, score, timer, wordsKey]);

  const handleSuccessfulMatch = useCallback(
    (firstId: string, secondId: string, currentMoves: number) => {
      setCardStates(prev => ({
        ...prev,
        [firstId]: 'matched',
        [secondId]: 'matched',
      }));

      setCards(prev =>
        prev.map(card =>
          card.id === firstId || card.id === secondId ? { ...card, isMatched: true } : card
        )
      );

      setCombo(prev => {
        const next = prev + 1;
        setScore(current => current + 120 + Math.max(0, next - 1) * 40);
        return next;
      });

      setMatchedPairs(prev => {
        const next = prev + 1;
        if (next >= TOTAL_PAIRS) {
          setGameState('COMPLETE');
          onComplete?.(timer, currentMoves);
        }
        return next;
      });

      setSelectedCards([]);
      setIsLocked(false);
    },
    [onComplete, timer]
  );

  const handleMismatch = useCallback((firstId: string, secondId: string) => {
    setCardStates(prev => ({
      ...prev,
      [firstId]: 'wrong',
      [secondId]: 'wrong',
    }));
    setCombo(0);

    window.setTimeout(() => {
      setCardStates(prev => ({
        ...prev,
        [firstId]: 'normal',
        [secondId]: 'normal',
      }));
      setSelectedCards([]);
      setIsLocked(false);
    }, 320);
  }, []);

  const handleCardClick = (cardId: string) => {
    if (isLocked || gameState !== 'PLAYING') return;
    if (cardStates[cardId] === 'matched' || cardStates[cardId] === 'selected') return;

    const nextSelected = [...selectedCards, cardId];
    setSelectedCards(nextSelected);
    setCardStates(prev => ({ ...prev, [cardId]: 'selected' }));
    setHintedCardIds(prev => prev.filter(id => id !== cardId));

    if (nextSelected.length < 2) return;

    setIsLocked(true);
    const currentMoves = moves + 1;
    setMoves(currentMoves);

    const [firstId, secondId] = nextSelected;
    const firstCard = cards.find(card => card.id === firstId);
    const secondCard = cards.find(card => card.id === secondId);

    if (!firstCard || !secondCard) {
      setSelectedCards([]);
      setIsLocked(false);
      return;
    }

    const isMatch = firstCard.pairId === secondCard.pairId && firstCard.type !== secondCard.type;
    if (isMatch) {
      window.setTimeout(() => handleSuccessfulMatch(firstId, secondId, currentMoves), 160);
      return;
    }
    handleMismatch(firstId, secondId);
  };

  const handleReshuffle = useCallback(() => {
    setCards(prev => {
      const matched = prev.filter(card => card.isMatched);
      const unmatched = shuffleArray(prev.filter(card => !card.isMatched));
      return [...matched, ...unmatched];
    });
  }, []);

  const useHint = () => {
    if (hintCount <= 0 || gameState !== 'PLAYING') return;
    const unmatched = cards.filter(card => !card.isMatched);
    const pairMap = new Map<string, MatchCard[]>();
    unmatched.forEach(card => {
      const current = pairMap.get(card.pairId);
      if (!current) {
        pairMap.set(card.pairId, [card]);
        return;
      }
      pairMap.set(card.pairId, [...current, card]);
    });

    const pair = [...pairMap.values()].find(value => value.length === 2);
    if (!pair) return;

    if (hintTimeoutRef.current !== null) {
      window.clearTimeout(hintTimeoutRef.current);
    }
    setHintedCardIds([pair[0].id, pair[1].id]);
    hintTimeoutRef.current = window.setTimeout(() => {
      setHintedCardIds([]);
      hintTimeoutRef.current = null;
    }, 1000);
    setHintCount(prev => prev - 1);
  };

  const useTimeBoost = () => {
    if (timeCount <= 0 || gameState !== 'PLAYING') return;
    setTimer(prev => Math.max(0, prev - 12));
    setTimeCount(prev => prev - 1);
  };

  const useShuffleBoost = () => {
    if (shuffleCount <= 0 || gameState !== 'PLAYING') return;
    handleReshuffle();
    setShuffleCount(prev => prev - 1);
  };

  const liveBoard = sortLeaderboard([
    ...leaderboard,
    {
      id: 'live-session',
      name: playerName,
      score,
      moves,
      time: timer,
      completedAt: 0,
    },
  ]).slice(0, 3);

  if (words.length < TOTAL_PAIRS) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div
          style={{
            background: KT.card,
            borderRadius: 16,
            border: `1px solid ${KT.line}`,
            boxShadow: KT.shSm,
            padding: 16,
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              margin: '0 auto 8px',
              background: KT.bg2,
              display: 'grid',
              placeItems: 'center',
              color: KT.sub,
            }}
          >
            <RefreshCw size={18} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: KT.sub }}>
            {(
              labels.vocab?.minWordsMatch || 'Need at least {count} words to start matching'
            ).replace('{count}', String(TOTAL_PAIRS))}
          </p>
        </div>
      </div>
    );
  }

  if (gameState === 'COMPLETE') {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div
          style={{
            width: '100%',
            background: KT.card,
            border: `1px solid ${KT.line}`,
            borderRadius: 18,
            boxShadow: KT.sh,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 16,
              margin: '0 auto 8px',
              background: KT.butter,
              color: KT.butterDeep,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Trophy size={30} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: KT.ink }}>
            {labels.vocab?.matchTitle || 'Great Job!'}
          </div>
          <div style={{ fontSize: 11, color: KT.sub, marginTop: 2 }}>
            {labels.vocab?.matchDesc || 'Master of words'}
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}
          >
            <StatCard label={labels.vocab?.time || 'Time'} value={formatTime(timer)} />
            <StatCard label={labels.vocab?.moves || 'Moves'} value={String(moves)} />
            <StatCard label="Score" value={String(score)} />
          </div>
          <button
            type="button"
            onClick={initializeCards}
            style={{
              marginTop: 10,
              width: '100%',
              minHeight: 42,
              borderRadius: 12,
              border: 'none',
              background: KT.ink,
              color: KT.card,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {labels.vocab?.restart || 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-[800px]"
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'auto auto auto auto 1fr auto auto',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${KT.lilac}70 0%, ${KT.pink}55 100%)`,
      }}
    >
      <div
        style={{
          padding: 'calc(env(safe-area-inset-top) + 8px) 14px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => onClose?.()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            border: 'none',
            background: KT.card,
            color: KT.ink,
            boxShadow: KT.shSm,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="关闭"
        >
          <X size={16} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', marginLeft: 6 }}>
          <div style={{ fontSize: 10, color: KT.sub, fontWeight: 800, letterSpacing: 1.1 }}>
            小游戏 · 戱
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: KT.ink, marginTop: 1 }}>
            词汇连连看
          </div>
        </div>
        <div
          style={{
            padding: '5px 8px',
            borderRadius: 12,
            background: KT.ink,
            color: KT.card,
            fontSize: 11,
            fontWeight: 800,
            minWidth: 54,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {formatTime(timer)}
        </div>
      </div>

      <div style={{ padding: '2px 14px 8px', display: 'flex', gap: 6 }}>
        <HudCard hanja="對" label="配对" value={`${matchedPairs}/${TOTAL_PAIRS}`} />
        <HudCard hanja="連" label="连击" value={`×${combo}`} />
        <HudCard hanja="點" label="分数" value={String(score)} />
      </div>

      <div style={{ padding: '0 14px 8px' }}>
        <div
          style={{
            padding: '5px 10px',
            borderRadius: 14,
            background: KT.butter,
            color: KT.ink,
            textAlign: 'center',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.4,
          }}
        >
          {combo > 1 ? `🔥 连击 ×${combo}` : '开始配对'}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5 px-3.5 pb-2">
        {cards.map(card => (
          <MatchButton
            key={card.id}
            card={card}
            cardState={cardStates[card.id] ?? 'normal'}
            isLocked={isLocked}
            isHinted={hintedCardIds.includes(card.id)}
            onClick={handleCardClick}
          />
        ))}
      </div>

      <div
        style={{
          padding: '0 14px 8px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 6,
        }}
      >
        <BoosterButton icon="☀" label="提示" count={hintCount} onClick={useHint} />
        <BoosterButton icon="⏱" label="延时" count={timeCount} onClick={useTimeBoost} />
        <BoosterButton icon="🔀" label="洗牌" count={shuffleCount} onClick={useShuffleBoost} />
      </div>

      <div style={{ padding: '0 14px 10px' }}>
        <div
          style={{
            borderRadius: 12,
            background: 'rgba(251,248,243,0.88)',
            border: `1px solid ${KT.line}`,
            padding: '8px 10px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: KT.sub,
              fontWeight: 800,
              letterSpacing: 1.1,
              textAlign: 'center',
            }}
          >
            今日排行榜
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3, marginTop: 5 }}>
            {liveBoard.map((entry, index) => (
              <div
                key={`${entry.id}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  fontWeight: 700,
                  color: KT.ink,
                }}
              >
                <span>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {entry.name}
                </span>
                <span style={{ color: KT.crimson }}>
                  {entry.score} · {entry.moves}步 · {formatTime(entry.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{ padding: '0 14px calc(env(safe-area-inset-bottom) + 8px)', textAlign: 'center' }}
      >
        <button
          type="button"
          onClick={initializeCards}
          style={{
            border: 'none',
            background: 'transparent',
            color: KT.ink2,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          重新开始
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div
      style={{
        borderRadius: 10,
        background: KT.bg2,
        padding: '8px 6px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: KT.ink }}>{value}</div>
      <div style={{ fontSize: 9, color: KT.sub }}>{label}</div>
    </div>
  );
}

function HudCard({
  hanja,
  label,
  value,
}: {
  readonly hanja: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: '7px 7px',
        borderRadius: 10,
        background: 'rgba(251,248,243,0.88)',
        border: `1px solid ${KT.line}`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          background: KT.crimson,
          color: KT.card,
          display: 'grid',
          placeItems: 'center',
          fontFamily: KT.serif,
          fontSize: 11,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {hanja}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8, color: KT.sub, fontWeight: 700 }}>{label}</div>
        <div
          style={{
            fontSize: 11,
            color: KT.ink,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function BoosterButton({
  icon,
  label,
  count,
  onClick,
}: {
  readonly icon: string;
  readonly label: string;
  readonly count: number;
  readonly onClick: () => void;
}) {
  const disabled = count <= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `1px solid ${KT.line}`,
        borderRadius: 9,
        background: 'rgba(251,248,243,0.92)',
        minHeight: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        color: disabled ? KT.subLight : KT.ink,
        fontSize: 10,
        fontWeight: 800,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span>{label}</span>
      <span
        style={{
          fontSize: 8,
          background: disabled ? KT.subLight : KT.crimson,
          color: KT.card,
          borderRadius: 7,
          padding: '1px 3px',
          minWidth: 14,
          textAlign: 'center',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function MatchButton({
  card,
  cardState,
  isLocked,
  isHinted,
  onClick,
}: {
  readonly card: MatchCard;
  readonly cardState: CardState;
  readonly isLocked: boolean;
  readonly isHinted: boolean;
  readonly onClick: (cardId: string) => void;
}) {
  const matched = cardState === 'matched';
  const selected = cardState === 'selected';
  const wrong = cardState === 'wrong';

  let background: string = KT.card;
  let color: string = KT.ink;
  let border: string = `1px solid ${KT.line}`;
  let opacity = 1;

  if (matched) {
    background = `${KT.mint}85`;
    color = KT.mintDeep;
    border = `1px solid ${KT.mintDeep}`;
    opacity = 0.62;
  } else if (selected) {
    background = KT.ink;
    color = KT.card;
    border = `1px solid ${KT.ink}`;
  } else if (wrong) {
    background = `${KT.pink}88`;
    color = KT.pinkDeep;
    border = `1px solid ${KT.pinkDeep}`;
  } else if (isHinted) {
    background = `${KT.butter}88`;
    border = `1px solid ${KT.butterDeep}`;
  }

  return (
    <button
      type="button"
      disabled={matched || isLocked}
      onClick={() => onClick(card.id)}
      style={{
        aspectRatio: '1 / 1',
        borderRadius: 12,
        border,
        background,
        color,
        opacity,
        textAlign: 'center',
        cursor: matched || isLocked ? 'default' : 'pointer',
        position: 'relative',
        fontSize: card.type === 'korean' ? 17 : 12,
        fontWeight: card.type === 'korean' ? 800 : 700,
        lineHeight: 1.15,
        padding: '6px 4px',
        boxShadow: KT.shSm,
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}
    >
      {card.content}
      {matched ? (
        <span
          style={{
            position: 'absolute',
            top: 3,
            right: 4,
            fontSize: 10,
            color: KT.mintDeep,
            fontWeight: 800,
          }}
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}
