package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.ExtractedTicketFieldsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.FieldValidationResult;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrOverallValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.shared.util.LotteryStationNameResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OcrScanValidationServiceTest {

    @Mock
    private LotteryStationRepositoryPort lotteryStationRepositoryPort;
    @Mock
    private LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    @Mock
    private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    @Mock
    private LotteryStationNameResolver stationNameResolver;

    private OcrScanValidationService service;
    private LotteryStationModel station;
    private LocalDate drawDate;

    @BeforeEach
    void setUp() {
        service = new OcrScanValidationService(
                lotteryStationRepositoryPort,
                lotteryTicketRepositoryPort,
                lotteryTicketSerialRepositoryPort,
                stationNameResolver
        );
        drawDate = LocalDate.of(2026, 8, 24); // Monday
        LotteryRegionModel region = LotteryRegionModel.builder()
                .id(1L)
                .code("NAM")
                .name("Miền Nam")
                .minNumber(100000)
                .maxNumber(999999)
                .build();
        station = LotteryStationModel.builder()
                .id(10L)
                .name("TP. Hồ Chí Minh")
                .code("HCM")
                .price(new BigDecimal("10000"))
                .drawDays(List.of(DayOfWeek.MONDAY, DayOfWeek.SATURDAY))
                .region(region)
                .build();
    }

    @Test
    void happyPathMarksRequiredFieldsMatched() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(station));
        when(stationNameResolver.resolve(anyString(), anyList(), anyMap()))
                .thenReturn(new LotteryStationNameResolver.Match(
                        10L, "TP. Hồ Chí Minh", LotteryStationNameResolver.MatchKind.EXACT, List.of()
                ));

        ExtractedTicketFieldsResponse extracted = new ExtractedTicketFieldsResponse(
                "TP. Hồ Chí Minh",
                "HCM",
                "A012345",
                "123456",
                drawDate,
                "10.000 VND",
                "35TV21"
        );
        Map<String, Double> confidences = Map.of(
                "stationName", 0.95,
                "serialNumber", 0.9,
                "numbers", 0.92,
                "drawDate", 0.91,
                "ticketType", 0.88,
                "batchCode", 0.8
        );

        OcrScanValidationService.ValidationOutcome outcome = service.validate(
                extracted, confidences, ScannedTicketStatus.COMPLETE, station, drawDate
        );

        assertThat(outcome.overallValidationStatus()).isEqualTo(OcrOverallValidationStatus.VALID);
        assertThat(outcome.status()).isEqualTo(ScannedTicketStatus.COMPLETE);
        assertThat(outcome.fieldValidations().get("stationName").status()).isEqualTo(OcrFieldValidationStatus.MATCHED);
        assertThat(outcome.fieldValidations().get("drawDate").status()).isEqualTo(OcrFieldValidationStatus.MATCHED);
        assertThat(outcome.fieldValidations().get("ticketType").status()).isEqualTo(OcrFieldValidationStatus.MATCHED);
        assertThat(outcome.fieldValidations().get("batchCode").status()).isEqualTo(OcrFieldValidationStatus.MATCHED);
        assertThat(outcome.businessValidationErrors()).noneMatch(msg -> msg.contains("phiếu nhập"));
        assertThat(outcome.adjustedConfidence()).isGreaterThan(0.8);
        assertThat(outcome.businessValidationErrors()).isEmpty();
    }

    @Test
    void productionBatchCodeIsNotComparedToImportBatch() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(station));
        when(stationNameResolver.resolve(anyString(), anyList(), anyMap()))
                .thenReturn(new LotteryStationNameResolver.Match(
                        10L, "TP. Hồ Chí Minh", LotteryStationNameResolver.MatchKind.EXACT, List.of()
                ));

        ExtractedTicketFieldsResponse extracted = new ExtractedTicketFieldsResponse(
                "TP. Hồ Chí Minh", "HCM", "A012345", "123456", drawDate, "10000", "35TV21"
        );

        OcrScanValidationService.ValidationOutcome outcome = service.validate(
                extracted,
                Map.of(
                        "stationName", 0.95,
                        "serialNumber", 0.95,
                        "numbers", 0.95,
                        "drawDate", 0.95,
                        "ticketType", 0.9,
                        "batchCode", 0.7
                ),
                ScannedTicketStatus.COMPLETE,
                station,
                drawDate
        );

        assertThat(outcome.fieldValidations().get("batchCode").status())
                .isEqualTo(OcrFieldValidationStatus.MATCHED);
        assertThat(outcome.overallValidationStatus()).isEqualTo(OcrOverallValidationStatus.VALID);
        assertThat(outcome.businessValidationErrors()).isEmpty();
    }

    @Test
    void scheduleMismatchWhenStationDoesNotDrawOnDate() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(station));
        when(stationNameResolver.resolve(anyString(), anyList(), anyMap()))
                .thenReturn(new LotteryStationNameResolver.Match(
                        10L, "TP. Hồ Chí Minh", LotteryStationNameResolver.MatchKind.EXACT, List.of()
                ));

        LocalDate tuesday = LocalDate.of(2026, 8, 25);
        ExtractedTicketFieldsResponse extracted = new ExtractedTicketFieldsResponse(
                "TP. Hồ Chí Minh", "HCM", "A012345", "123456", tuesday, "10000", null
        );

        OcrScanValidationService.ValidationOutcome outcome = service.validate(
                extracted,
                Map.of("stationName", 0.9, "serialNumber", 0.9, "numbers", 0.9, "drawDate", 0.9),
                ScannedTicketStatus.COMPLETE,
                station,
                tuesday
        );

        FieldValidationResult draw = outcome.fieldValidations().get("drawDate");
        assertThat(draw.status()).isEqualTo(OcrFieldValidationStatus.MISMATCHED);
        assertThat(outcome.overallValidationStatus()).isEqualTo(OcrOverallValidationStatus.INVALID);
        assertThat(outcome.status()).isEqualTo(ScannedTicketStatus.INCOMPLETE);
        assertThat(outcome.adjustedConfidence()).isLessThan(0.5);
    }

    @Test
    void priceMismatchReducesConfidence() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(station));
        when(stationNameResolver.resolve(anyString(), anyList(), anyMap()))
                .thenReturn(new LotteryStationNameResolver.Match(
                        10L, "TP. Hồ Chí Minh", LotteryStationNameResolver.MatchKind.EXACT, List.of()
                ));

        ExtractedTicketFieldsResponse extracted = new ExtractedTicketFieldsResponse(
                "TP. Hồ Chí Minh", "HCM", "A012345", "123456", drawDate, "20.000 VND", "35TV21"
        );

        OcrScanValidationService.ValidationOutcome outcome = service.validate(
                extracted,
                Map.of(
                        "stationName", 0.95,
                        "serialNumber", 0.95,
                        "numbers", 0.95,
                        "drawDate", 0.95,
                        "ticketType", 0.99
                ),
                ScannedTicketStatus.COMPLETE,
                station,
                drawDate
        );

        assertThat(outcome.fieldValidations().get("ticketType").status())
                .isEqualTo(OcrFieldValidationStatus.MISMATCHED);
        assertThat(outcome.overallValidationStatus()).isEqualTo(OcrOverallValidationStatus.INVALID);
        assertThat(outcome.businessValidationErrors()).anyMatch(msg -> msg.contains("20.000 VND"));
    }

    @Test
    void stationMismatchAgainstImportLine() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(station));
        when(stationNameResolver.resolve(anyString(), anyList(), anyMap()))
                .thenReturn(new LotteryStationNameResolver.Match(
                        99L, "Đà Lạt", LotteryStationNameResolver.MatchKind.EXACT, List.of()
                ));

        ExtractedTicketFieldsResponse extracted = new ExtractedTicketFieldsResponse(
                "Đà Lạt", "DL", "A012345", "123456", drawDate, "10000", null
        );

        OcrScanValidationService.ValidationOutcome outcome = service.validate(
                extracted,
                Map.of("stationName", 0.9, "serialNumber", 0.9, "numbers", 0.9, "drawDate", 0.9),
                ScannedTicketStatus.COMPLETE,
                station,
                drawDate
        );

        assertThat(outcome.fieldValidations().get("stationName").status())
                .isEqualTo(OcrFieldValidationStatus.MISMATCHED);
        assertThat(outcome.overallValidationStatus()).isEqualTo(OcrOverallValidationStatus.INVALID);
    }

    @Test
    void missingOcrFieldsAreUnreadablePartialNotInvalid() {
        ExtractedTicketFieldsResponse extracted = new ExtractedTicketFieldsResponse(
                "TP. Hồ Chí Minh",
                "HCM",
                null,
                "123456",
                drawDate,
                "10000",
                null
        );
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(station));
        when(stationNameResolver.resolve(anyString(), anyList(), anyMap()))
                .thenReturn(new LotteryStationNameResolver.Match(
                        10L, "TP. Hồ Chí Minh", LotteryStationNameResolver.MatchKind.EXACT, List.of()
                ));

        OcrScanValidationService.ValidationOutcome outcome = service.validate(
                extracted,
                Map.of(
                        "stationName", 0.9,
                        "serialNumber", 0.0,
                        "numbers", 0.95,
                        "drawDate", 0.9,
                        "ticketType", 0.9,
                        "batchCode", 0.0
                ),
                ScannedTicketStatus.INCOMPLETE,
                station,
                drawDate
        );

        assertThat(outcome.fieldValidations().get("serialNumber").status())
                .isEqualTo(OcrFieldValidationStatus.UNREADABLE);
        assertThat(outcome.fieldValidations().get("batchCode").status())
                .isEqualTo(OcrFieldValidationStatus.UNREADABLE);
        assertThat(outcome.overallValidationStatus()).isEqualTo(OcrOverallValidationStatus.NEEDS_REVIEW);
        assertThat(outcome.status()).isEqualTo(ScannedTicketStatus.PARTIAL);
        assertThat(outcome.fieldValidations().get("serialNumber").message())
                .containsIgnoringCase("che");
    }

    @Test
    void withoutLineContextSkipsBatchDrawDateMismatch() {
        when(lotteryStationRepositoryPort.findAll()).thenReturn(List.of(station));
        when(stationNameResolver.resolve(anyString(), anyList(), anyMap()))
                .thenReturn(new LotteryStationNameResolver.Match(
                        10L, "TP. Hồ Chí Minh", LotteryStationNameResolver.MatchKind.EXACT, List.of()
                ));

        ExtractedTicketFieldsResponse extracted = new ExtractedTicketFieldsResponse(
                "TP. Hồ Chí Minh",
                "HCM",
                "A012345",
                "123456",
                drawDate,
                "10.000 VND",
                "35TV21"
        );

        OcrScanValidationService.ValidationOutcome outcome = service.validate(
                extracted,
                Map.of(
                        "stationName", 0.95,
                        "serialNumber", 0.9,
                        "numbers", 0.92,
                        "drawDate", 0.91,
                        "ticketType", 0.88,
                        "batchCode", 0.8
                ),
                ScannedTicketStatus.COMPLETE,
                null,
                null
        );

        assertThat(outcome.overallValidationStatus()).isEqualTo(OcrOverallValidationStatus.VALID);
        assertThat(outcome.resolvedStationId()).isEqualTo(10L);
        assertThat(outcome.resolvedDrawDate()).isEqualTo(drawDate);
        assertThat(outcome.fieldValidations().get("drawDate").status())
                .isEqualTo(OcrFieldValidationStatus.MATCHED);
        assertThat(outcome.businessValidationErrors()).noneMatch(msg -> msg.contains("phiếu nhập"));
    }

    @Test
    void parseMoneyStripsCurrencyNoise() {
        assertThat(OcrScanValidationService.parseMoney("10.000đ")).isEqualByComparingTo("10000");
        assertThat(OcrScanValidationService.parseMoney("20,000 VND")).isEqualByComparingTo("20000");
        assertThat(OcrScanValidationService.formatVnd(new BigDecimal("10000"))).isEqualTo("10.000 VND");
    }
}
