package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

/**
 * A supplier's operating hours, as both intake paths read them.
 *
 * <p>The window has two ends: the counter opens at {@code importAllowFrom} and
 * closes when staff start sweeping unsold tickets for return, which is
 * {@code returnCutOffTime} minus the configured buffer.
 */
@ExtendWith(MockitoExtension.class)
class SupplierTicketIntakeWindowPolicyTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 17);
    private static final LocalDate TOMORROW = TODAY.plusDays(1);

    @Mock
    private ImportBatchConfigResolver configResolver;

    private SupplierTicketIntakeWindowPolicy policy;

    @BeforeEach
    void setUp() {
        lenient().when(configResolver.resolveReturnBufferMinutes()).thenReturn(45);
        policy = new SupplierTicketIntakeWindowPolicy(configResolver);
    }

    /** Counter open 08:00, return cut-off 14:30 — so intake closes at 13:45. */
    private LotterySupplierModel minhChinh() {
        return LotterySupplierModel.builder()
                .id(1L)
                .name("Minh Chính")
                .importAllowFrom(LocalTime.of(8, 0))
                .returnCutOffTime(LocalTime.of(14, 30))
                .build();
    }

    private LocalDateTime at(String time) {
        return LocalDateTime.of(TODAY, LocalTime.parse(time));
    }

    @Test
    @DisplayName("Intake is refused before the counter opens")
    void closedBeforeOpening() {
        assertThat(policy.isBeforeIntakeOpen(minhChinh(), TODAY, at("07:59"))).isTrue();
        assertThat(policy.isBeforeIntakeOpen(minhChinh(), TODAY, at("08:00"))).isFalse();
        assertThat(policy.isBeforeIntakeOpen(minhChinh(), TODAY, at("12:00"))).isFalse();
    }

    @Test
    @DisplayName("Intake closes when the return sweep starts, not at the cut-off itself")
    void closesWhenTheSweepStarts() {
        assertThat(policy.inspectionStartTime(minhChinh())).isEqualTo(LocalTime.of(13, 45));
        assertThat(policy.isIntakeClosed(minhChinh(), TODAY, at("13:44"))).isFalse();
        assertThat(policy.isIntakeClosed(minhChinh(), TODAY, at("13:45"))).isTrue();
        assertThat(policy.isIntakeClosed(minhChinh(), TODAY, at("14:29"))).isTrue();
    }

    @Test
    @DisplayName("Between the two ends the window is open")
    void openInBetween() {
        for (String time : new String[]{"08:00", "10:30", "13:44"}) {
            assertThat(policy.isBeforeIntakeOpen(minhChinh(), TODAY, at(time)))
                    .as("not before opening at %s", time).isFalse();
            assertThat(policy.isIntakeClosed(minhChinh(), TODAY, at(time)))
                    .as("not closed at %s", time).isFalse();
        }
    }

    /**
     * The two ends answer different questions, so they scope differently.
     *
     * <p>Opening asks "is this supplier trading yet?" — a fact about right now.
     * Before they open, nothing can be collected from them, whichever draw the
     * tickets are for.
     *
     * <p>Closing asks "has the return sweep for this draw begun?" — a fact about
     * the draw date. Tomorrow's sweep has not started today, so a batch for
     * tomorrow may be taken in as soon as the counter opens today.
     */
    @Test
    @DisplayName("Opening is judged on today's clock; closing is judged on the draw date")
    void endsScopeDifferently() {
        // 17/08 06:00, before the counter opens: nothing goes in, not even for the 18th.
        assertThat(policy.isBeforeIntakeOpen(minhChinh(), TOMORROW, at("06:00"))).isTrue();
        assertThat(policy.isBeforeIntakeOpen(minhChinh(), TODAY, at("06:00"))).isTrue();

        // 17/08 08:00, counter open: tomorrow's tickets may be taken in now.
        assertThat(policy.isBeforeIntakeOpen(minhChinh(), TOMORROW, at("08:00"))).isFalse();
        assertThat(policy.isIntakeClosed(minhChinh(), TOMORROW, at("08:00"))).isFalse();

        // 17/08 16:00, today's sweep long over: today is shut, the 18th is not.
        assertThat(policy.isIntakeClosed(minhChinh(), TODAY, at("16:00"))).isTrue();
        assertThat(policy.isIntakeClosed(minhChinh(), TOMORROW, at("16:00"))).isFalse();
    }

    /**
     * Cancelling a ticket follows the shelf, not the counter: once the sweep for a
     * draw date starts, its unsold stock is being counted for return, and once the
     * date is past that count has been handed over and signed for.
     */
    @Test
    @DisplayName("Tickets may no longer be cancelled once their draw date's sweep begins")
    void ticketChangeLocksWithTheSweep() {
        assertThat(policy.isTicketChangeLocked(minhChinh(), TODAY, at("13:44")))
                .as("shelf still open before the sweep").isFalse();
        assertThat(policy.isTicketChangeLocked(minhChinh(), TODAY, at("13:45")))
                .as("frozen the moment the sweep starts").isTrue();
        assertThat(policy.isTicketChangeLocked(minhChinh(), TOMORROW, at("16:00")))
                .as("tomorrow's tickets are still on the shelf").isFalse();
    }

    @Test
    @DisplayName("A past draw date is frozen at any hour, even before today's sweep")
    void pastDrawDatesStayFrozen() {
        LocalDate yesterday = TODAY.minusDays(1);

        assertThat(policy.isTicketChangeLocked(minhChinh(), yesterday, at("06:00"))).isTrue();
        assertThat(policy.isTicketChangeLocked(minhChinh(), yesterday, at("23:00"))).isTrue();
    }

    /**
     * A ticket whose import trail is broken must not become editable forever. The
     * same-day rule softens without a supplier, but a settled period stays shut.
     */
    @Test
    @DisplayName("A missing supplier cannot unlock a past draw date")
    void missingSupplierStillLocksThePast() {
        assertThat(policy.isTicketChangeLocked(null, TODAY.minusDays(1), at("06:00"))).isTrue();
        assertThat(policy.isTicketChangeLocked(null, TODAY, at("23:00"))).isFalse();
    }

    @Test
    @DisplayName("Each refusal names why the shelf is shut")
    void lockMessagesExplainThemselves() {
        assertThat(policy.ticketChangeLockedMessage(minhChinh(), TODAY.minusDays(1), at("10:00")))
                .contains("đã kết thúc").contains("2026-08-16");
        assertThat(policy.ticketChangeLockedMessage(minhChinh(), TODAY, at("14:00")))
                .contains("13:45").contains("Minh Chính");
    }

    @Test
    @DisplayName("A supplier with no hours configured is never held back")
    void unconfiguredSupplierIsAlwaysOpen() {
        LotterySupplierModel unconfigured = LotterySupplierModel.builder()
                .id(2L).name("Chưa cấu hình").build();

        assertThat(policy.isBeforeIntakeOpen(unconfigured, TODAY, at("03:00"))).isFalse();
        assertThat(policy.isIntakeClosed(unconfigured, TODAY, at("23:00"))).isFalse();
        assertThat(policy.inspectionStartTime(unconfigured)).isNull();
    }

    @Test
    @DisplayName("Both refusals name the supplier and the hour they refer to")
    void messagesNameTheHour() {
        assertThat(policy.notOpenMessage(minhChinh(), TODAY))
                .contains("Minh Chính").contains("08:00").contains("2026-08-17");
        assertThat(policy.closedMessage(minhChinh(), TODAY))
                .contains("Minh Chính").contains("13:45").contains("2026-08-17");
    }

    @Test
    @DisplayName("With no return buffer, intake runs right up to the cut-off")
    void zeroBufferClosesAtTheCutOff() {
        lenient().when(configResolver.resolveReturnBufferMinutes()).thenReturn(0);

        assertThat(policy.inspectionStartTime(minhChinh())).isEqualTo(LocalTime.of(14, 30));
        assertThat(policy.isIntakeClosed(minhChinh(), TODAY, at("14:29"))).isFalse();
        assertThat(policy.isIntakeClosed(minhChinh(), TODAY, at("14:30"))).isTrue();
    }
}
