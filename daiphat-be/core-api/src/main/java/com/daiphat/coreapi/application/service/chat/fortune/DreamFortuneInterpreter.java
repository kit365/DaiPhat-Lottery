package com.daiphat.coreapi.application.service.chat.fortune;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.CRC32;

/**
 * Local sổ mơ interpreter used when daiphat-ai is disabled or unavailable,
 * and as a numbers fallback when AI returns prose without lucky fragments.
 * <p>
 * Known folk symbols keep curated 2-digit mappings. Any other dream subject
 * (animal, object, person, place, …) extracted from dream phrasing still gets
 * stable reference numbers for inventory search — never invented ticket serials.
 */
@Component
public class DreamFortuneInterpreter {

    private static final Pattern NON_WORD = Pattern.compile("[^\\p{L}\\p{N}\\s]+");
    private static final Pattern DREAM_SUBJECT = Pattern.compile(
            "(?iu)(?:nằm\\s+mơ|chiêm\\s+bao|giấc\\s+mơ|\\bmơ)\\s+(?:thấy|về|đến|tới)\\s+(.+)$"
    );
    private static final Pattern LEADING_CLASSIFIER = Pattern.compile(
            "(?iu)^(con|cái|chiếc|cây|quả|trái|tờ|lá|người|ông|bà|anh|chị|em|bé|đứa|một|những|các)\\s+"
    );
    private static final Pattern TRAILING_NOISE = Pattern.compile(
            "(?iu)\\s+(thì|là|nhé|nha|ạ|à|ơi|giúp|cho\\s+tôi|cho\\s+mình|với|nhé\\.?|\\.|,|!|\\?).*$"
    );
    private static final Set<String> STOP_SUBJECTS = Set.of(
            "gi", "gi do", "cai gi", "thu gi", "gi do ay", "gi vay", "sao", "the nao"
    );

    private record DreamSymbol(String label, List<String> aliases, List<String> numbers) {
    }

    private static final List<DreamSymbol> SYMBOLS = List.of(
            new DreamSymbol("heo", List.of("con heo", "heo", "con lon", "lon"), List.of("02", "12", "22", "32", "36", "52")),
            new DreamSymbol("rắn", List.of("con ran", "ran"), List.of("05", "15", "35", "65")),
            new DreamSymbol("chó", List.of("con cho", "cun"), List.of("07", "17", "27", "67")),
            new DreamSymbol("mèo", List.of("con meo", "meo"), List.of("04", "14", "24", "34")),
            new DreamSymbol("gà", List.of("con ga", "ga"), List.of("08", "18", "28", "38")),
            new DreamSymbol("bò", List.of("con bo", "bo sua", "con bo sua"), List.of("09", "19", "49")),
            new DreamSymbol("trâu", List.of("con trau", "trau"), List.of("09", "19", "49")),
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
            new DreamSymbol("vịt", List.of("con vit", "vit"), List.of("44", "64")),
            new DreamSymbol("gián", List.of("con gian", "gian"), List.of("18", "28", "58")),
            new DreamSymbol("kiến", List.of("con kien", "kien"), List.of("14", "24", "54")),
            new DreamSymbol("muỗi", List.of("con muoi", "muoi"), List.of("16", "26", "56")),
            new DreamSymbol("nhện", List.of("con nhen", "nhen"), List.of("17", "27", "57")),
            new DreamSymbol("ong", List.of("con ong", "ong mat"), List.of("15", "35", "55")),
            new DreamSymbol("bướm", List.of("con buom", "buom"), List.of("19", "39", "59")),
            new DreamSymbol("tiền", List.of("tien", "tien bac", "tien vang"), List.of("08", "18", "68")),
            new DreamSymbol("nhà", List.of("ngoi nha", "can nha"), List.of("07", "27", "47")),
            new DreamSymbol("xe", List.of("xe may", "o to", "xe hoi"), List.of("09", "29", "49")),
            new DreamSymbol("nước", List.of("nuoc", "song", "bien"), List.of("02", "22", "52")),
            new DreamSymbol("lửa", List.of("lua", "ngon lua"), List.of("03", "23", "53")),
            new DreamSymbol("hoa", List.of("bong hoa", "hoa hong"), List.of("06", "26", "46")),
            new DreamSymbol("cây", List.of("cay coi", "cay xanh"), List.of("04", "24", "44"))
    );

    public record Interpretation(String reply, List<String> luckyNumbers, String symbol) {
    }

    public Interpretation interpret(String message) {
        Optional<DreamSymbol> catalog = findCatalogSymbol(message);
        if (catalog.isPresent()) {
            return buildMatchedReply(catalog.get().label(), catalog.get().numbers());
        }

        Optional<String> subject = extractDreamSubject(message);
        if (subject.isPresent()) {
            String label = subject.get();
            List<String> numbers = numbersFromSubject(normalize(label));
            return buildMatchedReply(label, numbers);
        }

        return new Interpretation(
                "Đại Phát đã nhận câu hỏi về giấc mơ của quý khách. "
                        + "Quý khách vui lòng cho biết đã mơ thấy gì "
                        + "(ví dụ: \"nằm mơ thấy con heo\", \"nằm mơ thấy tiền\") "
                        + "để Đại Phát tra sổ mơ và gợi ý vé phù hợp nhé.",
                List.of(),
                null
        );
    }

    private Interpretation buildMatchedReply(String label, List<String> numbers) {
        String numbersText = String.join(", ", numbers);
        String reply = "Đại Phát tra sổ mơ dân gian giúp quý khách: mơ thấy \"" + label
                + "\" thường gắn với các số " + numbersText
                + ". Thông tin này chỉ mang tính tham khảo nhé.";
        return new Interpretation(reply, List.copyOf(numbers), label);
    }

    private Optional<DreamSymbol> findCatalogSymbol(String message) {
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

    /**
     * Pulls the dream subject from natural phrasing such as
     * "tôi nằm mơ thấy con gián", "mơ về tiền", "chiêm bao thấy xe máy".
     */
    static Optional<String> extractDreamSubject(String message) {
        if (message == null || message.isBlank()) {
            return Optional.empty();
        }
        String text = Normalizer.normalize(message, Normalizer.Form.NFC).trim();
        Matcher matcher = DREAM_SUBJECT.matcher(text);
        if (!matcher.find()) {
            return Optional.empty();
        }
        String raw = matcher.group(1).trim();
        raw = TRAILING_NOISE.matcher(raw).replaceFirst("").trim();
        raw = raw.replaceAll("[\"'“”]+", "").trim();
        if (raw.isBlank()) {
            return Optional.empty();
        }

        // Keep a short noun phrase (max ~6 tokens) for stable display + hashing.
        String[] tokens = raw.split("\\s+");
        StringBuilder phrase = new StringBuilder();
        int limit = Math.min(tokens.length, 6);
        for (int i = 0; i < limit; i++) {
            String token = tokens[i];
            if (token.isBlank()) {
                continue;
            }
            String normToken = normalize(token);
            if (i > 0 && (STOP_SUBJECTS.contains(normToken) || isClauseBreak(normToken))) {
                break;
            }
            if (!phrase.isEmpty()) {
                phrase.append(' ');
            }
            phrase.append(token);
        }

        String subject = phrase.toString().trim();
        subject = LEADING_CLASSIFIER.matcher(subject).replaceFirst("").trim();
        if (subject.isBlank()) {
            return Optional.empty();
        }
        String normalizedSubject = normalize(subject);
        if (normalizedSubject.length() < 2 || STOP_SUBJECTS.contains(normalizedSubject)) {
            return Optional.empty();
        }
        return Optional.of(subject);
    }

    private static boolean isClauseBreak(String normalizedToken) {
        return Set.of("thi", "la", "va", "roi", "nhung", "ma", "nen", "giup", "cho").contains(normalizedToken);
    }

    /**
     * Deterministic folk-style 2-digit fragments from any subject key.
     * Same subject always yields the same numbers across BE / AI.
     */
    static List<String> numbersFromSubject(String normalizedSubject) {
        String key = normalizedSubject == null ? "" : normalizedSubject.trim();
        if (key.isBlank()) {
            return List.of("00", "27", "68");
        }
        CRC32 crc = new CRC32();
        crc.update(key.getBytes(StandardCharsets.UTF_8));
        long seed = crc.getValue();

        LinkedHashSet<String> numbers = new LinkedHashSet<>();
        long cursor = seed;
        int guard = 0;
        while (numbers.size() < 3 && guard++ < 32) {
            int value = (int) (Math.floorMod(cursor, 100L));
            numbers.add(String.format(Locale.ROOT, "%02d", value));
            cursor = cursor * 31L + 17L + numbers.size();
        }
        return new ArrayList<>(numbers);
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
