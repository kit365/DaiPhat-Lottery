package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.dto.request.payout.CompletePrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.CreateStaffPrizePayoutBatchRequest;
import com.daiphat.coreapi.application.dto.request.payout.CreateStaffPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutBatchCreateResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutLookupResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.mapper.payout.PrizePayoutApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutOwnershipVerificationLevel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutTicketOrigin;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrizePayoutStaffServiceCreateInPersonTest {

    @Mock private PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    @Mock private PrizePayoutEligibilityService prizePayoutEligibilityService;
    @Mock private PrizePayoutCalculationService prizePayoutCalculationService;
    @Mock private PrizePayoutSerialLockService prizePayoutSerialLockService;
    @Mock private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    @Mock private UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    @Mock private PrizePayoutApplicationMapper prizePayoutApplicationMapper;
    @Mock private OrderDetailRepository orderDetailRepository;
    @Mock private UserRepository userRepository;
    @Mock private StoragePort storagePort;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private LotteryStationServicePort lotteryStationServicePort;

    @InjectMocks
    private PrizePayoutStaffService staffService;

    private final UUID staffId = UUID.randomUUID();
    private final UUID otherStaffId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    private OrderDetailEntity detail;
    private LotteryTicketSerialEntity serial;
    private UserEntity customer;
    private final AtomicLong idSeq = new AtomicLong(100);

    private static CreateStaffPrizePayoutRequest cashRequest(
            Boolean manualConfirm,
            String recipientName,
            String recipientId,
            String recipientImage) {
        return new CreateStaffPrizePayoutRequest(
                20L, 10L, null, null, null, null, null, null,
                recipientName, recipientId, recipientImage, recipientImage,
                PrizePayoutPaymentMethod.CASH, null, manualConfirm, null,
                "https://cdn.example/contract.jpg");
    }

    @BeforeEach
    void setUp() {
        customer = new UserEntity();
        customer.setId(customerId);
        customer.setFirstName("Nguyen");
        customer.setLastName("Van A");

        OrderEntity order = new OrderEntity();
        order.setId(orderId);
        order.setOrderType(OrderType.DIRECT);
        order.setUser(null);

        serial = new LotteryTicketSerialEntity();
        serial.setId(10L);

        detail = new OrderDetailEntity();
        detail.setId(20L);
        detail.setOrder(order);
        detail.setLotteryTicketSerial(serial);

        lenient().when(prizePayoutEligibilityService.resolveDetail(eq(20L), any())).thenReturn(detail);
        lenient().when(prizePayoutEligibilityService.resolveDetail(eq(20L), eq(null))).thenReturn(detail);
        lenient().doNothing().when(prizePayoutEligibilityService).validateStaffInPersonCreate(any(), any());
        lenient().doNothing().when(prizePayoutEligibilityService).validateWonWithProof(any());
        lenient().when(prizePayoutEligibilityService.resolvePrizeMatch(any(), any())).thenReturn(
                new PrizePayoutEligibilityService.PrizeMatchContext(
                        TicketDrawResultStatus.WON,
                        "DB",
                        "Đặc biệt",
                        new BigDecimal("5000000"),
                        "123456",
                        "456",
                        "LAST",
                        3));
        lenient().when(prizePayoutEligibilityService.resolveOwnershipVerification(any(), any()))
                .thenReturn(new PrizePayoutEligibilityService.OwnershipVerificationContext(
                        PrizePayoutTicketOrigin.INTERNAL_OFFLINE,
                        PrizePayoutOwnershipVerificationLevel.MANUAL_ONLY,
                        true));
        lenient().when(prizePayoutCalculationService.calculate(any())).thenReturn(
                new PrizePayoutCalculationService.PrizePayoutBreakdown(
                        new BigDecimal("5000000.00"),
                        new BigDecimal("0.00"),
                        new BigDecimal("50000.00"),
                        new BigDecimal("4950000.00")));
        lenient().when(prizePayoutEligibilityService.requiresRecipientIdentity(any(), any())).thenReturn(true);
        lenient().when(prizePayoutEligibilityService.requiresRecipientIdImage(any(), any())).thenAnswer(inv -> {
            UUID cid = inv.getArgument(0);
            BigDecimal gross = inv.getArgument(1);
            if (cid == null) {
                return true;
            }
            return gross != null && gross.compareTo(new BigDecimal("10000000")) >= 0;
        });
        lenient().when(prizePayoutEligibilityService.requiresFourEyes(any())).thenAnswer(inv -> {
            BigDecimal gross = inv.getArgument(0);
            return gross != null && gross.compareTo(new BigDecimal("10000000")) >= 0;
        });
        lenient().when(prizePayoutCalculationService.resolveTaxThreshold()).thenReturn(new BigDecimal("10000000"));
        lenient().when(prizePayoutRequestRepositoryPort.existsByRequestCode(any())).thenReturn(false);
        lenient().when(prizePayoutRequestRepositoryPort.save(any())).thenAnswer(inv -> {
            PrizePayoutRequestModel m = inv.getArgument(0);
            if (m.getId() == null) {
                m.setId(idSeq.getAndIncrement());
            }
            return m;
        });
        lenient().when(prizePayoutRequestRepositoryPort.findById(anyLong())).thenAnswer(inv ->
                Optional.of(PrizePayoutRequestModel.builder()
                        .id(inv.getArgument(0))
                        .orderDetailId(20L)
                        .serialId(10L)
                        .grossAmount(new BigDecimal("5000000"))
                        .netAmount(new BigDecimal("4950000"))
                        .status(PrizePayoutRequestStatus.PENDING)
                        .createdBy(staffId.toString())
                        .build()));
        lenient().when(orderDetailRepository.findById(anyLong())).thenReturn(Optional.of(detail));
        lenient().when(prizePayoutEligibilityService.resolveMaxOnlineRejectRetry()).thenReturn(3);
        lenient().when(prizePayoutEligibilityService.isOnlineClaimLocked(any())).thenReturn(false);
        PrizePayoutRequestResponse dummyResponse = new PrizePayoutRequestResponse(
                99L, "PRZ-TEST", null, null, orderId, null, 20L, 10L,
                null, null, null, null, null, null,
                new BigDecimal("5000000"), new BigDecimal("0"), new BigDecimal("0"), new BigDecimal("5000000"),
                null, null,
                null, null, null, false, null, null, null, null,
                null, null, null, null,
                null, null, null, null, null,
                PrizePayoutRequestStatus.PENDING, 0, 3, false, false, false, true,
                null, null, null, null, null, staffId.toString(), null, null, null, null);
        lenient().when(prizePayoutApplicationMapper.toResponse(
                        any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
                .thenReturn(dummyResponse);
    }

    @Test
    void createInPerson_onlineWithoutCustomer_fails() {
        detail.getOrder().setOrderType(OrderType.ONLINE);
        detail.getOrder().setUser(null);
        when(prizePayoutEligibilityService.resolveOwnershipVerification(detail, serial))
                .thenThrow(new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE));

        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.createInPerson(staffId, cashRequest(true, "A", "012345678901", "https://cdn.example/a.jpg")));
        assertEquals(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, ex.getErrorCode());
        verify(prizePayoutRequestRepositoryPort, never()).save(any());
    }

    @Test
    void createInPerson_offlineWithoutCustomer_missingManualConfirm_fails() {
        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.createInPerson(staffId, cashRequest(false, "A", "1", "https://cdn.example/a.jpg")));
        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
        verify(prizePayoutRequestRepositoryPort, never()).save(any());
    }

    @Test
    void createInPerson_missingNameOrCccd_fails() {
        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.createInPerson(staffId, cashRequest(true, null, null, null)));
        assertEquals(ErrorCode.PRIZE_PAYOUT_RECIPIENT_IDENTITY_REQUIRED, ex.getErrorCode());
    }

    @Test
    void createInPerson_manualOnly_missingImage_fails() {
        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.createInPerson(staffId, cashRequest(true, "Tran Van C", "012345678901", null)));
        assertEquals(ErrorCode.PRIZE_PAYOUT_RECIPIENT_IDENTITY_REQUIRED, ex.getErrorCode());
    }

    @Test
    void createInPerson_manualOnly_withIdentity_completesImmediately() {
        staffService.createInPerson(
                staffId,
                cashRequest(true, "Tran Van C", "012345678901", "https://cdn.example/cccd.jpg"));

        ArgumentCaptor<PrizePayoutRequestModel> captor = ArgumentCaptor.forClass(PrizePayoutRequestModel.class);
        verify(prizePayoutRequestRepositoryPort, atLeastOnce()).save(captor.capture());
        PrizePayoutRequestModel saved = captor.getValue();
        assertNull(saved.getCustomerId());
        assertEquals("Tran Van C", saved.getRecipientFullName());
        assertEquals(PrizePayoutRequestStatus.COMPLETED, saved.getStatus());
        assertTrue(saved.isManualOwnershipConfirmed());
        verify(prizePayoutSerialLockService).lockSerial(10L);
        verify(prizePayoutSerialLockService).markPaidOut(10L);
    }

    @Test
    void createInPerson_linkedBelowThreshold_noImage_ok() {
        detail.getOrder().setUser(customer);
        when(prizePayoutEligibilityService.resolveOwnershipVerification(detail, serial))
                .thenReturn(new PrizePayoutEligibilityService.OwnershipVerificationContext(
                        PrizePayoutTicketOrigin.INTERNAL_OFFLINE,
                        PrizePayoutOwnershipVerificationLevel.CUSTOMER_LINKED,
                        false));
        when(userRepository.findById(customerId)).thenReturn(Optional.of(customer));

        staffService.createInPerson(
                staffId,
                cashRequest(false, "Nguyen Van A", "012345678901", null));

        verify(prizePayoutRequestRepositoryPort, atLeastOnce()).save(any());
        verify(prizePayoutSerialLockService).markPaidOut(10L);
    }

    @Test
    void createInPerson_highValueWithCustomer_missingImage_fails() {
        detail.getOrder().setUser(customer);
        when(prizePayoutCalculationService.calculate(any())).thenReturn(
                new PrizePayoutCalculationService.PrizePayoutBreakdown(
                        new BigDecimal("30000000.00"),
                        new BigDecimal("2000000.00"),
                        new BigDecimal("210000.00"),
                        new BigDecimal("27790000.00")));

        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.createInPerson(staffId, cashRequest(false, "Nguyen Van A", "012345678901", null)));
        assertEquals(ErrorCode.PRIZE_PAYOUT_RECIPIENT_IDENTITY_REQUIRED, ex.getErrorCode());
    }

    @Test
    void createBatch_twoTickets_independentTax() {
        OrderDetailEntity detail2 = new OrderDetailEntity();
        detail2.setId(21L);
        detail2.setOrder(detail.getOrder());
        LotteryTicketSerialEntity serial2 = new LotteryTicketSerialEntity();
        serial2.setId(11L);
        detail2.setLotteryTicketSerial(serial2);

        when(prizePayoutEligibilityService.resolveDetail(eq(20L), eq(null))).thenReturn(detail);
        when(prizePayoutEligibilityService.resolveDetail(eq(21L), eq(null))).thenReturn(detail2);
        when(prizePayoutEligibilityService.resolveOwnershipVerification(any(), any()))
                .thenReturn(new PrizePayoutEligibilityService.OwnershipVerificationContext(
                        PrizePayoutTicketOrigin.INTERNAL_OFFLINE,
                        PrizePayoutOwnershipVerificationLevel.MANUAL_ONLY,
                        true));

        PrizePayoutBatchCreateResponse response = staffService.createInPersonBatch(
                staffId,
                new CreateStaffPrizePayoutBatchRequest(
                        List.of(
                                new CreateStaffPrizePayoutBatchRequest.BatchItem(20L),
                                new CreateStaffPrizePayoutBatchRequest.BatchItem(21L)),
                        null, null, null, null,
                        "Tran Van C", "012345678901", "https://cdn.example/cccd.jpg", "https://cdn.example/cccd-back.jpg",
                        PrizePayoutPaymentMethod.CASH, null, true, null,
                        "https://cdn.example/contract.jpg"));

        assertEquals(2, response.claims().size());
        verify(prizePayoutCalculationService, org.mockito.Mockito.times(4)).calculate(any());
        verify(prizePayoutSerialLockService).lockSerial(10L);
        verify(prizePayoutSerialLockService).lockSerial(11L);
        verify(prizePayoutSerialLockService).markPaidOut(10L);
        verify(prizePayoutSerialLockService).markPaidOut(11L);
    }

    @Test
    void lookup_byOrderCode_returnsItems() {
        when(prizePayoutEligibilityService.resolveAllByOrderCode("ORD-1")).thenReturn(List.of(detail));
        when(prizePayoutEligibilityService.resolveOwnershipVerification(detail, serial))
                .thenReturn(new PrizePayoutEligibilityService.OwnershipVerificationContext(
                        PrizePayoutTicketOrigin.INTERNAL_OFFLINE,
                        PrizePayoutOwnershipVerificationLevel.MANUAL_ONLY,
                        true));

        PrizePayoutLookupResponse response = staffService.lookup("ORD-1", null, null, null);
        assertEquals(1, response.items().size());
        assertEquals(20L, response.items().get(0).orderDetailId());
    }

    @Test
    void lookup_tripleMiss_propagatesOutOfScope() {
        when(prizePayoutEligibilityService.resolveByStationDrawSerial(1L, LocalDate.of(2026, 8, 1), "SN-1"))
                .thenThrow(new DomainException(
                        ErrorCode.ORDER_DETAIL_NOT_FOUND,
                        PrizePayoutRequestModel.OUT_OF_SCOPE_TICKET_MESSAGE));

        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.lookup(null, 1L, LocalDate.of(2026, 8, 1), "SN-1"));
        assertEquals(ErrorCode.ORDER_DETAIL_NOT_FOUND, ex.getErrorCode());
        assertTrue(ex.getInternalMessage().contains("ngoài phạm vi hỗ trợ"));
    }

    @Test
    void preview_serialOnly_rejected() {
        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.preview(null, null, "SN-ONLY", null));
        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
    }

    @Test
    void approve_creator_blocked() {
        PrizePayoutRequestModel pending = PrizePayoutRequestModel.builder()
                .id(50L)
                .serialId(10L)
                .orderDetailId(20L)
                .grossAmount(new BigDecimal("30000000"))
                .status(PrizePayoutRequestStatus.PENDING)
                .createdBy(staffId.toString())
                .build();
        when(prizePayoutRequestRepositoryPort.findById(50L)).thenReturn(Optional.of(pending));
        when(prizePayoutEligibilityService.requiresFourEyes(any())).thenReturn(true);

        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.approve(50L, staffId));
        assertEquals(ErrorCode.PRIZE_PAYOUT_FOUR_EYES_REQUIRED, ex.getErrorCode());
    }

    @Test
    void complete_highValue_requiresApprovedAndOtherStaff() {
        PrizePayoutRequestModel pending = PrizePayoutRequestModel.builder()
                .id(50L)
                .serialId(10L)
                .orderDetailId(20L)
                .grossAmount(new BigDecimal("30000000"))
                .status(PrizePayoutRequestStatus.PENDING)
                .createdBy(staffId.toString())
                .build();
        when(prizePayoutRequestRepositoryPort.findById(50L)).thenReturn(Optional.of(pending));
        when(lotteryTicketSerialRepositoryPort.findById(10L)).thenReturn(Optional.of(
                LotteryTicketSerialModel.builder().id(10L).payoutState(SerialPayoutState.PAYOUT_PENDING).build()));
        when(prizePayoutEligibilityService.requiresFourEyes(any())).thenReturn(true);

        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.complete(
                        50L, otherStaffId, new CompletePrizePayoutRequest(PrizePayoutPaymentMethod.CASH, null, null)));
        assertEquals(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS, ex.getErrorCode());
    }

    @Test
    void complete_highValue_fromApproved_otherStaff_ok() {
        PrizePayoutRequestModel approved = PrizePayoutRequestModel.builder()
                .id(50L)
                .serialId(10L)
                .orderDetailId(20L)
                .grossAmount(new BigDecimal("30000000"))
                .netAmount(new BigDecimal("27790000"))
                .status(PrizePayoutRequestStatus.APPROVED)
                .createdBy(staffId.toString())
                .build();
        when(prizePayoutRequestRepositoryPort.findById(50L)).thenReturn(Optional.of(approved));
        when(lotteryTicketSerialRepositoryPort.findById(10L)).thenReturn(Optional.of(
                LotteryTicketSerialModel.builder().id(10L).payoutState(SerialPayoutState.PAYOUT_PENDING).build()));
        when(prizePayoutEligibilityService.requiresFourEyes(any())).thenReturn(true);

        staffService.complete(
                50L, otherStaffId, new CompletePrizePayoutRequest(PrizePayoutPaymentMethod.CASH, null, null));

        verify(prizePayoutSerialLockService).markPaidOut(10L);
    }

    @Test
    void createInPerson_combined_splitsCashAndTransfer() {
        when(prizePayoutEligibilityService.resolveOwnershipVerification(detail, serial))
                .thenReturn(new PrizePayoutEligibilityService.OwnershipVerificationContext(
                        PrizePayoutTicketOrigin.INTERNAL_OFFLINE,
                        PrizePayoutOwnershipVerificationLevel.MANUAL_ONLY,
                        true));

        staffService.createInPerson(
                staffId,
                new CreateStaffPrizePayoutRequest(
                        20L, 10L, null, null, null,
                        "Vietcombank", "0123456789", "TRAN VAN C",
                        "Tran Van C", "012345678901", "https://cdn.example/cccd.jpg", "https://cdn.example/cccd-back.jpg",
                        PrizePayoutPaymentMethod.COMBINED, new BigDecimal("2000000"),
                        true, "https://cdn.example/transfer.jpg", "https://cdn.example/contract.jpg"));

        ArgumentCaptor<PrizePayoutRequestModel> captor = ArgumentCaptor.forClass(PrizePayoutRequestModel.class);
        verify(prizePayoutRequestRepositoryPort, atLeastOnce()).save(captor.capture());
        PrizePayoutRequestModel saved = captor.getValue();
        assertEquals(PrizePayoutPaymentMethod.COMBINED, saved.getPaymentMethod());
        assertEquals(PrizePayoutRequestStatus.COMPLETED, saved.getStatus());
        assertEquals(0, new BigDecimal("2000000.00").compareTo(saved.getCashAmount()));
        assertEquals(0, new BigDecimal("2950000.00").compareTo(saved.getTransferAmount()));
        assertEquals("Vietcombank", saved.getBankName());
        verify(prizePayoutSerialLockService).markPaidOut(10L);
    }

    @Test
    void createInPerson_combined_zeroCash_fails() {
        DomainException ex = assertThrows(
                DomainException.class,
                () -> staffService.createInPerson(
                        staffId,
                        new CreateStaffPrizePayoutRequest(
                                20L, 10L, null, null, null, null, null, null,
                                "Tran Van C", "012345678901", "https://cdn.example/cccd.jpg", "https://cdn.example/cccd-back.jpg",
                                PrizePayoutPaymentMethod.COMBINED, BigDecimal.ZERO,
                                true, null, "https://cdn.example/contract.jpg")));
        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
    }

    @Test
    void complete_belowThreshold_sameCreator_ok() {
        PrizePayoutRequestModel pending = PrizePayoutRequestModel.builder()
                .id(51L)
                .serialId(10L)
                .orderDetailId(20L)
                .grossAmount(new BigDecimal("5000000"))
                .netAmount(new BigDecimal("4950000"))
                .status(PrizePayoutRequestStatus.PENDING)
                .createdBy(staffId.toString())
                .build();
        when(prizePayoutRequestRepositoryPort.findById(51L)).thenReturn(Optional.of(pending));
        when(lotteryTicketSerialRepositoryPort.findById(10L)).thenReturn(Optional.of(
                LotteryTicketSerialModel.builder().id(10L).payoutState(SerialPayoutState.PAYOUT_PENDING).build()));
        when(prizePayoutEligibilityService.requiresFourEyes(any())).thenReturn(false);

        staffService.complete(
                51L, staffId, new CompletePrizePayoutRequest(PrizePayoutPaymentMethod.CASH, null, null));

        verify(prizePayoutSerialLockService).markPaidOut(10L);
    }
}
