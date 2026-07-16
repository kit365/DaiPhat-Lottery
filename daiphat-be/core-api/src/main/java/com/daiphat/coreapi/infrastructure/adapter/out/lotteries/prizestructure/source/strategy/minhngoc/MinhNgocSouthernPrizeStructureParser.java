package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.prizestructure.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.infrastructure.adapter.out.lotteries.source.LotterySourceDocumentSupport;
import org.jsoup.nodes.Document;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class MinhNgocSouthernPrizeStructureParser {

    private static final List<RowDefinition> ROWS = List.of(
            new RowDefinition("Giải đặc biệt", PrizeLevel.SPECIAL, "DB", 0, MatchFrom.EXACT),
            new RowDefinition("Giải nhất", PrizeLevel.FIRST, "G1", 1, MatchFrom.LAST),
            new RowDefinition("Giải hai", PrizeLevel.SECOND, "G2", 2, MatchFrom.LAST),
            new RowDefinition("Giải ba", PrizeLevel.THIRD, "G3", 3, MatchFrom.LAST),
            new RowDefinition("Giải bốn", PrizeLevel.FOURTH, "G4", 4, MatchFrom.LAST),
            new RowDefinition("Giải năm", PrizeLevel.FIFTH, "G5", 5, MatchFrom.LAST),
            new RowDefinition("Giải sáu", PrizeLevel.SIXTH, "G6", 6, MatchFrom.LAST),
            new RowDefinition("Giải bảy", PrizeLevel.SEVENTH, "G7", 7, MatchFrom.LAST),
            new RowDefinition("Giải tám", PrizeLevel.EIGHTH, "G8", 8, MatchFrom.LAST)
    );

    List<PrizeStructureSourceItem> parse(Document document, String region) {
        if (document == null) {
            return List.of();
        }
        String text = extractRelevantSection(LotterySourceDocumentSupport.wholeText(document));
        String normalizedText = normalizeText(text);
        List<PrizeStructureSourceItem> items = new ArrayList<>();

        for (RowDefinition row : ROWS) {
            PrizeStructureSourceItem item = parseMainPrize(normalizedText, region, row);
            if (item != null) {
                items.add(item);
            }
        }

        PrizeStructureSourceItem subSpecial = parseSubSpecial(normalizedText, region);
        if (subSpecial != null) {
            items.add(subSpecial);
        }

        PrizeStructureSourceItem consolation = parseConsolation(normalizedText, region);
        if (consolation != null) {
            items.add(consolation);
        }

        return items;
    }

    private PrizeStructureSourceItem parseMainPrize(String normalizedText, String region, RowDefinition row) {
        Pattern pattern = Pattern.compile(
                "(\\d{1,3}(?:\\.\\d{3})*)\\s+"
                        + Pattern.quote(normalizeText(row.displayName()))
                        + "\\s*\\(\\s*(\\d+)\\s*số\\s*\\)\\s+"
                        + "(\\d{1,3}(?:\\.\\d{3})*)đ",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
        );
        Matcher matcher = pattern.matcher(normalizedText);
        if (!matcher.find()) {
            return null;
        }

        return PrizeStructureSourceItem.builder()
                .region(region)
                .prizeLevel(row.prizeLevel().name())
                .prizeDisplayName(row.displayName())
                .prizeCode(row.prizeCode())
                .prizeValue(parseAmount(matcher.group(3)))
                .quantity(parseInteger(matcher.group(1)))
                .matchDigits(parseInteger(matcher.group(2)))
                .matchFrom(row.matchFrom().name())
                .matchFromDisplayName(resolveMatchFromDisplayName(row.matchFrom()))
                .displayOrder(row.displayOrder())
                .isActive(true)
                .build();
    }

    private PrizeStructureSourceItem parseSubSpecial(String text, String region) {
        Pattern pattern = Pattern.compile(
                "(\\d{1,3}(?:\\.\\d{3})*)\\s+giải\\s+Phụ\\s+đặc\\s+biệt.*?mỗi\\s+giải\\s+trị\\s+(\\d{1,3}(?:\\.\\d{3})*)đ",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.DOTALL
        );
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }

        return buildDerivedPrizeStructureFromSource(
                region,
                PrizeLevel.SUB_SPECIAL,
                "DB_PHU",
                cleanDescription(matcher.group(0)),
                parseAmount(matcher.group(2)),
                parseInteger(matcher.group(1)),
                MatchFrom.SPECIAL_CONSOLATION_1,
                9
        );
    }

    private PrizeStructureSourceItem parseConsolation(String text, String region) {
        Pattern pattern = Pattern.compile(
                "(\\d{1,3}(?:\\.\\d{3})*)\\s+giải\\s+Khuyến\\s+khích.*?mỗi\\s+giải\\s+trị\\s+giá\\s+(\\d{1,3}(?:\\.\\d{3})*)đ",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.DOTALL
        );
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }

        return buildDerivedPrizeStructureFromSource(
                region,
                PrizeLevel.CONSOLATION,
                "KK",
                cleanDescription(matcher.group(0)),
                parseAmount(matcher.group(2)),
                parseInteger(matcher.group(1)),
                MatchFrom.SPECIAL_CONSOLATION_2,
                10
        );
    }

    private BigDecimal parseAmount(String value) {
        return BigDecimal.valueOf(parseInteger(value));
    }

    private Integer parseInteger(String value) {
        return Integer.parseInt(value.replace(".", "").trim());
    }

    private String cleanDescription(String value) {
        return value.replaceAll("\\s+", " ").trim();
    }

    private PrizeStructureSourceItem buildDerivedPrizeStructureFromSource(
            String region,
            PrizeLevel prizeLevel,
            String prizeCode,
            String description,
            BigDecimal prizeValue,
            Integer quantity,
            MatchFrom matchFrom,
            Integer displayOrder
    ) {
        return PrizeStructureSourceItem.builder()
                .region(region)
                .prizeLevel(prizeLevel.name())
                .prizeDisplayName(prizeLevel.getDisplayName())
                .prizeCode(prizeCode)
                .description(description)
                .prizeValue(prizeValue)
                .quantity(quantity)
                .matchDigits(5)
                .matchFrom(matchFrom.name())
                .matchFromDisplayName(matchFrom.getDisplayName())
                .displayOrder(displayOrder)
                .isActive(true)
                .build();
    }

    private String resolveMatchFromDisplayName(MatchFrom matchFrom) {
        return matchFrom.getDisplayName();
    }

    private String extractRelevantSection(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        int start = indexOfIgnoreCase(text, "CƠ CẤU GIẢI THƯỞNG");
        if (start < 0) {
            start = indexOfIgnoreCase(text, "Cơ cấu giải thưởng");
        }
        if (start < 0) {
            return text;
        }

        int end = indexOfIgnoreCase(text, "-Vé trùng nhiều giải");
        if (end < 0) {
            end = indexOfIgnoreCase(text, "Vé trùng nhiều giải");
        }
        if (end < 0 || end <= start) {
            end = Math.min(text.length(), start + 4000);
        }

        return text.substring(start, end);
    }

    private String normalizeText(String text) {
        return Objects.requireNonNullElse(text, "")
                .replace('\u00A0', ' ')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private int indexOfIgnoreCase(String text, String needle) {
        return text.toLowerCase(Locale.ROOT).indexOf(needle.toLowerCase(Locale.ROOT));
    }

    private record RowDefinition(
            String displayName,
            PrizeLevel prizeLevel,
            String prizeCode,
            Integer displayOrder,
            MatchFrom matchFrom
    ) {
    }
}
