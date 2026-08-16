import type { QueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/admin/constants/queryKeys";

export const invalidateAdminBadgeCounts = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_BADGES] });
