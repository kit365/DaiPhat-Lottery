package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierSettlementCodeGenerator Unit Tests")
class SupplierSettlementCodeGeneratorTest {

    @Mock
    private SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;

    @InjectMocks
    private SupplierSettlementCodeGenerator generator;

    @Test
    @DisplayName("generates DS-{periodFrom}-{sequence} format")
    void generateCode_success() {
        when(supplierSettlementRepositoryPort.nextSettlementCodeSequence()).thenReturn(1L);

        String code = generator.generateCode(LocalDate.of(2026, 8, 8));

        assertThat(code).isEqualTo("DS-20260808-0001");
    }

    @Test
    @DisplayName("pads sequence to 4 digits")
    void generateCode_padsSequence() {
        when(supplierSettlementRepositoryPort.nextSettlementCodeSequence()).thenReturn(42L);

        String code = generator.generateCode(LocalDate.of(2026, 8, 13));

        assertThat(code).isEqualTo("DS-20260813-0042");
    }
}
