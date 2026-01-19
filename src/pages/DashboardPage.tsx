import React, { useMemo } from 'react';
import { Disc, GripVertical, BookMarked, FileText } from 'lucide-react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { BentoCard } from '../components/dashboard/BentoCard';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useApp } from '../contexts/AppContext'; // Import Layout Context
import { useData } from '../contexts/DataContext'; // Import Data Context for institute lookup
import LearnerSummaryCard from '../components/dashboard/LearnerSummaryCard';
import DictionarySearchDropdown from '../../components/dashboard/DictionarySearchDropdown';
import { TextbookContent, TopikExam } from '../types';
import { useTranslation } from 'react-i18next';

// DnD Kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Assets - Locally hosted emoji images
const ASSETS = {
  wave: '/emojis/Waving_Hand.png',
  fire: '/emojis/Fire.png',
  gem: '/emojis/Gem_Stone.png',
  tiger: '/emojis/Tiger_Face.png',
  sparkles: '/emojis/Sparkles.png',
  book: '/emojis/Open_Book.png',
  trophy: '/emojis/Trophy.png',
  tv: '/emojis/Television.png',
  headphone: '/emojis/Headphone.png',
  memo: '/emojis/Memo.png',
};

// Sortable Item Wrapper
const SortableItem = ({
  id,
  children,
  isEditing,
  className,
}: {
  id: string;
  children: React.ReactNode;
  isEditing: boolean;
  className?: string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${className} ${isEditing ? 'cursor-move' : ''}`}
      {...attributes}
      {...(isEditing ? listeners : {})}
    >
      {children}
      {isEditing && (
        <div className="absolute top-2 right-2 bg-white/80 p-1 rounded-full shadow-sm text-slate-400 z-50 pointer-events-none">
          <GripVertical size={16} />
        </div>
      )}
      {/* Editing Overlay to prevent interactions while dragging */}
      {isEditing && <div className="absolute inset-0 z-40 bg-transparent" />}
    </div>
  );
};

export default function DashboardPage({
  _canAccessContent,
  _onShowUpgradePrompt,
}: {
  _canAccessContent: (content: TextbookContent | TopikExam) => boolean;
  _onShowUpgradePrompt: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { selectedInstitute, selectedLevel } = useLearning();
  const { isEditing, cardOrder, updateCardOrder } = useApp(); // Layout Context
  const { institutes } = useData(); // Get institutes data
  const navigate = useLocalizedNavigate();

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Prevent accidental drags
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate stats
  // const streak = user?.statistics?.dayStreak || 0;
  // const xp = (user?.wordsLearned || 0) * 10 + (user?.examsTaken || 0) * 50;
  const wordsToReview = user?.savedWords?.length || 0;

  // Calculate Progress (Mock for now, or based on lastUnit)
  const currentUnit = user?.lastUnit || 1;
  // const totalUnits = 10; // Mock total
  const progressPercent = Math.min(100, Math.round((currentUnit / 10) * 100));

  // Determine top score
  const topScore = useMemo(() => {
    if (!user?.examHistory || user.examHistory.length === 0) return 0;
    return Math.max(...user.examHistory.map(e => e.score));
  }, [user]);

  // Lookup institute name
  const instituteName = useMemo(() => {
    if (!selectedInstitute) return t('dashboard.textbook.label', { defaultValue: 'Textbook' });
    const inst = institutes.find(i => i.id === selectedInstitute);
    return inst ? inst.name : selectedInstitute;
  }, [selectedInstitute, institutes, t]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning', { defaultValue: 'Good morning' });
    if (hour < 18) return t('dashboard.greeting.afternoon', { defaultValue: 'Good afternoon' });
    return t('dashboard.greeting.evening', { defaultValue: 'Good evening' });
  };

  // Render Card Content based on ID
  const renderCard = (id: string) => {
    switch (id) {
      case 'summary':
        return <LearnerSummaryCard className="h-full" />;
      case 'tiger':
        return (
          <BentoCard
            className="flex flex-col items-center justify-center text-center h-full"
            bgClass="bg-[#FFE066]"
            borderClass="border-amber-300"
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(black 1px, transparent 1px)',
                backgroundSize: '10px 10px',
              }}
            ></div>
            <img
              src={ASSETS.tiger}
              className="w-36 h-36 drop-shadow-xl animate-float group-hover:scale-110 transition duration-500"
              alt="tiger coach"
            />
            <div className="relative z-10 mt-4 bg-white border-2 border-slate-900 px-4 py-3 rounded-2xl shadow-sm transform -rotate-2 group-hover:rotate-0 transition">
              <p className="font-bold text-slate-900 text-sm">
                &quot;
                {t('dashboard.tiger.quote', {
                  defaultValue: "Don't give up! Just 5 more minutes!",
                })}
                &quot;
              </p>
            </div>
            <button className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition shadow-lg border-2 border-black">
              {t('dashboard.tiger.action', { defaultValue: 'Start Quiz' })}
            </button>
          </BentoCard>
        );
      case 'textbook':
        return (
          <BentoCard
            onClickPath="/courses"
            bgClass="bg-sky-50"
            borderClass="border-sky-200"
            className="h-full"
          >
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <h3 className="font-black text-2xl text-slate-900 leading-tight">
                  {instituteName}
                  <br />
                  {selectedLevel
                    ? t('dashboard.textbook.level', { defaultValue: 'Level {level}' }).replace(
                        '{level}',
                        String(selectedLevel)
                      )
                    : t('dashboard.textbook.selectLevel', { defaultValue: 'Select Level' })}
                </h3>
                <div className="bg-white border-2 border-blue-200 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">
                  {t('dashboard.textbook.inProgress', { defaultValue: 'In Progress' })}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-blue-400 mb-1">
                  <span>
                    {t('dashboard.textbook.chapter', { defaultValue: 'Chapter {unit}' }).replace(
                      '{unit}',
                      String(currentUnit)
                    )}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-white h-3 rounded-full border-2 border-blue-100 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full border-r-2 border-blue-600"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <img
              src={ASSETS.book}
              className="absolute -right-4 -bottom-4 w-28 h-28 opacity-90 group-hover:scale-110 group-hover:rotate-6 transition duration-300"
              alt="books"
            />
          </BentoCard>
        );
      case 'topik':
        return (
          <BentoCard
            onClickPath="/topik"
            bgClass="bg-amber-50"
            borderClass="border-amber-200"
            className="h-full"
          >
            <div className="relative z-10">
              <h3 className="font-black text-2xl text-slate-900 whitespace-pre-wrap">
                {t('dashboard.topik.cardTitle', { defaultValue: 'TOPIK\nMock Exam' })}
              </h3>
              <div className="mt-2 inline-block bg-white px-3 py-1 rounded-lg text-xs font-bold text-yellow-600 shadow-sm border-2 border-yellow-100">
                {t('dashboard.topik.bestLabel', { defaultValue: 'Best' })}:{' '}
                <span className="text-slate-900">{topScore}</span>
              </div>
            </div>
            <img
              src={ASSETS.trophy}
              className="absolute -right-2 -bottom-2 w-28 h-28 group-hover:scale-110 group-hover:-rotate-6 transition duration-300"
              alt="trophy"
            />
          </BentoCard>
        );
      case 'youtube':
        return (
          <BentoCard
            onClickPath="/youtube"
            bgClass="bg-rose-50"
            borderClass="border-rose-200"
            className="h-full"
          >
            <div className="relative z-10">
              <h3 className="font-black text-2xl text-slate-900 whitespace-pre-wrap">
                {t('dashboard.video.cardTitle', { defaultValue: 'Immersion\nVideo' })}
              </h3>
              <div className="mt-2 inline-block bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold border-2 border-red-700 shadow-sm">
                {t('dashboard.video.new', { defaultValue: 'New Updates' })}
              </div>
            </div>
            <img
              src={ASSETS.tv}
              className="absolute -right-4 -bottom-4 w-28 h-28 group-hover:scale-110 group-hover:rotate-3 transition duration-300"
              alt="tv"
            />
          </BentoCard>
        );
      case 'podcast':
        return (
          <BentoCard
            onClickPath="/podcasts"
            bgClass="bg-violet-100"
            borderClass="border-violet-200"
            className="h-full"
          >
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:opacity-20 transition duration-700 group-hover:rotate-45">
              <Disc size={120} className="text-violet-500" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="inline-block bg-violet-500 text-white border-2 border-violet-400 text-[10px] font-black px-2 py-0.5 rounded-md uppercase transform -rotate-2">
                  {t('dashboard.podcast.label', { defaultValue: 'Podcast' })}
                </div>
                <h3 className="font-bold text-lg mt-2 leading-tight text-slate-900">
                  {t('dashboard.podcast.title', { defaultValue: 'Latest Podcast' })}
                  <br />
                  {t('dashboard.podcast.subtitle', { defaultValue: 'Iyagi Series' })}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 h-3 items-end">
                  <div className="w-1 bg-violet-500 h-full animate-pulse"></div>
                  <div className="w-1 bg-violet-500 h-2/3 animate-pulse"></div>
                  <div className="w-1 bg-violet-500 h-full animate-pulse"></div>
                </div>
                <span className="text-xs font-mono text-violet-600 font-bold">
                  {t('dashboard.podcast.listen', { defaultValue: 'Listen Now' })}
                </span>
              </div>
            </div>
          </BentoCard>
        );
      case 'vocab':
        return (
          <BentoCard
            onClickPath="/vocab-book"
            bgClass="bg-indigo-50"
            borderClass="border-indigo-200"
            className="h-full"
          >
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <BookMarked size={80} className="text-indigo-600 rotate-12" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="inline-block bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase mb-2">
                  {t('dashboard.vocab.label', { defaultValue: 'Vocab Book' })}
                </div>
                <h3 className="font-black text-xl text-slate-900 leading-tight">
                  {t('dashboard.vocab.title', { defaultValue: 'My Vocab' })}
                </h3>
                <p className="text-slate-500 font-bold text-sm mt-1">
                  {t('dashboard.vocab.subtitle', { defaultValue: 'Saved words and definitions' })}
                </p>
              </div>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                {t('dashboard.vocab.count', { defaultValue: '{count} Words' }).replace(
                  '{count}',
                  String(wordsToReview)
                )}
              </div>
            </div>
          </BentoCard>
        );
      case 'notes':
        return (
          <BentoCard
            onClickPath="/notebook"
            bgClass="bg-orange-50"
            borderClass="border-orange-200"
            className="h-full"
          >
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <FileText size={80} className="text-amber-600 rotate-12" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="inline-block bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase mb-2">
                  {t('dashboard.notes.label', { defaultValue: 'Notebook' })}
                </div>
                <h3 className="font-black text-xl text-slate-900 leading-tight">
                  {t('dashboard.notes.title', { defaultValue: 'Study Notes' })}
                </h3>
                <p className="text-slate-500 font-bold text-sm mt-1">
                  {t('dashboard.notes.subtitle', { defaultValue: 'Mistakes and memos' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[9px] font-bold text-red-600">
                  {t('dashboard.notes.mistake', { defaultValue: 'Err' })}
                </div>
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] font-bold text-emerald-600">
                  {t('dashboard.notes.memo', { defaultValue: 'Mem' })}
                </div>
              </div>
            </div>
          </BentoCard>
        );
      default:
        return null;
    }
  };

  // Card styling mapping (for spans)
  const getCardStyle = (id: string) => {
    switch (id) {
      case 'tiger':
        // Orig: md:col-span-1 row-span-2
        return 'md:col-span-1 md:row-span-2';
      default:
        // Default 1x1
        return 'md:col-span-1';
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cardOrder.indexOf(active.id as string);
      const newIndex = cardOrder.indexOf(over.id as string);
      updateCardOrder(arrayMove(cardOrder, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* 1. Header */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="relative pl-4">
          <img
            src={ASSETS.wave}
            className="absolute -top-6 -left-10 w-14 h-14 animate-float"
            alt="waving hand"
          />
          {/* SVG Underline Header */}
          <h1 className="text-4xl md:text-5xl font-black font-display text-slate-900 tracking-tight mb-2">
            {getGreeting()},{' '}
            <span className="text-indigo-600 relative inline-block">
              {user?.name?.split(' ')[0] || 'Learner'}
              <svg
                className="absolute w-full h-3 -bottom-1 left-0 text-indigo-200 -z-10"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </h1>
          <p className="text-slate-500 font-bold mt-1">
            {t('dashboard.subtitle', { defaultValue: "Ready to beat today's boss?" })}
          </p>
        </div>

        <div className="flex gap-4 items-center">
          {/* Dictionary Search with Dropdown */}
          <DictionarySearchDropdown />

          {/* Simplified Premium Badge */}
          {(user?.tier === 'PAID' || user?.subscriptionType) && (
            <div
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm border border-amber-500 hover:scale-110 transition cursor-pointer"
            >
              <span className="text-lg">👑</span>
              <span className="font-bold text-white text-sm">
                {t('dashboard.premiumBadge', { defaultValue: 'Premium' })}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Sortable Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(220px,auto)] transition-all ${isEditing ? 'scale-[0.98] ring-4 ring-indigo-500/20 rounded-3xl p-4 bg-slate-50' : ''}`}
          >
            {cardOrder.map(id => (
              <SortableItem key={id} id={id} isEditing={isEditing} className={getCardStyle(id)}>
                {renderCard(id)}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
