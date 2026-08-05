package com.daiphat.coreapi.application.service.fortune;

import com.daiphat.coreapi.application.dto.request.fortune.CastFortuneRequest;
import com.daiphat.coreapi.application.dto.request.fortune.FortuneProseAiRequest;
import com.daiphat.coreapi.application.dto.response.fortune.FortuneCastResponse;
import com.daiphat.coreapi.application.port.in.fortune.FortuneCastServicePort;
import com.daiphat.coreapi.application.port.out.ai.FortuneProsePort;
import com.daiphat.coreapi.application.port.out.fortune.FortuneInventoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.fortune.FiveElement;
import com.daiphat.coreapi.domain.model.enums.fortune.FortuneProseSource;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FortuneCastService implements FortuneCastServicePort {

    private final FortuneCastRepository fortuneCastRepository;
    private final UserRepositoryPort userRepositoryPort;
    private final FortuneInventoryPort fortuneInventoryPort;
    private final FortuneProsePort fortuneProsePort;
    private final ObjectMapper objectMapper;

    @Value("${daiphat.fortune.daily-limit-enabled:true}")
    private boolean dailyLimitEnabled;

    @Override
    @Transactional
    public FortuneCastResponse cast(UUID userId, CastFortuneRequest request) {
        LocalDate castDate = DrawScheduleUtils.today();
        Optional<FortuneCastEntity> existing = fortuneCastRepository.findByUserIdAndCastDate(userId, castDate);
        if (existing.isPresent() && dailyLimitEnabled) {
            return toResponse(existing.get(), true, previousSummary(userId, castDate));
        }
        if (existing.isPresent()) {
            // Unlimited mode (testing): replace today's cast so each request re-rolls.
            fortuneCastRepository.deleteByUserIdAndCastDate(userId, castDate);
            fortuneCastRepository.flush();
        }

        UserModel user = userRepositoryPort.findById(userId)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        int birthYear = resolveBirthYear(user, request);
        if (user.getDob() == null) {
            user.setDob(LocalDate.of(birthYear, 1, 1));
            userRepositoryPort.save(user);
        }

        LocalDate sellableDrawDate = DrawScheduleUtils.resolveDefaultSellableDrawDate();
        List<String> tails = fortuneInventoryPort.findAvailableTails(sellableDrawDate);
        if (tails.isEmpty()) {
            throw new DomainException(ErrorCode.FORTUNE_NO_INVENTORY);
        }

        FiveElement userElement = FiveElementCatalog.elementForBirthYear(birthYear);
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
        // Re-check inventory for race (same list is still authoritative for MVP)
        pick = FortuneTailScorer.applyFallback(pick, tails);

        FortuneCastResponse.PreviousCastSummary previous = previousSummary(userId, castDate);
        FortuneProseAiRequest proseRequest = new FortuneProseAiRequest(
                pick.finalTail(),
                userElement.name(),
                dayElement.name(),
                birthYear,
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
                .birthYear(birthYear)
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
        return toResponse(saved, false, previous);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FortuneCastResponse> getToday(UUID userId) {
        LocalDate castDate = DrawScheduleUtils.today();
        return fortuneCastRepository.findByUserIdAndCastDate(userId, castDate)
                .map(entity -> toResponse(entity, true, previousSummary(userId, castDate)));
    }

    private int resolveBirthYear(UserModel user, CastFortuneRequest request) {
        if (user.getDob() != null) {
            return user.getDob().getYear();
        }
        if (request == null || request.birthYear() == null) {
            throw new DomainException(ErrorCode.FORTUNE_BIRTH_YEAR_REQUIRED);
        }
        int year = request.birthYear();
        int current = DrawScheduleUtils.today().getYear();
        if (year < 1900 || year > current) {
            throw new DomainException(ErrorCode.FORTUNE_BIRTH_YEAR_INVALID);
        }
        return year;
    }

    private FortuneCastResponse.PreviousCastSummary previousSummary(UUID userId, LocalDate castDate) {
        return fortuneCastRepository
                .findFirstByUserIdAndCastDateLessThanOrderByCastDateDesc(userId, castDate)
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
            FortuneCastResponse.PreviousCastSummary previous
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
                previous
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
