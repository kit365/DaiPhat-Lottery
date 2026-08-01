/**
 * Returns the minimum datetime-local value (current time, timezone-adjusted).
 * Used in scheduled blog publishing fields.
 */
export const getMinScheduleValue = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};
