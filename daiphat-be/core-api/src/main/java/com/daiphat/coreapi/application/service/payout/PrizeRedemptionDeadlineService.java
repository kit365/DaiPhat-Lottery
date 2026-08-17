package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizeRedemptionZone;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Dual-deadline redemption: customer soft deadline and issuer hard deadline from draw date.
 */
@Service
@RequiredArgsConstructor
public class PrizeRedemptionDeadlineService {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final VietnamClock vietnamClock;

    public record RedemptionDeadlines(
            LocalDate drawDate,
            int effectiveOfficialDays,
            int bufferDays,
            LocalDate customerDeadlineDate,
            LocalDate issuerDeadlineDate,
            PrizeRedemptionZone zone,
            Integer daysRemainingToIssuer
    ) {
    }

    public RedemptionDeadlines resolve(LocalDate drawDate, Long stationId) {
        Integer stationOverride = null;
        if (stationId != null) {
            stationOverride = lotteryStationRepositoryPort.findById(stationId)
                    .map(LotteryStationModel::getPrizeRedemptionOfficialDeadlineDays)
                    .orElse(null);
        }
        return resolve(drawDate, stationOverride, vietnamClock.today());
    }

    public RedemptionDeadlines resolve(LocalDate drawDate, Integer stationOfficialOverride, LocalDate today) {
        if (drawDate == null) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Thiếu ngày quay để tính hạn đổi thưởng.");
        }
        LocalDate asOf = today != null ? today : vietnamClock.today();
        int globalOfficial = readPositiveInt(
                SystemConfigEnum.PRIZE_REDEMPTION_OFFICIAL_DEADLINE_DAYS, 30);
        int bufferDays = readNonNegativeInt(SystemConfigEnum.PRIZE_REDEMPTION_BUFFER_DAYS, 5);
        int effectiveOfficial = stationOfficialOverride != null && stationOfficialOverride > 0
                ? stationOfficialOverride
                : globalOfficial;
        requireBufferLessThanOfficial(bufferDays, effectiveOfficial);

        LocalDate issuerDeadline = drawDate.plusDays(effectiveOfficial);
        LocalDate customerDeadline = issuerDeadline.minusDays(bufferDays);
        PrizeRedemptionZone zone = zoneOf(asOf, customerDeadline, issuerDeadline);
        Integer daysRemainingToIssuer = zone == PrizeRedemptionZone.PAST_ISSUER_LOCKED
                ? 0
                : (int) ChronoUnit.DAYS.between(asOf, issuerDeadline);

        return new RedemptionDeadlines(
                drawDate,
                effectiveOfficial,
                bufferDays,
                customerDeadline,
                issuerDeadline,
                zone,
                daysRemainingToIssuer
        );
    }

    public static PrizeRedemptionZone zoneOf(
            LocalDate today,
            LocalDate customerDeadline,
            LocalDate issuerDeadline) {
        if (today == null || customerDeadline == null || issuerDeadline == null) {
            return PrizeRedemptionZone.PAST_ISSUER_LOCKED;
        }
        if (!today.isAfter(customerDeadline)) {
            return PrizeRedemptionZone.WITHIN_CUSTOMER;
        }
        if (!today.isAfter(issuerDeadline)) {
            return PrizeRedemptionZone.PAST_CUSTOMER_URGENT;
        }
        return PrizeRedemptionZone.PAST_ISSUER_LOCKED;
    }

    public void requireBufferLessThanOfficial(int bufferDays, int officialDays) {
        if (bufferDays < 0 || officialDays < 1) {
            throw new DomainException(
                    ErrorCode.SYSTEM_CONFIG_VALUE_INVALID,
                    "Cấu hình hạn đổi thưởng không hợp lệ.");
        }
        if (bufferDays >= officialDays) {
            throw new DomainException(
                    ErrorCode.SYSTEM_CONFIG_VALUE_INVALID,
                    "Số ngày đệm hạn đổi thưởng phải nhỏ hơn hạn lĩnh nhà đài.");
        }
    }

    private int readPositiveInt(SystemConfigEnum key, int fallback) {
        String raw = systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(SystemConfigModel::getConfigValue)
                .orElse(key.getDefaultValue());
        try {
            int value = Integer.parseInt(raw != null ? raw.trim() : "");
            return value > 0 ? value : fallback;
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private int readNonNegativeInt(SystemConfigEnum key, int fallback) {
        String raw = systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(SystemConfigModel::getConfigValue)
                .orElse(key.getDefaultValue());
        try {
            int value = Integer.parseInt(raw != null ? raw.trim() : "");
            return value >= 0 ? value : fallback;
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }
}
