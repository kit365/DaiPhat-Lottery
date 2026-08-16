export type LuckyPatternType = "EXACT" | "DIGIT_MATCH";

export type LuckyMatchPosition = "PREFIX" | "SUFFIX" | "ANYWHERE";

export interface LuckyPatternConfig {
    id: number;
    patternType: LuckyPatternType;
    exactNumbers?: string | null;
    matchDigits?: string | null;
    matchPosition?: LuckyMatchPosition | null;
    name: string;
    description?: string | null;
    badgeLabel: string;
    badgeColor?: string | null;
    priority?: number | null;
    active?: boolean | null;
}

export type LuckyHighlightPattern = Pick<
    LuckyPatternConfig,
    "patternType" | "exactNumbers" | "matchDigits" | "matchPosition" | "badgeColor" | "badgeLabel" | "priority" | "active"
>;

export type LuckyDigitSegment = {
    text: string;
    color?: string;
};
