const drawTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const formatSupplierTime = (value?: string | null): string => {
    if (!value) {
        return '—';
    }
    const trimmed = String(value).trim();
    const match = trimmed.match(drawTimePattern);
    if (match) {
        return match[0];
    }
    const embeddedTime = trimmed.match(/(?:T|\s)([01]\d|2[0-3]):([0-5]\d)/);
    return embeddedTime ? `${embeddedTime[1]}:${embeddedTime[2]}` : '—';
};
