import { Trophy } from 'lucide-react';
import { GrammarPointData } from '../../types';
import { Button } from '../ui';

interface MobileGrammarFeedProps {
  readonly grammarPoints: GrammarPointData[];
  readonly onSelect: (grammar: GrammarPointData) => void;
  readonly onToggleStatus: (id: string) => void;
  readonly isLoading: boolean;
}

export default function MobileGrammarFeed({
  grammarPoints,
  onSelect,
  onToggleStatus,
  isLoading,
}: MobileGrammarFeedProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (grammarPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <p className="font-bold">No grammar points found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-3">
      {grammarPoints.map(point => {
        const isMastered = point.status === 'MASTERED';
        const proficiency = point.proficiency || 0;

        const getStatusColor = (type: string) => {
          switch (type) {
            case 'ENDING':
              return 'bg-blue-50 text-blue-600';
            case 'PARTICLE':
              return 'bg-purple-50 text-purple-600';
            case 'CONNECTIVE':
              return 'bg-amber-50 text-amber-600';
            default:
              return 'bg-muted text-muted-foreground';
          }
        };
        const statusColor = getStatusColor(point.type);

        return (
          <Button
            variant="ghost"
            size="auto"
            key={point.id}
            onClick={() => onSelect(point)}
            className="group w-full text-left bg-card rounded-xl border-2 border-border active:border-border active:scale-[0.99] transition-all p-4 flex items-center gap-4 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-0 h-1 bg-muted w-full">
              <div
                className={`h-full transition-all duration-500 ${isMastered ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${proficiency}%` }}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${statusColor}`}
                >
                  {point.type}
                </span>
                {point.level && (
                  <span className="text-[10px] font-bold text-muted-foreground">{point.level}</span>
                )}
              </div>
              <h3 className="text-lg font-black text-foreground leading-tight">{point.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-medium">
                {point.summary}
              </p>
            </div>

            <Button
              variant="ghost"
              size="auto"
              onClick={e => {
                e.stopPropagation();
                onToggleStatus(point.id);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isMastered
                  ? 'bg-green-100 text-green-600'
                  : 'bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground'
              }`}
            >
              {isMastered ? (
                <Trophy className="w-5 h-5 fill-current" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-current" />
              )}
            </Button>
          </Button>
        );
      })}
    </div>
  );
}
