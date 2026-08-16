import { describe, expect, it } from "vitest";
import {
    highlightLuckyDigits,
    luckyPatternMatches,
} from "./luckyNumberHighlight";
import type { LuckyHighlightPattern } from "./luckyNumberHighlight";

const locPhat: LuckyHighlightPattern = {
    patternType: "EXACT",
    exactNumbers: "123456,686868",
    badgeLabel: "Lộc phát",
    badgeColor: "#FFAB00",
    priority: 100,
    active: true,
};

const suffix68: LuckyHighlightPattern = {
    patternType: "DIGIT_MATCH",
    matchDigits: "68",
    matchPosition: "SUFFIX",
    badgeLabel: "Đuôi 68",
    badgeColor: "#00B8D9",
    priority: 80,
    active: true,
};

const prefix39: LuckyHighlightPattern = {
    patternType: "DIGIT_MATCH",
    matchDigits: "39",
    matchPosition: "PREFIX",
    badgeLabel: "Đầu 39",
    badgeColor: "#22C55E",
    priority: 70,
    active: true,
};

describe("luckyPatternMatches", () => {
    it("khớp EXACT và DIGIT_MATCH như BE", () => {
        expect(luckyPatternMatches("686868", "EXACT", "123456,686868", null, null)).toBe(true);
        expect(luckyPatternMatches("123999", "DIGIT_MATCH", null, "999", "SUFFIX")).toBe(true);
        expect(luckyPatternMatches("999123", "DIGIT_MATCH", null, "999", "SUFFIX")).toBe(false);
    });
});

describe("highlightLuckyDigits", () => {
    it("tô đuôi 68", () => {
        expect(highlightLuckyDigits("132468", [suffix68])).toEqual([
            { text: "1324" },
            { text: "68", color: "#00B8D9" },
        ]);
    });

    it("tô cả dãy EXACT", () => {
        expect(highlightLuckyDigits("686868", [locPhat, suffix68])).toEqual([
            { text: "686868", color: "#FFAB00" },
        ]);
    });

    it("tô đầu và đuôi khi khớp hai rule", () => {
        expect(highlightLuckyDigits("399968", [suffix68, prefix39])).toEqual([
            { text: "39", color: "#22C55E" },
            { text: "99" },
            { text: "68", color: "#00B8D9" },
        ]);
    });
});
