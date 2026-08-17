package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.BulkUpdateLotteryStationCommissionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.BulkUpdateLotteryStationPricingRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationScheduleRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmSyncLotteryStationsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryStationsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSchedulePublicResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LotteryStationServicePort {

    LotteryStationResponse create(CreateLotteryStationRequest request);

    /**
     * Proposes a free station code derived from a name, for the generate button on
     * the station form.
     *
     * @param excludeStationId station allowed to keep its own code, when editing
     */
    String suggestCode(String name, Long excludeStationId);

    LotteryStationResponse getById(Long id);

    LotteryStationModel getModelById(Long id);

    Optional<LotteryStationModel> findModelById(Long id);

    List<LotteryStationModel> getScheduleModelsByDrawDate(LocalDate drawDate);

    PageResponse<LotteryStationResponse> getAll(int page, int size, String search,
                                                String status, String type, String region, String drawDay,
                                                Boolean isActive, String sortBy, String direction);

    List<LotteryStationResponse> getByDrawDate(LocalDate drawDate);

    List<LotteryStationResponse> getDrawingToday();

    List<LotteryStationResponse> getDrawingTomorrow();

    List<LotteryStationSchedulePublicResponse> getPublicSchedule(
            String region,
            Long stationId,
            List<Long> stationIds,
            LocalDate drawDate
    );

    LotteryStationResponse update(Long id, UpdateLotteryStationRequest request);

    List<LotteryStationResponse> updatePricing(BulkUpdateLotteryStationPricingRequest request);

    /** Corrects only commission rates, leaving {@code lottery_stations.price} (sale price) alone. */
    List<LotteryStationResponse> updateCommissions(BulkUpdateLotteryStationCommissionRequest request);

    /** Corrects only the weekly draw schedule, leaving every other field alone. */
    LotteryStationResponse updateSchedule(UpdateLotteryStationScheduleRequest request);

    void delete(Long id);

    LotteryStationResponse uploadImage(Long id, UploadRequest request);

    LotteryStationSyncPreviewResponse previewSyncStations(SyncLotteryStationsRequest request);

    LotteryStationSyncResponse confirmSyncStations(ConfirmSyncLotteryStationsRequest request);

    void recalculateInventory(Long id);

    int recalculateNextDrawDates();

    int sendUpcomingDrawReminderNotifications();
}
