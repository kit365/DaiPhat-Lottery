package com.daiphat.coreapi.application.service.chat.flow.schedule;

import com.daiphat.coreapi.application.config.ChatScheduleProperties;
import com.daiphat.coreapi.application.util.chat.ChatScheduleTexts;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleDateExtraction;
import com.daiphat.coreapi.application.dto.chat.schedule.ChatScheduleStationResolveResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.RELATIVE_TODAY;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.RELATIVE_TOMORROW;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.RELATIVE_YESTERDAY;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.TOKEN_SELECT_STATION_PREFIX;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.TOKEN_SET_GOAL_PREFIX;

/**
 * Parse user message for schedule flow: normalize text, YAML phrases, region/station/date, slot answer.
 */
@Component
@RequiredArgsConstructor
public class ChatScheduleParser {

    private static final Pattern DATE_PATTERN = Pattern.compile("\\b(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{4})\\b");
    private static final Pattern SHORT_DATE_PATTERN = Pattern.compile("\\b(\\d{1,2})[/.-](\\d{1,2})\\b");

    private final ChatScheduleProperties chatScheduleProperties;
    private final ChatScheduleStationResolver stationResolver;

    public String normalize(String value) {
        return ChatScheduleTexts.normalize(value);
    }

    public boolean matchesSlotAnswer(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        if (isSelectStationToken(message) || isSetGoalToken(message)) {
            return true;
        }
        String normalized = normalize(message);
        if (normalized.isBlank()) {
            return false;
        }
        if (findRegionCode(message) != null) {
            return true;
        }
        if (mentionsAllDaysFromMessage(message)) {
            return true;
        }
        if (mentionsAllStations(normalized)) {
            return true;
        }
        if (mentionsSpecificStationChoice(normalized)) {
            return true;
        }
        if (mentionsRegionToday(normalized)) {
            return true;
        }
        if (mentionsWeekSchedule(normalized)) {
            return true;
        }
        if (mentionsNationAll(normalized)) {
            return true;
        }
        // Free-text "gợi ý vé / xem kết quả / lịch quay" is a new intent, not a schedule slot answer.
        // Goal chips use SCHEDULE_SET_GOAL:* tokens (handled above via isSetGoalToken).
        if (stationResolver.hasYamlAliasHit(message)) {
            return true;
        }
        ChatScheduleStationResolveResult resolveResult = stationResolver.resolveExplicit(message);
        if (resolveResult instanceof ChatScheduleStationResolveResult.Single) {
            return true;
        }
        return mentionsRelativeDayExact(normalized) || matchesDateModePickNormalized(normalized);
    }

    public boolean isSelectStationToken(String message) {
        return message != null && message.trim().startsWith(TOKEN_SELECT_STATION_PREFIX);
    }

    public boolean isSetGoalToken(String message) {
        return message != null && message.trim().startsWith(TOKEN_SET_GOAL_PREFIX);
    }

    public Optional<Long> parseSelectStationId(String message) {
        if (!isSelectStationToken(message)) {
            return Optional.empty();
        }
        String payload = message.trim().substring(TOKEN_SELECT_STATION_PREFIX.length()).trim();
        if (payload.startsWith("id=")) {
            String rest = payload.substring(3).trim();
            int end = rest.indexOf(':');
            String idPart = end >= 0 ? rest.substring(0, end).trim() : rest;
            try {
                return Optional.of(Long.parseLong(idPart));
            } catch (NumberFormatException ignored) {
                return Optional.empty();
            }
        }
        try {
            return Optional.of(Long.parseLong(payload));
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    public Optional<String> parseSetGoal(String message) {
        if (!isSetGoalToken(message)) {
            return Optional.empty();
        }
        String goal = message.trim().substring(TOKEN_SET_GOAL_PREFIX.length()).trim();
        return goal.isBlank() ? Optional.empty() : Optional.of(goal);
    }

    public boolean mentionsGoalChoice(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        return normalized.contains("xem lich")
                || normalized.contains("xem ket qua")
                || normalized.contains("xem ve")
                || normalized.contains("lich quay")
                || normalized.contains("ket qua xo so")
                || normalized.contains("goi y ve");
    }

    /**
     * Hub / free-text "Gợi ý vé" — not a schedule slot chip ({@code SCHEDULE_SET_GOAL:*}).
     * Must not resume an open schedule date/location flow.
     */
    public boolean isStandaloneTicketSuggestMessage(String message) {
        if (message == null || message.isBlank() || isSetGoalToken(message)) {
            return false;
        }
        String normalized = normalize(message);
        if (normalized.isBlank()) {
            return false;
        }
        return normalized.contains("goi y ve")
                || normalized.contains("goi y so")
                || (normalized.contains("goi y")
                && (normalized.contains("ve") || normalized.contains("so") || normalized.contains("mua")));
    }

    public boolean mentionsAllStations(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        if (mentionsAllDays(normalized)) {
            return false;
        }
        return mentionsAllStationsExact(normalized) || mentionsAllStationsContains(normalized);
    }

    public boolean mentionsAllStationsExact(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        ChatScheduleProperties.SlotAnswerPhrases slotAnswers = chatScheduleProperties.getSlotAnswers();
        if (slotAnswers == null) {
            return false;
        }
        return matchesExact(normalized, slotAnswers.getAllStationsExact());
    }

    public boolean mentionsAllStationsContains(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        ChatScheduleProperties.SlotAnswerPhrases slotAnswers = chatScheduleProperties.getSlotAnswers();
        if (slotAnswers == null) {
            return false;
        }
        return containsAny(normalized, slotAnswers.getAllStationsContains());
    }

    public boolean mentionsRegionToday(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        return containsAny(normalized, chatScheduleProperties.getRegionTodayPhrases());
    }

    public boolean mentionsWeekSchedule(String normalized) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        return containsAny(normalized, chatScheduleProperties.getWeekSchedulePhrases());
    }

    public boolean mentionsSpecificStationChoice(String normalized) {
        return matchesPickStationPhrases(normalized);
    }

    public boolean mentionsNationAll(String normalized) {
        return containsAny(normalized, chatScheduleProperties.getNationAllPhrases());
    }

    public boolean mentionsScheduleIntent(String message) {
        String normalized = normalize(message);
        if (normalized.isBlank()) {
            return false;
        }
        return chatScheduleProperties.getIntentKeywords().stream()
                .map(this::normalize)
                .filter(alias -> !alias.isBlank())
                .anyMatch(normalized::contains);
    }

    public boolean matchesBareSchedulePrompt(String message) {
        String normalized = normalize(message);
        if (normalized.isBlank()) {
            return false;
        }
        return chatScheduleProperties.getBareIntentPhrases().stream()
                .map(this::normalize)
                .filter(alias -> !alias.isBlank())
                .anyMatch(normalized::contains);
    }

    public String findRegionCode(String message) {
        String normalized = normalize(message);
        for (Map.Entry<String, List<String>> entry : chatScheduleProperties.getRegions().entrySet()) {
            for (String alias : entry.getValue()) {
                String normalizedAlias = normalize(alias);
                if (!normalizedAlias.isBlank() && normalized.contains(normalizedAlias)) {
                    return entry.getKey();
                }
            }
        }
        return null;
    }

    public String findStationCanonicalName(String message) {
        return stationResolver.findStationNameForLegacyApi(message).orElse(null);
    }

    public DayOfWeek findWeekday(String message) {
        String normalized = normalize(message);
        for (Map.Entry<String, List<String>> entry : chatScheduleProperties.getWeekdays().entrySet()) {
            for (String alias : entry.getValue()) {
                String normalizedAlias = normalize(alias);
                if (!normalizedAlias.isBlank() && containsToken(normalized, normalizedAlias)) {
                    return DayOfWeek.valueOf(entry.getKey());
                }
            }
        }
        return resolveRelativeWeekday(normalized);
    }

    public boolean mentionsRegionAllListIntent(String message) {
        String normalized = normalize(message);
        if (normalized.isBlank()) {
            return false;
        }
        if (containsAny(normalized, chatScheduleProperties.getRegionAllIntentPhrases())) {
            return true;
        }
        String region = findRegionCode(message);
        ChatScheduleProperties.RegionListIntent regionListIntent = chatScheduleProperties.getRegionListIntent();
        String stationCueWord = regionListIntent != null ? regionListIntent.getStationCueWord() : null;
        String stationSuffixWord = regionListIntent != null ? regionListIntent.getStationSuffixWord() : null;
        if (region == null || stationCueWord == null || stationCueWord.isBlank() || !normalized.contains(stationCueWord)) {
            return false;
        }
        String suffixToken = stationSuffixWord != null && !stationSuffixWord.isBlank()
                ? " " + stationSuffixWord
                : "";
        return mentionsScheduleIntent(message)
                && chatScheduleProperties.getRegions().getOrDefault(region, List.of()).stream()
                .map(this::normalize)
                .filter(alias -> !alias.isBlank())
                .anyMatch(alias -> normalized.contains(stationCueWord + " " + alias)
                        || (!suffixToken.isBlank() && normalized.contains(alias + suffixToken)));
    }

    public boolean isRestartMessage(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        return matchesExact(normalize(message), chatScheduleProperties.getRestartPhrases());
    }

    public Optional<LocalDate> extractDate(String message) {
        return extractExtraction(message).resolvedDate();
    }

    public ChatScheduleDateExtraction extractExtraction(String message) {
        if (message == null || message.isBlank()) {
            return ChatScheduleDateExtraction.empty();
        }

        String normalized = normalize(message);
        if (mentionsAllDays(normalized)) {
            return ChatScheduleDateExtraction.allDays();
        }

        Optional<LocalDate> relative = extractRelativeDay(message);
        if (relative.isPresent()) {
            if (matchesRelativeDayKey(normalized, RELATIVE_TODAY)) {
                return ChatScheduleDateExtraction.today();
            }
            if (matchesRelativeDayKey(normalized, RELATIVE_TOMORROW)) {
                return ChatScheduleDateExtraction.tomorrow();
            }
            return ChatScheduleDateExtraction.specific(relative.get());
        }

        if (!isBareScheduleIntent(normalized)) {
            Optional<LocalDate> weekday = extractWeekday(message);
            if (weekday.isPresent()) {
                return ChatScheduleDateExtraction.specific(weekday.get());
            }
        }

        if (DATE_PATTERN.matcher(message).find()) {
            Optional<LocalDate> explicit = extractExplicitDate(message);
            if (explicit.isPresent()) {
                return ChatScheduleDateExtraction.specific(explicit.get());
            }
            return ChatScheduleDateExtraction.invalid();
        }

        Matcher shortDateMatcher = SHORT_DATE_PATTERN.matcher(message);
        if (shortDateMatcher.find()) {
            ChatScheduleDateExtraction shortDate = parseShortDateExtraction(
                    Integer.parseInt(shortDateMatcher.group(1)),
                    Integer.parseInt(shortDateMatcher.group(2))
            );
            if (shortDate.isPresent() || shortDate.missingYearClarification()) {
                return shortDate;
            }
            return ChatScheduleDateExtraction.invalid();
        }

        Matcher normalizedShortDateMatcher = Pattern.compile("\\b(\\d{1,2})\\s+(\\d{1,2})\\b").matcher(normalized);
        if (normalizedShortDateMatcher.find()) {
            ChatScheduleDateExtraction shortDate = parseShortDateExtraction(
                    Integer.parseInt(normalizedShortDateMatcher.group(1)),
                    Integer.parseInt(normalizedShortDateMatcher.group(2))
            );
            if (shortDate.isPresent() || shortDate.missingYearClarification()) {
                return shortDate;
            }
        }

        return ChatScheduleDateExtraction.empty();
    }

    public boolean mentionsAllDays(String normalizedMessage) {
        if (normalizedMessage == null || normalizedMessage.isBlank()) {
            return false;
        }
        return containsAny(normalizedMessage, chatScheduleProperties.getAllDaysPhrases());
    }

    public boolean mentionsAllDaysFromMessage(String message) {
        return mentionsAllDays(normalize(message));
    }

    public boolean mentionsRelativeToday(String message) {
        return matchesRelativeDayKey(normalize(message), RELATIVE_TODAY);
    }

    public boolean mentionsRelativeTomorrow(String message) {
        return matchesRelativeDayKey(normalize(message), RELATIVE_TOMORROW);
    }

    public boolean mentionsDateModePick(String message) {
        return matchesDateModePickNormalized(normalize(message));
    }

    public boolean mentionsExplicitDateChoice(String message) {
        if (mentionsDateModePick(message)) {
            return true;
        }
        ChatScheduleDateExtraction extraction = extractExtraction(message);
        return extraction.mode() != null || extraction.invalidDateAttempt();
    }

    static LocalDate nextOrSame(LocalDate from, DayOfWeek dayOfWeek) {
        if (from.getDayOfWeek() == dayOfWeek) {
            return from;
        }
        int daysUntil = (dayOfWeek.getValue() - from.getDayOfWeek().getValue() + 7) % 7;
        return from.plusDays(daysUntil);
    }

    private boolean matchesDateModePickNormalized(String normalizedMessage) {
        if (normalizedMessage == null || normalizedMessage.isBlank()) {
            return false;
        }
        ChatScheduleProperties.DateModePhrases dateModePhrases = chatScheduleProperties.getDateModePhrases();
        if (dateModePhrases == null) {
            return false;
        }
        return containsAny(normalizedMessage, dateModePhrases.getPickDate())
                || containsAny(normalizedMessage, dateModePhrases.getPickWeekday());
    }

    private boolean matchesPickStationPhrases(String normalizedMessage) {
        ChatScheduleProperties.SlotAnswerPhrases slotAnswers = chatScheduleProperties.getSlotAnswers();
        if (slotAnswers == null || normalizedMessage == null || normalizedMessage.isBlank()) {
            return false;
        }
        return matchesExact(normalizedMessage, slotAnswers.getPickStationExact())
                || containsAny(normalizedMessage, slotAnswers.getPickStationContains());
    }

    private boolean mentionsRelativeDayExact(String normalizedMessage) {
        ChatScheduleProperties.SlotAnswerPhrases slotAnswers = chatScheduleProperties.getSlotAnswers();
        if (slotAnswers == null) {
            return false;
        }
        return matchesExact(normalizedMessage, slotAnswers.getRelativeDayExact());
    }

    private boolean matchesRelativeDayKey(String normalizedMessage, String relativeDayKey) {
        if (normalizedMessage == null || normalizedMessage.isBlank() || relativeDayKey == null) {
            return false;
        }
        List<String> aliases = chatScheduleProperties.getRelativeDays().get(relativeDayKey);
        if (aliases == null || aliases.isEmpty()) {
            return false;
        }
        return containsAny(normalizedMessage, aliases);
    }

    public ChatScheduleDateExtraction parseShortDateExtraction(int day, int month) {
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return ChatScheduleDateExtraction.invalid();
        }
        int year = LocalDate.now().getYear();
        try {
            LocalDate candidate = LocalDate.of(year, month, day);
            if (candidate.isBefore(LocalDate.now().minusDays(1))) {
                return ChatScheduleDateExtraction.missingYear();
            }
            return ChatScheduleDateExtraction.specific(candidate);
        } catch (RuntimeException ignored) {
            return ChatScheduleDateExtraction.invalid();
        }
    }

    public String extractShortDateLabel(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }
        Matcher shortDateMatcher = SHORT_DATE_PATTERN.matcher(message);
        if (shortDateMatcher.find()) {
            return String.format("%02d/%02d",
                    Integer.parseInt(shortDateMatcher.group(1)),
                    Integer.parseInt(shortDateMatcher.group(2)));
        }
        String normalized = normalize(message);
        Matcher normalizedShortDateMatcher = Pattern.compile("\\b(\\d{1,2})\\s+(\\d{1,2})\\b").matcher(normalized);
        if (normalizedShortDateMatcher.find()) {
            return String.format("%02d/%02d",
                    Integer.parseInt(normalizedShortDateMatcher.group(1)),
                    Integer.parseInt(normalizedShortDateMatcher.group(2)));
        }
        return null;
    }

    private boolean isBareScheduleIntent(String normalized) {
        return chatScheduleProperties.getIntentKeywords().stream()
                .map(this::normalize)
                .filter(alias -> !alias.isBlank())
                .anyMatch(normalized::equals);
    }

    private Optional<LocalDate> extractRelativeDay(String message) {
        String normalized = normalize(message);
        for (Map.Entry<String, List<String>> entry : chatScheduleProperties.getRelativeDays().entrySet()) {
            for (String alias : entry.getValue()) {
                String normalizedAlias = normalize(alias);
                if (!normalizedAlias.isBlank() && normalized.contains(normalizedAlias)) {
                    return switch (entry.getKey()) {
                        case RELATIVE_TODAY -> Optional.of(LocalDate.now());
                        case RELATIVE_TOMORROW -> Optional.of(LocalDate.now().plusDays(1));
                        case RELATIVE_YESTERDAY -> Optional.of(LocalDate.now().minusDays(1));
                        default -> Optional.empty();
                    };
                }
            }
        }
        return Optional.empty();
    }

    private Optional<LocalDate> extractWeekday(String message) {
        String normalized = normalize(message);
        for (Map.Entry<String, List<String>> entry : chatScheduleProperties.getWeekdays().entrySet()) {
            for (String alias : entry.getValue()) {
                String normalizedAlias = normalize(alias);
                if (!normalizedAlias.isBlank() && containsToken(normalized, normalizedAlias)) {
                    DayOfWeek dayOfWeek = DayOfWeek.valueOf(entry.getKey());
                    return Optional.of(nextOrSame(LocalDate.now(), dayOfWeek));
                }
            }
        }
        return Optional.empty();
    }

    private Optional<LocalDate> extractExplicitDate(String message) {
        Matcher matcher = DATE_PATTERN.matcher(message);
        if (!matcher.find()) {
            return Optional.empty();
        }
        int day = Integer.parseInt(matcher.group(1));
        int month = Integer.parseInt(matcher.group(2));
        int year = Integer.parseInt(matcher.group(3));
        try {
            return Optional.of(LocalDate.of(year, month, day));
        } catch (DateTimeParseException ignored) {
            try {
                return Optional.of(LocalDate.parse(
                        String.format("%02d/%02d/%04d", day, month, year),
                        DateTimeFormatter.ofPattern("dd/MM/yyyy")
                ));
            } catch (DateTimeParseException ex) {
                return Optional.empty();
            }
        }
    }

    private DayOfWeek resolveRelativeWeekday(String normalized) {
        for (Map.Entry<String, List<String>> entry : chatScheduleProperties.getRelativeDays().entrySet()) {
            for (String alias : entry.getValue()) {
                String normalizedAlias = normalize(alias);
                if (!normalizedAlias.isBlank() && normalized.contains(normalizedAlias)) {
                    return switch (entry.getKey()) {
                        case RELATIVE_TODAY -> LocalDate.now().getDayOfWeek();
                        case RELATIVE_TOMORROW -> LocalDate.now().plusDays(1).getDayOfWeek();
                        default -> null;
                    };
                }
            }
        }
        return null;
    }

    private boolean matchesExact(String normalizedMessage, List<String> phrases) {
        if (phrases == null || phrases.isEmpty()) {
            return false;
        }
        for (String phrase : phrases) {
            String normalizedPhrase = normalize(phrase);
            if (!normalizedPhrase.isBlank() && normalizedMessage.equals(normalizedPhrase)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAny(String normalizedMessage, List<String> phrases) {
        if (phrases == null || phrases.isEmpty()) {
            return false;
        }
        for (String phrase : phrases) {
            String normalizedPhrase = normalize(phrase);
            if (!normalizedPhrase.isBlank() && normalizedMessage.contains(normalizedPhrase)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsToken(String normalizedMessage, String normalizedToken) {
        if (normalizedMessage.equals(normalizedToken)) {
            return true;
        }
        return normalizedMessage.contains(" " + normalizedToken + " ")
                || normalizedMessage.startsWith(normalizedToken + " ")
                || normalizedMessage.endsWith(" " + normalizedToken);
    }
}
