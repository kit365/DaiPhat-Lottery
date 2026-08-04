/** Mirrors backend PersonNameMatchUtils — diacritic-insensitive, case-insensitive name compare. */
export const normalizePersonName = (value?: string | null): string => {
    if (value == null || !String(value).trim()) {
        return '';
    }
    const collapsed = String(value).trim().replace(/\s+/g, ' ');
    return collapsed
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase();
};

export const personNamesMatch = (left?: string | null, right?: string | null): boolean => {
    const a = normalizePersonName(left);
    const b = normalizePersonName(right);
    if (!a || !b) return false;
    return a === b;
};
