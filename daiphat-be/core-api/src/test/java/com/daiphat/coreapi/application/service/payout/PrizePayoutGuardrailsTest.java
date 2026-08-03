package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutOwnershipVerificationLevel;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;

@ExtendWith(MockitoExtension.class)
class PrizePayoutGuardrailsTest {

    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;

    private PrizePayoutCalculationService calculationService;
    private PrizePayoutEligibilityService eligibilityService;

    @BeforeEach
    void setUp() {
        calculationService = new PrizePayoutCalculationService(systemConfigRepositoryPort, new ObjectMapper());
        org.mockito.Mockito.lenient()
                .when(systemConfigRepositoryPort.findActiveByConfigKey(anyString()))
                .thenReturn(Optional.empty());
        eligibilityService = new PrizePayoutEligibilityService(
                null, null, null, null, null, null, calculationService, systemConfigRepositoryPort);
    }

    @Test
    void validateWonWithProof_missingNumbers_fails() {
        var match = new PrizePayoutEligibilityService.PrizeMatchContext(
                TicketDrawResultStatus.WON, "G1", "Giải nhất", new BigDecimal("30000000"),
                null, null, null, null);
        DomainException ex = assertThrows(DomainException.class, () -> eligibilityService.validateWonWithProof(match));
        assertEquals(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, ex.getErrorCode());
    }

    @Test
    void validateWonWithProof_withNumbers_ok() {
        var match = new PrizePayoutEligibilityService.PrizeMatchContext(
                TicketDrawResultStatus.WON, "G1", "Giải nhất", new BigDecimal("30000000"),
                "123456", "123456", "EXACT", 6);
        assertDoesNotThrow(() -> eligibilityService.validateWonWithProof(match));
    }

    @Test
    void requiresRecipientIdentity_alwaysTrue() {
        assertTrue(eligibilityService.requiresRecipientIdentity(
                PrizePayoutOwnershipVerificationLevel.MANUAL_ONLY, new BigDecimal("1000")));
        assertTrue(eligibilityService.requiresRecipientIdentity(
                PrizePayoutOwnershipVerificationLevel.AUTO_MATCHED, new BigDecimal("9999999")));
    }

    @Test
    void requiresRecipientIdImage_noCustomer_always() {
        assertTrue(eligibilityService.requiresRecipientIdImage(null, new BigDecimal("1000")));
    }

    @Test
    void requiresRecipientIdImage_linkedBelowThreshold_false() {
        assertFalse(eligibilityService.requiresRecipientIdImage(
                UUID.randomUUID(), new BigDecimal("9999999")));
    }

    @Test
    void requiresRecipientIdImage_linkedAtThreshold_true() {
        assertTrue(eligibilityService.requiresRecipientIdImage(
                UUID.randomUUID(), new BigDecimal("10000000")));
    }

    @Test
    void requiresFourEyes_byTaxThreshold() {
        assertFalse(eligibilityService.requiresFourEyes(new BigDecimal("9999999")));
        assertTrue(eligibilityService.requiresFourEyes(new BigDecimal("10000000")));
    }

    @Test
    void outOfScopeMessage_constant() {
        assertTrue(PrizePayoutRequestModel.OUT_OF_SCOPE_TICKET_MESSAGE.contains("ngoài phạm vi hỗ trợ"));
    }
}
