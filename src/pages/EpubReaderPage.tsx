import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const EpubReader = lazy(() =>
  import('../components/reading/EpubReader').then(m => ({ default: m.EpubReader }))
);

const EpubReaderPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <EpubReader />
    </Suspense>
  );
};

export default EpubReaderPage;
