package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ReportSerialFaultRequest;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface LotteryTicketSerialServicePort {

    LotteryTicketSerialModel reportFault(Long id, ReportSerialFaultRequest request, UUID actorId);

    LotteryTicketSerialModel upsertSerialForTicket(
            LotteryTicketModel ticket,
            CreateLotteryTicketSerialRequest request,
            UUID importedById,
            Long importBatchId,
            Long importBatchLineId
    );

    void syncSerialsForTicket(
            LotteryTicketModel ticket,
            List<UpdateLotteryTicketSerialRequest> serials,
            UUID editorId
    );

    LotteryTicketSerialModel reserveFirstAvailable(Long ticketId, UUID orderId, LocalDateTime expiresAt);

    LotteryTicketSerialModel sellFirstAvailable(Long ticketId);

    LotteryTicketSerialModel markSold(Long ticketSerialId);

    LotteryTicketSerialModel releaseReservation(Long ticketSerialId, boolean expireAfterRelease);

    LotteryTicketSerialModel returnSoldToStock(Long ticketSerialId);

    LotteryTicketSerialModel getByIdOrThrow(Long ticketSerialId);

    Optional<LotteryTicketSerialModel> findFirstByTicketId(Long ticketId);

    Map<Long, LotteryTicketSerialModel> findRepresentativeSerialsByTicketIds(List<Long> ticketIds);

    long countAvailableSerials(Long ticketId);

    Map<Long, Long> countAvailableSerialsByTicketIds(Collection<Long> ticketIds);

    Map<Long, Long> countSerialsByTicketIds(Collection<Long> ticketIds);

    long countByStatuses(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    void expireActiveSerials(Long ticketId);

    LotteryTicketSerialModel uploadImage(Long ticketSerialId, UploadRequest request);

    List<LotteryTicketSerialModel> findAllByTicketId(Long ticketId);

    long countByImportBatchLineId(Long importBatchLineId);

    List<Long> findDistinctTicketIdsByImportBatchLineId(Long importBatchLineId);

    List<LotteryTicketSerialModel> findAllByImportBatchLineId(Long importBatchLineId);

    long countByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId);

    void hardDeleteByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId);

    void hardDeleteByImportBatchLineId(Long importBatchLineId);

    java.util.List<LotteryTicketSerialModel> findAllReplacementCandidates(
            Long stationId, String numbers, java.time.LocalDate drawDate, com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus status
    );

    List<EnumOptionResponse> getStatuses();
}
