import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAction, useMutation, useQuery } from 'convex/react'; // Added hooks
import {
  ArrowLeft,
  Play,
  Pause,
  Repeat,
  Sparkles,
  X,
  BookOpen,
  MessageSquare,
  Lightbulb,
  SkipBack,
  SkipForward,
  Languages,
  Volume2,
  Heart,
  Share2,
  ListMusic,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui';
import { Switch } from '../components/ui';
import { Badge } from '../components/ui';
import { Card } from '../components/ui';
import { Slider } from '../components/ui';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../components/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui';
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from '../components/ui';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../components/ui';
import { NoArgs, aRef, mRef, qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { logger } from '../utils/logger';
import { notify } from '../utils/notify';
import { useFileUpload } from '../hooks/useFileUpload';
import { useAuth } from '../contexts/AuthContext';
import { getLanguageLabel } from '../utils/languageUtils';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';

// Types
interface TranscriptLine {
  start: number;
  end: number;
  text: string;
  translation: string;
  words?: { word: string; start: number; end: number }[];
}

interface AnalysisData {
  vocabulary: { word: string; root: string; meaning: string; type: string }[];
  grammar: { structure: string; explanation: string }[];
  nuance: string;
  cached?: boolean;
}

type UiLang = 'en' | 'zh' | 'vi' | 'mn';

type UiCopy = {
  mockTranslations: [string, string, string, string, string];
  readAudioFailed: string;
  missingAudioLink: string;
  audioLinkTooLong: string;
  transcriptTimeout: string;
  audioLinkTooLarge: string;
  failedPrefix: string;
  transcriptUnavailable: string;
  resetFailed: string;
  noTranslation: string;
  translationSubtitle: string;
  showTranslationTemplate: string;
  generating: string;
  regenerateSubtitle: string;
  regenerateTitle: string;
  regenerateDescription: string;
  cancel: string;
  processing: string;
  confirmRegenerate: string;
  saved: string;
  saveEpisode: string;
  share: string;
  autoScrollOn: string;
  autoScrollOff: string;
  generatingSmartSubtitle: string;
  firstGenerationHint: string;
  cannotLoadSubtitle: string;
  retry: string;
  noSubtitleContent: string;
  playlist: string;
  noOtherEpisodes: string;
};

const UI_COPY: Record<UiLang, UiCopy> = {
  en: {
    mockTranslations: [
      'Hello everyone, shall we start learning Korean today as well?',
      'Consistency is the most important thing.',
      'This sentence is a bit fast, so please listen again.',
      'Today we will learn expressions commonly used in daily conversations.',
      "For example, there is an expression like 'How have you been lately?'",
    ],
    readAudioFailed: 'Failed to read audio',
    missingAudioLink: 'Missing audio URL',
    audioLinkTooLong: 'Audio URL is too long to submit a transcription request',
    transcriptTimeout: 'Subtitle generation timed out. Please try again later.',
    audioLinkTooLarge:
      'Audio URL is too large and the transcription request was blocked. Please upload audio first and try again.',
    failedPrefix: 'Failed',
    transcriptUnavailable: 'Subtitles are unavailable',
    resetFailed: 'Reset failed. Please try again later.',
    noTranslation: 'No translation yet',
    translationSubtitle: 'Translated subtitles',
    showTranslationTemplate: 'Show {{language}} translation',
    generating: 'Generating...',
    regenerateSubtitle: 'Regenerate subtitles (fix formatting)',
    regenerateTitle: 'Regenerate subtitles?',
    regenerateDescription:
      'Regenerating subtitles may take 1-2 minutes. The current subtitle cache will be cleared and requested again. Continue?',
    cancel: 'Cancel',
    processing: 'Processing...',
    confirmRegenerate: 'Confirm regenerate',
    saved: 'Saved',
    saveEpisode: 'Save this episode',
    share: 'Share',
    autoScrollOn: 'Auto-scroll: On',
    autoScrollOff: 'Auto-scroll: Off',
    generatingSmartSubtitle: 'AI is generating smart subtitles...',
    firstGenerationHint: 'First generation may take about 1 minute',
    cannotLoadSubtitle: 'Unable to load subtitles',
    retry: 'Retry',
    noSubtitleContent: 'No subtitle content',
    playlist: 'Playlist',
    noOtherEpisodes: 'No other episodes',
  },
  zh: {
    mockTranslations: [
      '\u5927\u5bb6\u597d\uff0c\u4eca\u5929\u4e5f\u5f00\u59cb\u5b66\u4e60\u97e9\u8bed\u5417\uff1f',
      '\u575a\u6301\u662f\u6700\u91cd\u8981\u7684\u3002',
      '\u8fd9\u53e5\u8bdd\u6709\u70b9\u5feb\uff0c\u8bf7\u518d\u542c\u4e00\u904d\u3002',
      '\u4eca\u5929\u6211\u4eec\u6765\u5b66\u4e60\u65e5\u5e38\u5bf9\u8bdd\u4e2d\u5e38\u7528\u7684\u8868\u8fbe\u3002',
      "\u6bd4\u5982\uff0c\u6709'\u60a8\u6700\u8fd1\u600e\u4e48\u6837\uff1f'\u8fd9\u6837\u7684\u8868\u8fbe\u3002",
    ],
    readAudioFailed: '\u8bfb\u53d6\u97f3\u9891\u5931\u8d25',
    missingAudioLink: '\u7f3a\u5c11\u97f3\u9891\u94fe\u63a5',
    audioLinkTooLong: '\u97f3\u9891\u94fe\u63a5\u8fc7\u957f\uff0c\u65e0\u6cd5\u63d0\u4ea4\u8f6c\u5199\u8bf7\u6c42',
    transcriptTimeout: '\u5b57\u5e55\u751f\u6210\u8d85\u65f6\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
    audioLinkTooLarge:
      '\u97f3\u9891\u94fe\u63a5\u8fc7\u5927\uff0c\u8f6c\u5199\u8bf7\u6c42\u88ab\u62e6\u622a\uff0c\u8bf7\u5148\u4e0a\u4f20\u97f3\u9891\u540e\u518d\u8bd5',
    failedPrefix: '\u5931\u8d25',
    transcriptUnavailable: '\u5b57\u5e55\u4e0d\u53ef\u7528',
    resetFailed: '\u91cd\u7f6e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
    noTranslation: '\u6682\u65e0\u7ffb\u8bd1',
    translationSubtitle: '\u7ffb\u8bd1\u5b57\u5e55',
    showTranslationTemplate: '\u663e\u793a{{language}}\u7ffb\u8bd1',
    generating: '\u751f\u6210\u4e2d...',
    regenerateSubtitle: '\u91cd\u65b0\u751f\u6210\u5b57\u5e55 (\u4fee\u6b63\u6392\u7248)',
    regenerateTitle: '\u91cd\u65b0\u751f\u6210\u5b57\u5e55\uff1f',
    regenerateDescription:
      '\u91cd\u65b0\u751f\u6210\u5b57\u5e55\u53ef\u80fd\u9700\u8981 1-2 \u5206\u949f\uff0c\u5f53\u524d\u5b57\u5e55\u7f13\u5b58\u4f1a\u88ab\u6e05\u7a7a\u5e76\u91cd\u65b0\u8bf7\u6c42\u3002\u786e\u5b9a\u7ee7\u7eed\u5417\uff1f',
    cancel: '\u53d6\u6d88',
    processing: '\u5904\u7406\u4e2d...',
    confirmRegenerate: '\u786e\u8ba4\u91cd\u751f\u6210',
    saved: '\u5df2\u6536\u85cf',
    saveEpisode: '\u6536\u85cf\u6b64\u96c6',
    share: '\u5206\u4eab',
    autoScrollOn: '\u81ea\u52a8\u6eda\u52a8: \u5f00',
    autoScrollOff: '\u81ea\u52a8\u6eda\u52a8: \u5173',
    generatingSmartSubtitle: 'AI \u6b63\u5728\u751f\u6210\u667a\u80fd\u5b57\u5e55...',
    firstGenerationHint: '\u9996\u6b21\u751f\u6210\u7ea6\u9700 1 \u5206\u949f',
    cannotLoadSubtitle: '\u65e0\u6cd5\u52a0\u8f7d\u5b57\u5e55',
    retry: '\u91cd\u8bd5',
    noSubtitleContent: '\u6682\u65e0\u5b57\u5e55\u5185\u5bb9',
    playlist: '\u64ad\u653e\u5217\u8868',
    noOtherEpisodes: '\u6682\u65e0\u5176\u4ed6\u5267\u96c6',
  },
  vi: {
    mockTranslations: [
      'Xin chao moi nguoi, hom nay minh tiep tuc hoc tieng Han nhe?',
      'Su kien tri la dieu quan trong nhat.',
      'Cau nay hoi nhanh, ban hay nghe lai mot lan nua.',
      'Hom nay chung ta hoc nhung mau cau thuong dung trong hoi thoai hang ngay.',
      "Vi du, co mau cau nhu 'Dao nay ban the nao?'",
    ],
    readAudioFailed: 'Khong the doc tep am thanh',
    missingAudioLink: 'Thieu lien ket am thanh',
    audioLinkTooLong: 'Lien ket am thanh qua dai, khong the gui yeu cau chuyen am',
    transcriptTimeout: 'Tao phu de da het thoi gian. Vui long thu lai sau.',
    audioLinkTooLarge:
      'Lien ket am thanh qua lon va yeu cau chuyen am bi chan. Hay tai len tep am thanh truoc roi thu lai.',
    failedPrefix: 'That bai',
    transcriptUnavailable: 'Khong co san phu de',
    resetFailed: 'Dat lai that bai. Vui long thu lai sau.',
    noTranslation: 'Chua co ban dich',
    translationSubtitle: 'Phu de dich',
    showTranslationTemplate: 'Hien ban dich {{language}}',
    generating: 'Dang tao...',
    regenerateSubtitle: 'Tao lai phu de (sua dinh dang)',
    regenerateTitle: 'Tao lai phu de?',
    regenerateDescription:
      'Tao lai phu de co the mat 1-2 phut. Bo nho dem phu de hien tai se duoc xoa va yeu cau lai. Ban co muon tiep tuc khong?',
    cancel: 'Huy',
    processing: 'Dang xu ly...',
    confirmRegenerate: 'Xac nhan tao lai',
    saved: 'Da luu',
    saveEpisode: 'Luu tap nay',
    share: 'Chia se',
    autoScrollOn: 'Tu dong cuon: Bat',
    autoScrollOff: 'Tu dong cuon: Tat',
    generatingSmartSubtitle: 'AI dang tao phu de thong minh...',
    firstGenerationHint: 'Lan tao dau tien mat khoang 1 phut',
    cannotLoadSubtitle: 'Khong the tai phu de',
    retry: 'Thu lai',
    noSubtitleContent: 'Chua co noi dung phu de',
    playlist: 'Danh sach phat',
    noOtherEpisodes: 'Khong co tap nao khac',
  },
  mn: {
    mockTranslations: [
      'Сайн байцгаана уу, өнөөдөр ч солонгос хэлээ эхлэх үү?',
      'Тууштай байх нь хамгийн чухал.',
      'Энэ өгүүлбэр арай хурдан тул дахин сонсоорой.',
      'Өнөөдөр бид өдөр тутмын ярианд түгээмэл хэрэглэдэг хэллэгүүдийг сурна.',
      "Жишээлбэл, 'Сүүлийн үед сайн уу?' гэх мэт хэллэг бий.",
    ],
    readAudioFailed: 'Аудио уншиж чадсангүй',
    missingAudioLink: 'Аудио холбоос алга',
    audioLinkTooLong: 'Аудио холбоос хэт урт тул хөрвүүлэх хүсэлт илгээж чадсангүй',
    transcriptTimeout: 'Хадмал үүсгэх хугацаа дууслаа. Дараа дахин оролдоно уу.',
    audioLinkTooLarge:
      'Аудио холбоос хэт том тул хөрвүүлэх хүсэлт хаагдлаа. Эхлээд аудиогоо байршуулж дахин оролдоно уу.',
    failedPrefix: 'Амжилтгүй',
    transcriptUnavailable: 'Хадмал боломжгүй',
    resetFailed: 'Сэргээж чадсангүй. Дараа дахин оролдоно уу.',
    noTranslation: 'Орчуулга алга',
    translationSubtitle: 'Орчуулгын хадмал',
    showTranslationTemplate: '{{language}} орчуулгыг харуулах',
    generating: 'Үүсгэж байна...',
    regenerateSubtitle: 'Хадмалыг дахин үүсгэх (формат засах)',
    regenerateTitle: 'Хадмалыг дахин үүсгэх үү?',
    regenerateDescription:
      'Хадмалыг дахин үүсгэхэд 1-2 минут шаардагдаж магадгүй. Одоогийн хадмал кэшийг цэвэрлээд дахин хүсэлт илгээнэ. Үргэлжлүүлэх үү?',
    cancel: 'Цуцлах',
    processing: 'Боловсруулж байна...',
    confirmRegenerate: 'Дахин үүсгэхийг батлах',
    saved: 'Хадгалсан',
    saveEpisode: 'Энэ дугаарыг хадгалах',
    share: 'Хуваалцах',
    autoScrollOn: 'Автоматаар гүйлгэх: Асаалттай',
    autoScrollOff: 'Автоматаар гүйлгэх: Унтраалттай',
    generatingSmartSubtitle: 'AI ухаалаг хадмал үүсгэж байна...',
    firstGenerationHint: 'Эхний үүсгэлт ойролцоогоор 1 минут',
    cannotLoadSubtitle: 'Хадмал ачаалж чадсангүй',
    retry: 'Дахин оролдох',
    noSubtitleContent: 'Хадмалын агуулга алга',
    playlist: 'Тоглуулах жагсаалт',
    noOtherEpisodes: 'Өөр дугаар алга',
  },
};

const AnalysisContent: React.FC<{
  loading: boolean;
  data: AnalysisData | null;
}> = ({ loading, data }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
        <Sparkles className="w-8 h-8 animate-spin text-indigo-400 dark:text-indigo-300" />
        <p className="text-sm">Analyzing context & grammar...</p>
      </div>
    );
  }

  if (data) {
    return (
      <>
        {/* Vocab Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold border-b border-border pb-2">
            <BookOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            Core Vocabulary
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.vocabulary.map((v, i) => (
              <div
                key={`${v.word}-${v.root}-${i}`}
                className="p-3 rounded-xl border border-border bg-muted hover:border-indigo-200 dark:hover:border-indigo-400/40 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-foreground">{v.word}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-card border border-border rounded text-muted-foreground">
                    {v.type}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-0.5">Root: {v.root}</div>
                <div className="text-sm text-muted-foreground">{v.meaning}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Grammar */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold border-b border-border pb-2">
            <MessageSquare className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />
            Grammar Points
          </div>
          <div className="space-y-3">
            {data.grammar.map((g, i) => (
              <div
                key={`${g.structure}-${i}`}
                className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-400/30"
              >
                <div className="font-bold text-emerald-800 dark:text-emerald-200 mb-1">
                  {g.structure}
                </div>
                <div className="text-sm text-emerald-900/80 dark:text-emerald-100/90 leading-relaxed">
                  {g.explanation}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Nuance */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold border-b border-border pb-2">
            <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-300" />
            Cultural Nuance
          </div>
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-400/30 text-sm text-amber-900/80 dark:text-amber-100/90 leading-relaxed italic">
            &quot;{data.nuance}&quot;
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="text-center py-12 text-muted-foreground">
      Analysis failed. Please try again.
    </div>
  );
};

interface PodcastEpisode {
  id?: string;
  guid?: string;
  title: string;
  audioUrl: string;
  image?: string;
  itunes?: { image?: string; duration?: string };
  channelTitle?: string;
  channelArtwork?: string;
  pubDate?: string;
  duration?: number | string;
  description?: string;
}

// CDN Domain for transcript cache
const CDN_DOMAIN = import.meta.env.VITE_CDN_URL ?? '';
const MAX_SAFE_URL_LENGTH = 8000;

// Mock transcript for fallback
const MOCK_TRANSCRIPT_BASE: Omit<TranscriptLine, 'translation'>[] = [
  {
    start: 0,
    end: 4.5,
    text: '안녕하세요, 여러분. 오늘도 한국어 공부 시작해볼까요?',
  },
  {
    start: 4.5,
    end: 8.2,
    text: '꾸준히 하는 것이 가장 중요합니다.',
  },
  {
    start: 8.2,
    end: 12,
    text: '이 문장은 조금 빠르니까 다시 들어보세요.',
  },
  {
    start: 12,
    end: 16.5,
    text: '오늘은 일상 대화에서 많이 쓰는 표현을 배워볼 거예요.',
  },
  {
    start: 16.5,
    end: 21,
    text: "예를 들어, '어떻게 지내세요?'라는 표현이 있어요.",
  },
];

const PodcastPlayerPage: React.FC = () => {
  const { state } = useLocation();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const { language, user } = useAuth();
  const uiLang: UiLang = language;
  const copy = UI_COPY[uiLang];
  const translationLabel = useMemo(() => getLanguageLabel(language), [language]);
  const mockTranscript = useMemo(
    () =>
      MOCK_TRANSCRIPT_BASE.map((line, idx) => ({
        ...line,
        translation: copy.mockTranslations[idx] || '',
      })),
    [copy.mockTranslations]
  );

  const getEpisodeFromUrl = useCallback(() => {
    // Try to reconstruct from URL params
    const audioUrl = searchParams.get('audioUrl');
    const title = searchParams.get('title');
    const guid = searchParams.get('guid');

    if (audioUrl) {
      return {
        guid: guid || '',
        title: title || 'Unknown Episode',
        audioUrl: decodeURIComponent(audioUrl),
        channelTitle: searchParams.get('channelTitle') || 'Unknown Channel',
        channelArtwork: searchParams.get('channelArtwork') || '',
      };
    }

    return {
      title: '',
      audioUrl: '',
      channelTitle: '',
      channelArtwork: '',
      guid: '',
    };
  }, [searchParams]);

  // 🔥 FIX: Support URL params for page refresh
  // Priority: state > URL params > fallback
  const episode: PodcastEpisode = useMemo(() => {
    if (state?.episode?.audioUrl) return state.episode;
    return getEpisodeFromUrl();
  }, [state, getEpisodeFromUrl]);

  type PodcastChannel = {
    itunesId?: string;
    id?: string;
    title?: string;
    author?: string;
    feedUrl?: string;
    artworkUrl?: string;
    artwork?: string;
    image?: string;
  };
  const channel: PodcastChannel =
    (state as { channel?: PodcastChannel } | null)?.channel ??
    (state as { episode?: { channel?: PodcastChannel } } | null)?.episode?.channel ??
    {};

  useEffect(() => {
    if (!episode.audioUrl) {
      navigate('/podcasts', { replace: true });
    }
  }, [episode, navigate]);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Learning Features State
  const [showTranslation, setShowTranslation] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null; active: boolean }>({
    a: null,
    b: null,
    active: false,
  });

  // Transcript State
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [showTranscriptResetConfirm, setShowTranscriptResetConfirm] = useState(false);

  // AI Analysis State
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analyzingLine, setAnalyzingLine] = useState<TranscriptLine | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const showTranscriptLoader = transcriptLoading && transcript.length === 0;

  // Playlist State
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlist, setPlaylist] = useState<PodcastEpisode[]>([]);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const resumeCheckedRef = useRef<string | null>(null); // Track resume check to prevent override
  const transcriptLoadKeyRef = useRef<string | null>(null);
  const transcriptLoadedKeyRef = useRef<string | null>(null);

  // Convex Hooks
  const requestTranscript = useAction(
    aRef<
      {
        audioUrl: string;
        episodeId: string;
        language: string;
        storageId?: string;
        storageIds?: string[];
      },
      { success: boolean; requestId?: string; error?: string }
    >('ai:requestTranscript')
  );
  const getTranscript = useAction(
    aRef<{ episodeId: string; language?: string }, { segments?: TranscriptLine[] | null }>(
      'ai:getTranscript'
    )
  );

  type PlaylistEpisode = Omit<PodcastEpisode, 'audioUrl'> & { audioUrl?: string };
  const getEpisodes = useAction(
    aRef<{ feedUrl: string }, { episodes: PlaylistEpisode[] }>('podcastActions:getEpisodes')
  );
  const deleteTranscript = useAction(aRef<{ episodeId: string }, unknown>('ai:deleteTranscript'));

  type TrackViewArgs = {
    guid: string;
    title: string;
    audioUrl: string;
    duration: number;
    pubDate: number;
    channel: {
      itunesId?: string;
      title: string;
      author?: string;
      feedUrl?: string;
      artworkUrl?: string;
    };
  };
  const trackView = useMutation(mRef<TrackViewArgs, unknown>('podcasts:trackView'));
  type RecordHistoryArgs = {
    episodeGuid: string;
    episodeTitle: string;
    episodeUrl: string;
    channelName: string;
    channelImage?: string;
    progress: number;
    duration?: number;
    episodeId?: string;
  };
  const recordHistory = useMutation(mRef<RecordHistoryArgs, unknown>('podcasts:recordHistory'));
  type HistoryRecord = {
    episodeGuid: string;
    episodeTitle: string;
    channelName: string;
    progress: number;
    duration?: number;
  };
  const historyData = useQuery(qRef<NoArgs, HistoryRecord[]>('podcasts:getHistory'));
  const history = useMemo(() => historyData ?? [], [historyData]);
  type SubscriptionChannel = {
    _id?: string;
    id?: string;
    itunesId?: string;
    title?: string;
    author?: string;
    feedUrl?: string;
    artworkUrl?: string;
  };
  const subscriptionsData = useQuery(
    qRef<NoArgs, SubscriptionChannel[]>('podcasts:getSubscriptions')
  );
  const subscriptions = useMemo(() => subscriptionsData ?? [], [subscriptionsData]);
  const toggleSubscription = useMutation(
    mRef<
      {
        channel: {
          itunesId?: string;
          title: string;
          author: string;
          feedUrl: string;
          artworkUrl?: string;
        };
      },
      { success: boolean; isSubscribed: boolean }
    >('podcasts:toggleSubscription')
  );
  const [subscriptionPending, setSubscriptionPending] = useState(false);
  const { uploadFile } = useFileUpload();

  // --- Helpers ---
  const formatTime = (seconds: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const getEpisodeId = useCallback(() => {
    if (episode.guid) return encodeURIComponent(episode.guid);
    let hash = 0;
    const str = `${episode.title}-${episode.audioUrl}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.codePointAt(i)!;
      hash = Math.trunc(hash);
    }
    return `ep_${Math.abs(hash).toString(16)}`;
  }, [episode.guid, episode.title, episode.audioUrl]);
  const getEpisodeKey = useCallback(() => {
    if (episode.guid) return episode.guid;
    let hash = 0;
    const str = `${episode.title}-${episode.audioUrl}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.codePointAt(i)!;
      hash = Math.trunc(hash);
    }
    return `ep_${Math.abs(hash).toString(16)}`;
  }, [episode.guid, episode.title, episode.audioUrl]);
  const episodeKey = useMemo(() => getEpisodeKey(), [getEpisodeKey]);
  const historyBase = useMemo(
    () => ({
      episodeGuid: episodeKey,
      episodeTitle: episode.title || 'Unknown Episode',
      episodeUrl: episode.audioUrl || '',
      channelName: channel.title || episode.channelTitle || 'Unknown Channel',
      channelImage:
        channel.artworkUrl ||
        channel.artwork ||
        channel.image ||
        episode.channelArtwork ||
        undefined,
    }),
    [
      episodeKey,
      episode.title,
      episode.audioUrl,
      channel.title,
      channel.artworkUrl,
      channel.artwork,
      channel.image,
      episode.channelTitle,
      episode.channelArtwork,
    ]
  );

  const loadTranscriptFromS3 = async (episodeId: string) => {
    if (!CDN_DOMAIN) return null;
    try {
      const s3Url = `${CDN_DOMAIN}/transcripts/${episodeId}.json`;
      const s3Res = await fetch(s3Url);
      if (s3Res.ok) {
        const data = await s3Res.json();
        return data.segments || data;
      }
    } catch {
      /* Fallback to API */
    }
    return null;
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const retryLoadTranscriptFromS3 = useCallback(async (episodeId: string) => {
    if (!CDN_DOMAIN) return null;
    const delays = [4000, 6000, 8000];
    for (const delay of delays) {
      await wait(delay);
      const data = await loadTranscriptFromS3(episodeId);
      if (data && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
    return null;
  }, []);

  const waitForTranscriptFromS3 = useCallback(async (episodeId: string) => {
    if (!CDN_DOMAIN) return null;
    const delays = [5000, 5000, 10000, 10000, 15000, 15000, 20000];
    for (const delay of delays) {
      await wait(delay);
      const data = await loadTranscriptFromS3(episodeId);
      if (data && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
    return null;
  }, []);

  const inferAudioExtension = (contentType: string) => {
    if (contentType.includes('wav')) return 'wav';
    if (contentType.includes('ogg')) return 'ogg';
    if (contentType.includes('webm')) return 'webm';
    if (contentType.includes('m4a')) return 'm4a';
    if (contentType.includes('mp4')) return 'mp4';
    return 'mp3';
  };

  const resolveTranscriptAudioUrl = useCallback(
    async (rawUrl: string, episodeId: string) => {
      if (!rawUrl) return '';

      const cacheKey = `transcript_audio_url_${episodeId}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return cached;
      } catch {
        /* ignore cache errors */
      }

      const isHttp = /^https?:\/\//i.test(rawUrl);
      const isBlob = rawUrl.startsWith('blob:');
      const isData = rawUrl.startsWith('data:');
      const looksLikeBase64 = !isHttp && !isBlob && !isData && rawUrl.length > 10000;
      const urlTooLong = rawUrl.length > MAX_SAFE_URL_LENGTH;
      const shouldUpload = isBlob || isData || looksLikeBase64 || urlTooLong;

      if (!shouldUpload) {
        return rawUrl;
      }

      let blob: Blob;
      if (isBlob || isData) {
        const res = await fetch(rawUrl);
        if (!res.ok) {
          throw new Error(copy.readAudioFailed);
        }
        blob = await res.blob();
      } else {
        // Raw base64 fallback
        const binary = atob(rawUrl);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'audio/mpeg' });
      }

      const ext = inferAudioExtension(blob.type || 'audio/mpeg');
      const file = new File([blob], `${episodeId}.${ext}`, {
        type: blob.type || 'audio/mpeg',
      });

      const { url } = await uploadFile(file, 'podcasts');

      try {
        localStorage.setItem(cacheKey, url);
      } catch {
        /* ignore cache errors */
      }

      return url;
    },
    [copy.readAudioFailed, uploadFile]
  );

  // 2. Transcript Loading Logic
  // V4: Deepgram URL Strategy (Simple)
  const loadTranscriptChunked = useCallback(
    async (force = false) => {
      console.log('[Transcript] V4: Starting Deepgram URL Strategy');
      if (!episode.audioUrl) {
        setTranscript([]);
        setTranscriptLoading(false);
        setTranscriptError(copy.missingAudioLink);
        return;
      }

      const episodeId = getEpisodeId();
      const targetLanguage = language;
      const loadKey = `${episodeId}:${targetLanguage}`;

      const getTranscriptCacheKey = (id: string, lang: string) => `transcript_${id}_${lang}`;

      const loadTranscriptFromLocal = (id: string, lang: string) => {
        const localCacheKey = getTranscriptCacheKey(id, lang);
        try {
          const cachedData = localStorage.getItem(localCacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            if (parsed.language && parsed.language !== lang) {
              return null;
            }
            if (parsed.segments && parsed.segments.length > 0) {
              const hasTranslation = parsed.segments.some(
                (seg: TranscriptLine) =>
                  typeof seg.translation === 'string' && seg.translation.trim().length > 0
              );
              if (!hasTranslation && lang) {
                return null;
              }
              console.log('[Transcript] Loaded from localStorage (instant)');
              return parsed.segments;
            }
          }
        } catch {
          /* localStorage error */
        }
        return null;
      };

      const saveTranscriptToLocal = (id: string, lang: string, segments: TranscriptLine[]) => {
        if (!segments || segments.length === 0) return;
        const localCacheKey = getTranscriptCacheKey(id, lang);
        try {
          localStorage.setItem(
            localCacheKey,
            JSON.stringify({
              segments,
              language: lang,
              cachedAt: Date.now(),
            })
          );
        } catch (storageError) {
          logger.warn('Failed to cache transcript locally', storageError);
        }
      };

      if (!force) {
        if (transcriptLoadKeyRef.current === loadKey) {
          return;
        }
        if (transcriptLoadedKeyRef.current === loadKey) {
          return;
        }
      }

      transcriptLoadKeyRef.current = loadKey;
      setTranscriptLoading(true);
      setTranscriptError(null);

      const shouldMarkLoaded = (segments: TranscriptLine[]) => {
        if (!targetLanguage) return true;
        return segments.some(
          seg => typeof seg.translation === 'string' && seg.translation.trim().length > 0
        );
      };

      // Step 0: Check localStorage
      const localData = loadTranscriptFromLocal(episodeId, targetLanguage);
      if (localData) {
        setTranscript(localData);
        setTranscriptLoading(false);
        if (shouldMarkLoaded(localData)) {
          transcriptLoadedKeyRef.current = loadKey;
        }
        transcriptLoadKeyRef.current = null;
        return;
      }

      try {
        // Step 1: S3 Cache
        let prefilledFromS3 = false;
        if (CDN_DOMAIN) {
          try {
            const s3Url = `${CDN_DOMAIN}/transcripts/${episodeId}.json`;
            const s3Res = await fetch(s3Url);
            if (s3Res.ok) {
              const data = await s3Res.json();
              const segments = data.segments || data;
              setTranscript(segments);
              setTranscriptLoading(false);
              prefilledFromS3 = true;
              if (shouldMarkLoaded(segments)) {
                transcriptLoadedKeyRef.current = loadKey;
              }
            }
          } catch {
            /* Ignore S3 error */
          }
        }

        // Step 1.5: Convex DB fallback (if CDN missing)
        const dbResult = await getTranscript({ episodeId, language: targetLanguage });
        if (dbResult?.segments && dbResult.segments.length > 0) {
          setTranscript(dbResult.segments);
          saveTranscriptToLocal(episodeId, targetLanguage, dbResult.segments);
          setTranscriptLoading(false);
          if (shouldMarkLoaded(dbResult.segments)) {
            transcriptLoadedKeyRef.current = loadKey;
          }
          return;
        }

        // Step 2: Generate (Direct Deepgram URL)
        setIsGeneratingTranscript(true);

        const transcriptAudioUrl = await resolveTranscriptAudioUrl(episode.audioUrl, episodeId);
        if (!transcriptAudioUrl) {
          throw new Error(copy.missingAudioLink);
        }
        if (transcriptAudioUrl.length > MAX_SAFE_URL_LENGTH) {
          throw new Error(copy.audioLinkTooLong);
        }

        const kickoff = await requestTranscript({
          audioUrl: transcriptAudioUrl,
          episodeId,
          language: targetLanguage,
        });

        if (!kickoff?.success) {
          const errorMsg = kickoff?.error || 'Failed to start transcription';
          throw new Error(errorMsg);
        }

        const s3Ready = await waitForTranscriptFromS3(episodeId);
        if (s3Ready && !prefilledFromS3) {
          setTranscript(s3Ready);
          setTranscriptLoading(false);
          prefilledFromS3 = true;
          if (shouldMarkLoaded(s3Ready)) {
            transcriptLoadedKeyRef.current = loadKey;
          }
        }

        const dbFallback = await getTranscript({ episodeId, language: targetLanguage });
        if (dbFallback?.segments && dbFallback.segments.length > 0) {
          setTranscript(dbFallback.segments);
          saveTranscriptToLocal(episodeId, targetLanguage, dbFallback.segments);
          if (shouldMarkLoaded(dbFallback.segments)) {
            transcriptLoadedKeyRef.current = loadKey;
          }
        } else if (!s3Ready) {
          throw new Error(copy.transcriptTimeout);
        }
      } catch (err) {
        console.error('Transcript failed:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (
          typeof message === 'string' &&
          message.includes('Connection lost while action was in flight')
        ) {
          const s3Fallback = await retryLoadTranscriptFromS3(episodeId);
          if (s3Fallback) {
            setTranscript(s3Fallback);
            saveTranscriptToLocal(episodeId, targetLanguage, s3Fallback);
            setTranscriptLoading(false);
            setIsGeneratingTranscript(false);
            transcriptLoadedKeyRef.current = loadKey;
            transcriptLoadKeyRef.current = null;
            return;
          }
        }
        if (typeof message === 'string' && message.includes('Maximum content size')) {
          setTranscript([]);
          setTranscriptError(copy.audioLinkTooLarge);
          setTranscriptLoading(false);
          setIsGeneratingTranscript(false);
          return;
        }
        if (import.meta.env.DEV) {
          setTranscript(mockTranscript);
          setTranscriptError(`${copy.failedPrefix}: ${message}`);
        } else {
          setTranscript([]);
          setTranscriptError(copy.transcriptUnavailable);
        }
      } finally {
        setTranscriptLoading(false);
        setIsGeneratingTranscript(false);
        transcriptLoadKeyRef.current = null;
      }
    },
    [
      copy.audioLinkTooLarge,
      copy.audioLinkTooLong,
      copy.failedPrefix,
      copy.missingAudioLink,
      copy.transcriptTimeout,
      copy.transcriptUnavailable,
      episode.audioUrl,
      requestTranscript,
      getTranscript,
      getEpisodeId,
      mockTranscript,
      resolveTranscriptAudioUrl,
      retryLoadTranscriptFromS3,
      waitForTranscriptFromS3,
      language,
    ]
  );

  // --- Effects ---

  // 0. Transcript Load (also refresh on language change)
  useEffect(() => {
    if (episode.audioUrl) {
      loadTranscriptChunked();
    }
  }, [episode.audioUrl, language, loadTranscriptChunked]);

  // 1. Initial Load & Analytics & Playlist
  useEffect(() => {
    let isMounted = true;

    // Load Playlist (Episodes from same channel)
    if (channel.feedUrl) {
      const fetchPlaylist = async () => {
        try {
          const data = await getEpisodes({ feedUrl: channel.feedUrl! });
          if (isMounted && data?.episodes) {
            const episodes: PodcastEpisode[] = data.episodes
              .filter(
                (e): e is PlaylistEpisode & { audioUrl: string } =>
                  typeof e.audioUrl === 'string' && e.audioUrl.length > 0
              )
              .map(e => ({ ...e, audioUrl: e.audioUrl }));
            setPlaylist(episodes);
          }
        } catch (e) {
          console.error('Failed to load playlist', e);
        }
      };
      fetchPlaylist();
    }

    // Track View
    if (episode?.audioUrl) {
      trackView({
        guid: episodeKey,
        title: episode.title,
        audioUrl: episode.audioUrl,
        duration: typeof episode.duration === 'number' ? episode.duration : 0,
        pubDate: episode.pubDate ? new Date(episode.pubDate).getTime() : Date.now(),
        channel: {
          itunesId: channel.itunesId || channel.id || 'unknown',
          title: channel.title || episode.channelTitle || 'Unknown',
          author: channel.author || '',
          feedUrl: channel.feedUrl || undefined,
          artworkUrl: channel.artworkUrl || channel.artwork || episode.channelArtwork || '',
        },
      }).catch(console.error);

      if (historyBase.episodeUrl) {
        const resolvedDuration =
          typeof episode.duration === 'number' ? episode.duration : duration || undefined;
        recordHistory({
          ...historyBase,
          progress: Math.floor(currentTime),
          duration: resolvedDuration,
        }).catch(console.error);
      }
    }

    // Cleanup: prevent updates after unmount
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.audioUrl]);

  // 1.5 Resume Playback Logic
  useEffect(() => {
    const checkResume = async () => {
      if (!episodeKey) return;
      if (resumeCheckedRef.current === episodeKey) return; // Already checked for this episode

      // Using history from query which is already loaded (hopefully)
      // If history isn't loaded yet, this might run again when history updates
      if (!history) return;

      try {
        // Match by guid (or title if guid is unstable/generated)
        const record = history.find(
          h =>
            h.episodeGuid === episodeKey ||
            (h.episodeTitle === episode.title &&
              h.channelName === (channel.title || episode.channelTitle))
        );

        if (record && record.progress > 0 && record.progress < (record.duration || 3600) - 10) {
          console.log(`[Resume] Found progress: ${record.progress}s`);
          setResumeTime(record.progress);
          setCurrentTime(record.progress); // Update UI immediately
          resumeCheckedRef.current = episodeKey;
        }
      } catch (err) {
        console.error('[Resume] Failed to check history', err);
      }
    };
    checkResume();
  }, [episodeKey, history, channel.title, episode.title, episode.channelTitle]);

  // 1.6 Apply Resume Time (Wait for Metadata)
  useEffect(() => {
    if (resumeTime !== null && audioRef.current && duration > 0 && !isLoading) {
      console.log(`[Resume] Seeking to ${resumeTime}s`);
      audioRef.current.currentTime = resumeTime;
      setResumeTime(null); // Clear once applied
    }
  }, [resumeTime, duration, isLoading]);

  // 1.7 Save Progress Periodically
  // 1.7 Save Progress Periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && currentTime > 5 && historyBase.episodeUrl) {
        const resolvedDuration =
          typeof episode.duration === 'number' ? episode.duration : duration || undefined;
        recordHistory({
          ...historyBase,
          progress: Math.floor(currentTime),
          duration: resolvedDuration,
        }).catch(() => {});
      }
    }, 10000); // Save every 10 seconds
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, historyBase, recordHistory, episode.duration, duration]);

  // 3. Auto-Scroll Logic
  const activeLineIndex = useMemo(() => {
    return transcript.findIndex(line => currentTime >= line.start && currentTime < line.end);
  }, [currentTime, transcript]);

  useEffect(() => {
    if (autoScroll && activeLineIndex !== -1) {
      const el = document.getElementById(`line-${activeLineIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex, autoScroll]);
  // --- Handlers ---

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;

    // A-B Loop
    if (abLoop.active && abLoop.b !== null && curr >= abLoop.b) {
      audioRef.current.currentTime = abLoop.a || 0;
      return;
    }
    setCurrentTime(curr);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      const t = Math.max(0, Math.min(time, duration));
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const skip = (sec: number) => seekTo(currentTime + sec);

  const changeSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const toggleLoop = () => {
    if (abLoop.a === null) setAbLoop({ a: currentTime, b: null, active: false });
    else if (abLoop.b === null) setAbLoop({ ...abLoop, b: currentTime, active: true });
    else setAbLoop({ a: null, b: null, active: false });
  };

  const getAbLoopLabel = useCallback(() => {
    if (abLoop.active) return 'Loop Active';
    if (abLoop.a === null) return 'Loop';
    return 'Set B';
  }, [abLoop.active, abLoop.a]);

  const getAbLoopClassName = useCallback(() => {
    if (abLoop.active) return 'bg-primary text-primary-foreground shadow-pop-sm';
    if (abLoop.a === null)
      return 'bg-card text-muted-foreground border border-border hover:border-border';
    return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-400/40';
  }, [abLoop.active, abLoop.a]);

  const isSubscribed = useMemo(() => {
    const targetFeed = channel.feedUrl?.trim();
    if (!targetFeed) return false;
    return subscriptions.some(sub => sub.feedUrl?.trim() === targetFeed);
  }, [channel.feedUrl, subscriptions]);

  const handleToggleSubscription = async () => {
    if (!user) {
      const redirect = encodeURIComponent(
        `${globalThis.location.pathname}${globalThis.location.search}`
      );
      navigate(`/auth?redirect=${redirect}`);
      return;
    }

    const feedUrl = channel.feedUrl?.trim();
    if (!feedUrl) {
      notify.error('This episode has no channel feed URL, so it cannot be saved yet.');
      return;
    }

    setSubscriptionPending(true);
    try {
      const result = await toggleSubscription({
        channel: {
          itunesId: channel.itunesId || channel.id,
          title: channel.title || episode.channelTitle || 'Unknown Channel',
          author: channel.author || '',
          feedUrl,
          artworkUrl:
            channel.artworkUrl || channel.artwork || channel.image || episode.channelArtwork || '',
        },
      });
      notify.success(result.isSubscribed ? 'Saved to your subscriptions' : 'Removed from saved');
    } catch (error) {
      console.error('Failed to toggle subscription', error);
      notify.error('Failed to update saved status. Please try again.');
    } finally {
      setSubscriptionPending(false);
    }
  };

  const handleShareEpisode = async () => {
    if (!episode.audioUrl) {
      notify.error('Missing episode URL');
      return;
    }

    const params = new URLSearchParams();
    params.set('audioUrl', encodeURIComponent(episode.audioUrl));
    params.set('title', episode.title);
    if (episode.guid) params.set('guid', episode.guid);
    if (channel.title) params.set('channelTitle', channel.title);
    if (channel.artworkUrl) params.set('channelArtwork', channel.artworkUrl);

    const shareUrl = `${globalThis.location.origin}/podcasts/player?${params.toString()}`;

    try {
      if (globalThis.navigator.share) {
        await globalThis.navigator.share({
          title: episode.title,
          text: channel.title || episode.channelTitle || 'Podcast episode',
          url: shareUrl,
        });
        return;
      }

      if (globalThis.navigator.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(shareUrl);
        notify.success('Share link copied');
        return;
      }

      notify.info(shareUrl);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to share episode', error);
      notify.error('Unable to share this episode right now.');
    }
  };

  const regenerateTranscript = async () => {
    const episodeId = getEpisodeId();
    setTranscriptLoading(true);
    setTranscriptError(null);
    setTranscript([]);

    try {
      try {
        const languagesToClear = ['zh', 'en', 'vi', 'mn'];
        languagesToClear.forEach(lang => {
          localStorage.removeItem(`transcript_${episodeId}_${lang}`);
        });
      } catch {
        /* ignore localStorage errors */
      }
      await deleteTranscript({ episodeId });
      // Force reload from API
      await loadTranscriptChunked(true);
    } catch (e) {
      console.error(e);
      setTranscriptError(copy.resetFailed);
      setTranscriptLoading(false);
    }
  };

  const handleConfirmRegenerateTranscript = () => {
    setShowTranscriptResetConfirm(false);
    void regenerateTranscript();
  };

  // Convex AI action
  const analyzeSentenceAction = useAction(
    aRef<{ sentence: string; context?: string }, { success: boolean; data?: AnalysisData }>(
      'ai:analyzeSentence'
    )
  );

  const analyze = async (line: TranscriptLine) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setAnalyzingLine(line);
    setShowAnalysis(true);
    setAnalysisLoading(true);
    setAnalysisData(null);

    try {
      const result = await analyzeSentenceAction({
        sentence: line.text,
        context: line.translation || undefined,
      });
      if (result?.success && result.data) {
        setAnalysisData(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const playEpisode = (newEpisode: PodcastEpisode) => {
    // 🔥 FIX: Use URL params instead of reload for SPA-friendly navigation
    const params = new URLSearchParams();
    params.set('audioUrl', encodeURIComponent(newEpisode.audioUrl));
    params.set('title', newEpisode.title);
    if (newEpisode.guid) params.set('guid', newEpisode.guid);
    if (channel.title) params.set('channelTitle', channel.title);
    if (channel.artworkUrl) params.set('channelArtwork', channel.artworkUrl);

    // Navigate with both URL params and state (state for immediate use, params for refresh)
    navigate(`/podcasts/player?${params.toString()}`, {
      state: { episode: newEpisode, channel },
      replace: true,
    });
  };

  const renderTranscriptLine = (line: TranscriptLine, idx: number) => {
    const isActive = idx === activeLineIndex;

    return (
      <div
        key={`${line.start}-${line.text}-${idx}`}
        id={`line-${idx}`}
        className={`
                                        group relative p-4 md:p-6 rounded-2xl transition-all duration-300 border-l-4
                                        ${
                                          isActive
                                            ? 'bg-card shadow-lg border-indigo-500 dark:border-indigo-300/50 scale-[1.01] z-10'
                                            : 'bg-transparent border-transparent hover:bg-card/60 hover:border-border'
                                        }
                                    `}
      >
        <div className="flex gap-4 items-start">
          {/* Timestamp Bubble */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => seekTo(line.start)}
            className={`
                                                flex-none text-[11px] font-bold px-2 py-1 rounded-md transition-colors
                                                ${
                                                  isActive
                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                                    : 'bg-muted text-muted-foreground group-hover:bg-muted group-hover:text-muted-foreground'
                                                }
                                            `}
          >
            {formatTime(line.start)}
          </Button>

          {/* Content */}
          <Button
            type="button"
            variant="ghost"
            className="flex w-full flex-1 min-w-0 items-start text-left font-normal h-auto px-0 py-0"
            onClick={() => seekTo(line.start)}
          >
            <div className="flex w-full flex-col items-start space-y-2">
              {/* Text Content with Karaoke Support */}
              <div
                className={`
                                                    text-lg md:text-xl font-bold leading-relaxed transition-colors flex flex-wrap gap-x-1
                                                    ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}
                                                `}
              >
                {line.words && line.words.length > 0 ? (
                  line.words.map((w, i) => {
                    const isWordActive = currentTime >= w.start && currentTime < w.end;
                    return (
                      <span
                        key={`${w.start}-${w.word}-${i}`}
                        className={`
                                                                        rounded px-0.5 transition-all duration-75
                                                                        ${
                                                                          isWordActive
                                                                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-primary-foreground shadow-sm scale-105'
                                                                            : 'hover:bg-indigo-50 dark:hover:bg-indigo-500/15'
                                                                        }
                                                                    `}
                      >
                        {w.word}
                      </span>
                    );
                  })
                ) : (
                  <span>{line.text}</span>
                )}
              </div>

              {/* Translation */}
              {showTranslation && (
                <p
                  className={`
                                                        text-base leading-relaxed transition-colors border-l-2 pl-3
                                                        ${
                                                          isActive
                                                            ? 'text-indigo-600/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-400/40'
                                                            : 'text-muted-foreground border-border'
                                                        }
                                                    `}
                >
                  {line.translation || (
                    <span className="text-muted-foreground italic text-sm">{copy.noTranslation}</span>
                  )}
                </p>
              )}
            </div>
          </Button>

          {/* Analyze Button (Visible on Hover/Active) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation();
                  analyze(line);
                }}
                aria-label="Analyze this sentence"
                className={`
                                                p-2 rounded-full transition-all flex-none
                                                ${
                                                  isActive
                                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 opacity-100'
                                                    : 'bg-card text-muted-foreground opacity-0 group-hover:opacity-100 shadow-sm border border-border'
                                                }
                                                hover:scale-110 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-primary-foreground
                                            `}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="top">Analyze this sentence</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-muted text-foreground overflow-hidden font-sans">
      {/* Header - Fixed on Mobile, Part of layout on Desktop */}
      <header className="flex-none flex items-center justify-between px-4 py-3 bg-card border-b border-border z-20 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="font-bold text-sm truncate max-w-[200px]">{episode.title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowPlaylist(true)}
          className="p-2 hover:bg-muted rounded-full"
        >
          <ListMusic className="w-5 h-5" />
        </Button>
      </header>

      {/* Main Layout: Stack on Mobile, Split on Desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Column: Meta & Controls (Sticky on Desktop) */}
        <aside className="w-full md:w-[320px] lg:w-[380px] flex-none bg-card md:border-r border-border flex flex-col z-10">
          <div className="p-6 md:p-8 flex flex-col items-center md:items-start text-center md:text-left h-full overflow-y-auto">
            {/* Desktop Back Button */}
            <div className="hidden md:block mb-6 space-y-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="w-12 h-12 border-2 border-foreground rounded-xl shadow-pop hover:shadow-pop-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-150"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
              </Button>
              <AppBreadcrumb
                className="max-w-[320px]"
                items={[
                  { label: 'Media', to: '/media' },
                  { label: 'Podcasts', to: '/podcasts' },
                  { label: episode.title || 'Player' },
                ]}
              />
            </div>

            {/* Cover Art */}
            <div className="relative group w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-xl overflow-hidden mb-6 flex-shrink-0">
              <img
                src={
                  episode.image ||
                  episode.itunes?.image ||
                  channel.artworkUrl ||
                  channel.image ||
                  channel.artwork ||
                  episode.channelArtwork ||
                  'https://placehold.co/400x400'
                }
                alt="Cover"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
            </div>

            {/* Meta Info */}
            <div className="space-y-2 mb-8 w-full">
              <h1 className="text-xl md:text-2xl font-bold leading-tight text-muted-foreground line-clamp-2 md:line-clamp-none">
                {episode.title}
              </h1>
              <p className="text-sm md:text-base font-medium text-indigo-600 dark:text-indigo-300">
                {channel.title || episode.channelTitle}
              </p>
            </div>

            {/* Sidebar Controls */}
            <div className="w-full space-y-4 md:mt-auto pb-4 md:pb-0">
              {/* Translation Switch */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-card rounded-lg shadow-sm text-indigo-500 dark:text-indigo-300">
                    <Languages className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-muted-foreground">{copy.translationSubtitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {copy.showTranslationTemplate.replace('{{language}}', translationLabel)}
                    </p>
                  </div>
                </div>
                <Switch checked={showTranslation} onCheckedChange={setShowTranslation} />
              </div>

              {/* Regenerate Button (For fixing broken subtitles) */}
              <Button
                onClick={() => setShowTranscriptResetConfirm(true)}
                disabled={transcriptLoading || isGeneratingTranscript}
                loading={isGeneratingTranscript}
                loadingText={copy.generating}
                loadingIconClassName="w-4 h-4"
                variant="outline"
                size="default"
                className="w-full gap-2 border-dashed border-border text-muted-foreground hover:border-indigo-300 dark:hover:border-indigo-300/50 hover:text-indigo-600 dark:hover:text-indigo-300"
              >
                <RefreshCw className="w-4 h-4" />
                {copy.regenerateSubtitle}
              </Button>
              <AlertDialog
                open={showTranscriptResetConfirm}
                onOpenChange={setShowTranscriptResetConfirm}
              >
                <AlertDialogContent className="max-w-md border-2 border-foreground rounded-2xl shadow-pop">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black text-foreground">
                      {copy.regenerateTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      {copy.regenerateDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row justify-end gap-2">
                    <AlertDialogCancel onClick={() => setShowTranscriptResetConfirm(false)}>
                      {copy.cancel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmRegenerateTranscript}
                      loading={isGeneratingTranscript || transcriptLoading}
                      loadingText={copy.processing}
                    >
                      {copy.confirmRegenerate}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleToggleSubscription}
                  disabled={subscriptionPending}
                  loading={subscriptionPending}
                  loadingText="Saving..."
                  loadingIconClassName="w-4 h-4"
                  className="gap-2 border-border text-muted-foreground hover:border-indigo-200 dark:hover:border-indigo-300/40"
                >
                  <Heart className={`w-4 h-4 ${isSubscribed ? 'fill-current' : ''}`} />
                  {isSubscribed ? copy.saved : copy.saveEpisode}
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleShareEpisode}
                  className="gap-2 border-border text-muted-foreground hover:border-indigo-200 dark:hover:border-indigo-300/40"
                >
                  <Share2 className="w-4 h-4" /> {copy.share}
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Transcript Stream */}
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto scroll-smooth bg-muted/50 pb-10 md:pb-12 relative"
        >
          {/* Auto-Scroll Floating Toggle */}
          <div className="sticky top-4 right-4 z-20 flex justify-end px-4 pointer-events-none">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`
                                pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-all
                                ${
                                  autoScroll
                                    ? 'bg-indigo-600/90 dark:bg-indigo-500/85 text-white dark:text-primary-foreground border-indigo-500 dark:border-indigo-300/50'
                                    : 'bg-card/90 text-muted-foreground border-border hover:bg-muted'
                                }
                            `}
            >
              <ListMusic className="w-4 h-4" />
              <span className="text-xs font-bold">
                {autoScroll ? copy.autoScrollOn : copy.autoScrollOff}
              </span>
            </Button>
          </div>

          <div className="max-w-3xl mx-auto p-4 md:p-8 lg:p-12 space-y-2">
            {/* Loading State */}
            {showTranscriptLoader && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-400/30 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">
                  {copy.generatingSmartSubtitle}
                </p>
                {isGeneratingTranscript && (
                  <Badge variant="secondary" className="text-xs shadow-sm">
                    {copy.firstGenerationHint}
                  </Badge>
                )}
              </div>
            )}

            {/* Error State */}
            {transcriptError && !transcriptLoading && (
              <Card className="border border-destructive/30 p-6 text-center shadow-sm mx-4 mt-8">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3 text-destructive">
                  <Volume2 className="w-6 h-6" />
                </div>
                <h3 className="text-muted-foreground font-bold mb-1">{copy.cannotLoadSubtitle}</h3>
                <p className="text-sm text-muted-foreground mb-4">{transcriptError}</p>
                <Button
                  onClick={() => loadTranscriptChunked(true)}
                  size="default"
                  className="px-6 py-2"
                >
                  {copy.retry}
                </Button>
              </Card>
            )}

            {/* Empty State */}
            {!transcriptLoading && !transcriptError && transcript.length === 0 && (
              <Card className="text-center py-16 text-muted-foreground border-dashed">
                <p>{copy.noSubtitleContent}</p>
              </Card>
            )}

            {/* Transcript List */}
            {transcript.length > 0 &&
              transcript.map((line, idx) => renderTranscriptLine(line, idx))}

            {/* Player Bar (Aligned with Transcript Width) */}
            <div className="sticky bottom-4 z-30 pt-6">
              <div className="bg-card border border-border rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] px-4 md:px-6 py-3">
                {/* Progress Slider */}
                <div className="relative group mb-1 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute -top-3 left-0 right-0 h-4 cursor-pointer z-10 w-full p-0 font-normal bg-transparent hover:bg-transparent"
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      seekTo(pct * duration);
                    }}
                  >
                    <span className="sr-only">Seek</span>
                  </Button>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full relative"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full shadow border-2 border-card scale-0 group-hover:scale-100 transition-transform" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium mt-1 select-none">
                    <span>{formatTime(currentTime)}</span>
                    <span>-{formatTime(duration - currentTime)}</span>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between">
                  {/* Left: Speed & Loop */}
                  <div className="flex items-center gap-2 flex-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={changeSpeed}
                      className="text-[10px] font-bold text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-300 px-1.5 py-0.5 rounded hover:bg-muted transition-colors w-8 h-auto"
                    >
                      {speed}x
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleLoop}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${getAbLoopClassName()}`}
                    >
                      <Repeat className="w-3 h-3" />
                      <span className="hidden md:inline">{getAbLoopLabel()}</span>
                    </Button>
                  </div>

                  {/* Center: Main Playback */}
                  <div className="flex items-center gap-4 flex-none">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => skip(-10)}
                      className="text-muted-foreground hover:text-muted-foreground transition-colors hover:scale-110"
                    >
                      <SkipBack className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                    </Button>

                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      onClick={togglePlay}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:scale-105 transition-all active:scale-95 ring-2 ring-transparent hover:ring-indigo-100 dark:hover:ring-indigo-300/35"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
                      ) : (
                        <Play className="w-4 h-4 md:w-5 md:h-5 ml-0.5" fill="currentColor" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => skip(10)}
                      className="text-muted-foreground hover:text-muted-foreground transition-colors hover:scale-110"
                    >
                      <SkipForward className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                    </Button>
                  </div>

                  {/* Right: Tools / Volume */}
                  <div className="flex items-center justify-end gap-3 flex-1">
                    <div className="hidden md:flex items-center gap-2 group w-20">
                      <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <Slider
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={e => {
                          const v = Number.parseFloat(e.target.value);
                          setVolume(v);
                          if (audioRef.current) audioRef.current.volume = v;
                        }}
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPlaylist(true)}
                          aria-label="Playlist"
                          className={`p-1.5 rounded-lg transition-colors ${showPlaylist ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15' : 'text-muted-foreground hover:text-muted-foreground'}`}
                        >
                          <ListMusic className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent side="top">Playlist</TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={e => {
          setDuration(e.currentTarget.duration);
          setIsLoading(false);
        }}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <track kind="captions" />
      </audio>

      {/* Playlist Drawer */}
      <Sheet open={showPlaylist} onOpenChange={setShowPlaylist}>
        <SheetPortal>
          <SheetOverlay
            unstyled
            forceMount
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[55] transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          />
          <SheetContent
            unstyled
            forceMount
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-card shadow-2xl z-[60] border-l border-border transform transition-transform duration-300 ease-in-out data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full data-[state=closed]:pointer-events-none"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                  <h3 className="font-bold text-muted-foreground">{copy.playlist}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                    {playlist.length}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPlaylist(false)}
                  className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {playlist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-2">
                    <ListMusic className="w-8 h-8 opacity-20" />
                    <p className="text-sm">{copy.noOtherEpisodes}</p>
                  </div>
                ) : (
                  playlist.map(ep => {
                    const isCurrent =
                      ep.guid === episode.guid ||
                      ep.id === episode.id ||
                      ep.audioUrl === episode.audioUrl;
                    return (
                      <Button
                        key={ep.guid || ep.id}
                        onClick={() => playEpisode(ep)}
                        variant="ghost"
                        size="auto"
                        className={`
                                            w-full text-left p-3 rounded-xl transition-all border justify-start items-start
                                            ${
                                              isCurrent
                                                ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-100 dark:border-indigo-400/30 ring-1 ring-indigo-200 dark:ring-indigo-400/30'
                                                : 'bg-card border-transparent hover:bg-muted hover:border-border'
                                            }
                                            font-normal
                                        `}
                      >
                        <div className="flex gap-3">
                          <div className="relative flex-none w-12 h-12 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={
                                ep.image || ep.itunes?.image || channel.artworkUrl || channel.image
                              }
                              className="w-full h-full object-cover"
                              alt=""
                            />
                            {isCurrent && (
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-card rounded-full animate-ping" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`text-sm font-bold truncate mb-0.5 ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
                              {ep.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {ep.pubDate ? new Date(ep.pubDate).toLocaleDateString() : ''}
                              </span>
                              <span>•</span>
                              <span>
                                {formatTime(typeof ep.duration === 'string' ? 0 : ep.duration || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Button>
                    );
                  })
                )}
              </div>
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>

      {/* AI Analysis Modal/Sheet */}
      {analyzingLine && (
        <Dialog open={showAnalysis} onOpenChange={open => !open && setShowAnalysis(false)}>
          <DialogPortal>
            <DialogOverlay
              unstyled
              forceMount
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
            />
            <DialogContent
              unstyled
              forceMount
              closeOnEscape={false}
              lockBodyScroll={false}
              className="fixed inset-0 z-[101] flex items-end md:items-center justify-center pointer-events-none data-[state=closed]:pointer-events-none"
            >
              <div className="relative bg-card w-full md:w-[600px] md:rounded-2xl rounded-t-2xl shadow-2xl pointer-events-auto transform transition-transform duration-300 md:max-h-[80vh] max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 uppercase tracking-wide">
                        AI Analysis
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground leading-snug">
                      {analyzingLine.text}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAnalysis(false)}
                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-muted-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-8 bg-card flex-1">
                  <AnalysisContent loading={analysisLoading} data={analysisData} />
                </div>
              </div>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}
    </div>
  );
};

export default PodcastPlayerPage;
