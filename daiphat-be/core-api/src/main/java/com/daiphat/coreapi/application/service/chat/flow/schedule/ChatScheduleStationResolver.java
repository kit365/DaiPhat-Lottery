package com.daiphat.coreapi.application.service.chat.flow.schedule;

import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import com.daiphat.coreapi.application.util.chat.ChatScheduleTexts;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleFuzzyCandidate;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationMatchResult;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationRef;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleStationMatchSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import static com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult.Ambiguous;
import static com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult.Multiple;
import static com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult.None;
import static com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult.Single;

/**
 * Resolve đài từ tin nhắn: YAML alias, auto-alias DB, fuzzy match.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatScheduleStationResolver {

    private static final Pattern MULTI_STATION_SPLIT = Pattern.compile(
            "\\s*(,|va|và|voi|với|&|va\\s+ca|và\\s+cả)\\s*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private final ChatScheduleProperties chatScheduleProperties;
    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final AiServiceConfigPort aiServiceConfigPort;

    private final JaroWinklerSimilarity jaroWinklerSimilarity = new JaroWinklerSimilarity();

    @Getter
    private volatile List<ChatScheduleStationRef> activeStations = List.of();

    private volatile Map<String, String> yamlAliasToCanonical = Map.of();

    @PostConstruct
    void init() {
        rebuild();
    }

    public synchronized void rebuild() {
        yamlAliasToCanonical = buildYamlAliasMap();
        activeStations = lotteryStationRepositoryPort.findAll().stream()
                .filter(station -> station.getStatus() == LotteryStationStatus.ACTIVE)
                .filter(station -> !station.isDeleted())
                .filter(station -> station.getName() != null && !station.getName().isBlank())
                .map(this::toStationRef)
                .sorted(Comparator.comparingInt(ref -> -ref.normalizedName().length()))
                .toList();
        log.debug("Chat schedule station index rebuilt: {} yaml aliases, {} active stations",
                yamlAliasToCanonical.size(), activeStations.size());
    }

    public Optional<ChatScheduleStationMatchResult> match(String message) {
        return resolve(message).toOptionalSingle();
    }

    public ChatScheduleStationResolveResult resolveExplicit(String message) {
        if (message == null || message.isBlank()) {
            return None.INSTANCE;
        }
        List<String> segments = splitStationSegments(message);
        if (segments.size() > 1) {
            return resolveExplicitMultipleSegments(segments);
        }
        return resolveExplicitSingleSegment(message);
    }

    public ChatScheduleStationResolveResult resolve(String message) {
        if (message == null || message.isBlank()) {
            return None.INSTANCE;
        }
        List<String> segments = splitStationSegments(message);
        if (segments.size() > 1) {
            return resolveMultipleSegments(segments);
        }
        return resolveSingleSegment(message);
    }

    public boolean hasYamlAliasHit(String message) {
        String normalized = ChatScheduleTexts.normalize(message);
        return findLongestYamlCanonical(normalized).isPresent();
    }

    public Optional<String> findStationNameForLegacyApi(String message) {
        return match(message).map(result -> result.station().getName());
    }

    public Optional<LotteryStationModel> findActiveById(Long stationId) {
        if (stationId == null) {
            return Optional.empty();
        }
        return lotteryStationRepositoryPort.findById(stationId)
                .filter(station -> station.getStatus() == LotteryStationStatus.ACTIVE)
                .filter(station -> !station.isDeleted());
    }

    public Optional<LotteryStationModel> findActiveByCanonicalName(String canonicalName) {
        if (canonicalName == null || canonicalName.isBlank()) {
            return Optional.empty();
        }
        String target = ChatScheduleTexts.normalize(canonicalName);
        return lotteryStationRepositoryPort.findAll().stream()
                .filter(station -> station.getStatus() == LotteryStationStatus.ACTIVE)
                .filter(station -> !station.isDeleted())
                .filter(station -> station.getName() != null && !station.getName().isBlank())
                .filter(station -> matchesCanonical(station.getName(), target))
                .min(Comparator.comparingInt(station -> nameDistance(station.getName(), target)));
    }

    private ChatScheduleStationResolveResult resolveMultipleSegments(List<String> segments) {
        Map<Long, ChatScheduleStationMatchResult> uniqueMatches = new LinkedHashMap<>();
        for (String segment : segments) {
            ChatScheduleStationResolveResult segmentResult = resolveSingleSegment(segment);
            if (segmentResult instanceof Ambiguous ambiguous) {
                return ambiguous;
            }
            segmentResult.toOptionalSingle()
                    .ifPresent(match -> uniqueMatches.putIfAbsent(match.station().getId(), match));
        }
        return collapseMatches(uniqueMatches);
    }

    private ChatScheduleStationResolveResult resolveExplicitMultipleSegments(List<String> segments) {
        Map<Long, ChatScheduleStationMatchResult> uniqueMatches = new LinkedHashMap<>();
        for (String segment : segments) {
            ChatScheduleStationResolveResult segmentResult = resolveExplicitSingleSegment(segment);
            if (segmentResult instanceof Ambiguous ambiguous) {
                return ambiguous;
            }
            segmentResult.toOptionalSingle()
                    .ifPresent(match -> uniqueMatches.putIfAbsent(match.station().getId(), match));
        }
        return collapseMatches(uniqueMatches);
    }

    private ChatScheduleStationResolveResult collapseMatches(Map<Long, ChatScheduleStationMatchResult> uniqueMatches) {
        if (uniqueMatches.isEmpty()) {
            return None.INSTANCE;
        }
        if (uniqueMatches.size() == 1) {
            return new Single(uniqueMatches.values().iterator().next());
        }
        return new Multiple(List.copyOf(uniqueMatches.values()));
    }

    private ChatScheduleStationResolveResult resolveSingleSegment(String message) {
        String normalized = ChatScheduleTexts.normalize(message);
        if (normalized.isBlank()) {
            return None.INSTANCE;
        }
        if (ChatScheduleTexts.containsAny(normalized, chatScheduleProperties.getStationExclusionPhrases())) {
            return None.INSTANCE;
        }

        Optional<ChatScheduleStationResolveResult> yamlMatch = tryYamlAlias(normalized);
        if (yamlMatch.isPresent()) {
            return yamlMatch.get();
        }

        Optional<ChatScheduleStationResolveResult> aliasMatch = tryAutoAlias(normalized);
        return aliasMatch.orElseGet(() -> tryFuzzyMatch(normalized));

    }

    private ChatScheduleStationResolveResult resolveExplicitSingleSegment(String message) {
        String normalized = ChatScheduleTexts.normalize(message);
        if (normalized.isBlank()) {
            return None.INSTANCE;
        }
        if (ChatScheduleTexts.containsAny(normalized, chatScheduleProperties.getStationExclusionPhrases())) {
            return None.INSTANCE;
        }

        Optional<ChatScheduleStationResolveResult> yamlMatch = tryYamlAlias(normalized);
        if (yamlMatch.isPresent()) {
            return yamlMatch.get();
        }

        return tryAutoAlias(normalized)
                .orElse(None.INSTANCE);
    }

    private Optional<ChatScheduleStationResolveResult> tryYamlAlias(String normalized) {
        Optional<String> yamlCanonical = findLongestYamlCanonical(normalized);
        if (yamlCanonical.isEmpty()) {
            return Optional.empty();
        }
        Optional<LotteryStationModel> station = findActiveByCanonicalName(yamlCanonical.get());
        if (station.isPresent()) {
            return Optional.of(single(station.get(), ChatScheduleStationMatchSource.YAML));
        }
        log.warn("YAML alias matched canonical '{}' but no active station found in DB", yamlCanonical.get());
        return Optional.empty();
    }

    private Optional<ChatScheduleStationResolveResult> tryAutoAlias(String normalized) {
        return findByNormalizedNameSubstring(normalized, activeStations)
                .map(station -> single(station, ChatScheduleStationMatchSource.AUTO_ALIAS));
    }

    private ChatScheduleStationResolveResult tryFuzzyMatch(String normalized) {
        List<ChatScheduleFuzzyCandidate> candidates = fuzzyTopCandidates(
                normalized,
                aiServiceConfigPort.stationFuzzyMatchThreshold(),
                3
        );
        if (candidates.isEmpty()) {
            return None.INSTANCE;
        }
        if (isAmbiguousFuzzy(candidates)) {
            return new Ambiguous(candidates);
        }
        return single(candidates.getFirst().station(), ChatScheduleStationMatchSource.FUZZY);
    }

    private Optional<String> findLongestYamlCanonical(String normalizedMessage) {
        if (normalizedMessage == null || normalizedMessage.isBlank()) {
            return Optional.empty();
        }
        String bestCanonical = null;
        int bestLength = 0;
        for (Map.Entry<String, String> entry : yamlAliasToCanonical.entrySet()) {
            String alias = entry.getKey();
            if (!alias.isBlank()
                    && normalizedMessage.contains(alias)
                    && alias.length() > bestLength) {
                bestCanonical = entry.getValue();
                bestLength = alias.length();
            }
        }
        return Optional.ofNullable(bestCanonical);
    }

    private Optional<LotteryStationModel> findByNormalizedNameSubstring(
            String normalizedMessage,
            List<ChatScheduleStationRef> stations
    ) {
        if (normalizedMessage == null || normalizedMessage.isBlank() || stations.isEmpty()) {
            return Optional.empty();
        }
        return stations.stream()
                .filter(ref -> !ref.normalizedName().isBlank())
                .filter(ref -> normalizedMessage.contains(ref.normalizedName()))
                .max(Comparator.comparingInt(ref -> ref.normalizedName().length()))
                .map(ChatScheduleStationRef::model);
    }

    private List<ChatScheduleFuzzyCandidate> fuzzyTopCandidates(
            String normalizedMessage,
            double threshold,
            int limit
    ) {
        if (normalizedMessage == null || normalizedMessage.isBlank() || activeStations.isEmpty()) {
            return List.of();
        }
        Map<Long, ChatScheduleFuzzyCandidate> bestByStation = new LinkedHashMap<>();
        for (String candidate : buildFuzzyCandidates(normalizedMessage)) {
            if (candidate.isBlank()) {
                continue;
            }
            for (ChatScheduleStationRef ref : activeStations) {
                if (ref.normalizedName().isBlank()) {
                    continue;
                }
                double score = jaroWinklerSimilarity.apply(candidate, ref.normalizedName());
                if (score < threshold) {
                    continue;
                }
                ChatScheduleFuzzyCandidate existing = bestByStation.get(ref.id());
                if (existing == null || score > existing.score()) {
                    bestByStation.put(ref.id(), new ChatScheduleFuzzyCandidate(ref.model(), score));
                }
            }
        }
        return bestByStation.values().stream()
                .sorted(Comparator.comparingDouble(ChatScheduleFuzzyCandidate::score).reversed())
                .limit(limit)
                .toList();
    }

    private boolean isAmbiguousFuzzy(List<ChatScheduleFuzzyCandidate> candidates) {
        if (candidates.size() < 2) {
            return false;
        }
        return candidates.get(0).score() - candidates.get(1).score() < aiServiceConfigPort.stationFuzzyAmbiguityGap();
    }

    private List<String> splitStationSegments(String message) {
        if (message == null || message.isBlank()) {
            return List.of();
        }
        String[] parts = MULTI_STATION_SPLIT.split(message);
        List<String> segments = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part == null ? "" : part.trim();
            if (!trimmed.isBlank()) {
                segments.add(trimmed);
            }
        }
        return segments.size() > 1 ? segments : List.of();
    }

    private List<String> buildFuzzyCandidates(String normalizedMessage) {
        List<String> candidates = new ArrayList<>();
        candidates.add(normalizedMessage);
        String[] tokens = normalizedMessage.split("\\s+");
        int minTokenWords = resolveFuzzyMinTokenWords();
        int maxTokenWords = resolveFuzzyMaxTokenWords(minTokenWords);
        for (int window = minTokenWords; window <= maxTokenWords; window++) {
            if (tokens.length < window) {
                continue;
            }
            for (int i = 0; i <= tokens.length - window; i++) {
                StringBuilder builder = new StringBuilder();
                for (int j = 0; j < window; j++) {
                    if (j > 0) {
                        builder.append(' ');
                    }
                    builder.append(tokens[i + j]);
                }
                candidates.add(builder.toString());
            }
        }
        return candidates;
    }

    private int resolveFuzzyMinTokenWords() {
        Integer configured = chatScheduleProperties.getFuzzyMinTokenWords();
        return configured != null && configured > 0 ? configured : 2;
    }

    private int resolveFuzzyMaxTokenWords(int minTokenWords) {
        Integer configured = chatScheduleProperties.getFuzzyMaxTokenWords();
        if (configured == null || configured < minTokenWords) {
            return Math.max(minTokenWords, 4);
        }
        return configured;
    }

    private Map<String, String> buildYamlAliasMap() {
        Map<String, String> aliases = new HashMap<>();
        for (ChatScheduleProperties.StationAlias station : chatScheduleProperties.getStations()) {
            if (station.getName() == null || station.getName().isBlank()) {
                continue;
            }
            putAlias(aliases, station.getName(), station.getName());
            for (String alias : station.getAliases()) {
                putAlias(aliases, alias, station.getName());
            }
        }
        return Map.copyOf(aliases);
    }

    private void putAlias(Map<String, String> aliases, String alias, String canonicalName) {
        String normalizedAlias = ChatScheduleTexts.normalize(alias);
        if (!normalizedAlias.isBlank()) {
            aliases.put(normalizedAlias, canonicalName);
        }
    }

    private ChatScheduleStationRef toStationRef(LotteryStationModel station) {
        return new ChatScheduleStationRef(
                station.getId(),
                station.getName(),
                ChatScheduleTexts.normalize(station.getName()),
                station
        );
    }

    private boolean matchesCanonical(String stationName, String normalizedCanonical) {
        String normalizedStation = ChatScheduleTexts.normalize(stationName);
        return normalizedStation.contains(normalizedCanonical) || normalizedCanonical.contains(normalizedStation);
    }

    private int nameDistance(String stationName, String normalizedCanonical) {
        String normalizedStation = ChatScheduleTexts.normalize(stationName);
        return Math.abs(normalizedStation.length() - normalizedCanonical.length());
    }

    private static Single single(LotteryStationModel station, ChatScheduleStationMatchSource source) {
        return new Single(new ChatScheduleStationMatchResult(station, source));
    }
}
