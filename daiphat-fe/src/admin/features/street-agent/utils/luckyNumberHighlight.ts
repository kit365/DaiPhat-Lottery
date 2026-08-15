import type { LuckyMatchPosition, LuckyPatternConfig, LuckyPatternType } from "../types/street-agent.type";

export type LuckyDigitSegment = {
    text: string;
    color?: string;
};

export type LuckyHighlightPattern = Pick<
    LuckyPatternConfig,
    "patternType" | "exactNumbers" | "matchDigits" | "matchPosition" | "badgeColor" | "badgeLabel" | "priority" | "active"
>;

const DEFAULT_LUCKY_COLOR = "#F59E0B";

const isActive = (pattern: LuckyHighlightPattern) => pattern.active !== false;

const exactValues = (exactNumbers?: string | null) =>
    (exactNumbers || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

export const luckyPatternMatches = (
    ticketNumbers: string,
    patternType: LuckyPatternType,
    exactNumbers?: string | null,
    matchDigits?: string | null,
    matchPosition?: LuckyMatchPosition | null
): boolean => {
    if (!ticketNumbers) return false;
    if (patternType === "EXACT") {
        return exactValues(exactNumbers).some((value) => value === ticketNumbers);
    }
    const digits = (matchDigits || "").trim();
    if (!digits) return false;
    const position = matchPosition || "ANYWHERE";
    if (position === "PREFIX") return ticketNumbers.startsWith(digits);
    if (position === "SUFFIX") return ticketNumbers.endsWith(digits);
    return ticketNumbers.includes(digits);
};

const matchRanges = (ticketNumbers: string, pattern: LuckyHighlightPattern): Array<[number, number]> => {
    if (pattern.patternType === "EXACT") {
        return luckyPatternMatches(
            ticketNumbers,
            pattern.patternType,
            pattern.exactNumbers,
            pattern.matchDigits,
            pattern.matchPosition
        )
            ? [[0, ticketNumbers.length]]
            : [];
    }

    const digits = (pattern.matchDigits || "").trim();
    if (!digits) return [];
    const position = pattern.matchPosition || "ANYWHERE";

    if (position === "PREFIX") {
        return ticketNumbers.startsWith(digits) ? [[0, digits.length]] : [];
    }
    if (position === "SUFFIX") {
        return ticketNumbers.endsWith(digits)
            ? [[ticketNumbers.length - digits.length, ticketNumbers.length]]
            : [];
    }

    const ranges: Array<[number, number]> = [];
    let from = 0;
    while (from <= ticketNumbers.length - digits.length) {
        const index = ticketNumbers.indexOf(digits, from);
        if (index < 0) break;
        ranges.push([index, index + digits.length]);
        from = index + digits.length;
    }
    return ranges;
};

/** Highest-priority matching pattern paints first; later patterns only fill uncolored digits. */
export const highlightLuckyDigits = (
    ticketNumbers: string,
    patterns: LuckyHighlightPattern[] | undefined
): LuckyDigitSegment[] => {
    const ticket = ticketNumbers || "";
    if (!ticket) return [];

    const colors: Array<string | undefined> = Array.from({ length: ticket.length });
    const sorted = [...(patterns || [])]
        .filter(isActive)
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const pattern of sorted) {
        if (
            !luckyPatternMatches(
                ticket,
                pattern.patternType,
                pattern.exactNumbers,
                pattern.matchDigits,
                pattern.matchPosition
            )
        ) {
            continue;
        }
        const color = pattern.badgeColor?.trim() || DEFAULT_LUCKY_COLOR;
        for (const [start, end] of matchRanges(ticket, pattern)) {
            for (let index = start; index < end; index += 1) {
                if (!colors[index]) colors[index] = color;
            }
        }
    }

    const segments: LuckyDigitSegment[] = [];
    for (let index = 0; index < ticket.length; index += 1) {
        const color = colors[index];
        const last = segments[segments.length - 1];
        if (last && last.color === color) {
            last.text += ticket[index];
        } else {
            segments.push({ text: ticket[index], color });
        }
    }
    return segments;
};

export const luckyBadgeColor = (
    badgeLabel: string,
    patterns: LuckyHighlightPattern[] | undefined
): string => {
    const match = (patterns || []).find(
        (pattern) => isActive(pattern) && pattern.badgeLabel === badgeLabel && pattern.badgeColor?.trim()
    );
    return match?.badgeColor?.trim() || DEFAULT_LUCKY_COLOR;
};
