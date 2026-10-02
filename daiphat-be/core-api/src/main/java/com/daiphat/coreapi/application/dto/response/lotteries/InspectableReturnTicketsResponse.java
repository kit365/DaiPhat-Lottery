package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Builder
public record InspectableReturnTicketsResponse(
        List<InspectableReturnTicketResponse> recordList,
        PageResponse.PaginationMetadata pagination,
        long eligibleSerialCount,
        BigDecimal eligibleReturnValue,
        List<InspectableReturnStationSummaryResponse> stationSummaries
) {
}
