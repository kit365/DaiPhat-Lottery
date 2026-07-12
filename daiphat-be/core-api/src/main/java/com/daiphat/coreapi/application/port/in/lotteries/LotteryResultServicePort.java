package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResyncLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryResultsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ManagementLotteryResultBoardResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultBoardDetailsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultBoardSummaryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultFullBoardResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultSyncBatchResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LotteryResultServicePort {

    LotteryResultResponse create(CreateLotteryResultRequest request);

    LotteryResultResponse getById(Long id);

    LotteryResultModel getModelById(Long id);

    Optional<LotteryResultModel> findModelById(Long id);

    PageResponse<LotteryResultResponse> getAll(int page, int size);

    LotteryResultFullBoardResponse getFullBoard(String region, LocalDate drawDate, LotteryStationSourceType sourceType);

    ManagementLotteryResultBoardResponse getManagementBoard(
            String region,
            LocalDate fromDate,
            LocalDate toDate,
            LotteryStationSourceType sourceType
    );

    LotteryResultBoardSummaryResponse getBoardSummary(String region, LocalDate drawDate);

    LotteryResultModel ensureResultForBoard(Long stationId, LocalDate drawDate);

    LotteryResultBoardDetailsResponse getBoardDetails(List<Long> resultIds);

    LotteryResultResponse requestResync(Long id, ResyncLotteryResultRequest request, java.util.UUID actorId);

    LotteryResultSyncBatchResponse requestBoardSync(SyncLotteryResultsRequest request);

    void requestManualResync(Long resultId, LotteryStationSourceType sourceType);

    void syncResult(Long resultId, LotteryStationSourceType sourceType);

    int syncHistoricalBacklog(int limit);

    LotteryResultResponse update(Long id, UpdateLotteryResultRequest request);

    void delete(Long id);
}
