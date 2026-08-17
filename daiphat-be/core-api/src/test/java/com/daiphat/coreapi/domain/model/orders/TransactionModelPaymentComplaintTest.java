package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionModelPaymentComplaintTest {

    @Test
    void verifiedPaymentComplaint_createsCompletedOnlineOrderPaymentWithEvidence() {
        UUID staffId = UUID.randomUUID();
        TransactionModel transaction = TransactionModel.builder()
                .amount(BigDecimal.valueOf(90_000))
                .type(TransactionType.ONLINE)
                .transactionType(TransactionBusinessType.ORDER_PAYMENT)
                .status(TransactionStatus.PENDING)
                .build();

        transaction.markPaymentComplaintVerified(
                staffId,
                "https://storage.example/proof.png",
                "Đã đối chiếu sao kê.",
                LocalDateTime.of(2026, 8, 17, 11, 0));

        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(transaction.getPaymentBy()).isEqualTo(staffId);
        assertThat(transaction.getPaymentEvidenceUrl()).isEqualTo("https://storage.example/proof.png");
    }
}
