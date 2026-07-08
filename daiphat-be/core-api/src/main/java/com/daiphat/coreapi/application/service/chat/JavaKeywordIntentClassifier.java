package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatIntentProperties;
import com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleTexts;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import com.daiphat.coreapi.application.service.chat.schedule.ChatScheduleParser;
import com.daiphat.coreapi.application.service.chat.schedule.ChatScheduleStationResolver;
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

    private final ChatIntentProperties intentProperties;
    private final ChatScheduleParser scheduleParser;
    private final ChatScheduleStationResolver scheduleStations;

    public ChatClassifyResponseDto classify(String message) {
        String normalized = scheduleParser.normalize(message);

        if (containsAny(normalized, intentProperties.getEscalateKeywords())) {
            return build(ChatIntent.ESCALATE_REQUEST, 0.95, Map.of());
        }

        if (containsAny(normalized, intentProperties.getAccountKeywords())) {
            return build(ChatIntent.WEB_ACCOUNT, 0.92, Map.of());
        }

        if (scheduleParser.matchesSlotAnswer(message)) {
            return build(ChatIntent.WEB_SCHEDULE, 0.76, Map.of());
        }

        if (isScheduleIntent(normalized, message)) {
            Map<String, String> entities = buildScheduleEntities(message);
            double confidence = entities.isEmpty() ? 0.75 : 0.88;
            return build(ChatIntent.WEB_SCHEDULE, confidence, entities);
        }

        if (containsAny(normalized, intentProperties.getResultKeywords())) {
            Map<String, String> entities = new HashMap<>();
            Matcher ticketMatch = TICKET_PATTERN.matcher(normalized);
            if (ticketMatch.find()) {
                entities.put("ticket_number", ticketMatch.group());
            }
            return build(ChatIntent.WEB_RESULT, entities.containsKey("ticket_number") ? 0.85 : 0.70, entities);
        }

        if (containsAny(normalized, intentProperties.getFortuneKeywords())) {
            return build(ChatIntent.OTHER_KNOWLEDGE, 0.82, Map.of());
        }

        if (normalizedTrashTalkExact().contains(normalized)) {
            return build(ChatIntent.TRASH_TALK, 0.90, Map.of());
        }

        return build(ChatIntent.UNKNOWN, 0.3, Map.of());
    }

    private boolean isScheduleIntent(String normalizedText, String originalMessage) {
        if (scheduleParser.mentionsScheduleIntent(originalMessage)) {
            return true;
        }
        if (mentionsStationScheduleLookup(normalizedText)) {
            return true;
        }
        if (scheduleParser.findRegionCode(originalMessage) != null) {
            return true;
        }
        if (scheduleStations.match(originalMessage).isPresent()) {
            return true;
        }
        return scheduleParser.extractExtraction(originalMessage).resolvedDate().isPresent()
                && containsAny(normalizedText, intentProperties.getScheduleDateContextVerbs());
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

    private static ChatClassifyResponseDto build(ChatIntent intent, double confidence, Map<String, String> entities) {
        return ChatClassifyResponseDto.builder()
                .intent(intent.name())
                .confidence(confidence)
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
