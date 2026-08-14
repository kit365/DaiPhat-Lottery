package com.daiphat.coreapi.application.service.chat.intent.classifier;

import com.daiphat.coreapi.application.config.ChatIntentProperties;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.util.chat.ChatScheduleTexts;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleParser;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleStationResolver;
import com.daiphat.coreapi.application.service.chat.fortune.DestinyNumberInterpreter;
import com.daiphat.coreapi.domain.model.enums.chat.AiIntentConfigKey;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleStationMatchSource;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.ENTITY_DRAW_DATE;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.ENTITY_REGION;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.ENTITY_STATION_CANONICAL;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.ENTITY_STATION_ID;

@Component
@RequiredArgsConstructor
public class JavaKeywordIntentClassifier {

    private static final Pattern TICKET_PATTERN = Pattern.compile("\\b\\d{5,6}\\b");
    private static final Pattern TICKET_FRAGMENT_PATTERN = Pattern.compile("\\b\\d{2,6}\\b");
    private static final String ENTITY_TICKET_NUMBER = "ticket_number";
    private static final String ENTITY_TICKET_FRAGMENT = "ticket_fragment";
    private static final String ENTITY_TICKET_MATCH_MODE = "ticket_match_mode";
    private static final String MATCH_SUFFIX = "suffix";
    private static final String MATCH_PREFIX = "prefix";
    private static final String MATCH_EXACT = "exact";

    private final ChatIntentProperties intentProperties;
    private final AiServiceConfigPort aiServiceConfigPort;
    private final ChatScheduleParser scheduleParser;
    private final ChatScheduleStationResolver scheduleStations;
    private final DestinyNumberInterpreter destinyNumberInterpreter;

    public ChatClassifyResponse classify(String message) {
        // FE "Gợi ý khác" appends "|exclude=1,2,3" — strip before classify so ticket IDs
        // are not mistaken for đuôi/đầu search fragments.
        String classifyMessage = stripSuggestExcludePayload(message);
        String normalized = scheduleParser.normalize(classifyMessage);

        // Destiny / dream fortune before generic "gợi ý" so "gợi ý số cung Thiên Bình" stays OTHER_KNOWLEDGE.
        if (isFortuneIntent(normalized)) {
            return buildDefault(ChatIntent.OTHER_KNOWLEDGE, Map.of());
        }

        // Suggest before inventory search: "gợi ý vé ...|exclude=4716" still contains digits + "ve"
        // which would otherwise win as WEB_SEARCH.
        if (isSuggestIntent(normalized)) {
            return buildDefault(ChatIntent.WEB_SUGGEST, Map.of());
        }

        // Ticket search wins over escalation when both cues appear (e.g. "nhân viên tìm đuôi 12").
        if (isTicketInventorySearchIntent(normalized)) {
            Map<String, String> entities = extractTicketEntities(normalized);
            return buildDefault(ChatIntent.WEB_SEARCH, entities);
        }

        if (containsAny(normalized, intentProperties.getEscalateKeywords())) {
            return buildDefault(ChatIntent.ESCALATE_REQUEST, Map.of());
        }

        if (containsAny(normalized, intentProperties.getAccountKeywords())) {
            return buildDefault(ChatIntent.WEB_ACCOUNT, Map.of());
        }

        if (scheduleParser.matchesSlotAnswer(classifyMessage)
                && !scheduleParser.mentionsWeekdayInquiry(classifyMessage)
                && !scheduleParser.mentionsScheduleIntent(classifyMessage)) {
            return build(ChatIntent.WEB_SCHEDULE, AiIntentConfigKey.SLOT_ANSWER_CONFIDENCE, Map.of());
        }

        if (isScheduleIntent(normalized, classifyMessage)) {
            Map<String, String> entities = buildScheduleEntities(classifyMessage);
            AiIntentConfigKey confidenceKey = entities.isEmpty()
                    ? AiIntentConfigKey.WITHOUT_ENTITY_CONFIDENCE
                    : AiIntentConfigKey.WITH_ENTITY_CONFIDENCE;
            return build(ChatIntent.WEB_SCHEDULE, confidenceKey, entities);
        }

        if (containsAny(normalized, intentProperties.getResultKeywords())) {
            Map<String, String> entities = new HashMap<>();
            Matcher ticketMatch = TICKET_PATTERN.matcher(normalized);
            if (ticketMatch.find()) {
                entities.put(ENTITY_TICKET_NUMBER, ticketMatch.group());
            }
            AiIntentConfigKey confidenceKey = entities.containsKey(ENTITY_TICKET_NUMBER)
                    ? AiIntentConfigKey.WITH_TICKET_CONFIDENCE
                    : AiIntentConfigKey.WITHOUT_TICKET_CONFIDENCE;
            return build(ChatIntent.WEB_RESULT, confidenceKey, entities);
        }

        if (normalizedTrashTalkExact().contains(normalized)) {
            return buildDefault(ChatIntent.TRASH_TALK, Map.of());
        }

        return buildDefault(ChatIntent.UNKNOWN, Map.of());
    }

    private boolean isFortuneIntent(String normalized) {
        if (containsAny(normalized, intentProperties.getFortuneKeywords())) {
            return true;
        }
        // Catch zodiac / giáp / mệnh symbol names even when keyword list drifts.
        return destinyNumberInterpreter.matchesCue(normalized);
    }

    /**
     * Removes FE protocol payload {@code |exclude=1,2,3} used by "Gợi ý khác".
     * Raw message is still available to {@code WebSuggestIntentStrategy} via MessageModel.
     */
    static String stripSuggestExcludePayload(String message) {
        if (message == null || message.isBlank()) {
            return message;
        }
        int marker = message.toLowerCase(java.util.Locale.ROOT).indexOf("|exclude=");
        if (marker < 0) {
            return message;
        }
        return message.substring(0, marker).trim();
    }

    /**
     * "gợi ý cho tôi vé số mua" does not contain contiguous "gợi ý vé", so also accept
     * "gợi ý" plus a ticket/buy cue anywhere in the message.
     */
    private boolean isSuggestIntent(String normalized) {
        if (containsAny(normalized, intentProperties.getSuggestKeywords())) {
            return true;
        }
        if (!normalized.contains("goi y")) {
            return false;
        }
        return containsAny(normalized, List.of(" ve", "ve ", " ve ", "so ", " so", "mua", "ticket"));
    }

    /**
     * Messages like "68" / "có đuôi 55 không" / "tìm vé 123" map to inventory search.
     */
    private boolean isTicketInventorySearchIntent(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        if (containsAny(normalized, intentProperties.getResultKeywords())) {
            return false;
        }
        if (containsAny(normalized, intentProperties.getSearchKeywords())) {
            return true;
        }
        return hasTicketFragmentWithoutResultCue(normalized);
    }

    /**
     * Messages like "68" or "có 123456" without "dò/kết quả" still map to inventory search
     * when a 2–6 digit fragment is present and result keywords are absent.
     */
    private boolean hasTicketFragmentWithoutResultCue(String normalized) {
        if (containsAny(normalized, intentProperties.getResultKeywords())) {
            return false;
        }
        // Bare digits after ask-đuôi (e.g. "72", "168") must map to WEB_SEARCH, not UNKNOWN.
        if (normalized.matches("\\d{2,6}")) {
            return true;
        }
        return TICKET_FRAGMENT_PATTERN.matcher(normalized).find()
                && containsAny(normalized, List.of("co ", "co so", "duoi", "dau", "tim ", "ve "));
    }

    private Map<String, String> extractTicketEntities(String normalized) {
        Map<String, String> entities = new HashMap<>();
        Matcher fullTicket = TICKET_PATTERN.matcher(normalized);
        if (fullTicket.find()) {
            String number = fullTicket.group();
            entities.put(ENTITY_TICKET_NUMBER, number);
            entities.put(ENTITY_TICKET_FRAGMENT, number);
            putTicketMatchMode(normalized, number, entities);
            return entities;
        }
        Matcher fragment = TICKET_FRAGMENT_PATTERN.matcher(normalized);
        String last = null;
        while (fragment.find()) {
            last = fragment.group();
        }
        if (last != null) {
            entities.put(ENTITY_TICKET_FRAGMENT, last);
            putTicketMatchMode(normalized, last, entities);
        }
        return entities;
    }

    private static void putTicketMatchMode(String normalized, String fragment, Map<String, String> entities) {
        if (normalized.contains("duoi")) {
            entities.put(ENTITY_TICKET_MATCH_MODE, MATCH_SUFFIX);
            return;
        }
        if (containsPrefixCue(normalized)) {
            entities.put(ENTITY_TICKET_MATCH_MODE, MATCH_PREFIX);
            return;
        }
        if (fragment != null && fragment.length() >= 6) {
            entities.put(ENTITY_TICKET_MATCH_MODE, MATCH_EXACT);
            return;
        }
        entities.put(ENTITY_TICKET_MATCH_MODE, MATCH_SUFFIX);
    }

    public static boolean containsPrefixCue(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        if (normalized.contains("so dau") || normalized.contains("dau so")) {
            return true;
        }
        if (normalized.contains("co dau") || normalized.contains("tim dau")) {
            return true;
        }
        return normalized.matches(".*\\bdau\\b.*");
    }

    private boolean isScheduleIntent(String normalizedText, String originalMessage) {
        if (scheduleParser.mentionsScheduleAndResult(originalMessage)) {
            return true;
        }
        if (scheduleParser.mentionsRegionStationCatalogQuestion(originalMessage)) {
            return true;
        }
        if (scheduleParser.mentionsWeekdayInquiry(originalMessage)) {
            return true;
        }
        if (scheduleParser.mentionsScheduleIntent(originalMessage)) {
            return true;
        }
        if (mentionsStationScheduleLookup(normalizedText)) {
            return true;
        }
        if (scheduleParser.findRegionCode(originalMessage) != null) {
            return true;
        }
        // Explicit station only (YAML / exact name) — fuzzy match is too aggressive for
        // ticket phrases (e.g. "đuôi là" ≈ "Đà Lạt") and must not open schedule flow.
        if (hasExplicitStationMention(originalMessage)) {
            return true;
        }
        return scheduleParser.extractExtraction(originalMessage).resolvedDate().isPresent()
                && containsAny(normalizedText, intentProperties.getScheduleDateContextVerbs());
    }

    private boolean hasExplicitStationMention(String message) {
        if (scheduleStations.hasYamlAliasHit(message)) {
            return true;
        }
        ChatScheduleStationResolveResult resolved = scheduleStations.resolveExplicit(message);
        return resolved != null && resolved.toOptionalSingle().isPresent();
    }

    private boolean mentionsStationScheduleLookup(String normalizedText) {
        ChatIntentProperties.StationScheduleLookup lookup = intentProperties.getStationScheduleLookup();
        if (lookup == null || lookup.getCueWord() == null || lookup.getCueWord().isBlank()) {
            return false;
        }
        String cueWord = scheduleParser.normalize(lookup.getCueWord());
        if (cueWord.isBlank() || !normalizedText.contains(cueWord)) {
            return false;
        }
        return ChatScheduleTexts.containsAny(normalizedText, lookup.getLookupVerbs());
    }

    private Map<String, String> buildScheduleEntities(String message) {
        Map<String, String> entities = new HashMap<>();

        String region = scheduleParser.findRegionCode(message);
        if (region != null) {
            entities.put(ENTITY_REGION, region);
        }

        addExplicitStationEntities(message, entities);

        scheduleParser.extractExtraction(message)
                .resolvedDate()
                .map(LocalDate::toString)
                .ifPresent(drawDate -> entities.put(ENTITY_DRAW_DATE, drawDate));

        return entities;
    }

    private void addExplicitStationEntities(String message, Map<String, String> entities) {
        if (scheduleStations.hasYamlAliasHit(message)) {
            scheduleStations.match(message).ifPresent(result -> putStationEntity(entities, result.station()));
            return;
        }
        ChatScheduleStationResolveResult resolved = scheduleStations.resolve(message);
        if (resolved instanceof ChatScheduleStationResolveResult.Single single
                && single.match().source() != ChatScheduleStationMatchSource.FUZZY) {
            putStationEntity(entities, single.match().station());
        }
    }

    private Set<String> normalizedTrashTalkExact() {
        return intentProperties.getTrashTalkExact().stream()
                .map(scheduleParser::normalize)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toCollection(HashSet::new));
    }

    private static void putStationEntity(Map<String, String> entities, LotteryStationModel station) {
        entities.put(ENTITY_STATION_CANONICAL, station.getName());
        entities.put(ENTITY_STATION_ID, String.valueOf(station.getId()));
    }

    private ChatClassifyResponse buildDefault(ChatIntent intent, Map<String, String> entities) {
        return build(intent, AiIntentConfigKey.DEFAULT_CONFIDENCE, entities);
    }

    private ChatClassifyResponse build(ChatIntent intent, AiIntentConfigKey key, Map<String, String> entities) {
        return ChatClassifyResponse.builder()
                .intent(intent.name())
                .confidence(aiServiceConfigPort.confidence(intent, key))
                .entities(entities)
                .suggestedReply(null)
                .build();
    }

    private boolean containsAny(String normalizedText, List<String> keywords) {
        if (keywords == null || keywords.isEmpty()) {
            return false;
        }
        for (String keyword : keywords) {
            String normalizedKeyword = scheduleParser.normalize(keyword);
            if (!normalizedKeyword.isBlank() && normalizedText.contains(normalizedKeyword)) {
                return true;
            }
        }
        return false;
    }
}
