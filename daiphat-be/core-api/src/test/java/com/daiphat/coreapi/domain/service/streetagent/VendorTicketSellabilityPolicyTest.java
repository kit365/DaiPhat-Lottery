package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VendorTicketSellabilityPolicyTest {

    @Test
    void pastDraw_isTrue_forPastDate() {
        assertThat(VendorTicketSellabilityPolicy.isPastDraw(
                DrawScheduleUtils.today().minusDays(1),
                LocalTime.of(16, 15)
        )).isTrue();
    }

    @Test
    void pastDraw_isFalse_forFutureDate() {
        assertThat(VendorTicketSellabilityPolicy.isPastDraw(
                DrawScheduleUtils.today().plusDays(1),
                LocalTime.of(16, 15)
        )).isFalse();
    }

    @Test
    void resolveBlockedReason_returnsDrawTimePassed_forPastBusinessDate() {
        String reason = VendorTicketSellabilityPolicy.resolveBlockedReason(
                DrawScheduleUtils.today().minusDays(1),
                10,
                List.of()
        );
        assertThat(reason).isEqualTo(VendorTicketSellabilityPolicy.BLOCKED_DRAW_TIME_PASSED);
    }

    @Test
    void isSellableForVendor_rejectsWhenDrawTimePassedToday() {
        LocalDate today = DrawScheduleUtils.today();
        LocalTime drawTime = DrawScheduleUtils.nowTime().minusMinutes(1);
        VendorAllocationSerialModel serial = VendorAllocationSerialModel.builder()
                .drawDate(today)
                .drawTime(drawTime)
                .drawDays(List.of(today.getDayOfWeek()))
                .stationActive(true)
                .ticketActive(true)
                .ticketStatus(com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD)
                .build();

        assertThat(VendorTicketSellabilityPolicy.isSellableForVendor(serial, today)).isFalse();
    }

    @Test
    void isSellableForVendor_acceptsBeforeDrawTimeToday() {
        LocalDate today = DrawScheduleUtils.today();
        LocalTime now = DrawScheduleUtils.nowTime();
        // Keep drawTime after "now" on the same calendar day (LocalTime.plusHours wraps past midnight).
        LocalTime drawTime = now.getHour() >= 22 ? LocalTime.of(23, 59) : now.plusHours(2);
        if (!drawTime.isAfter(now)) {
            // Too late in the day to construct a same-day future draw — treat as still sellable via tomorrow.
            today = today.plusDays(1);
            drawTime = LocalTime.of(16, 15);
        }
        VendorAllocationSerialModel serial = VendorAllocationSerialModel.builder()
                .drawDate(today)
                .drawTime(drawTime)
                .drawDays(List.of(today.getDayOfWeek()))
                .stationActive(true)
                .ticketActive(true)
                .ticketStatus(com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD)
                .build();

        assertThat(VendorTicketSellabilityPolicy.isSellableForVendor(serial, today)).isTrue();
    }

    @Test
    void resolveBlockedReason_returnsDateNotScheduled_whenDrawDaysMismatch() {
        LocalDate businessDate = DrawScheduleUtils.today().plusDays(1);
        VendorAllocationSerialModel serial = VendorAllocationSerialModel.builder()
                .drawDate(businessDate)
                .drawTime(LocalTime.of(16, 15))
                .drawDays(List.of(DayOfWeek.MONDAY))
                .build();
        while (serial.getDrawDays().contains(businessDate.getDayOfWeek())) {
            businessDate = businessDate.plusDays(1);
            serial.setDrawDate(businessDate);
        }

        String reason = VendorTicketSellabilityPolicy.resolveBlockedReason(
                businessDate,
                10,
                List.of(serial)
        );
        assertThat(reason).isEqualTo(VendorTicketSellabilityPolicy.BLOCKED_DATE_NOT_SCHEDULED);
    }

    @Test
    void resolveBlockedReason_returnsNoEligibleInventory_beforeDailyCapWhenThereAreNoTickets() {
        String reason = VendorTicketSellabilityPolicy.resolveBlockedReason(
                DrawScheduleUtils.today(),
                0,
                List.of()
        );

        assertThat(reason).isEqualTo(VendorTicketSellabilityPolicy.BLOCKED_NO_ELIGIBLE_INVENTORY);
    }

    @Test
    void deterministic_sellability_rejects_missing_draw_schedule() {
        LocalDate businessDate = LocalDate.of(2026, 8, 12);
        VendorAllocationSerialModel serial = VendorAllocationSerialModel.builder()
                .drawDate(businessDate)
                .stationActive(true)
                .ticketActive(true)
                .ticketStatus(com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD)
                .build();

        assertThat(VendorTicketSellabilityPolicy.isSellableForVendor(
                serial, businessDate, LocalDateTime.of(2026, 8, 12, 9, 0))).isFalse();
    }
}
