package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.mapper.streetagent.StreetAgentProfileApplicationMapper;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StreetAgentProfileService implements StreetAgentProfileServicePort {

    private final StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;
    private final StreetAgentProfileApplicationMapper streetAgentProfileApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StreetAgentProfileResponse> getAll(int page, int limit, String search, String status) {
        Pageable pageable = PageableUtils.of(page, limit, SortUtils.byCreatedAtDesc());
        StreetAgentProfileStatus statusFilter = parseStatusFilter(status);

        Page<StreetAgentProfileModel> resultPage =
                streetAgentProfileRepositoryPort.findAll(pageable, search, statusFilter);

        List<StreetAgentProfileResponse> recordList = resultPage.getContent().stream()
                .map(streetAgentProfileApplicationMapper::toResponse)
                .toList();

        return PageResponse.<StreetAgentProfileResponse>builder()
                .recordList(recordList)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(resultPage.getTotalElements())
                        .totalPages(resultPage.getTotalPages())
                        .currentPage(page)
                        .limit(limit)
                        .isFirst(resultPage.isFirst())
                        .isLast(resultPage.isLast())
                        .build())
                .build();
    }

    @Override
    @Transactional
    public StreetAgentProfileResponse create(CreateStreetAgentProfileRequest request) {
        log.info("Creating street agent profile for phone: {}", request.phone());

        if (streetAgentProfileRepositoryPort.existsByPhone(request.phone())) {
            throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_PHONE_EXISTED);
        }
        if (streetAgentProfileRepositoryPort.existsByCccd(request.cccd())) {
            throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_CCCD_EXISTED);
        }
        validateContractDates(request);

        StreetAgentProfileModel model = streetAgentProfileApplicationMapper.toModel(request);
        if (model.getDepositBalance() == null) {
            model.setDepositBalance(BigDecimal.ZERO);
        }

        StreetAgentProfileModel saved = streetAgentProfileRepositoryPort.save(model);
        log.info("Street agent profile created with id: {}", saved.getId());
        return streetAgentProfileApplicationMapper.toResponse(saved);
    }

    private void validateContractDates(CreateStreetAgentProfileRequest request) {
        if (request.contractStartDate() != null
                && request.contractEndDate() != null
                && request.contractEndDate().isBefore(request.contractStartDate())) {
            throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_INVALID_CONTRACT_DATE);
        }
    }

    private StreetAgentProfileStatus parseStatusFilter(String status) {
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            return null;
        }
        try {
            return StreetAgentProfileStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
