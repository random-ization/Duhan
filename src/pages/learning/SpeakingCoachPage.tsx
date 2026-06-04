import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  SPEAKING_COACH,
  type RecordAttemptResult,
  type SpeakingSessionDto,
} from '../../utils/convexRefs';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { Button } from '../../components/ui';
import { notify } from '../../utils/notify';
import { Mic, MicOff, RotateCcw, CheckCircle, Volume2, History, BarChart3 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────

type PracticeMode = 'read_aloud' | 'shadowing' | 'pronunciation';

type SpeechState = 'idle' | 'listening' | 'processing' | 'result';

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  0?: SpeechRecognitionResultLike;
};

type SpeechRecognitionResultEventLike = Event & {
  results?: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

const MODE_META: Record<
  PracticeMode,
  {
    seal: string;
    tone: 'sky' | 'mint' | 'pink';
    labelZh: string;
    labelEn: string;
    descZh: string;
    descEn: string;
  }
> = {
  read_aloud: {
    seal: '讀',
    tone: 'sky',
    labelZh: '朗读练习',
    labelEn: 'Read Aloud',
    descZh: '大声朗读韩语句子，AI 评估你的准确度',
    descEn: 'Read Korean sentences aloud and get accuracy feedback',
  },
  shadowing: {
    seal: '影',
    tone: 'mint',
    labelZh: '跟读模仿',
    labelEn: 'Shadowing',
    descZh: '听到发音后立即跟读模仿，训练语感',
    descEn: 'Repeat after the audio to train your intonation',
  },
  pronunciation: {
    seal: '音',
    tone: 'pink',
    labelZh: '发音纠正',
    labelEn: 'Pronunciation',
    descZh: '针对特定发音规则（连音、鼻音化等）专项练习',
    descEn: 'Focused practice on specific phonetic rules',
  },
};

// ── Sample sentences for practice ──────────────────────

const SAMPLE_SENTENCES: { text: string; level: string }[] = [
  { text: '안녕하세요, 만나서 반갑습니다.', level: '1' },
  { text: '오늘 날씨가 정말 좋네요.', level: '1' },
  { text: '한국어를 공부하고 있어요.', level: '2' },
  { text: '주말에 친구들과 같이 영화를 봤어요.', level: '2' },
  { text: '요즘 한국 드라마에 빠져서 매일 보고 있어요.', level: '3' },
  { text: '시간이 있으면 한번 만나서 이야기합시다.', level: '3' },
  { text: '그 문제에 대해서는 좀 더 생각해 봐야 할 것 같습니다.', level: '4' },
  { text: '환경 보호를 위해 우리 모두가 노력해야 한다고 생각합니다.', level: '5' },
];

// ── Web Speech API hook ────────────────────────────────

function useSpeechRecognition() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isSupported = Boolean(getSpeechRecognitionConstructor());

  const startRecognition = useCallback(
    (onResult: (text: string) => void, onError: (err: string) => void) => {
      const SR = getSpeechRecognitionConstructor();
      if (!SR) {
        onError('Speech recognition not supported');
        return;
      }

      const recognition = new SR();
      recognition.lang = 'ko-KR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onresult = (event: SpeechRecognitionResultEventLike) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? '';
        onResult(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        onError(event.error ?? 'unknown');
      };

      recognition.onend = () => {
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    []
  );

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  return { isSupported, startRecognition, stopRecognition };
}

// ── Main Component ─────────────────────────────────────

export default function SpeakingCoachPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const isZh = language === 'zh' || language.startsWith('zh-');

  const { isSupported, startRecognition, stopRecognition } = useSpeechRecognition();

  // State
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('read_aloud');
  const [targetText, setTargetText] = useState('');
  const [customText, setCustomText] = useState('');
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [lastResult, setLastResult] = useState<RecordAttemptResult | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Queries & mutations
  const progressSummary = useQuery(SPEAKING_COACH.getProgressSummary, user ? {} : 'skip');
  const recentSessions = useQuery(
    SPEAKING_COACH.getRecentSessions,
    user && showHistory ? { limit: 10 } : 'skip'
  );
  const createSession = useMutation(SPEAKING_COACH.createSession);
  const recordAttempt = useMutation(SPEAKING_COACH.recordAttempt);
  const completeSession = useMutation(SPEAKING_COACH.completeSession);

  // Pick a random sample sentence
  const pickRandomSentence = useCallback(() => {
    const s = SAMPLE_SENTENCES[Math.floor(Math.random() * SAMPLE_SENTENCES.length)];
    setTargetText(s.text);
    setLastResult(null);
    setSpeechState('idle');
  }, []);

  // Use custom text
  const applyCustomText = useCallback(() => {
    const text = customText.trim();
    if (text.length < 2) {
      notify.info(isZh ? '请输入至少 2 个字符' : 'Enter at least 2 characters');
      return;
    }
    setTargetText(text);
    setLastResult(null);
    setSpeechState('idle');
  }, [customText, isZh]);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (!targetText) {
      notify.info(isZh ? '请先选择或输入练习句子' : 'Select or enter a sentence first');
      return;
    }

    // Create session if none active
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const res = await createSession({
          mode: selectedMode,
          targetText,
          source: 'speaking_page',
        });
        sessionId = res.sessionId;
        setCurrentSessionId(sessionId);
      } catch {
        notify.error(isZh ? '创建练习失败' : 'Failed to start session');
        return;
      }
    }

    setSpeechState('listening');

    startRecognition(
      async recognized => {
        setSpeechState('processing');
        try {
          const result = await recordAttempt({
            sessionId,
            recognizedText: recognized,
          });
          setLastResult(result);
          setSpeechState('result');
        } catch {
          notify.error(isZh ? '评估失败' : 'Scoring failed');
          setSpeechState('idle');
        }
      },
      err => {
        if (err === 'no-speech') {
          notify.info(isZh ? '没有检测到语音，请再试一次' : 'No speech detected, try again');
        } else if (err !== 'aborted') {
          notify.error(isZh ? `语音识别错误: ${err}` : `Speech error: ${err}`);
        }
        setSpeechState('idle');
      }
    );
  }, [
    targetText,
    currentSessionId,
    selectedMode,
    createSession,
    recordAttempt,
    startRecognition,
    isZh,
  ]);

  // Stop recording
  const handleStopRecording = useCallback(() => {
    stopRecognition();
    setSpeechState('idle');
  }, [stopRecognition]);

  // Finish session
  const handleFinishSession = useCallback(async () => {
    if (currentSessionId) {
      try {
        await completeSession({ sessionId: currentSessionId });
        notify.success(isZh ? '练习完成!' : 'Session completed!');
      } catch {
        // ignore
      }
    }
    setCurrentSessionId(null);
    setLastResult(null);
    setTargetText('');
    setSpeechState('idle');
  }, [currentSessionId, completeSession, isZh]);

  // TTS (text-to-speech) for the target sentence
  const handlePlayTTS = useCallback(() => {
    if (!targetText) return;
    const utterance = new SpeechSynthesisUtterance(targetText);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  }, [targetText]);

  // Accuracy color
  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-green-600';
    if (acc >= 70) return 'text-yellow-600';
    return 'text-red-500';
  };

  if (!isSupported) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <DesktopCard className="text-center py-16">
          <MicOff size={48} className="mx-auto text-k-sub/30 mb-4" />
          <h2 className="text-lg font-black text-k-ink mb-2">
            {isZh ? '浏览器不支持语音识别' : 'Speech Recognition Not Supported'}
          </h2>
          <p className="text-sm text-k-sub">
            {isZh
              ? '请使用 Chrome 或 Edge 浏览器以获得语音识别功能'
              : 'Please use Chrome or Edge browser for speech recognition'}
          </p>
        </DesktopCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HanjaSeal c="聲" size={40} bg="var(--color-k-sky-deep)" round={10} />
          <div>
            <h1 className="text-xl font-black text-k-ink">
              {isZh ? '口语练习' : 'Speaking Coach'}
            </h1>
            <p className="text-xs font-bold text-k-sub">
              {isZh ? '朗读 · 跟读 · 发音评测' : 'Read aloud · Shadowing · Pronunciation'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs"
          >
            <History size={14} className="mr-1" />
            {isZh ? '历史' : 'History'}
          </Button>
        </div>
      </div>

      {/* Progress summary */}
      {progressSummary && progressSummary.totalSessions > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: isZh ? '练习次数' : 'Sessions',
              value: progressSummary.totalSessions,
              icon: <BarChart3 size={14} />,
            },
            { label: isZh ? '总时长' : 'Minutes', value: `${progressSummary.totalMinutes}m` },
            {
              label: isZh ? '平均准确率' : 'Avg Accuracy',
              value: `${progressSummary.avgAccuracy}%`,
            },
          ].map((stat, i) => (
            <DesktopCard key={i} className="text-center py-3">
              <div className="text-lg font-black font-k-serif text-k-ink">{stat.value}</div>
              <div className="text-[10px] font-bold text-k-sub mt-0.5">{stat.label}</div>
            </DesktopCard>
          ))}
        </div>
      )}

      {/* Mode selector */}
      <div className="flex gap-2">
        {(Object.keys(MODE_META) as PracticeMode[]).map(mode => {
          const meta = MODE_META[mode];
          const active = selectedMode === mode;
          return (
            <button
              key={mode}
              onClick={() => {
                setSelectedMode(mode);
                handleFinishSession();
              }}
              className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-2xl border-2 transition-all ${
                active
                  ? 'border-k-ink bg-k-ink text-white'
                  : 'border-k-ink/10 bg-white text-k-ink hover:border-k-ink/30'
              }`}
            >
              <HanjaSeal
                c={meta.seal}
                size={24}
                bg={active ? 'white' : `var(--color-k-${meta.tone}-deep)`}
                round={6}
              />
              <div className="text-left">
                <div className="text-[12px] font-black">{isZh ? meta.labelZh : meta.labelEn}</div>
                <div className={`text-[9px] font-bold ${active ? 'text-white/60' : 'text-k-sub'}`}>
                  {isZh ? meta.descZh.slice(0, 15) + '...' : meta.descEn.slice(0, 20) + '...'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Target sentence area */}
      <DesktopCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-k-ink">{isZh ? '练习句子' : 'Target Sentence'}</h3>
          <button
            onClick={pickRandomSentence}
            className="text-[11px] font-bold text-k-crimson hover:underline min-h-[24px] px-1 -mr-1"
          >
            {isZh ? '随机选择' : 'Random'}
          </button>
        </div>

        {targetText ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 text-lg font-bold text-k-ink leading-relaxed">{targetText}</div>
            <button
              onClick={handlePlayTTS}
              className="shrink-0 p-2 rounded-full bg-k-sky/10 text-k-sky hover:bg-k-sky/20 transition-colors"
              title={isZh ? '播放发音' : 'Play pronunciation'}
            >
              <Volume2 size={18} />
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-k-sub mb-3">
              {isZh ? '选择一个句子开始练习' : 'Pick a sentence to start'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SAMPLE_SENTENCES.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTargetText(s.text);
                    setLastResult(null);
                    setSpeechState('idle');
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-full border border-k-line hover:bg-k-bg2 transition-colors text-k-ink"
                >
                  {s.text.slice(0, 15)}...
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder={isZh ? '或输入自定义句子...' : 'Or type your own sentence...'}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-k-line bg-white focus:outline-none focus:border-k-ink transition-colors"
            onKeyDown={e => e.key === 'Enter' && applyCustomText()}
          />
          <Button variant="outline" size="sm" onClick={applyCustomText}>
            {isZh ? '使用' : 'Use'}
          </Button>
        </div>
      </DesktopCard>

      {/* Recording area */}
      {targetText && (
        <DesktopCard className="text-center py-8">
          {speechState === 'idle' && (
            <button
              onClick={handleStartRecording}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-k-crimson text-white shadow-pop-large hover:bg-red-500 active:scale-95 transition-all"
            >
              <Mic size={32} />
            </button>
          )}

          {speechState === 'listening' && (
            <div className="space-y-4">
              <button
                onClick={handleStopRecording}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-k-crimson text-white shadow-pop-large animate-pulse"
              >
                <MicOff size={32} />
              </button>
              <p className="text-sm font-bold text-k-crimson animate-pulse">
                {isZh ? '正在录音...' : 'Listening...'}
              </p>
            </div>
          )}

          {speechState === 'processing' && (
            <div className="space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-k-bg2 flex items-center justify-center">
                <div className="h-8 w-8 border-3 border-k-crimson border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm font-bold text-k-sub">
                {isZh ? '正在评估...' : 'Analyzing...'}
              </p>
            </div>
          )}

          {speechState === 'result' && lastResult && (
            <div className="space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-k-bg2">
                <span
                  className={`text-3xl font-black font-k-serif ${getAccuracyColor(lastResult.accuracy)}`}
                >
                  {lastResult.accuracy}%
                </span>
              </div>

              {/* Syllable feedback */}
              {lastResult.syllableFeedback && lastResult.syllableFeedback.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 max-w-md mx-auto">
                  {lastResult.syllableFeedback.map((sf, i) => (
                    <span
                      key={i}
                      className={`px-1.5 py-0.5 rounded text-sm font-bold ${
                        sf.correct
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600 underline decoration-wavy'
                      }`}
                    >
                      {sf.target}
                    </span>
                  ))}
                </div>
              )}

              {/* Issues */}
              {lastResult.issues && lastResult.issues.length > 0 && (
                <div className="flex justify-center gap-2">
                  {lastResult.issues.map((issue, i) => (
                    <DesignChip key={i} tone="crimson" size="sm">
                      {issue === 'overall_low_accuracy'
                        ? isZh
                          ? '准确率较低'
                          : 'Low accuracy'
                        : issue === 'incomplete_utterance'
                          ? isZh
                            ? '语音不完整'
                            : 'Incomplete'
                          : issue}
                    </DesignChip>
                  ))}
                </div>
              )}

              <div className="flex justify-center gap-3 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSpeechState('idle');
                    setLastResult(null);
                  }}
                >
                  <RotateCcw size={14} className="mr-1" />
                  {isZh ? '再试一次' : 'Try Again'}
                </Button>
                <Button size="sm" onClick={pickRandomSentence}>
                  {isZh ? '下一句' : 'Next'}
                </Button>
              </div>

              <div className="text-[10px] font-bold text-k-sub mt-2">
                {isZh ? '最佳' : 'Best'}: {lastResult.bestAccuracy}% · {isZh ? '第' : '#'}
                {lastResult.attemptCount}
                {isZh ? '次尝试' : ' attempt'}
              </div>
            </div>
          )}

          {speechState === 'idle' && (
            <p className="text-xs font-bold text-k-sub mt-4">
              {isZh ? '点击麦克风开始朗读' : 'Tap the mic to start reading'}
            </p>
          )}
        </DesktopCard>
      )}

      {/* Session controls */}
      {currentSessionId && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleFinishSession}>
            <CheckCircle size={14} className="mr-1" />
            {isZh ? '结束本次练习' : 'End Session'}
          </Button>
        </div>
      )}

      {/* History */}
      {showHistory && recentSessions && recentSessions.length > 0 && (
        <DesktopCard>
          <h3 className="text-sm font-black text-k-ink mb-3">
            {isZh ? '练习历史' : 'Recent Sessions'}
          </h3>
          <div className="space-y-2">
            {recentSessions.map((session: SpeakingSessionDto) => {
              const meta = MODE_META[session.mode as PracticeMode] ?? MODE_META.read_aloud;
              return (
                <div key={session._id} className="flex items-center gap-3 p-3 rounded-xl bg-k-bg2">
                  <HanjaSeal
                    c={meta.seal}
                    size={28}
                    bg={`var(--color-k-${meta.tone}-deep)`}
                    round={7}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-extrabold text-k-ink truncate">
                      {session.targetText.slice(0, 30)}
                      {session.targetText.length > 30 ? '...' : ''}
                    </div>
                    <div className="text-[10px] font-bold text-k-sub">
                      {session.attemptCount}
                      {isZh ? '次尝试' : ' attempts'} ·{' '}
                      {session.bestAccuracy != null ? `${session.bestAccuracy}%` : '-'}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-k-sub">
                    {new Date(session.createdAt).toLocaleDateString(
                      language === 'zh' ? 'zh-CN' : 'en-US',
                      { month: 'short', day: 'numeric' }
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DesktopCard>
      )}
    </div>
  );
}
