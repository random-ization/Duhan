import { Download, X } from 'lucide-react';
import { Button } from '../ui';

type MobilePwaInstallPromptCardProps = {
  readonly canPromptInstall: boolean;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly closeLabel: string;
  readonly onInstall: () => void;
  readonly onDismiss: () => void;
};

export function MobilePwaInstallPromptCard({
  canPromptInstall,
  title,
  description,
  actionLabel,
  closeLabel,
  onInstall,
  onDismiss,
}: Readonly<MobilePwaInstallPromptCardProps>) {
  return (
    <div className="md:hidden fixed left-4 right-4 bottom-mobile-floating z-[55] pointer-events-none">
      <div className="pointer-events-auto rounded-2xl border-2 border-foreground bg-card shadow-2xl p-3 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 grid place-items-center shrink-0">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-5">{description}</p>
          {canPromptInstall ? (
            <Button
              type="button"
              size="sm"
              className="mt-2 h-8 rounded-lg text-xs px-3"
              onClick={onInstall}
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-8 w-8 rounded-lg text-muted-foreground"
          aria-label={closeLabel}
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
