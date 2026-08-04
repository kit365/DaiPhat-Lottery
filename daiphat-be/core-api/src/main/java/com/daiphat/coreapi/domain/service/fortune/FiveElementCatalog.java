package com.daiphat.coreapi.domain.service.fortune;

import com.daiphat.coreapi.domain.model.enums.fortune.FiveElement;
import com.nlf.calendar.Lunar;
import com.nlf.calendar.Solar;

import java.time.LocalDate;

/**
 * Static catalogs and calendars for fortune-cast five-element resolution.
 * Year element uses the heavenly-stem cycle (sexagenary); day element uses
 * the lunar library earthly branch for the solar date (Asia/Ho_Chi_Minh business day).
 */
public final class FiveElementCatalog {

    private FiveElementCatalog() {
    }

    /**
     * Birth-year element from the heavenly stem of the sexagenary cycle.
     * Stem index = (year - 4) mod 10 → paired stems share one element.
     */
    public static FiveElement elementForBirthYear(int year) {
        int stem = Math.floorMod(year - 4, 10);
        return switch (stem) {
            case 0, 1 -> FiveElement.WOOD;
            case 2, 3 -> FiveElement.FIRE;
            case 4, 5 -> FiveElement.EARTH;
            case 6, 7 -> FiveElement.METAL;
            default -> FiveElement.WATER;
        };
    }

    /**
     * Day element from the earthly branch of the lunar day for the given solar date.
     */
    public static FiveElement elementForSolarDate(LocalDate date) {
        Solar solar = Solar.fromYmd(date.getYear(), date.getMonthValue(), date.getDayOfMonth());
        Lunar lunar = solar.getLunar();
        String zhi = lunar.getDayZhi();
        return elementForEarthlyBranch(zhi);
    }

    /**
     * Fixed mapping: last digit of the two-digit ticket tail → five element.
     */
    public static FiveElement elementForTail(String tail) {
        if (tail == null || tail.length() < 2) {
            throw new IllegalArgumentException("Tail must be two digits");
        }
        char last = tail.charAt(tail.length() - 1);
        if (!Character.isDigit(last)) {
            throw new IllegalArgumentException("Tail must be numeric: " + tail);
        }
        int digit = last - '0';
        return switch (digit) {
            case 0, 1 -> FiveElement.METAL;
            case 2, 3 -> FiveElement.WOOD;
            case 4, 5 -> FiveElement.WATER;
            case 6, 7 -> FiveElement.FIRE;
            default -> FiveElement.EARTH;
        };
    }

    static FiveElement elementForEarthlyBranch(String zhi) {
        if (zhi == null || zhi.isBlank()) {
            return FiveElement.EARTH;
        }
        return switch (zhi.trim()) {
            case "子", "亥" -> FiveElement.WATER;   // Rat, Pig
            case "寅", "卯" -> FiveElement.WOOD;    // Tiger, Rabbit
            case "巳", "午" -> FiveElement.FIRE;    // Snake, Horse
            case "申", "酉" -> FiveElement.METAL;   // Monkey, Rooster
            case "丑", "辰", "未", "戌" -> FiveElement.EARTH; // Ox, Dragon, Goat, Dog
            default -> FiveElement.EARTH;
        };
    }
}
