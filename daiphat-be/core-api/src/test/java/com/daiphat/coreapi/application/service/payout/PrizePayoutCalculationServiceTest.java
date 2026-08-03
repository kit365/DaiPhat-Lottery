package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrizePayoutCalculationServiceTest {

    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;

    private PrizePayoutCalculationService service;

    private static final PrizePayoutCalculationService.PrizePayoutCalcSettings DEFAULT_SETTINGS =
            new PrizePayoutCalculationService.PrizePayoutCalcSettings(
                    new BigDecimal("10000000"),
                    new BigDecimal("10000000"),
                    new BigDecimal("0.10"),
                    List.of(
                            new PrizePayoutCalculationService.CommissionTier(new BigDecimal("10000000"), new BigDecimal("0.01")),
                            new PrizePayoutCalculationService.CommissionTier(new BigDecimal("100000000"), new BigDecimal("0.007")),
                            new PrizePayoutCalculationService.CommissionTier(new BigDecimal("1000000000"), new BigDecimal("0.004")),
                            new PrizePayoutCalculationService.CommissionTier(null, new BigDecimal("0.002"))
                    )
            );

    @BeforeEach
    void setUp() {
        service = new PrizePayoutCalculationService(systemConfigRepositoryPort, new ObjectMapper());
        when(systemConfigRepositoryPort.findActiveByConfigKey(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void calculate_atExactlyTenMillion_noTax_onePercentCommission() {
        var result = service.calculate(new BigDecimal("10000000"), DEFAULT_SETTINGS);
        assertEquals(new BigDecimal("10000000.00"), result.grossAmount());
        assertEquals(new BigDecimal("0.00"), result.taxAmount());
        assertEquals(new BigDecimal("100000.00"), result.commissionAmount());
        assertEquals(new BigDecimal("9900000.00"), result.netAmount());
    }

    @Test
    void calculate_aboveTenMillion_appliesTaxAndZeroPointSevenCommission() {
        // gross 20_000_000 → tax (10M)*10% = 1_000_000; commission 0.7% = 140_000; net = 18_860_000
        var result = service.calculate(new BigDecimal("20000000"), DEFAULT_SETTINGS);
        assertEquals(new BigDecimal("20000000.00"), result.grossAmount());
        assertEquals(new BigDecimal("1000000.00"), result.taxAmount());
        assertEquals(new BigDecimal("140000.00"), result.commissionAmount());
        assertEquals(new BigDecimal("18860000.00"), result.netAmount());
    }

    @Test
    void calculate_aboveOneHundredMillion_usesZeroPointFourCommission() {
        var result = service.calculate(new BigDecimal("150000000"), DEFAULT_SETTINGS);
        assertEquals(new BigDecimal("150000000.00"), result.grossAmount());
        // tax = (140M)*10% = 14_000_000
        assertEquals(new BigDecimal("14000000.00"), result.taxAmount());
        // commission 0.4% = 600_000
        assertEquals(new BigDecimal("600000.00"), result.commissionAmount());
        assertEquals(new BigDecimal("135400000.00"), result.netAmount());
    }

    @Test
    void calculate_aboveOneBillion_usesZeroPointTwoCommission() {
        var result = service.calculate(new BigDecimal("2000000000"), DEFAULT_SETTINGS);
        assertEquals(new BigDecimal("2000000000.00"), result.grossAmount());
        // tax = (1_990_000_000)*10% = 199_000_000
        assertEquals(new BigDecimal("199000000.00"), result.taxAmount());
        // commission 0.2% = 4_000_000
        assertEquals(new BigDecimal("4000000.00"), result.commissionAmount());
        assertEquals(new BigDecimal("1797000000.00"), result.netAmount());
    }

    @Test
    void calculate_loadsDefaultsWhenConfigMissing() {
        var result = service.calculate(new BigDecimal("5000000"));
        assertEquals(new BigDecimal("5000000.00"), result.grossAmount());
        assertEquals(new BigDecimal("0.00"), result.taxAmount());
        assertEquals(new BigDecimal("50000.00"), result.commissionAmount());
        assertEquals(new BigDecimal("4950000.00"), result.netAmount());
    }
}
