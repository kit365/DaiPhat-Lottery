package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LotteryStationServicePort {

    LotteryStationResponse create(CreateLotteryStationRequest request);

    LotteryStationResponse getById(Long id);

    LotteryStationModel getModelById(Long id);

    Optional<LotteryStationModel> findModelById(Long id);

    PageResponse<LotteryStationResponse> getAll(
            int page, int size, String search,
            String status, String type,
            String sortBy, String direction);

    List<LotteryStationResponse> getByDrawDate(LocalDate drawDate);

    List<LotteryStationResponse> getDrawingToday();

    List<LotteryStationResponse> getDrawingTomorrow();

    LotteryStationResponse update(Long id, UpdateLotteryStationRequest request);

    void delete(Long id);

    LotteryStationResponse uploadImage(Long id, UploadRequest request);

    void recalculateInventory(Long id);

    int recalculateNextDrawDates();
}
