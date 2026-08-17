package com.daiphat.coreapi.application.dto.lotteries;

import java.math.BigDecimal;
import java.util.List;

/**
 * Everything printed on a "phiếu nhập lô" document, already resolved to display
 * text.
 *
 * <p>This is the shape three producers agree on: the server's export, the
 * downloadable blank template, and the preview's reconciliation report. Keeping
 * one description of the document means an operator comparing an exported batch
 * against the file they uploaded is comparing like with like, field for field.
 *
 * <p>Assembled by the service, rendered by ImportBatchDocumentWriter - no lookups
 * happen while writing cells.
 */
public record ImportBatchDocument(
        Header header,
        Party issuer,
        Party supplier,
        Operator importedBy,
        Totals totals,
        List<StationLine> stations,
        List<TicketLine> tickets
) {

    /** Identity of the batch itself. Every field is display-ready text. */
    public record Header(
            String batchCode,
            String drawDate,
            String batchType,
            String status,
            String importMode,
            String importedAt,
            String createdAt,
            String completedAt,
            String note
    ) {
    }

    /** One side of the delivery: the supplier handing over, or this company. */
    public record Party(
            String name,
            String code,
            String taxCode,
            String contactName,
            String phone,
            String email,
            String address
    ) {
    }

    /** The staff member who created the batch. */
    public record Operator(
            String fullName,
            String role,
            String phone,
            String email
    ) {
    }

    public record Totals(
            int declaredQuantity,
            int importedQuantity,
            BigDecimal declaredCostValue,
            BigDecimal importedCostValue,
            int stationCount
    ) {
    }

    /**
     * One station of the batch - one import_batch_line.
     *
     * @param drawSchedule the station's weekly draw days and time, which is what
     *                     tells a reader whether this line belongs on this date
     * @param progress     imported over declared, as text
     */
    public record StationLine(
            String stationCode,
            String stationName,
            String drawDate,
            String drawSchedule,
            String batchType,
            String status,
            String progress,
            int declaredQuantity,
            int importedQuantity,
            BigDecimal salePrice,
            BigDecimal commissionPercent,
            BigDecimal importCost,
            BigDecimal totalCostValue
    ) {
    }

    /** One physical ticket, in the schema the importer reads back. */
    public record TicketLine(
            String stationCode,
            String stationName,
            String drawDate,
            String numbers,
            String serialNumber,
            String ticketImage,
            BigDecimal importCost,
            BigDecimal salePrice,
            BigDecimal commissionPercent
    ) {
    }
}
