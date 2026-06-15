package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.RegionPrizeStructureResponse;

import java.util.List;

public interface RegionPrizeStructureServicePort {

    List<String> getRegions();

    List<RegionPrizeStructureResponse> getByRegion(String region);

    RegionPrizeStructureResponse getById(String region, Long id);

    RegionPrizeStructureResponse create(String region, RegionPrizeStructureRequest request);

    RegionPrizeStructureResponse update(String region, Long id, RegionPrizeStructureRequest request);

    List<RegionPrizeStructureResponse> replaceByRegion(String region, List<RegionPrizeStructureRequest> requests);

    void delete(String region, Long id);
}
