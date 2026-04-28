import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { KT, PageShell } from '../components/mobile/ksoft/ksoft';

const EpubReader = lazy(() =>
  import('../components/reading/EpubReader').then(m => ({ default: m.EpubReader }))
);

const EpubReaderPage: React.FC = () => {
  return (
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
  );
};

export default EpubReaderPage;
