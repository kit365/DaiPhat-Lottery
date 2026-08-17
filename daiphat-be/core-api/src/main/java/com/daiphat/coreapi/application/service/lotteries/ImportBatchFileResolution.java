package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileGroupResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileRowResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileSupplierIdentityResponse;
import com.daiphat.coreapi.shared.util.tabular.TabularTable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * The fully resolved contents of an uploaded file.
 *
 * <p>Preview renders this; commit re-derives the very same structure from the same
 * file and creates from it, so the two steps can never disagree.
 */
record ImportBatchFileResolution(
        TabularTable table,
        List<ImportBatchFileGroupResponse> groups,
        ImportBatchFileSupplierIdentityResponse supplierIdentity
) {

    Optional<ImportBatchFileGroupResponse> group(LocalDate drawDate) {
        return groups.stream()
                .filter(group -> drawDate != null && drawDate.equals(group.drawDate()))
                .findFirst();
    }

    List<ImportBatchFileRowResponse> allRows() {
        return groups.stream().flatMap(group -> group.rows().stream()).toList();
    }

    /** Importable rows of one station within one draw date, in file order. */
    static List<ImportBatchFileRowResponse> stationRows(
            ImportBatchFileGroupResponse group,
            Long lotteryStationId
    ) {
        return group.rows().stream()
                .filter(ImportBatchFileRowResponse::isImportable)
                .filter(row -> lotteryStationId.equals(row.lotteryStationId()))
                .toList();
    }
}
