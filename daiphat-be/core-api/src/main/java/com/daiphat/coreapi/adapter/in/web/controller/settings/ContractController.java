package com.daiphat.coreapi.adapter.in.web.controller.settings;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.request.contract.UpsertContractRequest;
import com.daiphat.coreapi.application.dto.response.contract.ContractResponse;
import com.daiphat.coreapi.application.port.in.contract.ContractServicePort;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_ADMIN + "/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractServicePort contractServicePort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:view')")
    public ApiResponse<List<ContractResponse>> list(@RequestParam(required = false) ContractType type) {
        return ApiResponse.success(null, contractServicePort.list(type));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:view')")
    public ApiResponse<ContractResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, contractServicePort.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:edit')")
    public ApiResponse<ContractResponse> create(@Valid @RequestBody UpsertContractRequest request) {
        return ApiResponse.success("Đã tạo hợp đồng.", contractServicePort.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:edit')")
    public ApiResponse<ContractResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpsertContractRequest request) {
        return ApiResponse.success("Đã cập nhật hợp đồng.", contractServicePort.update(id, request));
    }

    @PutMapping("/{id}/default")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:edit')")
    public ApiResponse<ContractResponse> setDefault(@PathVariable Long id) {
        return ApiResponse.success("Đã đặt hợp đồng làm mặc định.", contractServicePort.setDefault(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:edit')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        contractServicePort.delete(id);
        return ApiResponse.success("Đã xóa hợp đồng.", null);
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:view')")
    public ResponseEntity<byte[]> previewPdf(@PathVariable Long id) {
        return pdf(contractServicePort.previewPdf(id));
    }

    @GetMapping("/default/pdf")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'settings:view')")
    public ResponseEntity<byte[]> previewDefaultPdf(@RequestParam ContractType type) {
        return pdf(contractServicePort.previewDefaultPdf(type));
    }

    private ResponseEntity<byte[]> pdf(ContractPdfDocument document) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.fileName() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(document.content());
    }
}
