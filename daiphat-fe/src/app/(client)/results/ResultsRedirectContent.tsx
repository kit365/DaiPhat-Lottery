"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function ResultsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams ? searchParams.toString() : '';
    router.replace(query ? `/?${query}` : '/');
  }, [router, searchParams]);

  return null;
}
