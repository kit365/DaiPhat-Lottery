package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateApprovedDailyCapRequest;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.DailySalesReportResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorConfidenceResponse;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentContractServicePort;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import com.daiphat.coreapi.application.port.in.streetagent.VendorConfidenceServicePort;
import com.daiphat.coreapi.application.port.in.streetagent.VendorDailySalesReportServicePort;
import com.daiphat.coreapi.shared.util.StorageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/street-agent-profiles")
@RequiredArgsConstructor
public class StreetAgentProfileController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final StreetAgentProfileServicePort streetAgentProfileServicePort;
    private final StreetAgentContractServicePort streetAgentContractServicePort;
    private final VendorConfidenceServicePort vendorConfidenceServicePort;
    private final VendorDailySalesReportServicePort vendorDailySalesReportServicePort;

    @GetMapping
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<PageResponse<StreetAgentProfileResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String contactProvince) {
        return ApiResponse.success(
                null,
                streetAgentProfileServicePort.getAll(page, limit, search, status, contactProvince));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<StreetAgentProfileResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, streetAgentProfileServicePort.getById(id));
    }

    @GetMapping(ID_PATH + "/confidence")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<VendorConfidenceResponse> getConfidence(@PathVariable Long id) {
        return ApiResponse.success(null, vendorConfidenceServicePort.getConfidence(id));
    }

    @GetMapping(ID_PATH + "/daily-sales-reports")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<PageResponse<DailySalesReportResponse>> listDailySalesReports(
            @PathVariable Long id,
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit) {
        return ApiResponse.success(null, vendorDailySalesReportServicePort.listByProfile(id, page, limit));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('streetAgent:create')")
    public ApiResponse<StreetAgentProfileResponse> create(
            @Valid @RequestBody CreateStreetAgentProfileRequest request) {
        StreetAgentProfileResponse response = streetAgentProfileServicePort.create(request);
        return ApiResponse.success("Tạo hồ sơ đại lý bán dạo thành công.", response);
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<StreetAgentProfileResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStreetAgentProfileRequest request) {
        StreetAgentProfileResponse response = streetAgentProfileServicePort.update(id, request);
        return ApiResponse.success("Cập nhật hồ sơ đại lý bán dạo thành công.", response);
    }

    @PatchMapping(ID_PATH + "/approved-daily-cap")
    @PreAuthorize("hasAuthority('streetAgent:manage')")
    public ApiResponse<StreetAgentProfileResponse> updateApprovedDailyCap(
            @PathVariable Long id,
            @Valid @RequestBody UpdateApprovedDailyCapRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã điều chỉnh hạn mức vận hành.",
                streetAgentProfileServicePort.updateApprovedDailyCap(id, request, principal.getId()));
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAuthority('streetAgent:delete')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        streetAgentProfileServicePort.delete(id);
        return ApiResponse.success("Xóa hồ sơ đại lý bán dạo thành công.", null);
    }

    @GetMapping(ID_PATH + "/contract/print")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ResponseEntity<String> printContract(@PathVariable Long id) {
        String html = streetAgentContractServicePort.renderPrintHtml(id);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"street-agent-contract-" + id + ".html\"")
                .body(html);
    }

    @GetMapping(ID_PATH + "/contract/pdf")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ResponseEntity<byte[]> downloadContractPdf(@PathVariable Long id) {
        ContractPdfDocument document = streetAgentContractServicePort.generatePdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.fileName() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(document.content());
    }

    @PostMapping(value = ID_PATH + "/contract/signed-document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<StreetAgentProfileResponse> uploadSignedDocument(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file) {
        StreetAgentProfileResponse response = streetAgentProfileServicePort.uploadSignedContractDocument(
                id, StorageUtils.toUploadRequest(file));
        return ApiResponse.success("Đính kèm bản hợp đồng đã ký thành công.", response);
    }
}
