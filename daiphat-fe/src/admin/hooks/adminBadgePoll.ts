/**
 * Shared gate for Admin layout badge polls.
 * Requires a usable access token + permission (ADMIN bypasses via hasPermission).
 * On auth failure, callers should set refetchInterval to false via `canPoll`.
 */
export const ADMIN_BADGE_POLL_MS = 30_000;

export const shouldPollAdminBadge = (canAccess: boolean): boolean => canAccess;
