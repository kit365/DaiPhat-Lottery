import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { ROUTES } from '@/admin/constants/routes';
import { prefetchBuyTicketCatalog } from '@/client/features/buy-ticket/prefetch/prefetchBuyTicketCatalog';
import { prefetchClientPagesWhenIdle } from '../utils/prefetchClientPagesWhenIdle';
import { shouldSkipClientPrefetch } from '../utils/prefetchImagesWhenIdle';

/**
 * Prefetch funnel mua vé (/tickets, /cart) + catalog vé (tất cả đài) sau khi Home load xong.
 * /tickets được prefetch JS sớm ngay khi mount để click nhanh hơn.
 */
export const usePrefetchClientPagesWhenIdle = (enabled: boolean) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    router.prefetch(ROUTES.PUBLIC.TICKETS);
  }, [router]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return prefetchClientPagesWhenIdle(
      (path) => {
        router.prefetch(path);
      },
      {
        onRoutesWarmed: async () => {
          if (shouldSkipClientPrefetch()) {
            return;
          }
          await prefetchBuyTicketCatalog(queryClient);
        },
      },
    );
  }, [enabled, queryClient, router]);
};
