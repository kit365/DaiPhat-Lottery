package com.daiphat.coreapi.domain.model.streetagent;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.streetagent.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VendorAllocationBatchModelTest {
    @Test
    void owns_draft_handover_and_release_lifecycle() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 4, 9, 0);
        VendorAllocationSerialModel serial = serial();
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft("VND-1", 7L, LocalDate.of(2026, 8, 5),
                now.plusMinutes(15), List.of(serial), null);

        assertThat(serial.getStatus()).isEqualTo(AllocationSerialStatus.DRAFT_RESERVED);
        serial.markReservedByBatch(99L);
        batch.confirmHandover(now, BigDecimal.valueOf(9000), new BigDecimal("0.10"), VendorLateReturnPolicy.FORFEIT_DEPOSIT, LocalTime.of(15, 0), BigDecimal.valueOf(900), BigDecimal.ZERO, UUID.randomUUID());

        assertThat(batch.getStatus()).isEqualTo(AllocationBatchStatus.CONFIRMED);
        assertThat(batch.getVendorUnitPriceSnapshot()).isEqualByComparingTo("9000");
        assertThat(batch.getDepositRequiredAmount()).isEqualByComparingTo("900");
        assertThat(batch.getDepositBalanceAfter()).isEqualByComparingTo("900");
        assertThat(serial.getTicketStatus()).isEqualTo(LotteryTicketSerialStatus.WITH_STREET_AGENT);
    }

    @Test
    void rejects_confirm_when_vendor_unit_price_exceeds_face_value() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 4, 9, 0);
        VendorAllocationSerialModel serial = serial();
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft("VND-1", 7L, LocalDate.of(2026, 8, 5),
                now.plusMinutes(15), List.of(serial), null);
        serial.markReservedByBatch(99L);

        assertThatThrownBy(() -> batch.confirmHandover(
                now, BigDecimal.valueOf(10_001), new BigDecimal("0.10"),
                VendorLateReturnPolicy.FORFEIT_DEPOSIT, LocalTime.of(15, 0), BigDecimal.valueOf(1_000), BigDecimal.ZERO, UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_UNIT_PRICE_EXCEEDS_FACE);
        assertThat(batch.getStatus()).isEqualTo(AllocationBatchStatus.DRAFT);
    }

    @Test
    void releases_only_draft_reservations() {
        VendorAllocationSerialModel serial = VendorAllocationSerialModel.builder()
                .serialId(1L)
                .stationId(2L)
                .drawDate(LocalDate.of(2099, 1, 1))
                .drawTime(LocalTime.of(16, 15))
                .faceValue(BigDecimal.valueOf(10_000))
                .ticketStatus(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD)
                .build();
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft("VND-1", 7L, LocalDate.of(2099, 1, 1),
                LocalDateTime.of(2099, 1, 1, 9, 15), List.of(serial), null);
        serial.markReservedByBatch(99L);

        batch.releaseDraft(AllocationBatchStatus.EXPIRED);

        assertThat(batch.getStatus()).isEqualTo(AllocationBatchStatus.EXPIRED);
        assertThat(serial.getTicketStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(serial.getStatus()).isEqualTo(AllocationSerialStatus.RELEASED);
    }

    @Test
    void rejects_confirm_when_actual_deposit_is_below_required_amount() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 5, 9, 0);
        VendorAllocationSerialModel serial = serial();
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft("VND-1", 7L, LocalDate.of(2026, 8, 5),
                now.plusMinutes(15), List.of(serial), null);
        serial.markReservedByBatch(99L);

        assertThatThrownBy(() -> batch.confirmHandover(now, BigDecimal.valueOf(9_000), new BigDecimal("0.10"),
                VendorLateReturnPolicy.FORFEIT_DEPOSIT, LocalTime.of(15, 0), BigDecimal.valueOf(899), BigDecimal.ZERO, UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_DEPOSIT_INSUFFICIENT);
    }

    @Test
    void returns_serial_then_settles_with_actual_deposit_refund() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 5, 9, 0);
        VendorAllocationSerialModel serial = serial();
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft("VND-1", 7L, LocalDate.of(2026, 8, 5),
                now.plusMinutes(15), List.of(serial), null);
        serial.markReservedByBatch(99L);
        batch.confirmHandover(now, BigDecimal.valueOf(9_000), new BigDecimal("0.10"),
                VendorLateReturnPolicy.FORFEIT_DEPOSIT, LocalTime.of(15, 0), BigDecimal.valueOf(1_000), BigDecimal.ZERO, UUID.randomUUID());

        batch.openReturnSession();
        batch.recordReturnedSerials(List.of(1L), now.plusHours(1));
        var settlement = batch.settle(now.plusHours(2), BigDecimal.valueOf(1_000), UUID.randomUUID());

        assertThat(batch.getStatus()).isEqualTo(AllocationBatchStatus.SETTLED);
        assertThat(serial.getTicketStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(settlement.soldQuantity()).isZero();
        assertThat(settlement.depositRefundAmount()).isEqualByComparingTo("1000");
        assertThat(batch.getDepositBalanceAfter()).isZero();
    }

    @Test
    void rejects_return_session_before_handover_and_duplicate_return_scans() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 5, 9, 0);
        VendorAllocationSerialModel serial = serial();
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft("VND-1", 7L, LocalDate.of(2026, 8, 5),
                now.plusMinutes(15), List.of(serial), null);

        assertThatThrownBy(batch::openReturnSession)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);

        serial.markReservedByBatch(99L);
        batch.confirmHandover(now, BigDecimal.valueOf(9_000), new BigDecimal("0.10"),
                VendorLateReturnPolicy.FORFEIT_DEPOSIT, LocalTime.of(15, 0), BigDecimal.valueOf(900), BigDecimal.ZERO, UUID.randomUUID());
        batch.openReturnSession();

        assertThatThrownBy(() -> batch.recordReturnedSerials(List.of(1L, 1L), now.plusHours(1)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);

        batch.recordReturnedSerials(List.of(1L), now.plusHours(1));
        assertThatThrownBy(() -> batch.recordReturnedSerials(List.of(1L), now.plusHours(2)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
    }

    @Test
    void prevents_double_settlement() {
        LocalDateTime now = LocalDateTime.of(2026, 8, 5, 9, 0);
        VendorAllocationSerialModel serial = serial();
        VendorAllocationBatchModel batch = VendorAllocationBatchModel.createDraft("VND-1", 7L, LocalDate.of(2026, 8, 5),
                now.plusMinutes(15), List.of(serial), null);
        serial.markReservedByBatch(99L);
        batch.confirmHandover(now, BigDecimal.valueOf(9_000), new BigDecimal("0.10"),
                VendorLateReturnPolicy.FORFEIT_DEPOSIT, LocalTime.of(15, 0), BigDecimal.valueOf(900), BigDecimal.ZERO, UUID.randomUUID());
        batch.openReturnSession();
        batch.settle(now.plusHours(2), BigDecimal.valueOf(900), UUID.randomUUID());

        assertThatThrownBy(() -> batch.settle(now.plusHours(3), BigDecimal.ZERO, UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
    }

    private VendorAllocationSerialModel serial() {
        return VendorAllocationSerialModel.builder().serialId(1L).stationId(2L).drawDate(LocalDate.of(2026, 8, 5))
                .faceValue(BigDecimal.valueOf(10_000)).ticketStatus(LotteryTicketSerialStatus.IN_STOCK)
                .ticketCondition(TicketCondition.GOOD).build();
    }
}
