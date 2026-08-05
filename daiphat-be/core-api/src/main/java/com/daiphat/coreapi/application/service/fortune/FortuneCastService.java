package com.daiphat.coreapi.application.service.fortune;

import com.daiphat.coreapi.application.dto.request.fortune.CastFortuneRequest;
import com.daiphat.coreapi.application.dto.request.fortune.FortuneProseAiRequest;
import com.daiphat.coreapi.application.dto.response.fortune.FortuneCastResponse;
import com.daiphat.coreapi.application.port.in.fortune.FortuneCastServicePort;
import com.daiphat.coreapi.application.port.out.ai.FortuneProsePort;
import com.daiphat.coreapi.application.port.out.fortune.FortuneInventoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.fortune.FiveElement;
import com.daiphat.coreapi.domain.model.enums.fortune.FortuneProseSource;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.service.fortune.FiveElementCatalog;
import com.daiphat.coreapi.domain.service.fortune.FortuneTailScorer;
import com.daiphat.coreapi.infrastructure.persistence.entity.fortune.FortuneCastEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.fortune.FortuneCastRepository;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FortuneCastService implements FortuneCastServicePort {

    /** Default slot length: 24 hours in minutes (once per calendar day from 00:00). */
    private static final int DEFAULT_SLOT_DURATION_MINUTES = 24 * 60;
    private static final int MIN_SLOT_DURATION_MINUTES = 1;
    private static final int MAX_SLOT_DURATION_MINUTES = 24 * 60;
    /** Grid origin for wall-clock slots (Asia/Ho_Chi_Minh midnights). */
    private static final LocalDate SLOT_EPOCH_DATE = LocalDate.of(2020, 1, 1);

    private final FortuneCastRepository fortuneCastRepository;
    private final UserRepositoryPort userRepositoryPort;
    private final FortuneInventoryPort fortuneInventoryPort;
    private final FortuneProsePort fortuneProsePort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final ObjectMapper objectMapper;

    @Value("${daiphat.fortune.daily-limit-enabled:true}")
    private boolean dailyLimitEnabled;

    @Override
    @Transactional
    public FortuneCastResponse cast(UUID userId, CastFortuneRequest request) {
        Optional<FortuneCastEntity> latestOpt = fortuneCastRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);
        int slotDurationMinutes = resolveSlotDurationMinutes();

        if (dailyLimitEnabled && latestOpt.isPresent()) {
            FortuneCastEntity latest = latestOpt.get();
            Instant nextUnlockAt = computeNextUnlockAt(latest, slotDurationMinutes);
            if (Instant.now().isBefore(nextUnlockAt)) {
                return toResponse(latest, true, previousSummaryExcluding(latest), nextUnlockAt);
            }
        }

        UserModel user = userRepositoryPort.findById(userId)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        BirthContext birthContext = resolveBirthContext(user, request);

        LocalDate castDate = DrawScheduleUtils.today();
        LocalDate sellableDrawDate = DrawScheduleUtils.resolveDefaultSellableDrawDate();
        List<String> tails = fortuneInventoryPort.findAvailableTails(sellableDrawDate);
        if (tails.isEmpty()) {
            throw new DomainException(ErrorCode.FORTUNE_NO_INVENTORY);
        }

        Integer birthYear = birthContext.birthYear();
        FiveElement userElement = birthContext.userElement();
        FiveElement dayElement = FiveElementCatalog.elementForSolarDate(castDate);

        String seedSalt = dailyLimitEnabled ? null : UUID.randomUUID().toString();
        FortuneTailScorer.PickResult pick = FortuneTailScorer.pick(
                userId,
                castDate.toString(),
                userElement,
                dayElement,
                tails,
                seedSalt
        );
        pick = FortuneTailScorer.applyFallback(pick, tails);

        FortuneCastResponse.PreviousCastSummary previous = latestOpt
                .map(prev -> new FortuneCastResponse.PreviousCastSummary(
                        prev.getCastDate(),
                        prev.getFinalTail(),
                        prev.getUserElement().name()
                ))
                .orElse(null);

        int proseBirthYear = birthYear != null ? birthYear : castDate.getYear();
        FortuneProseAiRequest proseRequest = new FortuneProseAiRequest(
                pick.finalTail(),
                userElement.name(),
                dayElement.name(),
                proseBirthYear,
                previous == null ? null : new FortuneProseAiRequest.PreviousCast(
                        previous.castDate(),
                        previous.luckyTail(),
                        previous.userElement()
                ),
                pick.fallbackUsed(),
                pick.fallbackReason()
        );

        Optional<String> aiProse = fortuneProsePort.generateProse(proseRequest);
        FortuneProseSource proseSource = aiProse.isPresent() ? FortuneProseSource.AI : FortuneProseSource.TEMPLATE;
        String prose = aiProse.orElseGet(() -> FortuneProseTemplates.render(proseRequest));

        FortuneCastEntity entity = FortuneCastEntity.builder()
                .userId(userId)
                .castDate(castDate)
                .sellableDrawDate(sellableDrawDate)
                .birthYear(birthYear != null ? birthYear : castDate.getYear())
                .userElement(userElement)
                .dayElement(dayElement)
                .primaryTail(pick.primaryTail())
                .finalTail(pick.finalTail())
                .fallbackUsed(pick.fallbackUsed())
                .fallbackReason(pick.fallbackReason())
                .scoreSnapshot(toJson(pick.scored()))
                .prose(prose)
                .proseSource(proseSource)
                .build();

        FortuneCastEntity saved = fortuneCastRepository.save(entity);
        Instant nextUnlockAt = dailyLimitEnabled ? computeNextUnlockAt(saved, slotDurationMinutes) : null;
        return toResponse(saved, false, previous, nextUnlockAt);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FortuneCastResponse> getToday(UUID userId) {
        if (!dailyLimitEnabled) {
            return Optional.empty();
        }

        Optional<FortuneCastEntity> latestOpt = fortuneCastRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);
        if (latestOpt.isEmpty()) {
            return Optional.empty();
        }

        FortuneCastEntity latest = latestOpt.get();
        int slotDurationMinutes = resolveSlotDurationMinutes();
        Instant nextUnlockAt = computeNextUnlockAt(latest, slotDurationMinutes);
        if (!Instant.now().isBefore(nextUnlockAt)) {
            return Optional.empty();
        }

        return Optional.of(toResponse(latest, true, previousSummaryExcluding(latest), nextUnlockAt));
    }

    private record BirthContext(Integer birthYear, FiveElement userElement) {
    }

    private BirthContext resolveBirthContext(UserModel user, CastFortuneRequest request) {
        if (request != null && Boolean.TRUE.equals(request.randomElement())) {
            LocalDate castDate = DrawScheduleUtils.today();
            return new BirthContext(null, randomUserElement(user.getId(), castDate));
        }

        LocalDate resolvedDob = null;

        if (request != null && request.birthDate() != null) {
            resolvedDob = request.birthDate();
            validateBirthDate(resolvedDob);
        } else if (user.getDob() != null) {
            resolvedDob = user.getDob();
        } else if (request != null && request.birthYear() != null) {
            validateBirthYear(request.birthYear());
            resolvedDob = LocalDate.of(request.birthYear(), 1, 1);
        }

        if (resolvedDob == null) {
            throw new DomainException(ErrorCode.FORTUNE_BIRTH_YEAR_REQUIRED);
        }

        validateBirthDate(resolvedDob);
        int birthYear = resolvedDob.getYear();
        return new BirthContext(birthYear, FiveElementCatalog.elementForBirthYear(birthYear));
    }

    private void validateBirthYear(int year) {
        int current = DrawScheduleUtils.today().getYear();
        if (year < 1900 || year > current) {
            throw new DomainException(ErrorCode.FORTUNE_BIRTH_YEAR_INVALID);
        }
    }

    private void validateBirthDate(LocalDate dob) {
        if (dob == null) {
            throw new DomainException(ErrorCode.FORTUNE_BIRTH_YEAR_REQUIRED);
        }
        LocalDate today = DrawScheduleUtils.today();
        if (dob.isAfter(today)) {
            throw new DomainException(ErrorCode.FORTUNE_BIRTH_YEAR_INVALID);
        }
        validateBirthYear(dob.getYear());
    }

    private FiveElement randomUserElement(UUID userId, LocalDate castDate) {
        int idx = Math.floorMod(Objects.hash(userId, castDate, "fortune-random-element"), FiveElement.values().length);
        return FiveElement.values()[idx];
    }

    private int resolveSlotDurationMinutes() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.FORTUNE_CAST_COOLDOWN_HOURS.name())
                .map(cfg -> parseSlotDurationMinutes(cfg.getConfigValue()))
                .orElseGet(() -> parseSlotDurationMinutes(
                        SystemConfigEnum.FORTUNE_CAST_COOLDOWN_HOURS.getDefaultValue()
                ));
    }

    private int parseSlotDurationMinutes(String raw) {
        try {
            int minutes = Integer.parseInt(raw.trim());
            if (minutes < MIN_SLOT_DURATION_MINUTES) {
                return DEFAULT_SLOT_DURATION_MINUTES;
            }
            return Math.min(minutes, MAX_SLOT_DURATION_MINUTES);
        } catch (NumberFormatException ex) {
            log.warn("Invalid FORTUNE_CAST_COOLDOWN_HOURS (minutes) value: {}", raw);
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
    }

    /**
     * Next unlock is the start of the next wall-clock slot after {@code createdAt},
     * where slots are aligned from 00:00 Asia/Ho_Chi_Minh in fixed {@code durationMinutes} steps.
     */
    private Instant computeNextUnlockAt(FortuneCastEntity entity, int durationMinutes) {
        ZoneId zone = DrawScheduleUtils.VIETNAM_ZONE;
        LocalDateTime createdAt = entity.getCreatedAt() != null
                ? entity.getCreatedAt()
                : LocalDateTime.now(zone);
        ZonedDateTime castAt = createdAt.atZone(zone);
        ZonedDateTime epoch = SLOT_EPOCH_DATE.atStartOfDay(zone);

        long absoluteMinutes = ChronoUnit.MINUTES.between(epoch, castAt);
        if (absoluteMinutes < 0) {
            absoluteMinutes = 0;
        }
        long nextSlotStartMinutes = ((absoluteMinutes / durationMinutes) + 1) * (long) durationMinutes;
        return epoch.plusMinutes(nextSlotStartMinutes).toInstant();
    }

    private FortuneCastResponse.PreviousCastSummary previousSummaryExcluding(FortuneCastEntity latest) {
        List<FortuneCastEntity> recent = fortuneCastRepository.findTop2ByUserIdOrderByCreatedAtDesc(latest.getUserId());
        return recent.stream()
                .filter(row -> !Objects.equals(row.getId(), latest.getId()))
                .findFirst()
                .map(prev -> new FortuneCastResponse.PreviousCastSummary(
                        prev.getCastDate(),
                        prev.getFinalTail(),
                        prev.getUserElement().name()
                ))
                .orElse(null);
    }

    private FortuneCastResponse toResponse(
            FortuneCastEntity entity,
            boolean alreadyCastToday,
            FortuneCastResponse.PreviousCastSummary previous,
            Instant nextUnlockAt
    ) {
        String buyPath = "/buy-ticket?ticketNumber="
                + entity.getFinalTail()
                + "&drawDate="
                + entity.getSellableDrawDate();
        return new FortuneCastResponse(
                entity.getFinalTail(),
                entity.getPrimaryTail(),
                entity.isFallbackUsed(),
                entity.getFallbackReason(),
                entity.getUserElement().name(),
                entity.getDayElement().name(),
                entity.getProse(),
                entity.getProseSource().name(),
                entity.getCastDate(),
                entity.getSellableDrawDate(),
                buyPath,
                alreadyCastToday,
                previous,
                nextUnlockAt
        );
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize fortune score snapshot", e);
            return null;
        }
    }
}
