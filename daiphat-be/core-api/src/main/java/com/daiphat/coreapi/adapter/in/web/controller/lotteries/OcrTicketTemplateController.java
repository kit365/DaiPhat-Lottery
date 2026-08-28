package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrFieldLayoutRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrTicketTemplateRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.UpdateOcrFieldLayoutRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.UpdateOcrTicketTemplateRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrFieldLayoutResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrTemplateDefaultReadyResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrTicketTemplateResponse;
import com.daiphat.coreapi.application.port.in.lotteries.OcrTicketTemplateServicePort;
import com.daiphat.coreapi.shared.util.StorageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/ocr-templates")
@RequiredArgsConstructor
public class OcrTicketTemplateController {

    private final OcrTicketTemplateServicePort ocrTicketTemplateServicePort;

    @GetMapping("/default-ready")
    @PreAuthorize("hasAnyAuthority('ticket:view', 'ticket:create', 'station:view', 'station:update')")
    public ApiResponse<OcrTemplateDefaultReadyResponse> defaultReady() {
        return ApiResponse.success(null, ocrTicketTemplateServicePort.defaultReady());
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('station:view', 'station:update', 'provider:view')")
    public ApiResponse<List<OcrTicketTemplateResponse>> listByStation(@RequestParam Long stationId) {
        return ApiResponse.success(null, ocrTicketTemplateServicePort.listByStation(stationId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('station:view', 'station:update', 'provider:view')")
    public ApiResponse<OcrTicketTemplateResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, ocrTicketTemplateServicePort.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('station:create', 'station:update', 'provider:create')")
    public ApiResponse<OcrTicketTemplateResponse> create(
            @Valid @RequestBody CreateOcrTicketTemplateRequest request
    ) {
        return ApiResponse.success("Tạo mẫu vé OCR thành công.", ocrTicketTemplateServicePort.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('station:update', 'provider:create')")
    public ApiResponse<OcrTicketTemplateResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOcrTicketTemplateRequest request
    ) {
        return ApiResponse.success("Cập nhật mẫu vé OCR thành công.", ocrTicketTemplateServicePort.update(id, request));
    }

    @PostMapping(value = "/{id}/sample-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('station:update', 'provider:create')")
    public ApiResponse<OcrTicketTemplateResponse> uploadSampleImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file
    ) {
        return ApiResponse.success(
                "Tải ảnh mẫu vé OCR thành công.",
                ocrTicketTemplateServicePort.uploadSampleImage(id, StorageUtils.toUploadRequest(file))
        );
    }

    @PostMapping("/{id}/set-default")
    @PreAuthorize("hasAnyAuthority('station:update', 'provider:create')")
    public ApiResponse<OcrTicketTemplateResponse> setDefault(@PathVariable Long id) {
        return ApiResponse.success(
                "Đã đặt mẫu vé OCR mặc định.",
                ocrTicketTemplateServicePort.setDefault(id)
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('station:update', 'provider:create')")
    public ApiResponse<Void> softDelete(@PathVariable Long id) {
        ocrTicketTemplateServicePort.softDelete(id);
        return ApiResponse.success("Đã xóa mẫu vé OCR.", null);
    }

    @GetMapping("/{templateId}/field-layouts")
    @PreAuthorize("hasAnyAuthority('station:view', 'station:update', 'provider:view')")
    public ApiResponse<List<OcrFieldLayoutResponse>> listFieldLayouts(@PathVariable Long templateId) {
        return ApiResponse.success(null, ocrTicketTemplateServicePort.listFieldLayouts(templateId));
    }

    @PostMapping("/{templateId}/field-layouts")
    @PreAuthorize("hasAnyAuthority('station:update', 'provider:create')")
    public ApiResponse<OcrFieldLayoutResponse> createFieldLayout(
            @PathVariable Long templateId,
            @Valid @RequestBody CreateOcrFieldLayoutRequest request
    ) {
        return ApiResponse.success(
                "Tạo bố cục trường OCR thành công.",
                ocrTicketTemplateServicePort.createFieldLayout(templateId, request)
        );
    }

    @PutMapping("/{templateId}/field-layouts/{layoutId}")
    @PreAuthorize("hasAnyAuthority('station:update', 'provider:create')")
    public ApiResponse<OcrFieldLayoutResponse> updateFieldLayout(
            @PathVariable Long templateId,
            @PathVariable Long layoutId,
            @Valid @RequestBody UpdateOcrFieldLayoutRequest request
    ) {
        return ApiResponse.success(
                "Cập nhật bố cục trường OCR thành công.",
                ocrTicketTemplateServicePort.updateFieldLayout(templateId, layoutId, request)
        );
    }

    @DeleteMapping("/{templateId}/field-layouts/{layoutId}")
    @PreAuthorize("hasAnyAuthority('station:update', 'provider:create')")
    public ApiResponse<Void> softDeleteFieldLayout(
            @PathVariable Long templateId,
            @PathVariable Long layoutId
    ) {
        ocrTicketTemplateServicePort.softDeleteFieldLayout(templateId, layoutId);
        return ApiResponse.success("Đã xóa bố cục trường OCR.", null);
    }
}
