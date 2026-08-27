package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldDataType;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrNormalizedBoundingBox;
import lombok.Builder;

@Builder
public record UpdateOcrFieldLayoutRequest(
        OcrTemplateFieldName fieldName,
        OcrNormalizedBoundingBox boundingBox,
        OcrFieldDataType dataType,
        Boolean isRequired,
        Integer priority
) {}
