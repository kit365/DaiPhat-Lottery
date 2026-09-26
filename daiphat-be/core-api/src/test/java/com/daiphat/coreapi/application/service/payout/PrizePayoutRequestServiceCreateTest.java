package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.dto.ekyc.EkycVerificationResult;
import com.daiphat.coreapi.application.dto.request.payout.CreatePrizePayoutRequestRequest;
import com.daiphat.coreapi.application.mapper.payout.PrizePayoutApplicationMapper;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.service.ekyc.EkycVerificationService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PrizePayoutRequestService.create")
class PrizePayoutRequestServiceCreateTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final String FRONT_URL = "https://res.cloudinary.com/demo/front.jpg";
    private static final String BACK_URL = "https://res.cloudinary.com/demo/back.jpg";

    @Mock
    private PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    @Mock
    private UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    @Mock
    private PrizePayoutEligibilityService prizePayoutEligibilityService;
    @Mock
    private PrizePayoutCalculationService prizePayoutCalculationService;
    @Mock
    private PrizePayoutSerialLockService prizePayoutSerialLockService;
    @Mock
    private PrizePayoutApplicationMapper prizePayoutApplicationMapper;
    @Mock
    private OrderDetailRepository orderDetailRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StoragePort storagePort;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private EkycVerificationService ekycVerificationService;
    @Mock
    private PlatformTransactionManager transactionManager;

    private PrizePayoutRequestService service;

    @BeforeEach
    void setUp() {
        service = new PrizePayoutRequestService(
                prizePayoutRequestRepositoryPort,
                userBankAccountRepositoryPort,
                prizePayoutEligibilityService,
                prizePayoutCalculationService,
                prizePayoutSerialLockService,
                prizePayoutApplicationMapper,
                orderDetailRepository,
                userRepository,
                storagePort,
                eventPublisher,
                ekycVerificationService,
                transactionManager
        );
    }

    @Test
    @DisplayName("OCR runs between a committed read-only transaction and a time-limited write transaction")
    void create_runsOcrOutsideTransaction_andMapsLockTimeoutToTicketBusy() {
        stubValidTicket();
        when(transactionManager.getTransaction(any())).thenAnswer(invocation -> mock(TransactionStatus.class));
        EkycVerificationResult ekyc = new EkycVerificationResult(
                EkycStatus.VERIFIED, "DOAN MINH PHU", "079204016924",
                "04/12/2004", "Nam", "Việt Nam", "Nam Định", "Hồ Chí Minh",
                "01/01/2021", "04/12/2029",
                null, null, null, null);
        when(ekycVerificationService.verifyIdCardOcrOnlyFromUrls(FRONT_URL, BACK_URL)).thenReturn(ekyc);
        when(ekycVerificationService.requireOcrIdNumber(ekyc)).thenReturn("079204016924");
        when(prizePayoutCalculationService.calculate(any())).thenReturn(
                new PrizePayoutCalculationService.PrizePayoutBreakdown(
                        BigDecimal.valueOf(6_000_000), BigDecimal.ZERO, BigDecimal.valueOf(60_000), BigDecimal.valueOf(5_940_000)));
        when(prizePayoutRequestRepositoryPort.existsByRequestCode(anyString())).thenReturn(false);
        when(prizePayoutRequestRepositoryPort.save(any()))
                .thenThrow(new QueryTimeoutException("canceling statement due to user request"));

        assertThatThrownBy(() -> service.create(CUSTOMER_ID, request()))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.PRIZE_PAYOUT_TICKET_BUSY);

        ArgumentCaptor<TransactionDefinition> definitions = ArgumentCaptor.forClass(TransactionDefinition.class);
        InOrder order = inOrder(transactionManager, ekycVerificationService);
        order.verify(transactionManager).getTransaction(definitions.capture());
        order.verify(transactionManager).commit(any());
        order.verify(ekycVerificationService).verifyIdCardOcrOnlyFromUrls(FRONT_URL, BACK_URL);
        order.verify(transactionManager).getTransaction(definitions.capture());
        order.verify(transactionManager).rollback(any());

        List<TransactionDefinition> captured = definitions.getAllValues();
        assertThat(captured.get(0).isReadOnly()).isTrue();
        assertThat(captured.get(1).isReadOnly()).isFalse();
        assertThat(captured.get(1).getTimeout()).isPositive();
        verify(prizePayoutEligibilityService, times(2)).validateCustomerOnlineCreate(any(), any());
    }

    private void stubValidTicket() {
        OrderEntity order = OrderEntity.builder().id(UUID.randomUUID()).orderType(OrderType.ONLINE).build();
        LotteryTicketSerialEntity serial = LotteryTicketSerialEntity.builder().id(143482L).build();
        OrderDetailEntity detail = OrderDetailEntity.builder().id(582L).order(order).lotteryTicketSerial(serial).build();
        when(prizePayoutEligibilityService.resolveOwnedDetail(CUSTOMER_ID, 582L, 143482L)).thenReturn(detail);
        when(prizePayoutEligibilityService.resolvePrizeMatch(detail, serial)).thenReturn(
                new PrizePayoutEligibilityService.PrizeMatchContext(
                        TicketDrawResultStatus.WON, "KK", "Giải khuyến khích", BigDecimal.valueOf(6_000_000),
                        "123456", "23456", "LAST", 5));
        when(userBankAccountRepositoryPort.findById(1L)).thenReturn(Optional.of(
                UserBankAccountModel.builder().id(1L).userId(CUSTOMER_ID).bankName("Vietcombank")
                        .bankAccountNo("0123456789").bankAccountName("NGUYEN PHU").build()));
    }

    private static CreatePrizePayoutRequestRequest request() {
        return new CreatePrizePayoutRequestRequest(582L, 143482L, 1L, FRONT_URL, BACK_URL);
    }
}
