"use client";

import { useMemo } from "react";
import { highlightDisplayString, highlightLuckyDigits } from "./highlightLuckyDigits";
import type { LuckyDigitSegment } from "./types";
import { useLuckyPatternConfigs } from "./useLuckyPatternConfigs";

type UseLuckyDigitSegmentsOptions = {
    /** When true, highlight the full value as a ticket number (no separator handling). */
    ticket?: boolean;
};

export const useLuckyDigitSegments = (
    value?: string | null,
    options: UseLuckyDigitSegmentsOptions = {}
): LuckyDigitSegment[] => {
    const { data: patterns = [] } = useLuckyPatternConfigs();
    const display = value || "";

    return useMemo(() => {
        if (!display) return [];
        return options.ticket
            ? highlightLuckyDigits(display, patterns)
            : highlightDisplayString(display, patterns);
    }, [display, options.ticket, patterns]);
};

export const useIsLuckyTicket = (value?: string | number | null): boolean => {
    const display = value == null || value === "" ? "" : String(value);
    const segments = useLuckyDigitSegments(display, { ticket: true });
    return segments.some((segment) => Boolean(segment.color));
};
