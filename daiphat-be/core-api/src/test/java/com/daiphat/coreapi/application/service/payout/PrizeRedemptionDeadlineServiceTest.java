package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizeRedemptionZone;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PrizeRedemptionDeadlineService")
class PrizeRedemptionDeadlineServiceTest {

    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;
    @Mock
    private LotteryStationRepositoryPort lotteryStationRepositoryPort;
    @Mock
    private VietnamClock vietnamClock;

    private PrizeRedemptionDeadlineService service;

    @BeforeEach
    void setUp() {
        service = new PrizeRedemptionDeadlineService(
                systemConfigRepositoryPort, lotteryStationRepositoryPort, vietnamClock);
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey(
                SystemConfigEnum.PRIZE_REDEMPTION_OFFICIAL_DEADLINE_DAYS.name()))
                .thenReturn(Optional.of(config("30")));
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey(
                SystemConfigEnum.PRIZE_REDEMPTION_BUFFER_DAYS.name()))
                .thenReturn(Optional.of(config("5")));
    }

    @Test
    void resolve_usesGlobalOfficialAndBuffer() {
        LocalDate draw = LocalDate.of(2026, 8, 1);
        var result = service.resolve(draw, null, LocalDate.of(2026, 8, 10));

        assertThat(result.effectiveOfficialDays()).isEqualTo(30);
        assertThat(result.bufferDays()).isEqualTo(5);
        assertThat(result.issuerDeadlineDate()).isEqualTo(LocalDate.of(2026, 8, 31));
        assertThat(result.customerDeadlineDate()).isEqualTo(LocalDate.of(2026, 8, 26));
        assertThat(result.zone()).isEqualTo(PrizeRedemptionZone.WITHIN_CUSTOMER);
    }

    @Test
    void resolve_usesStationOverride() {
        LocalDate draw = LocalDate.of(2026, 8, 1);
        var result = service.resolve(draw, 20, LocalDate.of(2026, 8, 10));

        assertThat(result.effectiveOfficialDays()).isEqualTo(20);
        assertThat(result.issuerDeadlineDate()).isEqualTo(LocalDate.of(2026, 8, 21));
        assertThat(result.customerDeadlineDate()).isEqualTo(LocalDate.of(2026, 8, 16));
    }

    @Test
    void zone_urgentBetweenCustomerAndIssuer() {
        LocalDate draw = LocalDate.of(2026, 8, 1);
        // customer = Aug 26, issuer = Aug 31
        var result = service.resolve(draw, null, LocalDate.of(2026, 8, 28));
        assertThat(result.zone()).isEqualTo(PrizeRedemptionZone.PAST_CUSTOMER_URGENT);
        assertThat(result.daysRemainingToIssuer()).isEqualTo(3);
    }

    @Test
    void zone_lockedAfterIssuerInclusiveBoundary() {
        LocalDate draw = LocalDate.of(2026, 8, 1);
        var onIssuerDay = service.resolve(draw, null, LocalDate.of(2026, 8, 31));
        assertThat(onIssuerDay.zone()).isEqualTo(PrizeRedemptionZone.PAST_CUSTOMER_URGENT);

        var afterIssuer = service.resolve(draw, null, LocalDate.of(2026, 9, 1));
        assertThat(afterIssuer.zone()).isEqualTo(PrizeRedemptionZone.PAST_ISSUER_LOCKED);
        assertThat(afterIssuer.daysRemainingToIssuer()).isZero();
    }

    @Test
    void requireBufferLessThanOfficial_rejectsInvalid() {
        assertThatThrownBy(() -> service.requireBufferLessThanOfficial(5, 5))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    private static SystemConfigModel config(String value) {
        return SystemConfigModel.builder().configValue(value).isActive(true).build();
    }
}
