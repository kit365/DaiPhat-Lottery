package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.lotteries.BulkCreateLotteryTicketsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.BulkCreateLotteryTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchReductionTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode;

import java.util.List;
import java.util.UUID;

public interface LotteryTicketServicePort {

    LotteryTicketResponse create(CreateLotteryTicketRequest request, UUID importedById);

    BulkCreateLotteryTicketsResponse createBulk(BulkCreateLotteryTicketsRequest request, UUID importedById);

    LotteryTicketResponse getById(Long id);

    PageResponse<LotteryTicketResponse> getAll(
            int page, int size, Long stationId, List<Long> stationIds, String status,
            String drawDate, String search, String sortBy, String direction);

    PageResponse<LotteryTicketResponse> getPublicTickets(
            int page, int size, Long stationId, List<Long> stationIds, String drawDate, String search, String sortBy, String direction);

    PageResponse<LotteryTicketResponse> getPublicTickets(
            int page, int size, Long stationId, List<Long> stationIds, String drawDate,
            String search, TicketSearchMode searchMode, String sortBy, String direction);

    PageResponse<LotteryTicketResponse> getPublicTickets(
            int page, int size, Long stationId, List<Long> stationIds, String drawDate,
            String search, TicketSearchMode searchMode,
            List<String> searches, List<String> tailRanges, List<String> numberTypes,
            String sortBy, String direction);

    LotteryTicketResponse update(Long id, UpdateLotteryTicketRequest request, UUID editorId);

    void delete(Long id);

    void purgeImportBatchLineTickets(Long importBatchLineId);

    void hardDeleteImportBatchTicketsForReduction(Long importBatchId, List<Long> ticketIds, int requiredSerialCount);

    List<ImportBatchReductionTicketResponse> listReductionTicketsByImportBatchLine(Long importBatchLineId);

    void activateTicketsForImportBatchLine(Long importBatchLineId);

    LotteryTicketResponse verify(Long id, UUID verifierId);

    LotteryTicketResponse changeStatus(Long id, LotteryTicketStatus status);

    LotteryTicketResponse uploadImage(Long id, UploadRequest request);

    StorageResult uploadAsset(UploadRequest request);

    List<OrderTicketSnapshot> reserveForOrder(List<Long> ticketIds);

    List<OrderTicketSnapshot> sellOfflineForOrder(List<Long> ticketIds);

    void markSoldForOrder(Long ticketSerialId);

    void releaseReservationForOrder(Long ticketSerialId);

    void returnSoldTicketForOrder(Long ticketSerialId);

    int expireDueTickets();
    java.util.List<com.daiphat.coreapi.application.dto.lotteries.TicketAvailabilityKey> findAvailableReplacementsInBulk(
            java.util.Collection<Long> stationIds,
            java.util.Collection<java.time.LocalDate> drawDates,
            java.util.Collection<String> numbers);

    java.util.List<com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse> getReplacementCandidates(Long stationId, String numbers, java.time.LocalDate drawDate);
}
