package com.daiphat.coreapi.application.service.chat.fortune;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Maps western zodiac, Chinese zodiac (con giáp), and ngũ hành / căn mệnh cues
 * to folk-style 2-digit lucky tails for chat ticket suggestions.
 * <p>
 * Numbers are reference-only and used to search sellable inventory suffixes.
 */
@Component
public class DestinyNumberInterpreter {

    private record DestinySymbol(String label, String kind, List<String> aliases, List<String> numbers) {
    }

    private static final List<DestinySymbol> SYMBOLS = List.of(
            // —— Cung hoàng đạo ——
            new DestinySymbol("Bạch Dương", "cung", List.of("bach duong", "aries"), List.of("01", "10", "19", "28")),
            new DestinySymbol("Kim Ngưu", "cung", List.of("kim nguu", "taurus"), List.of("02", "11", "20", "29")),
            new DestinySymbol("Song Tử", "cung", List.of("song tu", "gemini"), List.of("03", "12", "21", "30")),
            new DestinySymbol("Cự Giải", "cung", List.of("cu giai", "cancer"), List.of("04", "13", "22", "31")),
            new DestinySymbol("Sư Tử", "cung", List.of("su tu", "leo"), List.of("05", "14", "23", "32")),
            new DestinySymbol("Xử Nữ", "cung", List.of("xu nu", "virgo"), List.of("06", "15", "24", "33")),
            new DestinySymbol("Thiên Bình", "cung", List.of("thien binh", "libra"), List.of("07", "16", "25", "34")),
            new DestinySymbol("Thiên Yết", "cung", List.of("thien yet", "bo cap", "scorpio", "bo cap"), List.of("08", "17", "26", "35")),
            new DestinySymbol("Nhân Mã", "cung", List.of("nhan ma", "sagittarius"), List.of("09", "18", "27", "36")),
            new DestinySymbol("Ma Kết", "cung", List.of("ma ket", "capricorn"), List.of("00", "19", "28", "37")),
            new DestinySymbol("Bảo Bình", "cung", List.of("bao binh", "aquarius"), List.of("11", "22", "33", "44")),
            new DestinySymbol("Song Ngư", "cung", List.of("song ngu", "pisces"), List.of("12", "24", "36", "48")),

            // —— Con giáp ——
            new DestinySymbol("Tý (Chuột)", "giap", List.of("tuoi ty", "con ty", "giap ty", "ty chuot", "con chuot"), List.of("01", "11", "31", "41")),
            new DestinySymbol("Sửu (Trâu)", "giap", List.of("tuoi suu", "con suu", "giap suu", "trau"), List.of("09", "19", "49", "59")),
            new DestinySymbol("Dần (Hổ)", "giap", List.of("tuoi dan", "con dan", "giap dan", "con ho", "con cop"), List.of("03", "13", "23", "33")),
            new DestinySymbol("Mão (Mèo)", "giap", List.of("tuoi mao", "con mao", "giap mao", "con meo"), List.of("04", "14", "24", "34")),
            new DestinySymbol("Thìn (Rồng)", "giap", List.of("tuoi thin", "con thin", "giap thin", "con rong"), List.of("06", "16", "26", "66")),
            new DestinySymbol("Tỵ (Rắn)", "giap", List.of("tuoi ti", "con ti", "giap ti", "tuoi ran", "con ran"), List.of("05", "15", "35", "65")),
            new DestinySymbol("Ngọ (Ngựa)", "giap", List.of("tuoi ngo", "con ngo", "giap ngo", "con ngua"), List.of("21", "41", "61", "81")),
            new DestinySymbol("Mùi (Dê)", "giap", List.of("tuoi mui", "con mui", "giap mui", "con de"), List.of("25", "45", "55", "75")),
            new DestinySymbol("Thân (Khỉ)", "giap", List.of("tuoi than", "con than", "giap than", "con khi"), List.of("29", "39", "59", "79")),
            new DestinySymbol("Dậu (Gà)", "giap", List.of("tuoi dau", "con dau", "giap dau", "con ga"), List.of("08", "18", "28", "38")),
            new DestinySymbol("Tuất (Chó)", "giap", List.of("tuoi tuat", "con tuat", "giap tuat", "con cho"), List.of("07", "17", "27", "67")),
            new DestinySymbol("Hợi (Heo)", "giap", List.of("tuoi hoi", "con hoi", "giap hoi", "con heo", "con lon"), List.of("02", "12", "22", "32")),

            // —— Ngũ hành / căn mệnh ——
            new DestinySymbol("mệnh Kim", "menh", List.of("menh kim", "can menh kim", "ban menh kim", "hanh kim"), List.of("04", "09", "14", "49")),
            new DestinySymbol("mệnh Mộc", "menh", List.of("menh moc", "can menh moc", "ban menh moc", "hanh moc"), List.of("03", "08", "13", "38")),
            new DestinySymbol("mệnh Thủy", "menh", List.of("menh thuy", "can menh thuy", "ban menh thuy", "hanh thuy"), List.of("01", "06", "16", "61")),
            new DestinySymbol("mệnh Hỏa", "menh", List.of("menh hoa", "can menh hoa", "ban menh hoa", "hanh hoa"), List.of("02", "07", "27", "72")),
            new DestinySymbol("mệnh Thổ", "menh", List.of("menh tho", "can menh tho", "ban menh tho", "hanh tho"), List.of("05", "00", "15", "50"))
    );

    /** Topic cues without a specific symbol — still route to fortune + generic suggest. */
    private static final List<String> TOPIC_CUES = List.of(
            "cung hoang dao",
            "hoang dao",
            "con giap",
            "can menh",
            "ban menh",
            "ngu hanh",
            "chiem tinh",
            "tu vi",
            "phong thuy",
            "boi so",
            "gieo que",
            "nen mua so",
            "mua so gi",
            "so hop"
    );

    public record Interpretation(String reply, List<String> luckyNumbers, String symbol) {
    }

    public Optional<Interpretation> interpret(String message) {
        String normalized = DreamFortuneInterpreter.normalize(message);
        if (normalized.isBlank()) {
            return Optional.empty();
        }

        Optional<DestinySymbol> matched = findBestSymbol(normalized);
        if (matched.isPresent()) {
            DestinySymbol symbol = matched.get();
            return Optional.of(buildMatchedReply(symbol));
        }

        if (!hasTopicCue(normalized)) {
            return Optional.empty();
        }

        return Optional.of(new Interpretation(
                "Đại Phát có thể gợi ý đuôi số theo cung hoàng đạo, con giáp hoặc căn mệnh. "
                        + "Quý khách cho biết cụ thể (ví dụ: \"cung Thiên Bình\", \"tuổi Tý\", \"mệnh Kim\") "
                        + "để Đại Phát gợi ý số và vé đang bán nhé. Thông tin chỉ mang tính tham khảo.",
                List.of(),
                null
        ));
    }

    /** True when message mentions destiny/astrology topics or a known symbol. */
    public boolean matchesCue(String normalizedOrRaw) {
        String normalized = DreamFortuneInterpreter.normalize(normalizedOrRaw);
        if (normalized.isBlank()) {
            return false;
        }
        return findBestSymbol(normalized).isPresent() || hasTopicCue(normalized);
    }

    private Interpretation buildMatchedReply(DestinySymbol symbol) {
        String numbersText = String.join(", ", symbol.numbers());
        String kindLabel = switch (symbol.kind()) {
            case "cung" -> "cung hoàng đạo";
            case "giap" -> "con giáp";
            case "menh" -> "căn mệnh";
            default -> "vận mệnh";
        };
        String reply = "Theo tham khảo dân gian về " + kindLabel + " \"" + symbol.label()
                + "\", các đuôi số thường được nhắc tới là " + numbersText
                + ". Thông tin này chỉ mang tính tham khảo nhé.";
        return new Interpretation(reply, List.copyOf(symbol.numbers()), symbol.label());
    }

    private Optional<DestinySymbol> findBestSymbol(String normalized) {
        DestinySymbol best = null;
        int bestLen = -1;
        for (DestinySymbol symbol : SYMBOLS) {
            for (String alias : symbol.aliases()) {
                String key = DreamFortuneInterpreter.normalize(alias);
                if (key.isBlank()) {
                    continue;
                }
                // Avoid bare "kim/moc/..." matching inside unrelated words unless word-bounded.
                boolean hit = key.length() <= 3
                        ? DreamFortuneInterpreter.containsAlias(normalized, key)
                        : normalized.contains(key) || DreamFortuneInterpreter.containsAlias(normalized, key);
                if (hit && key.length() > bestLen) {
                    best = symbol;
                    bestLen = key.length();
                }
            }
        }
        return Optional.ofNullable(best);
    }

    private static boolean hasTopicCue(String normalized) {
        for (String cue : TOPIC_CUES) {
            if (normalized.contains(cue)) {
                return true;
            }
        }
        // "mệnh gì" / "mệnh của tôi"
        return normalized.contains("menh gi")
                || normalized.contains("menh cua")
                || normalized.matches(".*\\bmenh\\b.*");
    }
}
