package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.scan.FieldValidationResult;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrScanResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketBoundingBoxResponse;
import com.daiphat.coreapi.domain.model.lotteries.OcrBoundingBox;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidation;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import org.mapstruct.Mapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Mapper(componentModel = "spring")
public interface OcrScanResultApplicationMapper {

    OcrScanResultResponse toResponse(OcrScanResultModel model);

    default TicketBoundingBoxResponse toBoxResponse(OcrBoundingBox box) {
        if (box == null) {
            return null;
        }
        List<List<Integer>> corners = box.getCorners() != null ? box.getCorners() : List.of();
        return new TicketBoundingBoxResponse(
                box.getX(),
                box.getY(),
                box.getWidth(),
                box.getHeight(),
                corners
        );
    }

    default FieldValidationResult toFieldValidationResult(OcrFieldValidation validation) {
        if (validation == null) {
            return null;
        }
        return FieldValidationResult.of(
                validation.getStatus(),
                validation.getMessage(),
                validation.getExpectedValue()
        );
    }

    default Map<String, TicketBoundingBoxResponse> toBoxResponseMap(Map<String, OcrBoundingBox> boxes) {
        if (boxes == null) {
            return null;
        }
        Map<String, TicketBoundingBoxResponse> mapped = new LinkedHashMap<>();
        boxes.forEach((key, value) -> mapped.put(key, toBoxResponse(value)));
        return mapped;
    }

    default Map<String, FieldValidationResult> toFieldValidationResultMap(
            Map<String, OcrFieldValidation> validations
    ) {
        if (validations == null) {
            return null;
        }
        Map<String, FieldValidationResult> mapped = new LinkedHashMap<>();
        validations.forEach((key, value) -> mapped.put(key, toFieldValidationResult(value)));
        return mapped;
    }

    default OcrBoundingBox toDomainBox(TicketBoundingBoxResponse box) {
        if (box == null) {
            return null;
        }
        return OcrBoundingBox.builder()
                .x(box.x())
                .y(box.y())
                .width(box.width())
                .height(box.height())
                .corners(box.corners() != null ? new ArrayList<>(box.corners()) : new ArrayList<>())
                .build();
    }

    default Map<String, OcrBoundingBox> toDomainBoxMap(Map<String, TicketBoundingBoxResponse> boxes) {
        if (boxes == null) {
            return null;
        }
        Map<String, OcrBoundingBox> mapped = new LinkedHashMap<>();
        boxes.forEach((key, value) -> mapped.put(key, toDomainBox(value)));
        return mapped;
    }

    default OcrFieldValidation toDomainValidation(FieldValidationResult validation) {
        if (validation == null) {
            return null;
        }
        return OcrFieldValidation.builder()
                .status(validation.status())
                .message(validation.message())
                .expectedValue(validation.expectedValue())
                .build();
    }

    default Map<String, OcrFieldValidation> toDomainValidationMap(
            Map<String, FieldValidationResult> validations
    ) {
        if (validations == null) {
            return null;
        }
        Map<String, OcrFieldValidation> mapped = new LinkedHashMap<>();
        validations.forEach((key, value) -> mapped.put(key, toDomainValidation(value)));
        return mapped;
    }
}
