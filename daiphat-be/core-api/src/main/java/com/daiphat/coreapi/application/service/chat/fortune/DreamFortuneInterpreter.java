package com.daiphat.coreapi.application.service.chat.fortune;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Local sổ mơ interpreter used when daiphat-ai is disabled or unavailable,
 * and as a numbers fallback when AI returns prose without lucky fragments.
 * Never invents ticket serials — only folk 2-digit fragments for DB search.
 */
@Component
public class DreamFortuneInterpreter {

    private static final Pattern NON_WORD = Pattern.compile("[^\\p{L}\\p{N}\\s]+");

    private record DreamSymbol(String label, List<String> aliases, List<String> numbers) {
    }

    private static final List<DreamSymbol> SYMBOLS = List.of(
            new DreamSymbol("heo", List.of("con heo", "heo", "con lon", "lon"), List.of("02", "12", "22", "32", "36", "52")),
            new DreamSymbol("rắn", List.of("con ran", "ran"), List.of("05", "15", "35", "65")),
            new DreamSymbol("chó", List.of("con cho", "cun"), List.of("07", "17", "27", "67")),
            new DreamSymbol("mèo", List.of("con meo", "meo"), List.of("04", "14", "24", "34")),
            new DreamSymbol("gà", List.of("con ga", "ga"), List.of("08", "18", "28", "38")),
            new DreamSymbol("trâu", List.of("con trau", "trau", "con bo"), List.of("09", "19", "49")),
            new DreamSymbol("hổ", List.of("con ho", "cop", "con cop"), List.of("03", "13", "23", "33")),
            new DreamSymbol("rồng", List.of("con rong", "rong"), List.of("06", "16", "26")),
            new DreamSymbol("ngựa", List.of("con ngua", "ngua"), List.of("21", "41", "61")),
            new DreamSymbol("dê", List.of("con de"), List.of("25", "45", "55")),
            new DreamSymbol("khỉ", List.of("con khi"), List.of("29", "39", "59")),
            new DreamSymbol("chuột", List.of("con chuot", "chuot"), List.of("01", "11", "31")),
            new DreamSymbol("thỏ", List.of("con tho", "tho"), List.of("10", "20", "30")),
            new DreamSymbol("cá", List.of("con ca"), List.of("33", "43", "53")),
            new DreamSymbol("rùa", List.of("con rua", "rua"), List.of("48", "58")),
            new DreamSymbol("voi", List.of("con voi", "voi"), List.of("42", "62")),
            new DreamSymbol("vịt", List.of("con vit", "vit"), List.of("44", "64"))
    );

    public record Interpretation(String reply, List<String> luckyNumbers, String symbol) {
    }

    public Interpretation interpret(String message) {
        Optional<DreamSymbol> matched = findSymbol(message);
        if (matched.isEmpty()) {
            return new Interpretation(
                    "Mình đã nhận câu hỏi phong thủy/giấc mơ của bạn. "
                            + "Bạn thử mô tả rõ hơn (vd: \"nằm mơ thấy con heo\") để mình tra sổ mơ "
                            + "và tìm vé khớp số trong kho nhé.",
                    List.of(),
                    null
            );
        }
        DreamSymbol symbol = matched.get();
        String numbersText = String.join(", ", symbol.numbers());
        String reply = "Theo sổ mơ dân gian, mơ thấy \"" + symbol.label() + "\" thường gắn với các số: "
                + numbersText + ". Mình sẽ tìm giúp các vé đang bán trong kho khớp đuôi số này "
                + "(chỉ mang tính tham khảo vui).";
        return new Interpretation(reply, List.copyOf(symbol.numbers()), symbol.label());
    }

    private Optional<DreamSymbol> findSymbol(String message) {
        String normalized = normalize(message);
        if (normalized.isBlank()) {
            return Optional.empty();
        }
        DreamSymbol best = null;
        int bestLen = -1;
        for (DreamSymbol symbol : SYMBOLS) {
            for (String alias : symbol.aliases()) {
                String key = normalize(alias);
                if (!key.isBlank() && containsAlias(normalized, key) && key.length() > bestLen) {
                    best = symbol;
                    bestLen = key.length();
                }
            }
        }
        return Optional.ofNullable(best);
    }

    static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String text = Normalizer.normalize(value, Normalizer.Form.NFC).toLowerCase(Locale.ROOT).trim();
        text = text.replace('đ', 'd').replace('Đ', 'd');
        text = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        text = NON_WORD.matcher(text).replaceAll(" ");
        return text.replaceAll("\\s+", " ").trim();
    }

    static boolean containsAlias(String normalized, String alias) {
        return (" " + normalized + " ").contains(" " + alias + " ");
    }
}
