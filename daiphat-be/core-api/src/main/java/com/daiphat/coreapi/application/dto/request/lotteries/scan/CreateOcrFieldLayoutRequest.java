package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldDataType;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrNormalizedBoundingBox;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record CreateOcrFieldLayoutRequest(
        @NotNull(message = "Tên trường không được để trống")
        OcrTemplateFieldName fieldName,

        @NotNull(message = "Vùng nhận dạng không được để trống")
        OcrNormalizedBoundingBox boundingBox,

        OcrFieldDataType dataType,
        Boolean isRequired,
        /** Optional; when null, next available priority for this field is assigned. */
        Integer priority
) {}
