import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KT, PageShell } from '../components/mobile/ksoft/ksoft';
import { logError } from '../utils/logger';

const EpubReader = lazy(() =>
  import('../components/reading/EpubReader').then(m => ({ default: m.EpubReader }))
);

const EpubReaderUnavailable: React.FC = () => {
  const navigate = useNavigate();
  return (
    <PageShell>
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-foreground">Book not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This EPUB is unavailable or you do not have access to it.
          </p>
          <button
            type="button"
            onClick={() => navigate('/reading')}
            className="mt-6 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Back to Reading
          </button>
        </div>
      </div>
    </PageShell>
  );
};

class EpubReaderBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    logError('EPUB reader failed', error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const EpubReaderPage: React.FC = () => {
  return (
    <EpubReaderBoundary fallback={<EpubReaderUnavailable />}>
      <Suspense
        fallback={
          <PageShell>
            <div className="flex min-h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: KT.crimson }} />
            </div>
          </PageShell>
        }
      >
        <div
          style={{
            minHeight: '100dvh',
            background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 62%)`,
            fontFamily: KT.font,
          }}
        >
          <EpubReader />
        </div>
      </Suspense>
    </EpubReaderBoundary>
  );
};

export default EpubReaderPage;
