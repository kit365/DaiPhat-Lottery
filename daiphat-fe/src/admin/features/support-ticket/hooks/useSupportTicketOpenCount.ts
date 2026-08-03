import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supportTicketAdminApi } from '../services/supportTicketService';
import { QUERY_KEYS } from '../constants/queryKeys';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { hasPermission } from '../../../utils/permission.util';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { TicketRefType } from '../../../../types/support.type';

const OPEN_STATUSES = 'OPEN,IN_PROGRESS,WAITING_FOR_CUSTOMER';
const PRIZE_PAYOUT_CATEGORY_CODES = 'PRIZE_PAYOUT_SLOW_PROCESSING,PRIZE_PAYOUT_PAID_ISSUE';

/**
 * Polls open/in-progress support tickets for sidebar badges.
 * Shares ADMIN_SUPPORT_TICKETS invalidation with assign/resolve/respond.
 */
export const useSupportTicketOpenCount = (options?: {
    prizePayoutOnly?: boolean;
}) => {
    const prizePayoutOnly = options?.prizePayoutOnly === true;
    const { user } = useAuthStore();
    const canView = hasPermission(user, PERMISSIONS.SUPPORT_TICKET.VIEW);

    const query = useQuery({
        queryKey: [
            QUERY_KEYS.ADMIN_SUPPORT_TICKETS,
            'open-count',
            prizePayoutOnly ? 'prize-payout' : 'all',
        ],
        queryFn: () =>
            supportTicketAdminApi.getStaffTickets({
                page: 1,
                limit: 1,
                statuses: OPEN_STATUSES,
                ...(prizePayoutOnly
                    ? {
                          refType: TicketRefType.PRIZE_CLAIM,
                          categoryCodes: PRIZE_PAYOUT_CATEGORY_CODES,
                      }
                    : {}),
            }),
        enabled: canView,
        refetchOnWindowFocus: true,
        refetchInterval: 5_000,
        staleTime: 0,
    });

    const openCount = useMemo(
        () => Number(query.data?.data?.pagination?.totalRecords || 0),
        [query.data?.data?.pagination?.totalRecords]
    );

    return {
        openCount,
        isLoading: query.isLoading,
    };
};
