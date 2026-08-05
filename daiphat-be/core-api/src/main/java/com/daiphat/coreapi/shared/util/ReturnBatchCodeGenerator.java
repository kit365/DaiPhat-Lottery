package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Generates unique codes for return batch headers (phiếu trả vé).
 * Format: {@code PT-{drawDate}-{sequence}} e.g. {@code PT-20260804-0001}
 */
@Component
@RequiredArgsConstructor
public class ReturnBatchCodeGenerator {

    public static final String HEADER_PREFIX = "PT";
    public static final String SEGMENT_SEPARATOR = "-";
    private static final DateTimeFormatter DRAW_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;

    public String generateHeaderCode(LocalDate drawDate) {
        long sequence = returnBatchRepositoryPort.nextHeaderBatchCodeSequence();
        String drawDatePart = (drawDate != null ? drawDate : LocalDate.now()).format(DRAW_DATE_FORMAT);
        return String.join(
                SEGMENT_SEPARATOR,
                HEADER_PREFIX,
                drawDatePart,
                String.format("%04d", sequence)
        );
    }
}
