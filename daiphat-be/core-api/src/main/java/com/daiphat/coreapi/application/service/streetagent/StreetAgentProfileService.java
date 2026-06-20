package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
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
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class StreetAgentProfileService implements StreetAgentProfileServicePort {

    private final StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;
    private final StreetAgentProfileApplicationMapper streetAgentProfileApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StreetAgentProfileResponse> getAll(
            int page, int limit, String search, String status, String contactProvince) {
        Pageable pageable = PageableUtils.of(page, limit, SortUtils.byCreatedAtDesc());
        List<StreetAgentProfileStatus> statusFilters = parseStatusList(status);
        List<String> provinceFilters = parseContactProvinceList(contactProvince);

        Page<StreetAgentProfileModel> resultPage =
                streetAgentProfileRepositoryPort.findAll(pageable, search, statusFilters, provinceFilters);

        return PageResponse.from(
                resultPage.map(streetAgentProfileApplicationMapper::toResponse),
                page,
                limit,
                buildStatusCounts(search, provinceFilters));
    }

    private Map<String, Long> buildStatusCounts(String search, List<String> contactProvinces) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put(StatusCountKeys.ALL, streetAgentProfileRepositoryPort.countAll(search, contactProvinces));
        Arrays.stream(StreetAgentProfileStatus.values())
                .forEach(status -> counts.put(
                        status.getCode(),
                        streetAgentProfileRepositoryPort.countByStatus(status, search, contactProvinces)
                ));
        return counts;
    }

    @Override
    @Transactional(readOnly = true)
    public StreetAgentProfileResponse getById(Long id) {
        StreetAgentProfileModel profile = streetAgentProfileRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));
        return streetAgentProfileApplicationMapper.toResponse(profile);
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
        model.setStatus(StreetAgentProfileStatus.ACTIVE);
        if (model.getDepositBalance() == null) {
            model.setDepositBalance(BigDecimal.ZERO);
        }

        StreetAgentProfileModel saved = streetAgentProfileRepositoryPort.save(model);
        log.info("Street agent profile created with id: {}", saved.getId());
        return streetAgentProfileApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public StreetAgentProfileResponse update(Long id, UpdateStreetAgentProfileRequest request) {
        log.info("Updating street agent profile id: {}", id);

        StreetAgentProfileModel profile = streetAgentProfileRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));

        if (streetAgentProfileRepositoryPort.existsByPhoneAndIdNot(request.phone(), id)) {
            throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_PHONE_EXISTED);
        }
        if (streetAgentProfileRepositoryPort.existsByCccdAndIdNot(request.cccd(), id)) {
            throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_CCCD_EXISTED);
        }
        validateContractDates(request.contractStartDate(), request.contractEndDate());

        streetAgentProfileApplicationMapper.updateModel(profile, request);
        if (request.depositBalance() != null) {
            profile.setDepositBalance(request.depositBalance());
        }

        StreetAgentProfileModel saved = streetAgentProfileRepositoryPort.save(profile);
        log.info("Street agent profile updated with id: {}", saved.getId());
        return streetAgentProfileApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Soft deleting street agent profile id: {}", id);

        StreetAgentProfileModel profile = streetAgentProfileRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));

        profile.softDelete();
        streetAgentProfileRepositoryPort.save(profile);
        log.info("Street agent profile soft deleted with id: {}", id);
    }

    private void validateContractDates(CreateStreetAgentProfileRequest request) {
        validateContractDates(request.contractStartDate(), request.contractEndDate());
    }

    private void validateContractDates(LocalDate contractStartDate, LocalDate contractEndDate) {
        if (contractStartDate != null
                && contractEndDate != null
                && contractEndDate.isBefore(contractStartDate)) {
            throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_INVALID_CONTRACT_DATE);
        }
    }

    private List<StreetAgentProfileStatus> parseStatusList(String status) {
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            return List.of();
        }

        List<StreetAgentProfileStatus> parsed = Arrays.stream(status.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> {
                    try {
                        return StreetAgentProfileStatus.valueOf(value.toUpperCase());
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (parsed.size() >= StreetAgentProfileStatus.values().length) {
            return List.of();
        }

        return parsed;
    }

    private List<String> parseContactProvinceList(String contactProvince) {
        if (contactProvince == null || contactProvince.isBlank()) {
            return List.of();
        }

        return Arrays.stream(contactProvince.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }
}
