package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileImportCommitRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFilePreviewRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SaveImportBatchFileMappingProfileRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SaveLotteryStationAliasRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchFileConfigRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileConfigResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileExportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileJobResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileMappingProfileResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileImportResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileInspectResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFilePreviewResponse;
import com.daiphat.coreapi.application.dto.lotteries.ImportBatchOriginalFileBundle;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Creating import batches from a supplier .csv / .xlsx file.
 *
 * <p>The file never creates anything by itself: inspect and preview are read-only,
 * and commit funnels every batch through the ordinary create path so file import
 * can never bypass a rule that manual entry enforces.
 */
public interface ImportBatchFileImportServicePort {

    /** Step 1: read the header layout and suggest a column mapping. */
    ImportBatchFileInspectResponse inspect(byte[] content, String fileName, Long supplierId);

    /** Step 2: resolve every row and group it by draw date. Writes nothing. */
    ImportBatchFilePreviewResponse preview(
            byte[] content,
            String fileName,
            ImportBatchFilePreviewRequest request,
            UUID operatorId
    );

    /**
     * Step 3: create one batch per selected draw date - and its tickets when the
     * file carries them - each call in its own transaction.
     *
     * <p>The file is uploaded again rather than the resolved rows being sent back,
     * so the backend re-reads and re-validates everything instead of trusting the
     * client's copy of the preview.
     */
    ImportBatchFileImportResultResponse commit(
            byte[] content,
            String fileName,
            ImportBatchFileImportCommitRequest request,
            UUID operatorId
    );

    /**
     * Renders an existing batch as a CSV in the very schema the importer accepts,
     * so an exported file can be edited and uploaded back unchanged.
     */
    ImportBatchFileExportResponse export(Long importBatchId);

    /**
     * The rules currently in force, so the import dialog can show the operator what
     * the system will do before they commit to an upload.
     */
    ImportBatchFileConfigResponse getConfig();

    /** Updates the shared file-import configuration (aliases + limits). */
    ImportBatchFileConfigResponse updateConfig(UpdateImportBatchFileConfigRequest request);

    /** History of file-import runs, newest first. */
    PageResponse<ImportBatchFileJobResponse> getJobs(int page, int size, Long supplierId);

    /** Saved column mappings, so an operator can check or clean up what was remembered. */
    List<ImportBatchFileMappingProfileResponse> getMappingProfiles(Long supplierId);

    void saveMappingProfile(SaveImportBatchFileMappingProfileRequest request);

    void deleteMappingProfile(Long id);

    void saveStationAlias(SaveLotteryStationAliasRequest request);

    /**
     * Downloads original Cloudinary uploads for the given import batches and re-parses
     * tickets of {@code drawDate}. Failures are per-file; this never throws for a missing URL.
     */
    ImportBatchOriginalFileBundle loadOriginalFilesForSettlementBatches(
            List<Long> importBatchIds,
            Map<Long, String> batchCodeById,
            Long supplierId,
            LocalDate drawDate
    );
}
