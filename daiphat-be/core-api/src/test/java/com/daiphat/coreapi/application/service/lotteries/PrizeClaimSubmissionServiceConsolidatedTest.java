package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.payout.PrizePayoutRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrizeClaimSubmissionServiceConsolidatedTest {

    @Mock private PrizeClaimSubmissionRepository submissionRepository;
    @Mock private PrizeClaimSubmissionLineRepository lineRepository;
    @Mock private LotteryTicketSerialRepository serialRepository;
    @Mock private LotteryStationRepository stationRepository;
    @Mock private PrizePayoutRequestRepository payoutRequestRepository;

    @InjectMocks
    private PrizeClaimSubmissionService service;

    private PrizeClaimSubmissionEntity submission;

    @BeforeEach
    void setUp() {
        submission = PrizeClaimSubmissionEntity.builder()
                .id(10L)
                .submissionCode("PCS-TEST")
                .status(PrizeClaimSubmissionStatus.DRAFT)
                .build();
    }

    @Test
    void createDraft_createsConsolidatedSubmissionWithoutSupplier() {
        when(submissionRepository.existsBySubmissionCode(any())).thenReturn(false);
        when(submissionRepository.save(any())).thenAnswer(invocation -> {
            PrizeClaimSubmissionEntity entity = invocation.getArgument(0);
            entity.setId(99L);
            return entity;
        });

        PrizeClaimSubmissionEntity created = service.createDraft();

        assertNull(created.getLotterySupplier());
        assertEquals(PrizeClaimSubmissionStatus.DRAFT, created.getStatus());
    }

    @Test
    void addLine_appliesTaxAndNetFromPayoutRequest() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(submission));
        when(lineRepository.countBySerialIdAndLineStatus(any(), any())).thenReturn(0L);
        when(lineRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(submissionRepository.save(any())).thenReturn(submission);
        when(lineRepository.findByPrizeClaimSubmissionId(10L)).thenReturn(java.util.List.of());

        LotteryTicketSerialEntity serial = serial(1L, 101L);
        when(serialRepository.findById(1L)).thenReturn(Optional.of(serial));
        when(payoutRequestRepository.findBySerial_IdAndStatus(eq(1L), eq(PrizePayoutRequestStatus.COMPLETED)))
                .thenReturn(Optional.of(payoutRequestWithTax(1L, serial)));

        PrizeClaimSubmissionLineEntity line = service.addLine(10L, 1L);

        assertEquals(new BigDecimal("29790000"), line.getGrossPrizeAmount());
        assertEquals(new BigDecimal("1979000"), line.getTaxAmount());
        assertEquals(BigDecimal.ZERO, line.getCommissionAmount());
        assertEquals(new BigDecimal("27811000"), line.getNetClaimAmount());
    }

    @Test
    void addLine_allowsDifferentStationsInSameSubmission() {
        when(submissionRepository.findById(10L)).thenReturn(Optional.of(submission));
        when(lineRepository.countBySerialIdAndLineStatus(any(), any())).thenReturn(0L);
        when(lineRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(submissionRepository.save(any())).thenReturn(submission);
        when(lineRepository.findByPrizeClaimSubmissionId(10L)).thenReturn(java.util.List.of());

        LotteryTicketSerialEntity serialA = serial(1L, 101L);
        LotteryTicketSerialEntity serialB = serial(2L, 202L);
        when(serialRepository.findById(1L)).thenReturn(Optional.of(serialA));
        when(serialRepository.findById(2L)).thenReturn(Optional.of(serialB));
        when(payoutRequestRepository.findBySerial_IdAndStatus(eq(1L), eq(PrizePayoutRequestStatus.COMPLETED)))
                .thenReturn(Optional.of(payoutRequest(1L, serialA)));
        when(payoutRequestRepository.findBySerial_IdAndStatus(eq(2L), eq(PrizePayoutRequestStatus.COMPLETED)))
                .thenReturn(Optional.of(payoutRequest(2L, serialB)));

        service.addLine(10L, 1L);
        service.addLine(10L, 2L);

        ArgumentCaptor<PrizeClaimSubmissionLineEntity> captor = ArgumentCaptor.forClass(PrizeClaimSubmissionLineEntity.class);
        verify(lineRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertEquals(101L, captor.getAllValues().get(0).getStationId());
        assertEquals(202L, captor.getAllValues().get(1).getStationId());
    }

    private static LotteryTicketSerialEntity serial(Long id, Long stationId) {
        return LotteryTicketSerialEntity.builder()
                .id(id)
                .stationId(stationId)
                .serialNumber("SER-" + id)
                .payoutState(SerialPayoutState.PAID_OUT)
                .build();
    }

    private static PrizePayoutRequestEntity payoutRequestWithTax(Long id, LotteryTicketSerialEntity serial) {
        return PrizePayoutRequestEntity.builder()
                .id(id)
                .requestCode("PPR-" + id)
                .serial(serial)
                .status(PrizePayoutRequestStatus.COMPLETED)
                .grossAmount(new BigDecimal("29790000"))
                .taxAmount(new BigDecimal("1979000"))
                .commissionAmount(new BigDecimal("310000"))
                .netAmount(new BigDecimal("27501000"))
                .build();
    }

    private static PrizePayoutRequestEntity payoutRequest(Long id, LotteryTicketSerialEntity serial) {
        return PrizePayoutRequestEntity.builder()
                .id(id)
                .requestCode("PPR-" + id)
                .serial(serial)
                .status(PrizePayoutRequestStatus.COMPLETED)
                .grossAmount(new BigDecimal("100000"))
                .commissionAmount(BigDecimal.ZERO)
                .build();
    }
}
