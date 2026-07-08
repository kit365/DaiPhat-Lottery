package com.daiphat.coreapi.application.service.chat.intent.classifier;

import com.daiphat.coreapi.application.config.ChatIntentProperties;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.util.chat.ChatScheduleTexts;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleParser;
import com.daiphat.coreapi.application.service.chat.flow.schedule.ChatScheduleStationResolver;
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

    private final ChatIntentProperties intentProperties;
    private final AiServiceConfigPort aiServiceConfigPort;
    private final ChatScheduleParser scheduleParser;
    private final ChatScheduleStationResolver scheduleStations;

    public ChatClassifyResponse classify(String message) {
        String normalized = scheduleParser.normalize(message);

        if (containsAny(normalized, intentProperties.getEscalateKeywords())) {
            return buildDefault(ChatIntent.ESCALATE_REQUEST, Map.of());
        }

        if (containsAny(normalized, intentProperties.getAccountKeywords())) {
            return buildDefault(ChatIntent.WEB_ACCOUNT, Map.of());
        }

        if (scheduleParser.matchesSlotAnswer(message)) {
            return build(ChatIntent.WEB_SCHEDULE, AiIntentConfigKey.SLOT_ANSWER_CONFIDENCE, Map.of());
        }

        if (isScheduleIntent(normalized, message)) {
            Map<String, String> entities = buildScheduleEntities(message);
            AiIntentConfigKey confidenceKey = entities.isEmpty()
                    ? AiIntentConfigKey.WITHOUT_ENTITY_CONFIDENCE
                    : AiIntentConfigKey.WITH_ENTITY_CONFIDENCE;
            return build(ChatIntent.WEB_SCHEDULE, confidenceKey, entities);
        }

        if (containsAny(normalized, intentProperties.getResultKeywords())) {
            Map<String, String> entities = new HashMap<>();
            Matcher ticketMatch = TICKET_PATTERN.matcher(normalized);
            if (ticketMatch.find()) {
                entities.put("ticket_number", ticketMatch.group());
            }
            AiIntentConfigKey confidenceKey = entities.containsKey("ticket_number")
                    ? AiIntentConfigKey.WITH_TICKET_CONFIDENCE
                    : AiIntentConfigKey.WITHOUT_TICKET_CONFIDENCE;
            return build(ChatIntent.WEB_RESULT, confidenceKey, entities);
        }

        if (containsAny(normalized, intentProperties.getFortuneKeywords())) {
            return buildDefault(ChatIntent.OTHER_KNOWLEDGE, Map.of());
        }

        if (normalizedTrashTalkExact().contains(normalized)) {
            return buildDefault(ChatIntent.TRASH_TALK, Map.of());
        }

        return buildDefault(ChatIntent.UNKNOWN, Map.of());
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
