package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.lotteries.BulkCreateLotteryTicketsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.BulkCreateLotteryTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;

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

    LotteryTicketResponse update(Long id, UpdateLotteryTicketRequest request, UUID editorId);

    void delete(Long id);

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
}
