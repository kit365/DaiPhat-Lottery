import { Suspense } from 'react';
import { ResultsRedirectContent } from './ResultsRedirectContent';

export const dynamic = 'force-dynamic';

export default function ResultsRedirectPage() {
  return (
    <Suspense fallback={null}>
      <ResultsRedirectContent />
    </Suspense>
  );
}
