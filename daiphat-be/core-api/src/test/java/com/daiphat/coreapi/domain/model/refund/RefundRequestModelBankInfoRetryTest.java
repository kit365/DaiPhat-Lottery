package com.daiphat.coreapi.domain.model.refund;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("RefundRequestModel — bank info retry")
class RefundRequestModelBankInfoRetryTest {

    @Test
    @DisplayName("requestBankInfoCorrection: READY_TO_PAY → WAITING_FOR_INFO and increments retryCount")
    void requestBankInfoCorrection_movesToWaitingForInfo() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .status(RefundRequestStatus.READY_TO_PAY)
                .retryCount(0)
                .build();

        refund.requestBankInfoCorrection("STK không hợp lệ", 3);

        assertThat(refund.getStatus()).isEqualTo(RefundRequestStatus.WAITING_FOR_INFO);
        assertThat(refund.getRetryCount()).isEqualTo(1);
        assertThat(refund.getOperatorNote()).isEqualTo("STK không hợp lệ");
    }

    @Test
    @DisplayName("requestBankInfoCorrection: reaches max → MANUAL_RESOLUTION with fixed note")
    void requestBankInfoCorrection_movesToManualWhenMaxReached() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .status(RefundRequestStatus.READY_TO_PAY)
                .retryCount(2)
                .build();

        refund.requestBankInfoCorrection("note sẽ bị ghi đè", 3);

        assertThat(refund.getStatus()).isEqualTo(RefundRequestStatus.MANUAL_RESOLUTION);
        assertThat(refund.getRetryCount()).isEqualTo(3);
        assertThat(refund.getOperatorNote()).isEqualTo(RefundRequestModel.MANUAL_RESOLUTION_NOTE);
    }

    @Test
    @DisplayName("attachBankAccount: clears operatorNote and returns READY_TO_PAY")
    void attachBankAccount_clearsOperatorNote() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .status(RefundRequestStatus.WAITING_FOR_INFO)
                .retryCount(1)
                .operatorNote("STK sai")
                .build();

        refund.attachBankAccount(99L);

        assertThat(refund.getStatus()).isEqualTo(RefundRequestStatus.READY_TO_PAY);
        assertThat(refund.getBankAccountId()).isEqualTo(99L);
        assertThat(refund.getOperatorNote()).isNull();
        assertThat(refund.getRetryCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("expire: rejects MANUAL_RESOLUTION")
    void expire_rejectsManualResolution() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .status(RefundRequestStatus.MANUAL_RESOLUTION)
                .build();

        assertThatThrownBy(refund::expire)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
    }

    @Test
    @DisplayName("requestBankInfoCorrection: rejects blank note")
    void requestBankInfoCorrection_rejectsBlankNote() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .status(RefundRequestStatus.READY_TO_PAY)
                .build();

        assertThatThrownBy(() -> refund.requestBankInfoCorrection("  ", 3))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }
}
