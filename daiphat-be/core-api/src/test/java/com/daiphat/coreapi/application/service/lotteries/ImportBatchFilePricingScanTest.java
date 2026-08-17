package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileMappingRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFilePricingMismatchResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.shared.util.ImportBatchFilePricingComparator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The price check over an uploaded file, exercised on the layout the template
 * actually produces: one serial per line, so a lottery number occupies several
 * consecutive lines and only the first of them becomes a ticket.
 */
class ImportBatchFilePricingScanTest {

    private static final long CA_MAU = 31L;

    private final ImportBatchFileImportService service = newService();

    private ImportBatchFileImportService newService() {
        // The scan needs one collaborator; the rest of the service is untouched by
        // it, so it is built without wiring twenty unrelated ports.
        ImportBatchFileImportService instance =
                org.mockito.Mockito.mock(ImportBatchFileImportService.class,
                        org.mockito.Mockito.CALLS_REAL_METHODS);
        ReflectionTestUtils.setField(instance, "pricingComparator",
                new ImportBatchFilePricingComparator());
        return instance;
    }

    /** Cà Mau as configured: 10.000đ sale price, 5% commission. */
    private Map<Long, LotteryStationModel> stations() {
        return Map.of(CA_MAU, LotteryStationModel.builder()
                .id(CA_MAU)
                .name("Cà Mau")
                .price(new BigDecimal("10000"))
                .commissionRate(new BigDecimal("0.05"))
                .build());
    }

    private ImportBatchFileMappingRequest mappingWithPrices() {
        return ImportBatchFileMappingRequest.builder()
                .stationColumn("Nhà đài")
                .numbersColumn("Dãy số")
                .serialsColumn("Số sê-ri")
                .importCostColumn("Giá nhập")
                .salePriceColumn("Giá bán")
                .commissionRateColumn("Hoa hồng (%)")
                .build();
    }

    private ImportBatchFileImportService.PricingCandidate line(
            int rowNumber, String salePrice, String commission) {
        return new ImportBatchFileImportService.PricingCandidate(
                rowNumber, CA_MAU, salePrice, commission, "9500");
    }

    @Test
    @DisplayName("A price edited on a line that merges into an earlier one is still caught")
    void catchesPriceOnAMergedLine() {
        // Lines 5-8 are one lottery number: line 5 keeps the ticket, 6-8 hand it
        // their serials. The edit under test is on line 6 - sale price 9.000
        // instead of 10.000, commission 10% instead of 5%.
        List<ImportBatchFileImportService.PricingCandidate> candidates = List.of(
                line(1, "10000", "5"),
                line(2, "10000", "5"),
                line(3, "10000", "5"),
                line(5, "10000", "5"),
                line(6, "9000", "10"),
                line(7, "10000", "5"),
                line(8, "10000", "5")
        );

        List<ImportBatchFilePricingMismatchResponse> mismatches =
                service.scanPricing(candidates, stations(), mappingWithPrices());

        assertThat(mismatches).hasSize(1);
        ImportBatchFilePricingMismatchResponse found = mismatches.getFirst();
        assertThat(found.rowNumber()).as("names the offending line").isEqualTo(6);
        assertThat(found.salePriceMismatch()).isTrue();
        assertThat(found.salePriceInFile()).isEqualByComparingTo("9000");
        assertThat(found.salePriceInSystem()).isEqualByComparingTo("10000");
        assertThat(found.commissionRateMismatch()).isTrue();
        assertThat(found.commissionRateInFile()).isEqualByComparingTo("10");
        assertThat(found.commissionRateInSystem()).isEqualByComparingTo("5");
    }

    @Test
    @DisplayName("A file whose prices all agree reports nothing")
    void silentWhenPricesAgree() {
        List<ImportBatchFileImportService.PricingCandidate> candidates = List.of(
                line(1, "10000", "5"),
                line(2, "10000", "5"),
                line(3, "10000", "5")
        );

        assertThat(service.scanPricing(candidates, stations(), mappingWithPrices())).isEmpty();
    }

    @Test
    @DisplayName("One station is reported once, however many of its lines disagree")
    void reportsEachStationOnce() {
        List<ImportBatchFileImportService.PricingCandidate> candidates = List.of(
                line(1, "9000", "10"),
                line(2, "9000", "10"),
                line(3, "9000", "10")
        );

        List<ImportBatchFilePricingMismatchResponse> mismatches =
                service.scanPricing(candidates, stations(), mappingWithPrices());

        assertThat(mismatches).hasSize(1);
        assertThat(mismatches.getFirst().rowNumber())
                .as("the first offending line, not the last")
                .isEqualTo(1);
    }

    @Test
    @DisplayName("A file carrying no price columns is not compared at all")
    void skipsFilesWithoutPriceColumns() {
        ImportBatchFileMappingRequest noPrices = ImportBatchFileMappingRequest.builder()
                .stationColumn("Nhà đài")
                .numbersColumn("Dãy số")
                .serialsColumn("Số sê-ri")
                .build();

        assertThat(service.scanPricing(List.of(line(1, "9000", "10")), stations(), noPrices))
                .isEmpty();
    }

    @Test
    @DisplayName("Lines whose station never resolved carry no comparison")
    void ignoresUnresolvedLines() {
        List<ImportBatchFileImportService.PricingCandidate> candidates = List.of(
                new ImportBatchFileImportService.PricingCandidate(1, null, "9000", "10", "9500"));

        assertThat(service.scanPricing(candidates, stations(), mappingWithPrices())).isEmpty();
    }

    // --------------------------------------------------- duplicate keys

    /**
     * A duplicate is the same physical ticket: same station, same draw date, same
     * lottery number, same serial. Anything less is a different ticket, and the
     * database says so — UNIQUE (ticket_id, serial_number), where the ticket is
     * itself keyed by station, draw date and number.
     */
    @Test
    @DisplayName("Two lines are duplicates only when station, number and serial all match")
    void duplicateNeedsTheWholeTuple() {
        String base = ImportBatchFileImportService.serialKey(CA_MAU, "100000", "CM1000001");

        assertThat(ImportBatchFileImportService.serialKey(CA_MAU, "100000", "CM1000001"))
                .as("same ticket, same serial")
                .isEqualTo(base);

        assertThat(ImportBatchFileImportService.serialKey(CA_MAU, "100001", "CM1000001"))
                .as("a serial reused under another lottery number is another ticket")
                .isNotEqualTo(base);

        assertThat(ImportBatchFileImportService.serialKey(99L, "100000", "CM1000001"))
                .as("another station is another ticket")
                .isNotEqualTo(base);

        assertThat(ImportBatchFileImportService.serialKey(CA_MAU, "100000", "CM1000002"))
                .as("another serial is another row of the same ticket")
                .isNotEqualTo(base);
    }

    @Test
    @DisplayName("Case and stray spaces do not make a second ticket")
    void duplicateIgnoresCaseAndSpacing() {
        assertThat(ImportBatchFileImportService.serialKey(CA_MAU, " 100000 ", " cm1000001 "))
                .isEqualTo(ImportBatchFileImportService.serialKey(CA_MAU, "100000", "CM1000001"));
    }

    // ------------------------------------------------------- draw dates

    private static final LocalDateTime NOW =
            LocalDateTime.of(LocalDate.of(2026, 8, 16), LocalTime.of(9, 0));

    @Test
    @DisplayName("A draw date already past says so, and points at the settlement route")
    void namesAPastDrawDate() {
        String message = service.outOfWindowMessage(LocalDate.of(2026, 8, 15), NOW);

        assertThat(message)
                .contains("15/08/2026")
                .contains("đã qua")
                .contains("16/08/2026")
                .contains("đối soát");
    }

    /**
     * Tomorrow is inside the window now, so "out of window" in the future means a
     * date beyond it — the message names the range rather than a single day.
     */
    @Test
    @DisplayName("A draw date beyond tomorrow names the range and says to come back")
    void namesADrawDateBeyondTheWindow() {
        String message = service.outOfWindowMessage(LocalDate.of(2026, 8, 20), NOW);

        assertThat(message)
                .contains("20/08/2026")
                .contains("còn xa")
                .contains("16/08/2026")
                .contains("17/08/2026")
                .contains("tải lại");
    }
}
