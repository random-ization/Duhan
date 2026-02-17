import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Mic, Square, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { cn } from '../../lib/utils';
import { Button } from '../ui';

interface MobileSpeakingModuleProps {
  readonly unitTitle: string;
  readonly targetSentence: string; // The sentence to read
  readonly referenceAudioUrl?: string; // Optional reference audio
  readonly translation?: string;
  readonly onBack: () => void;
  readonly onComplete?: () => void;
}

export function MobileSpeakingModule({
  unitTitle: _unitTitle,
  targetSentence,
  referenceAudioUrl,
  translation,
  onBack,
  onComplete: _onComplete,
}: MobileSpeakingModuleProps) {
  const {
    isRecording,
    recordingTime,
    audioUrl,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  } = useAudioRecorder();

  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [isPlayingUser, setIsPlayingUser] = useState(false);

  const referenceAudioRef = useRef<HTMLAudioElement>(null);
  const userAudioRef = useRef<HTMLAudioElement>(null);

  const toggleReferencePlay = () => {
    if (referenceAudioRef.current) {
      if (isPlayingReference) {
        referenceAudioRef.current.pause();
      } else {
        referenceAudioRef.current.play();
      }
      setIsPlayingReference(!isPlayingReference);
    }
  };

  const toggleUserPlay = () => {
    if (userAudioRef.current) {
      if (isPlayingUser) {
        userAudioRef.current.pause();
      } else {
        userAudioRef.current.play();
      }
      setIsPlayingUser(!isPlayingUser);
    }
  };

  // Reset play state on end
  useEffect(() => {
    const refAudio = referenceAudioRef.current;
    const userAudio = userAudioRef.current;

    const onRefEnd = () => setIsPlayingReference(false);
    const onUserEnd = () => setIsPlayingUser(false);

    if (refAudio) refAudio.addEventListener('ended', onRefEnd);
    if (userAudio) userAudio.addEventListener('ended', onUserEnd);

    return () => {
      if (refAudio) refAudio.removeEventListener('ended', onRefEnd);
      if (userAudio) userAudio.removeEventListener('ended', onUserEnd);
    };
  }, [audioUrl, referenceAudioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-muted">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-muted border-b border-transparent px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="auto"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </Button>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Speaking Practice
        </span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        {/* Card */}
        <div className="w-full bg-card rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-border flex flex-col items-center text-center space-y-6">
          <h1 className="text-2xl font-black text-foreground leading-relaxed">{targetSentence}</h1>

          {translation && (
            <p className="text-lg text-muted-foreground font-medium">{translation}</p>
          )}

          {/* Reference Audio Control */}
          {referenceAudioUrl && (
            <Button
              variant="ghost"
              size="auto"
              onClick={toggleReferencePlay}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full font-bold text-sm hover:bg-indigo-100 transition-colors"
            >
              {isPlayingReference ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <Volume2 size={16} />
              )}
              <span>Listen to Reference</span>
              <audio ref={referenceAudioRef} src={referenceAudioUrl} />
            </Button>
          )}
        </div>

        {/* Feedback Area */}
        <div className="h-24 flex items-center justify-center w-full">
          {isRecording ? (
            <div className="flex items-center gap-1">
              {[
                { h: 14, d: 0.55 },
                { h: 24, d: 0.7 },
                { h: 18, d: 0.6 },
                { h: 28, d: 0.75 },
                { h: 16, d: 0.65 },
              ].map((b, i) => (
                <div
                  key={i}
                  className="w-2 bg-rose-500 rounded-full animate-bounce"
                  style={{ height: `${b.h}px`, animationDuration: `${b.d}s` }}
                />
              ))}
              <span className="ml-3 font-mono font-bold text-rose-500">
                {formatTime(recordingTime)}
              </span>
            </div>
          ) : audioUrl ? (
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
              <Button
                variant="ghost"
                size="auto"
                onClick={toggleUserPlay}
                className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {isPlayingUser ? (
                  <Square size={20} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" className="ml-1" />
                )}
                <audio ref={userAudioRef} src={audioUrl} />
              </Button>
              <Button
                variant="ghost"
                size="auto"
                onClick={resetRecording}
                className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted transition-colors"
              >
                <RotateCcw size={18} />
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground font-medium text-sm">Tap mic to record</p>
          )}
        </div>
      </div>

      {/* Footer / Controls */}
      <div className="bg-card border-t border-border p-8 pt-6 pb-[calc(env(safe-area-inset-bottom)+32px)] flex flex-col items-center justify-center rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        {error && <p className="text-rose-500 text-sm mb-4 font-medium">{error}</p>}

        <Button
          variant="ghost"
          size="auto"
          // On mobile, touch events are better for "hold to record", but for simplicity start with toggle
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!!audioUrl} // Disable if already recorded (must reset first)
          className={cn(
            'w-24 h-24 rounded-[32px] flex items-center justify-center transition-all duration-300 shadow-xl',
            isRecording
              ? 'bg-rose-500 shadow-rose-200 scale-110'
              : audioUrl
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-indigo-500 shadow-indigo-200 hover:scale-105 active:scale-95 text-white'
          )}
        >
          {isRecording ? (
            <Square size={32} fill="currentColor" className="text-white" />
          ) : (
            <Mic size={36} className={audioUrl ? 'text-muted-foreground' : 'text-white'} />
          )}
        </Button>
        <p className="mt-4 text-muted-foreground text-xs font-bold uppercase tracking-wider">
          {isRecording ? 'Tap to Stop' : audioUrl ? 'Recorded' : 'Tap to Record'}
        </p>
      </div>
    </div>
  );
}
