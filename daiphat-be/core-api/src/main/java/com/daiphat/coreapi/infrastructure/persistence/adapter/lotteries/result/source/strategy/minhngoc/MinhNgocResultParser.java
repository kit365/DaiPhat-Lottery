package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.source.LotterySourceDocumentSupport;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Document;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class MinhNgocResultParser {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d{2,6}");
    private static final Pattern DATE_PATTERN = Pattern.compile("\\b(\\d{2}/\\d{2}/\\d{4})\\b");

    private static final List<PrizeDefinition> PRIZE_DEFINITIONS = List.of(
            new PrizeDefinition(PrizeLevel.SPECIAL, "DB", 0, List.of("Giải ĐB", "Giải đặc biệt", "Đặc biệt")),
            new PrizeDefinition(PrizeLevel.FIRST, "G1", 1, List.of("Giải nhất", "Giải 1")),
            new PrizeDefinition(PrizeLevel.SECOND, "G2", 2, List.of("Giải nhì", "Giải hai", "Giải 2")),
            new PrizeDefinition(PrizeLevel.THIRD, "G3", 3, List.of("Giải ba", "Giải 3")),
            new PrizeDefinition(PrizeLevel.FOURTH, "G4", 4, List.of("Giải tư", "Giải bốn", "Giải 4")),
            new PrizeDefinition(PrizeLevel.FIFTH, "G5", 5, List.of("Giải năm", "Giải 5")),
            new PrizeDefinition(PrizeLevel.SIXTH, "G6", 6, List.of("Giải sáu", "Giải 6")),
            new PrizeDefinition(PrizeLevel.SEVENTH, "G7", 7, List.of("Giải bảy", "Giải 7")),
            new PrizeDefinition(PrizeLevel.EIGHTH, "G8", 8, List.of("Giải tám", "Giải 8"))
    );

    List<LotteryResultSourceItem> parse(Document document, String stationName, LocalDate drawDate) {
        ensureMatchingDrawDate(document, stationName, drawDate);

        List<LotteryResultSourceItem> structuredItems = parseStructuredTable(document, stationName, drawDate);
        if (!structuredItems.isEmpty()) {
            return structuredItems;
        }

        List<String> lines = toMeaningfulLines(document);
        int startIndex = locateStartIndex(lines, drawDate);
        List<LotteryResultSourceItem> items = new ArrayList<>();
        int cursor = Math.max(startIndex, 0);

        for (PrizeDefinition definition : PRIZE_DEFINITIONS) {
            int prizeIndex = findPrizeIndex(lines, cursor, definition);
            if (prizeIndex < 0) {
                continue;
            }

            int nextPrizeIndex = findNextPrizeIndex(lines, prizeIndex + 1);
            List<String> winningNumbers = extractWinningNumbers(lines, prizeIndex + 1, nextPrizeIndex);
            if (winningNumbers.isEmpty()) {
                cursor = prizeIndex + 1;
                continue;
            }

            items.add(LotteryResultSourceItem.builder()
                    .prizeLevel(definition.prizeLevel().name())
                    .prizeDisplayName(definition.prizeLevel().getDisplayName())
                    .prizeCode(definition.prizeCode())
                    .displayOrder(definition.displayOrder())
                    .winningNumbers(winningNumbers)
                    .note(buildNote(stationName, drawDate))
                    .build());
            cursor = nextPrizeIndex > 0 ? nextPrizeIndex : prizeIndex + 1;
        }

        return items;
    }

    List<String> warnings(Document document, LocalDate drawDate) {
        if (document == null) {
            return List.of("Minh Ngọc không trả về nội dung cho ngày " + drawDate);
        }
        return List.of();
    }

    private List<LotteryResultSourceItem> parseStructuredTable(Document document, String stationName, LocalDate drawDate) {
        Element resultTable = document.selectFirst("table.bkqtinhmiennam table.box_kqxs_content, table.bkqtinhmienbac table.box_kqxs_content");
        if (resultTable == null) {
            return List.of();
        }

        List<LotteryResultSourceItem> items = new ArrayList<>();
        for (PrizeDefinition definition : PRIZE_DEFINITIONS) {
            List<String> winningNumbers = extractStructuredWinningNumbers(resultTable, definition);
            if (winningNumbers.isEmpty()) {
                continue;
            }

            items.add(LotteryResultSourceItem.builder()
                    .prizeLevel(definition.prizeLevel().name())
                    .prizeDisplayName(definition.prizeLevel().getDisplayName())
                    .prizeCode(definition.prizeCode())
                    .displayOrder(definition.displayOrder())
                    .winningNumbers(winningNumbers)
                    .note(buildNote(stationName, drawDate))
                    .build());
        }
        return items;
    }

    private List<String> extractStructuredWinningNumbers(Element resultTable, PrizeDefinition definition) {
        String prizeCellClass = prizeCellClass(definition.prizeLevel());
        if (prizeCellClass == null) {
            return List.of();
        }

        Element prizeCell = resultTable.selectFirst("td." + prizeCellClass);
        if (prizeCell == null) {
            return List.of();
        }

        List<String> winningNumbers = new ArrayList<>();
        for (Element numberNode : prizeCell.select("> div")) {
            String value = cleanNumber(numberNode.text());
            if (!value.isBlank()) {
                winningNumbers.add(value);
            }
        }

        if (winningNumbers.isEmpty()) {
            String value = cleanNumber(prizeCell.text());
            if (!value.isBlank()) {
                winningNumbers.add(value);
            }
        }
        return winningNumbers;
    }

    private String prizeCellClass(PrizeLevel prizeLevel) {
        return switch (prizeLevel) {
            case SPECIAL -> "giaidb";
            case FIRST -> "giai1";
            case SECOND -> "giai2";
            case THIRD -> "giai3";
            case FOURTH -> "giai4";
            case FIFTH -> "giai5";
            case SIXTH -> "giai6";
            case SEVENTH -> "giai7";
            case EIGHTH -> "giai8";
            default -> null;
        };
    }

    private String cleanNumber(String rawValue) {
        if (rawValue == null) {
            return "";
        }
        return rawValue.replaceAll("[^0-9]", "");
    }

    private void ensureMatchingDrawDate(Document document, String stationName, LocalDate expectedDrawDate) {
        if (document == null) {
            throw new DomainException(
                    ErrorCode.LOTTERY_RESULT_SOURCE_EMPTY,
                    "Nguồn Minh Ngọc không trả về nội dung cho đài " + stationName + " ngày " + expectedDrawDate
            );
        }

        LocalDate actualDrawDate = extractPageDrawDate(document);
        if (actualDrawDate == null) {
            throw new DomainException(
                    ErrorCode.LOTTERY_RESULT_SOURCE_INVALID,
                    "Không đọc được ngày quay từ trang Minh Ngọc cho đài " + stationName + " ngày " + expectedDrawDate
            );
        }

        if (!expectedDrawDate.equals(actualDrawDate)) {
            throw new DomainException(
                    ErrorCode.LOTTERY_RESULT_SOURCE_INVALID,
                    "Trang Minh Ngọc trả về ngày quay " + actualDrawDate + " thay vì " + expectedDrawDate
                            + " cho đài " + stationName
            );
        }
    }

    private String buildNote(String stationName, LocalDate drawDate) {
        return "Parsed from Minh Ngọc result page for " + stationName + " on " + drawDate;
    }

    private List<String> toMeaningfulLines(Document document) {
        String wholeText = LotterySourceDocumentSupport.wholeText(document);
        if (wholeText.isBlank()) {
            return List.of();
        }

        return Arrays.stream(wholeText.replace('\r', '\n').split("\n"))
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .toList();
    }

    private LocalDate extractPageDrawDate(Document document) {
        List<String> lines = toMeaningfulLines(document);
        for (String line : lines) {
            if (!line.contains("/")) {
                continue;
            }
            Matcher matcher = DATE_PATTERN.matcher(line);
            if (matcher.find()) {
                LocalDate parsed = tryParseDate(matcher.group(1));
                if (parsed != null) {
                    return parsed;
                }
            }
        }

        Matcher titleMatcher = DATE_PATTERN.matcher(document.title());
        if (titleMatcher.find()) {
            return tryParseDate(titleMatcher.group(1));
        }

        return null;
    }

    private LocalDate tryParseDate(String rawDate) {
        try {
            return LocalDate.parse(rawDate, DATE_FORMATTER);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private int locateStartIndex(List<String> lines, LocalDate drawDate) {
        String formattedDate = drawDate.format(DATE_FORMATTER);
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.contains(formattedDate) && (line.contains("KẾT QUẢ XỔ SỐ") || line.startsWith("Ngày:"))) {
                return i;
            }
        }
        return 0;
    }

    private int findPrizeIndex(List<String> lines, int fromIndex, PrizeDefinition definition) {
        for (int i = Math.max(fromIndex, 0); i < lines.size(); i++) {
            if (matchesPrize(lines.get(i), definition)) {
                return i;
            }
        }
        return -1;
    }

    private int findNextPrizeIndex(List<String> lines, int fromIndex) {
        for (int i = Math.max(fromIndex, 0); i < lines.size(); i++) {
            for (PrizeDefinition definition : PRIZE_DEFINITIONS) {
                if (matchesPrize(lines.get(i), definition)) {
                    return i;
                }
            }
            if (isResultFooter(lines.get(i))) {
                return i;
            }
        }
        return lines.size();
    }

    private List<String> extractWinningNumbers(List<String> lines, int fromIndex, int toIndex) {
        List<String> winningNumbers = new ArrayList<>();
        for (int i = fromIndex; i < Math.min(toIndex, lines.size()); i++) {
            String line = lines.get(i);
            if (isResultFooter(line)) {
                break;
            }
            Matcher matcher = NUMBER_PATTERN.matcher(line);
            while (matcher.find()) {
                winningNumbers.add(matcher.group());
            }
        }
        return winningNumbers;
    }

    private boolean matchesPrize(String line, PrizeDefinition definition) {
        String normalizedLine = normalize(line);
        for (String alias : definition.aliases()) {
            if (normalizedLine.equals(normalize(alias))) {
                return true;
            }
        }
        return false;
    }

    private boolean isResultFooter(String line) {
        String normalized = normalize(line);
        return normalized.startsWith("chu so dau")
                || normalized.startsWith("chu so duoi")
                || normalized.contains("doi so trung")
                || normalized.contains("bang loto")
                || normalized.equals("dau")
                || normalized.equals("duoi");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
                .replaceAll("\\s+", " ");
    }

    private record PrizeDefinition(
            PrizeLevel prizeLevel,
            String prizeCode,
            Integer displayOrder,
            List<String> aliases
    ) {
    }
}
