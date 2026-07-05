package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryStationsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSchedulePublicResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LotteryStationServicePort {

    LotteryStationResponse create(CreateLotteryStationRequest request);

    LotteryStationResponse getById(Long id);

    LotteryStationModel getModelById(Long id);

    Optional<LotteryStationModel> findModelById(Long id);

    List<LotteryStationModel> getScheduleModelsByDrawDate(LocalDate drawDate);

    PageResponse<LotteryStationResponse> getAll(int page, int size, String search,
                                                String status, String type, String region, List<String> drawDay,
                                                String sortBy, String direction);

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

    void delete(Long id);

    LotteryStationResponse uploadImage(Long id, UploadRequest request);

    LotteryStationSyncResponse syncStations(SyncLotteryStationsRequest request);

    void recalculateInventory(Long id);

    int recalculateNextDrawDates();

    int sendUpcomingDrawReminderNotifications();
}
