package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourceItem;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;

import java.util.List;
import java.util.Optional;

public interface LotteryResultDetailServicePort {

    List<LotteryResultDetailResponse> getByLotteryResultId(Long lotteryResultId);

    LotteryResultDetailResponse getById(Long lotteryResultId, Long detailId);

    LotteryResultDetailResponse create(Long lotteryResultId, CreateLotteryResultDetailRequest request);

    LotteryResultDetailResponse update(Long lotteryResultId, Long detailId, UpdateLotteryResultDetailRequest request);

    void delete(Long lotteryResultId, Long detailId);

    void deleteByLotteryResultId(Long lotteryResultId);

    void validateRegionCompatibility(Long lotteryResultId, String regionCode);

    List<LotteryResultDetailModel> getModelsByLotteryResultId(Long lotteryResultId);

    List<LotteryResultDetailResponse> syncFromSource(
            Long lotteryResultId,
            List<LotteryResultSourceItem> sourceItems,
            List<PrizeStructureModel> prizeStructures
    );


    Optional<LotteryResultDetailModel> findModelById(Long id);
}
