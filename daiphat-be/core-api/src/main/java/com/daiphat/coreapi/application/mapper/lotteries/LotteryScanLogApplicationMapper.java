package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scanlog.LotteryScanLogResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryScanLogModel;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface LotteryScanLogApplicationMapper {

    LotteryScanLogResponse toResponse(LotteryScanLogModel model);
}
