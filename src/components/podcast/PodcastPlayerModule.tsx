import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
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
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { Button } from '../ui';
import { Switch } from '../ui';
import { Badge } from '../ui';
import { Card } from '../ui';
import { Slider } from '../ui';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui';
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from '../ui';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../ui';
import { aRef, mRef, qRef } from '../../utils/convexRefs';
import { getLocalizedPath, useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { notify } from '../../utils/notify';
import { useAuth } from '../../contexts/AuthContext';
import { getLanguageLabel } from '../../utils/languageUtils';
import { buildMediaPath } from '../../utils/mediaRoutes';
import { resolveSafeReturnTo } from '../../utils/navigation';
import { useIsMobile } from '../../hooks/useIsMobile';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';
import { KT } from '../mobile/ksoft/ksoft';
import { lazy, Suspense } from 'react';
import { ContentSkeleton } from '../common';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { cn } from '../../lib/utils';

const DesktopPodcastPlayerPage = lazy(() => import('../../pages/desktop/DesktopPodcastPlayerPage'));

// Props
interface PodcastPlayerModuleProps {
  initialEpisode?: PodcastEpisode;
  initialChannel?: PodcastChannel;
  onBack?: () => void;
  isEmbedded?: boolean;
}

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
  translationPending: string;
  translationReady: string;
  translationFailed: string;
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
  analysisLoading: string;
  coreVocabulary: string;
  rootLabel: string;
  grammarPoints: string;
  culturalNuance: string;
  analysisFailed: string;
  analyzeSentence: string;
  aiAnalysis: string;
  back: string;
  coverAlt: string;
  saving: string;
  seek: string;
  showEpisodeTools: string;
  hideEpisodeTools: string;
  play: string;
  pause: string;
  forward: string;
  rewind: string;
  speed: string;
  speedControlDisabled: string;
  confirm: string;
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
    translationPending: 'Translation is generating in the background',
    translationReady: 'Translation is ready',
    translationFailed: 'Translation did not complete yet. Reload or regenerate.',
    generating: 'Generating...',
    regenerateSubtitle: 'Regenerate subtitles',
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
    analysisLoading: 'Analyzing context & grammar...',
    coreVocabulary: 'Core Vocabulary',
    rootLabel: 'Root:',
    grammarPoints: 'Grammar Points',
    culturalNuance: 'Cultural Nuance',
    analysisFailed: 'Analysis failed. Please try again.',
    analyzeSentence: 'Analyze this sentence',
    aiAnalysis: 'AI Analysis',
    back: 'Back',
    coverAlt: 'Cover',
    saving: 'Saving...',
    seek: 'Seek',
    showEpisodeTools: 'Show episode tools',
    hideEpisodeTools: 'Hide episode tools',
    play: 'Play',
    pause: 'Pause',
    forward: 'Forward 15s',
    rewind: 'Rewind 15s',
    speed: 'Playback Speed',
    speedControlDisabled: 'Upgrade to unlock speed control',
    confirm: 'Confirm',
  },
  zh: {
    mockTranslations: [
      '大家好，今天也开始学习韩语吗？',
      '坚持是最重要的。',
      '这句话有点快，请再听一遍。',
      '今天我们将学习日常对话中常用的表达。',
      "比如，有'您最近怎么样？'这样的表达。",
    ],
    readAudioFailed: '读取音频失败',
    missingAudioLink: '缺少音频链接',
    audioLinkTooLong: '音频链接过长，无法提交转写请求',
    transcriptTimeout: '字幕生成超时，请稍后重试',
    audioLinkTooLarge: '音频链接过大，转写请求被拦截，请先上传音频后再试',
    failedPrefix: '失败',
    transcriptUnavailable: '字幕不可用',
    resetFailed: '重置失败，请稍后重试',
    noTranslation: '暂无翻译',
    translationSubtitle: '翻译字幕',
    showTranslationTemplate: '显示{{language}}翻译',
    translationPending: '翻译正在后台生成',
    translationReady: '翻译已就绪',
    translationFailed: '翻译暂未完成，请刷新或重试生成',
    generating: '生成中...',
    regenerateSubtitle: '重新生成字幕',
    regenerateTitle: '重新生成字幕？',
    regenerateDescription:
      '重新生成字幕可能需要 1-2 分钟，当前字幕缓存会被清空并重新请求。确定继续吗？',
    cancel: '取消',
    processing: '处理中...',
    confirmRegenerate: '确认重生成',
    saved: '已收藏',
    saveEpisode: '收藏此集',
    share: '分享',
    autoScrollOn: '自动滚动: 开',
    autoScrollOff: '自动滚动: 关',
    generatingSmartSubtitle: 'AI 正在生成智能字幕...',
    firstGenerationHint: '首次生成约需 1 分钟',
    cannotLoadSubtitle: '无法加载字幕',
    retry: '重试',
    noSubtitleContent: '暂无字幕内容',
    playlist: '播放列表',
    noOtherEpisodes: '暂无其他剧集',
    analysisLoading: '正在分析语境与语法...',
    coreVocabulary: '核心词汇',
    rootLabel: '词根:',
    grammarPoints: '语法要点',
    culturalNuance: '文化细微差异',
    analysisFailed: '分析失败，请重试。',
    analyzeSentence: '分析这句话',
    aiAnalysis: 'AI 分析',
    back: '返回',
    coverAlt: '封面',
    saving: '保存中...',
    seek: '快进/快退',
    showEpisodeTools: '展开本集信息',
    hideEpisodeTools: '收起本集信息',
    play: '播放',
    pause: '暂停',
    forward: '快进 15秒',
    rewind: '后退 15秒',
    speed: '播放速度',
    speedControlDisabled: '升级以解锁播放速度控制',
    confirm: '确认',
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
    translationPending: 'Ban dich dang duoc tao trong nen',
    translationReady: 'Ban dich da san sang',
    translationFailed: 'Ban dich chua hoan tat. Hay tai lai hoac tao lai.',
    generating: 'Dang tao...',
    regenerateSubtitle: 'Tao lai phu de',
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
    analysisLoading: 'Dang phan tich ngu canh va ngu phap...',
    coreVocabulary: 'Tu vung cot loi',
    rootLabel: 'Goc tu:',
    grammarPoints: 'Diem ngu phap',
    culturalNuance: 'Sac thai van hoa',
    analysisFailed: 'Phan tich that bai. Vui long thu lai.',
    analyzeSentence: 'Phan tich cau nay',
    aiAnalysis: 'Phan tich AI',
    back: 'Quay lai',
    coverAlt: 'Anh bia',
    saving: 'Dang luu...',
    seek: 'Tua',
    showEpisodeTools: 'Mo thong tin tap',
    hideEpisodeTools: 'An thong tin tap',
    play: 'Phat',
    pause: 'Tam dung',
    forward: 'Tua toi 15s',
    rewind: 'Tua lui 15s',
    speed: 'Toc do phat',
    speedControlDisabled: 'Nang cap de mo khoa toc do phat',
    confirm: 'Xac nhan',
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
    translationPending: 'Орчуулга дэвсгэрт үүсэж байна',
    translationReady: 'Орчуулга бэлэн боллоо',
    translationFailed: 'Орчуулга хараахан дуусаагүй байна. Дахин ачаална уу.',
    generating: 'Үүсгэж байна...',
    regenerateSubtitle: 'Хадмалыг дахин үүсгэх',
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
    playlist: 'Тоглуулах жагса할т',
    noOtherEpisodes: 'Өөр дугаар алга',
    analysisLoading: 'Өгүүлбэрийн агуулга, дүрмийг шинжилж байна...',
    coreVocabulary: 'Гол үгс',
    rootLabel: 'Үг үндэс:',
    grammarPoints: 'Дүрмийн цэгүүд',
    culturalNuance: 'Соёлын ялгаа',
    analysisFailed: 'Шинжилгээ амжилтгүй. Дахин оролдоно уу.',
    analyzeSentence: 'Энэ өгүүлбэрийг шинжлэх',
    aiAnalysis: 'AI шинжилгээ',
    back: 'Буцах',
    coverAlt: 'Ковер',
    saving: 'Хадгалж байна...',
    seek: 'Үсрэх',
    showEpisodeTools: 'Дугаарын мэдээллийг нээх',
    hideEpisodeTools: 'Дугаарын мэдээллийг хураах',
    play: 'Тоглуулах',
    pause: 'Түр зогсоох',
    forward: '15 сек урагшлах',
    rewind: '15 сек ухрах',
    speed: 'Тоглуулах хурд',
    speedControlDisabled: 'Хурд то히руулахыг идэвхжүүлэхийн тулд сайжруулна уу',
    confirm: 'Батлах',
  },
};

const AnalysisContent: React.FC<{
  loading: boolean;
  data: AnalysisData | null;
  copy: UiCopy;
}> = ({ loading, data, copy }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
        <Sparkles className="w-8 h-8 animate-spin text-indigo-400 dark:text-indigo-300" />
        <p className="text-sm">{copy.analysisLoading}</p>
      </div>
    );
  }

  if (data) {
    return (
      <div className="space-y-8">
        {/* Vocab Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold border-b border-border pb-2">
            <BookOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            {copy.coreVocabulary}
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
                <div className="text-xs text-muted-foreground mb-0.5">
                  {copy.rootLabel} {v.root}
                </div>
                <div className="text-sm text-muted-foreground">{v.meaning}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Grammar */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold border-b border-border pb-2">
            <MessageSquare className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />
            {copy.grammarPoints}
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
            {copy.culturalNuance}
          </div>
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-400/30 text-sm text-amber-900/80 dark:text-amber-100/90 leading-relaxed italic">
            {`"${data.nuance}"`}
          </div>
        </section>
      </div>
    );
  }

  return <div className="text-center py-12 text-muted-foreground">{copy.analysisFailed}</div>;
};

const TranscriptLineRow: React.FC<{
  line: TranscriptLine;
  index: number;
  activeLineIndex: number;
  currentTime: number;
  showTranslation: boolean;
  noTranslationText: string;
  analyzeLabel: string;
  onSeek: (time: number) => void;
  onAnalyze: (line: TranscriptLine) => void;
  formatTime: (seconds: number) => string;
}> = ({
  line,
  index,
  activeLineIndex,
  currentTime,
  showTranslation,
  noTranslationText,
  analyzeLabel,
  onSeek,
  onAnalyze,
  formatTime,
}) => {
  const isActive = index === activeLineIndex;
  return (
    <div
      id={`line-${index}`}
      className={`
        group relative p-3 md:p-6 rounded-xl md:rounded-2xl transition-all duration-300 border-l-4
        ${
          isActive
            ? 'bg-card shadow-lg border-indigo-500 dark:border-indigo-300/50 scale-[1.01] z-10'
            : 'bg-transparent border-transparent hover:bg-card/60 hover:border-border'
        }
      `}
    >
      <div className="flex gap-3 md:gap-4 items-start">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSeek(line.start)}
          className={`
            flex-none text-[10px] md:text-[11px] font-bold px-2 py-1 rounded-md transition-colors
            ${
              isActive
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                : 'bg-muted text-muted-foreground group-hover:bg-muted group-hover:text-muted-foreground'
            }
          `}
        >
          {formatTime(line.start)}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="flex w-full flex-1 min-w-0 items-start text-left font-normal h-auto px-0 py-0 whitespace-normal"
          onClick={() => onSeek(line.start)}
        >
          <div className="flex w-full flex-col items-start space-y-2">
            <div
              className={`
                text-base md:text-xl font-bold leading-relaxed transition-colors flex flex-wrap gap-x-1 whitespace-normal break-words [overflow-wrap:anywhere]
                ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}
              `}
            >
              {line.words && line.words.length > 0 ? (
                line.words.map((word, wordIndex) => {
                  const isWordActive = currentTime >= word.start && currentTime < word.end;
                  return (
                    <span
                      key={`${word.start}-${word.word}-${wordIndex}`}
                      className={`
                        rounded px-0.5 transition-all duration-75
                        ${
                          isWordActive
                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-primary-foreground shadow-sm scale-105'
                            : 'hover:bg-indigo-50 dark:hover:bg-indigo-500/15'
                        }
                      `}
                    >
                      {word.word}
                    </span>
                  );
                })
              ) : (
                <span>{line.text}</span>
              )}
            </div>

            {showTranslation && (
              <p
                className={`
                  text-sm md:text-base leading-relaxed transition-colors border-l-2 pl-2.5 md:pl-3 whitespace-normal break-words [overflow-wrap:anywhere]
                  ${
                    isActive
                      ? 'text-indigo-600/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-400/40'
                      : 'text-muted-foreground border-border'
                  }
                `}
              >
                {line.translation || (
                  <span className="text-muted-foreground italic text-sm">{noTranslationText}</span>
                )}
              </p>
            )}
          </div>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={event => {
                event.stopPropagation();
                onAnalyze(line);
              }}
              aria-label={analyzeLabel}
              className={`
                p-1.5 md:p-2 rounded-full transition-all flex-none
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
            <TooltipContent side="top">{analyzeLabel}</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </div>
    </div>
  );
};

const TranscriptStreamBody: React.FC<{
  showTranscriptLoader: boolean;
  isGeneratingTranscript: boolean;
  transcriptError: string | null;
  transcriptLoading: boolean;
  transcript: TranscriptLine[];
  activeLineIndex: number;
  currentTime: number;
  showTranslation: boolean;
  copy: UiCopy;
  onRetry: () => void;
  onSeek: (time: number) => void;
  onAnalyze: (line: TranscriptLine) => void;
  formatTime: (seconds: number) => string;
}> = ({
  showTranscriptLoader,
  isGeneratingTranscript,
  transcriptError,
  transcriptLoading,
  transcript,
  activeLineIndex,
  currentTime,
  showTranslation,
  copy,
  onRetry,
  onSeek,
  onAnalyze,
  formatTime,
}) => (
  <>
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

    {transcriptError && !transcriptLoading && (
      <Card className="border border-destructive/30 p-6 text-center shadow-sm mx-4 mt-8">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3 text-destructive">
          <Volume2 className="w-6 h-6" />
        </div>
        <h3 className="text-muted-foreground font-bold mb-1">{copy.cannotLoadSubtitle}</h3>
        <p className="text-sm text-muted-foreground mb-4">{transcriptError}</p>
        <Button onClick={onRetry} size="default" className="px-6 py-2">
          {copy.retry}
        </Button>
      </Card>
    )}

    {!transcriptLoading && !transcriptError && transcript.length === 0 && (
      <Card className="text-center py-16 text-muted-foreground border-dashed">
        <p>{copy.noSubtitleContent}</p>
      </Card>
    )}

    {transcript.length > 0 &&
      transcript.map((line, idx) => (
        <TranscriptLineRow
          key={`${line.start}-${line.text}-${idx}`}
          line={line}
          index={idx}
          activeLineIndex={activeLineIndex}
          currentTime={currentTime}
          showTranslation={showTranslation}
          noTranslationText={copy.noTranslation}
          analyzeLabel={copy.analyzeSentence}
          onSeek={onSeek}
          onAnalyze={onAnalyze}
          formatTime={formatTime}
        />
      ))}
  </>
);

const PlayPauseIcon: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) =>
  isPlaying ? (
    <Pause className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
  ) : (
    <Play className="w-4 h-4 md:w-5 md:h-5 ml-0.5" fill="currentColor" />
  );

const EpisodeUtilityControls: React.FC<{
  mobile?: boolean;
  showTranslation: boolean;
  setShowTranslation: React.Dispatch<React.SetStateAction<boolean>>;
  translationLabel: string;
  translationStatusLabel?: string | null;
  copy: UiCopy;
  transcriptLoading: boolean;
  isGeneratingTranscript: boolean;
  onRegenerate: () => void;
  onToggleSubscription: () => void;
  subscriptionPending: boolean;
  isSubscribed: boolean;
  onShare: () => void;
}> = ({
  mobile = false,
  showTranslation,
  setShowTranslation,
  translationLabel,
  translationStatusLabel,
  copy,
  transcriptLoading,
  isGeneratingTranscript,
  onRegenerate,
  onToggleSubscription,
  subscriptionPending,
  isSubscribed,
  onShare,
}) => (
  <div className={mobile ? 'space-y-3' : 'w-full space-y-4 md:mt-auto pb-4 md:pb-0'}>
    <div
      className={
        mobile
          ? 'flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/70 px-4 py-3'
          : 'flex items-center justify-between p-4 bg-muted rounded-xl border border-border'
      }
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-card rounded-lg shadow-sm text-indigo-500 dark:text-indigo-300">
          <Languages className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-muted-foreground">{copy.translationSubtitle}</p>
          <p className="text-xs text-muted-foreground">
            {copy.showTranslationTemplate.replace('{{language}}', translationLabel)}
          </p>
          {translationStatusLabel ? (
            <p className="mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300">
              {translationStatusLabel}
            </p>
          ) : null}
        </div>
      </div>
      <Switch checked={showTranslation} onCheckedChange={setShowTranslation} />
    </div>

    <Button
      onClick={onRegenerate}
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

    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="outline"
        size="default"
        onClick={onToggleSubscription}
        disabled={subscriptionPending}
        loading={subscriptionPending}
        loadingText={copy.saving}
        loadingIconClassName="w-4 h-4"
        className="gap-2 border-border text-muted-foreground hover:border-indigo-200 dark:hover:border-indigo-300/40"
      >
        <Heart className={`w-4 h-4 ${isSubscribed ? 'fill-current' : ''}`} />
        {isSubscribed ? copy.saved : copy.saveEpisode}
      </Button>
      <Button
        variant="outline"
        size="default"
        onClick={onShare}
        className="gap-2 border-border text-muted-foreground hover:border-indigo-200 dark:hover:border-indigo-300/40"
      >
        <Share2 className="w-4 h-4" /> {copy.share}
      </Button>
    </div>
  </div>
);

const PlaylistSheetBody: React.FC<{
  playlist: PodcastEpisode[];
  copy: UiCopy;
  episode: PodcastEpisode;
  channel: PodcastChannel;
  onPlayEpisode: (episode: PodcastEpisode) => void;
  formatTime: (seconds: number) => string;
}> = ({ playlist, copy, episode, channel, onPlayEpisode, formatTime }) => {
  if (playlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-2">
        <ListMusic className="w-8 h-8 opacity-20" />
        <p className="text-sm">{copy.noOtherEpisodes}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {playlist.map(item => {
        const isCurrent =
          item.guid === episode.guid ||
          item.id === episode.id ||
          item.audioUrl === episode.audioUrl;
        return (
          <Button
            key={item.guid || item.id}
            onClick={() => onPlayEpisode(item)}
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
                  src={item.image || item.itunes?.image || channel.artworkUrl || channel.image}
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
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.pubDate ? new Date(item.pubDate).toLocaleDateString() : ''}</span>
                  <span>•</span>
                  <span>
                    {formatTime(typeof item.duration === 'string' ? 0 : item.duration || 0)}
                  </span>
                </div>
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
};

const AnalysisDialog: React.FC<{
  analyzingLine: TranscriptLine | null;
  showAnalysis: boolean;
  analysisLoading: boolean;
  analysisData: AnalysisData | null;
  copy: UiCopy;
  setShowAnalysis: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ analyzingLine, showAnalysis, analysisLoading, analysisData, copy, setShowAnalysis }) => {
  if (!analyzingLine) return null;
  return (
    <Dialog open={showAnalysis} onOpenChange={open => !open && setShowAnalysis(false)}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
        <DialogContent className="fixed inset-0 z-[101] flex items-end md:items-center justify-center pointer-events-none">
          <div className="relative bg-card w-full md:w-[600px] md:rounded-2xl rounded-t-2xl shadow-2xl pointer-events-auto transform transition-transform duration-300 md:max-h-[80vh] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 uppercase tracking-wide">
                    {copy.aiAnalysis}
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
                className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="overflow-y-auto p-6 bg-card flex-1">
              <AnalysisContent loading={analysisLoading} data={analysisData} copy={copy} />
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
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
  episodeNumber?: number;
  level?: string;
  category?: string;
}

export function buildPodcastEpisodeShareUrl(args: {
  origin: string;
  language: string;
  episode: Pick<PodcastEpisode, 'audioUrl' | 'title' | 'guid' | 'channelTitle'>;
  channel: Pick<PodcastChannel, 'title' | 'artworkUrl'>;
}) {
  const { origin, language, episode, channel } = args;
  const params = new URLSearchParams();
  params.set('audioUrl', encodeURIComponent(episode.audioUrl));
  params.set('title', episode.title);
  if (episode.guid) params.set('guid', episode.guid);
  if (channel.title) params.set('channelTitle', channel.title);
  if (channel.artworkUrl) params.set('channelArtwork', channel.artworkUrl);

  const sharePath = getLocalizedPath('/podcasts/player', language);
  return `${origin}${sharePath}?${params.toString()}`;
}

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

function buildMockTranscript(copy: UiCopy): TranscriptLine[] {
  return [
    {
      start: 0,
      end: 4.5,
      text: '안녕하세요, 여러분. 오늘도 한국어 공부 시작해볼까요?',
      translation: copy.mockTranslations[0],
    },
    {
      start: 4.5,
      end: 8.2,
      text: '꾸준히 하는 것이 가장 중요합니다.',
      translation: copy.mockTranslations[1],
    },
    {
      start: 8.2,
      end: 12,
      text: '이 문장은 조금 빠르니까 다시 들어보세요.',
      translation: copy.mockTranslations[2],
    },
    {
      start: 12,
      end: 16.5,
      text: '오늘은 일상 대화에서 많이 쓰는 표현을 배워볼 거예요.',
      translation: copy.mockTranslations[3],
    },
    {
      start: 16.5,
      end: 21,
      text: "예를 들어, '어떻게 지내세요?'라는 표현이 있어요.",
      translation: copy.mockTranslations[4],
    },
  ];
}

function resolveEpisodeFromState(state: any, searchParams: URLSearchParams): PodcastEpisode {
  const stateEpisode = state?.episode;
  const audioUrl = searchParams.get('audioUrl');
  const title = searchParams.get('title');
  const guid = searchParams.get('guid');

  const resolved = stateEpisode?.audioUrl
    ? stateEpisode
    : {
        guid: guid || '',
        title: title || 'Unknown Episode',
        audioUrl: audioUrl ? decodeURIComponent(audioUrl) : '',
        channelTitle: searchParams.get('channelTitle') || 'Unknown Channel',
        channelArtwork: searchParams.get('channelArtwork') || '',
      };

  return {
    ...resolved,
    audioUrl: normalizePublicAssetUrl(resolved.audioUrl) || resolved.audioUrl,
    channelArtwork: normalizePublicAssetUrl(resolved.channelArtwork) || resolved.channelArtwork,
    image: normalizePublicAssetUrl(resolved.image) || resolved.image,
  };
}

function resolvePodcastChannel(state: any): PodcastChannel {
  const channel = state?.channel ?? state?.episode?.channel ?? {};
  return {
    ...channel,
    artworkUrl: normalizePublicAssetUrl(channel.artworkUrl) || channel.artworkUrl,
    artwork: normalizePublicAssetUrl(channel.artwork) || channel.artwork,
    image: normalizePublicAssetUrl(channel.image) || channel.image,
  };
}

function getEpisodeIdForTranscript(episode: Pick<PodcastEpisode, 'guid' | 'title' | 'audioUrl'>) {
  if (episode.guid) return encodeURIComponent(episode.guid);
  let hash = 0;
  const text = `${episode.title}-${episode.audioUrl}`;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `ep_${Math.abs(hash).toString(16)}`;
}

function formatPlaybackTime(seconds: number) {
  const s = Math.max(0, seconds || 0);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function parseDurationToSeconds(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const parts = value.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseInt(value, 10) || 0;
}

function scrollPodcastLineIntoView(element: HTMLElement | null, isMobile: boolean) {
  if (!element || typeof globalThis.window === 'undefined') return;

  const rect = element.getBoundingClientRect();
  const viewportHeight = globalThis.window.innerHeight;
  const topThreshold = isMobile ? 96 : 120;
  const bottomThreshold = isMobile ? 180 : 220;
  const isVisibleEnough =
    rect.top >= topThreshold && rect.bottom <= viewportHeight - bottomThreshold;

  if (isVisibleEnough) return;

  element.scrollIntoView({
    behavior: isMobile ? 'auto' : 'smooth',
    block: 'center',
  });
}

export const PodcastPlayerModule: React.FC<PodcastPlayerModuleProps> = ({
  initialEpisode,
  initialChannel,
  onBack,
  isEmbedded = false,
}) => {
  const location = useLocation();
  const { state } = location;
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const { language, viewerAccess } = useAuth();
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const { settings: globalSettings } = useGlobalSettings();
  const uiLang: UiLang = language;
  const copy = UI_COPY[uiLang];
  const isMobile = useIsMobile();
  const backPath = useMemo(
    () => resolveSafeReturnTo(searchParams.get('returnTo'), buildMediaPath('podcast')),
    [searchParams]
  );

  const episode = useMemo(
    () => initialEpisode || resolveEpisodeFromState(state, searchParams),
    [initialEpisode, state, searchParams]
  );
  const channel = useMemo(
    () => initialChannel || resolvePodcastChannel(state),
    [initialChannel, state]
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlist, setPlaylist] = useState<PodcastEpisode[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analyzingLine, setAnalyzingLine] = useState<TranscriptLine | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const transcriptLoadKeyRef = useRef<string | null>(null);
  const transcriptLoadedKeyRef = useRef<string | null>(null);
  const playlistLoadedFeedRef = useRef<string | null>(null);

  const generateTranscript = useAction(aRef<any, any>('ai:generateTranscript'));
  const getTranscript = useAction(aRef<any, any>('ai:getTranscript'));
  const getEpisodesAction = useAction(aRef<any, any>('podcastActions:getEpisodes'));
  const toggleSubscription = useMutation(mRef<any, any>('podcasts:toggleSubscription'));
  const subscriptions =
    useQuery(qRef<any, any>('podcasts:getSubscriptions'), isAuthenticated ? {} : 'skip') ?? [];
  const analyzeSentenceAction = useAction(aRef<any, any>('ai:analyzeSentence'));

  const getEpisodeId = useCallback(() => getEpisodeIdForTranscript(episode), [episode]);
  const episodeArtwork = useMemo(
    () =>
      episode.image ||
      episode.itunes?.image ||
      channel.artworkUrl ||
      channel.image ||
      'https://placehold.co/400x400',
    [channel.artworkUrl, channel.image, episode.image, episode.itunes?.image]
  );
  const effectiveDuration = useMemo(
    () => Math.max(duration, parseDurationToSeconds(episode.duration || episode.itunes?.duration)),
    [duration, episode.duration, episode.itunes?.duration]
  );
  const progressPercent = useMemo(
    () => (effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0),
    [currentTime, effectiveDuration]
  );
  const isSubscribed = useMemo(
    () => subscriptions.some((s: any) => s.feedUrl === channel.feedUrl),
    [subscriptions, channel.feedUrl]
  );

  useEffect(() => {
    setShowTranslation(globalSettings.mediaSubtitleMode === 'BILINGUAL');
    setAutoScroll(globalSettings.mediaAutoScroll);
  }, [globalSettings.mediaAutoScroll, globalSettings.mediaSubtitleMode]);

  const loadTranscript = useCallback(
    async (force = false) => {
      if (convexAuthLoading || !isAuthenticated || !episode.audioUrl) return;
      const epId = getEpisodeId();
      const loadKey = `${epId}:${language}`;
      if (
        !force &&
        (transcriptLoadKeyRef.current === loadKey || transcriptLoadedKeyRef.current === loadKey)
      )
        return;
      transcriptLoadKeyRef.current = loadKey;
      setTranscriptLoading(true);
      setTranscriptError(null);
      try {
        const db = await getTranscript({ episodeId: epId, language });
        if (db?.segments?.length > 0) {
          setTranscript(db.segments);
          transcriptLoadedKeyRef.current = loadKey;
        } else {
          setIsGeneratingTranscript(true);
          const res = await generateTranscript({
            audioUrl: episode.audioUrl,
            episodeId: epId,
            language,
          });
          if (res.success && res.data?.segments) {
            setTranscript(res.data.segments);
            transcriptLoadedKeyRef.current = loadKey;
          } else {
            setTranscriptError(res.error || 'Failed to generate transcript');
          }
          setIsGeneratingTranscript(false);
        }
      } catch (e) {
        setTranscriptError('Error loading transcript');
      } finally {
        setTranscriptLoading(false);
        transcriptLoadKeyRef.current = null;
      }
    },
    [
      convexAuthLoading,
      isAuthenticated,
      episode.audioUrl,
      getEpisodeId,
      language,
      getTranscript,
      generateTranscript,
    ]
  );

  useEffect(() => {
    if (!convexAuthLoading && isAuthenticated && episode.audioUrl) {
      loadTranscript();
    }
  }, [convexAuthLoading, isAuthenticated, episode.audioUrl, language, loadTranscript]);

  useEffect(() => {
    if (!showPlaylist || !channel.feedUrl) return;
    if (playlistLoadedFeedRef.current === channel.feedUrl) return;

    let cancelled = false;
    setPlaylistLoading(true);

    getEpisodesAction({ feedUrl: channel.feedUrl })
      .then(res => {
        if (cancelled) return;
        if (res?.episodes) {
          setPlaylist(res.episodes.filter((e: any) => e.audioUrl));
        }
        playlistLoadedFeedRef.current = channel.feedUrl ?? null;
      })
      .catch(() => {
        if (!cancelled) {
          setPlaylist([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPlaylistLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showPlaylist, channel.feedUrl, getEpisodesAction]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch (e) {
        notify.error('Playback failed');
      }
    }
  };

  const seekTo = (t: number) => {
    if (audioRef.current) audioRef.current.currentTime = t;
  };
  const skip = (s: number) => seekTo(currentTime + s);
  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const n = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(n);
    if (audioRef.current) audioRef.current.playbackRate = n;
  };
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    notify.success('Link copied');
  };
  const handleToggleSub = async () => {
    try {
      await toggleSubscription({
        channel: {
          itunesId: channel.itunesId || channel.id,
          title: channel.title || episode.channelTitle,
          author: channel.author,
          feedUrl: channel.feedUrl!,
          artworkUrl: episodeArtwork,
        },
      });
    } catch (e) {
      console.error('Failed to toggle podcast subscription', e);
    }
  };
  const analyzeSentence = async (line: TranscriptLine) => {
    setAnalyzingLine(line);
    setShowAnalysis(true);
    setAnalysisLoading(true);
    try {
      const res = await analyzeSentenceAction({ sentence: line.text, language });
      if (res.success) setAnalysisData(res.data);
    } catch (e) {
      console.error('Failed to analyze transcript sentence', e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const activeLineIndex = useMemo(
    () => transcript.findIndex(l => currentTime >= l.start && currentTime < l.end),
    [currentTime, transcript]
  );
  useEffect(() => {
    if (!autoScroll || activeLineIndex === -1) return;
    scrollPodcastLineIntoView(document.getElementById(`line-${activeLineIndex}`), isMobile);
  }, [activeLineIndex, autoScroll, isMobile]);

  return (
    <div className="w-full h-full">
      {!isMobile ? (
        <Suspense fallback={<ContentSkeleton />}>
          <DesktopPodcastPlayerPage
            navigate={navigate}
            episode={episode}
            channel={channel}
            transcript={transcript}
            activeLineIndex={activeLineIndex}
            currentTime={currentTime}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            progressPercent={progressPercent}
            safeCurrentTime={currentTime}
            effectiveDuration={effectiveDuration}
            remainingTime={effectiveDuration - currentTime}
            formatTime={formatPlaybackTime}
            seekTo={seekTo}
            skip={skip}
            speed={speed}
            changeSpeed={changeSpeed}
            toggleLoop={() => {}}
            getAbLoopLabel={() => 'Loop'}
            getAbLoopClassName={() => ''}
            showTranslation={showTranslation}
            setShowTranslation={setShowTranslation}
            translationLabel={getLanguageLabel(language)}
            translationStatusLabel={null}
            onRegenerate={() => {}}
            onToggleSubscription={handleToggleSub}
            subscriptionPending={false}
            isSubscribed={isSubscribed}
            onShare={handleShare}
            showPlaylist={showPlaylist}
            setShowPlaylist={setShowPlaylist}
            playlist={playlist}
            playEpisode={e =>
              navigate(
                `/podcasts/player?audioUrl=${encodeURIComponent(e.audioUrl)}&title=${e.title}`
              )
            }
            scrollRef={scrollRef}
            showTranscriptLoader={transcriptLoading}
            transcriptError={transcriptError}
            TranscriptStreamBody={TranscriptStreamBody}
          />
        </Suspense>
      ) : (
        <div
          className="flex flex-col h-[100dvh] bg-k-bg overflow-hidden"
          style={{ background: KT.bg }}
        >
          {/* Header */}
          <div
            className="px-5 pb-3 flex-none"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-card rounded-xl border border-k-line shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="text-[10px] font-bold text-k-crimson uppercase tracking-widest">
                  Podcast
                </div>
                <div className="text-sm font-bold text-k-ink line-clamp-1 max-w-[200px]">
                  {channel.title || episode.channelTitle}
                </div>
              </div>
              <button
                onClick={() => setShowPlaylist(true)}
                className="p-2 bg-card rounded-xl border border-k-line shadow-sm"
              >
                ⋯
              </button>
            </div>
          </div>

          {/* Main View */}
          <div className="flex-1 overflow-hidden flex flex-col px-5">
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 shadow-lg flex-none">
              <img src={episodeArtwork} className="w-full h-full object-cover" alt="cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <h1 className="text-white font-bold text-lg line-clamp-1">{episode.title}</h1>
              </div>
            </div>

            {/* Transcript Area */}
            <div className="flex-1 bg-white rounded-2xl border border-k-line p-4 overflow-hidden flex flex-col mb-4">
              {/* Translation Toggle Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-k-line/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-k-bg flex items-center justify-center shadow-sm">
                    <Languages className="w-5 h-5 text-k-crimson" />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-k-ink leading-tight">雙語對照</div>
                    <div className="text-[11px] font-medium text-k-sub">
                      {getLanguageLabel(language)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className={cn(
                    'w-10 h-5 rounded-full transition-all relative',
                    showTranslation ? 'bg-k-crimson' : 'bg-k-sub/20'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                      showTranslation ? 'left-6' : 'left-1'
                    )}
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4" ref={scrollRef}>
                {transcriptLoading && transcript.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-k-crimson" />
                    <p className="text-xs text-k-sub font-bold">{copy.generatingSmartSubtitle}</p>
                  </div>
                ) : transcript.length > 0 ? (
                  transcript.map((line, idx) => (
                    <div
                      key={idx}
                      id={`line-${idx}`}
                      className={cn(
                        'transition-all',
                        idx === activeLineIndex ? 'opacity-100' : 'opacity-40'
                      )}
                    >
                      <button onClick={() => seekTo(line.start)} className="text-left w-full group">
                        <p className="text-[16px] font-bold text-k-ink leading-relaxed group-hover:text-k-crimson transition-colors">
                          {line.text}
                        </p>
                        {showTranslation && (
                          <p className="mt-1 text-sm text-k-sub leading-relaxed">
                            {line.translation}
                          </p>
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-k-sub text-center py-10 italic">
                    {transcriptError || copy.noSubtitleContent}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="px-5 pb-8 flex-none bg-card border-t border-k-line pt-4">
            <div className="mb-4">
              <Slider
                value={progressPercent}
                max={100}
                step={0.1}
                onChange={event =>
                  seekTo((Number(event.currentTarget.value) / 100) * effectiveDuration)
                }
                className="h-1"
              />
              <div className="flex justify-between text-[10px] text-k-sub mt-2 font-bold">
                <span>{formatPlaybackTime(currentTime)}</span>
                <span>-{formatPlaybackTime(effectiveDuration - currentTime)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={changeSpeed}
                className="w-10 h-10 rounded-full border border-k-line flex items-center justify-center text-xs font-bold"
              >
                {speed}x
              </button>
              <button onClick={() => skip(-10)}>
                <RotateCcw className="w-6 h-6 text-k-ink" />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-k-ink text-white flex items-center justify-center shadow-xl"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" fill="white" />
                ) : (
                  <Play className="w-8 h-8 ml-1" fill="white" />
                )}
              </button>
              <button onClick={() => skip(10)}>
                <RotateCw className="w-6 h-6 text-k-ink" />
              </button>
              <button onClick={handleShare}>
                <Share2 className="w-6 h-6 text-k-sub" />
              </button>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <Sheet open={showPlaylist} onOpenChange={setShowPlaylist}>
        <SheetPortal>
          <SheetOverlay className="fixed inset-0 bg-black/20 z-50" />
          <SheetContent className="fixed inset-y-0 right-0 w-[300px] bg-card shadow-2xl z-50 border-l border-k-line p-6">
            <h3 className="font-bold text-k-ink mb-4">Playlist</h3>
            {playlistLoading ? (
              <div className="flex items-center justify-center py-10 text-sm font-semibold text-muted-foreground">
                {copy.generating}
              </div>
            ) : (
              <PlaylistSheetBody
                playlist={playlist}
                copy={copy}
                episode={episode}
                channel={channel}
                onPlayEpisode={e => {
                  navigate(
                    `/podcasts/player?audioUrl=${encodeURIComponent(e.audioUrl)}&title=${e.title}`
                  );
                  setShowPlaylist(false);
                }}
                formatTime={formatPlaybackTime}
              />
            )}
          </SheetContent>
        </SheetPortal>
      </Sheet>

      <AnalysisDialog
        analyzingLine={analyzingLine}
        showAnalysis={showAnalysis}
        analysisLoading={analysisLoading}
        analysisData={analysisData}
        copy={copy}
        setShowAnalysis={setShowAnalysis}
      />
    </div>
  );
};

export default PodcastPlayerModule;
