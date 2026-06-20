package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncResponse;

import java.util.List;

public interface RegionPrizeStructureServicePort {

    List<String> getRegions();

    List<PrizeStructureResponse> getByRegion(String region);

    PrizeStructureResponse getById(String region, Long id);

    PrizeStructureResponse create(String region, RegionPrizeStructureRequest request);

    PrizeStructureResponse update(String region, Long id, RegionPrizeStructureRequest request);

    List<PrizeStructureResponse> replaceByRegion(String region, List<RegionPrizeStructureRequest> requests);

    PrizeStructureSyncResponse syncByRegion(SyncPrizeStructuresRequest request);

    void delete(String region, Long id);
}
