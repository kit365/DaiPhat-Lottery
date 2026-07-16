package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncResponse;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;

import java.util.List;
import java.util.Optional;

public interface PrizeStructureServicePort {

    List<String> getRegions();

    List<PrizeStructureResponse> getByRegion(String region);

    PrizeStructureResponse getById(String region, Long id);

    PrizeStructureModel getModelById(Long id);

    Optional<PrizeStructureModel> findModelById(Long id);

    List<PrizeStructureModel> getModelsByRegion(String region);

    PrizeStructureResponse create(String region, RegionPrizeStructureRequest request);

    PrizeStructureResponse update(String region, Long id, RegionPrizeStructureRequest request);

    List<PrizeStructureResponse> replaceByRegion(String region, List<RegionPrizeStructureRequest> requests);

    PrizeStructureSyncResponse syncByRegion(SyncPrizeStructuresRequest request);

    PrizeStructureSyncResponse previewSyncByRegion(SyncPrizeStructuresRequest request);

    void delete(String region, Long id);
}
