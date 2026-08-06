import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/admin/constants/routes';
import { prefetchClientPagesWhenIdle } from '../utils/prefetchClientPagesWhenIdle';

/**
 * Prefetch route JS + banner theo thứ tự ưu tiên sau khi Home load xong.
 * /tickets được prefetch JS sớm ngay khi mount để click nhanh hơn.
 */
export const usePrefetchClientPagesWhenIdle = (enabled: boolean) => {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(ROUTES.PUBLIC.TICKETS);
  }, [router]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return prefetchClientPagesWhenIdle((path) => {
      router.prefetch(path);
    });
  }, [enabled, router]);
};
