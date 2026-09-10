package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.PrizeClaimSubmissionDocument;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionExportResponse;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.payout.PrizePayoutRequestRepository;
import com.daiphat.coreapi.shared.util.BusinessDocumentIssuer;
import com.daiphat.coreapi.shared.util.PrizeClaimSubmissionDocumentWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrizeClaimSubmissionServiceExportTest {

    @Mock private PrizeClaimSubmissionRepository submissionRepository;
    @Mock private PrizeClaimSubmissionLineRepository lineRepository;
    @Mock private LotteryTicketSerialRepository serialRepository;
    @Mock private LotteryStationRepository stationRepository;
    @Mock private PrizePayoutRequestRepository payoutRequestRepository;
    @Mock private PrizeClaimSubmissionDocumentWriter documentWriter;
    @Mock private BusinessDocumentIssuer businessDocumentIssuer;
    @Mock private UserLookupServicePort userLookupServicePort;

    @InjectMocks
    private PrizeClaimSubmissionService service;

    private PrizeClaimSubmissionEntity submission;

    @BeforeEach
    void setUp() {
        submission = PrizeClaimSubmissionEntity.builder()
                .id(10L)
                .submissionCode("PCS-20260901-TEST01")
                .status(PrizeClaimSubmissionStatus.PENDING_HANDOVER)
                .totalGrossPrizeAmount(BigDecimal.valueOf(1_000_000))
                .totalTaxAmount(BigDecimal.valueOf(100_000))
                .totalCommissionAmount(BigDecimal.ZERO)
                .totalNetClaimAmount(BigDecimal.valueOf(900_000))
                .build();
    }

    @Test
    void export_rejectsDraftStatus() {
        submission.setStatus(PrizeClaimSubmissionStatus.DRAFT);
        when(submissionRepository.findByIdWithSupplier(10L)).thenReturn(Optional.of(submission));

        assertThatThrownBy(() -> service.export(10L))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.PRIZE_CLAIM_EXPORT_NOT_READY);
    }

    @Test
    void export_rejectsEmptyLines() {
        when(submissionRepository.findByIdWithSupplier(10L)).thenReturn(Optional.of(submission));
        when(lineRepository.findBySubmissionIdWithSerial(10L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.export(10L))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.PRIZE_CLAIM_EXPORT_EMPTY);
    }

    @Test
    void export_returnsXlsxForPendingHandover() {
        PrizeClaimSubmissionLineEntity line = PrizeClaimSubmissionLineEntity.builder()
                .id(1L)
                .stationId(5L)
                .drawDate(LocalDate.of(2026, 9, 1))
                .ticketSerialNumber("TG123456")
                .ticketNumbers("123456")
                .prizeDisplayName("Giải nhất")
                .grossPrizeAmount(BigDecimal.valueOf(1_000_000))
                .taxAmount(BigDecimal.valueOf(100_000))
                .commissionAmount(BigDecimal.ZERO)
                .netClaimAmount(BigDecimal.valueOf(900_000))
                .build();

        when(submissionRepository.findByIdWithSupplier(10L)).thenReturn(Optional.of(submission));
        when(lineRepository.findBySubmissionIdWithSerial(10L)).thenReturn(List.of(line));
        when(stationRepository.findAllById(any())).thenReturn(List.of(
                LotteryStationEntity.builder().id(5L).code("TG").name("Tiền Giang").build()));
        when(businessDocumentIssuer.resolve()).thenReturn(new BusinessDocumentIssuer.Issuer(
                "Đại Phát", "0312345678", "123 Lý Chính Thắng", "1900", "a@b.com", "Nguyễn A"));
        when(documentWriter.write(any(PrizeClaimSubmissionDocument.class))).thenReturn(new byte[] {1, 2, 3});

        PrizeClaimSubmissionExportResponse response = service.export(10L);

        assertThat(response.fileName()).isEqualTo("phieu-nop-PCS-20260901-TEST01.xlsx");
        assertThat(response.content()).containsExactly((byte) 1, (byte) 2, (byte) 3);
        verify(documentWriter).write(any(PrizeClaimSubmissionDocument.class));
    }
}
