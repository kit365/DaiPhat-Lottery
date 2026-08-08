package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Generates unique codes for supplier settlements (đối soát NCC).
 * Format: {@code DS-{periodFrom}-{sequence}} e.g. {@code DS-20260808-0001}
 * <p>
 * Mirrors import-batch ({@code PN-...}) and return-batch ({@code PT-...}) conventions.
 */
@Component
@RequiredArgsConstructor
public class SupplierSettlementCodeGenerator {

    public static final String HEADER_PREFIX = "DS";
    public static final String SEGMENT_SEPARATOR = "-";
    private static final DateTimeFormatter PERIOD_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    private final SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;

    public String generateCode(LocalDate periodFrom) {
        long sequence = supplierSettlementRepositoryPort.nextSettlementCodeSequence();
        String datePart = (periodFrom != null ? periodFrom : LocalDate.now()).format(PERIOD_DATE_FORMAT);
        return String.join(
                SEGMENT_SEPARATOR,
                HEADER_PREFIX,
                datePart,
                String.format("%04d", sequence)
        );
    }
}
