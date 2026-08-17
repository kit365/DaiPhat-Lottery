package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.generator.streetagent.StreetAgentContractCodeGenerator;
import com.daiphat.coreapi.application.mapper.streetagent.StreetAgentProfileApplicationMapper;
import com.daiphat.coreapi.application.policy.streetagent.VendorAllocationPolicyResolver;
import com.daiphat.coreapi.application.policy.streetagent.VendorConfidencePolicyResolver;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import com.daiphat.coreapi.application.port.in.user.UserServicePort;
import com.daiphat.coreapi.application.dto.request.user.CreateUserRequest;
import com.daiphat.coreapi.application.dto.response.user.UserResponse;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.domain.service.streetagent.VendorDailyCapCalculator;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.Locale;
import java.time.Clock;

@Service
@Slf4j
public class StreetAgentProfileService implements StreetAgentProfileServicePort {

    private static final Set<String> SIGNED_CONTRACT_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png"
    );

    private final StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;
    private final StreetAgentProfileApplicationMapper streetAgentProfileApplicationMapper;
    private final StoragePort storagePort;
    private final VendorConfidencePolicyResolver vendorConfidencePolicyResolver;
    private final UserServicePort userServicePort;
    private final VendorAllocationPolicyResolver vendorAllocationPolicyResolver;
    private final StreetAgentContractCodeGenerator streetAgentContractCodeGenerator;
    private final VietnamClock vietnamClock;

    @Autowired
    public StreetAgentProfileService(
            StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort,
            StreetAgentProfileApplicationMapper streetAgentProfileApplicationMapper,
            StoragePort storagePort,
            VendorConfidencePolicyResolver vendorConfidencePolicyResolver,
            UserServicePort userServicePort,
            VendorAllocationPolicyResolver vendorAllocationPolicyResolver,
            StreetAgentContractCodeGenerator streetAgentContractCodeGenerator,
            VietnamClock vietnamClock) {
        this.streetAgentProfileRepositoryPort = streetAgentProfileRepositoryPort;
        this.streetAgentProfileApplicationMapper = streetAgentProfileApplicationMapper;
        this.storagePort = storagePort;
        this.vendorConfidencePolicyResolver = vendorConfidencePolicyResolver;
        this.userServicePort = userServicePort;
        this.vendorAllocationPolicyResolver = vendorAllocationPolicyResolver;
        this.streetAgentContractCodeGenerator = streetAgentContractCodeGenerator;
        this.vietnamClock = vietnamClock;
    }

    /** Compatibility constructor for tests and legacy bootstrap code. */
    public StreetAgentProfileService(
            StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort,
            StreetAgentProfileApplicationMapper streetAgentProfileApplicationMapper,
            StoragePort storagePort,
            VendorConfidencePolicyResolver vendorConfidencePolicyResolver,
            UserServicePort userServicePort,
            com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort systemConfigRepositoryPort) {
        this(streetAgentProfileRepositoryPort, streetAgentProfileApplicationMapper, storagePort,
                vendorConfidencePolicyResolver, userServicePort, new VendorAllocationPolicyResolver(systemConfigRepositoryPort),
                new StreetAgentContractCodeGenerator(new VietnamClock(Clock.systemUTC())),
                new VietnamClock(Clock.systemUTC()));
    }

    /** Compatibility constructor for focused unit tests that do not exercise cap projection. */
    public StreetAgentProfileService(
            StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort,
            StreetAgentProfileApplicationMapper streetAgentProfileApplicationMapper,
            StoragePort storagePort) {
        this.streetAgentProfileRepositoryPort = streetAgentProfileRepositoryPort;
        this.streetAgentProfileApplicationMapper = streetAgentProfileApplicationMapper;
        this.storagePort = storagePort;
        this.vendorConfidencePolicyResolver = null;
        this.userServicePort = null;
        this.vendorAllocationPolicyResolver = null;
        this.vietnamClock = new VietnamClock(Clock.systemUTC());
        this.streetAgentContractCodeGenerator = new StreetAgentContractCodeGenerator(vietnamClock);
    }

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
                resultPage.map(this::toResponse),
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
        return toResponse(profile);
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
        if (userServicePort != null && vendorAllocationPolicyResolver != null) {
            // Street agents are managed offline. Keep a 1:1 User only as an
            // identity record, without credentials or access to the system.
            UserResponse vendorUser = userServicePort.createInternalStreetAgent(CreateUserRequest.builder()
                    .email(request.email())
                    .firstName(request.firstName())
                    .lastName(request.lastName())
                    .phone(request.phone())
                    .build());
            model.setUserId(vendorUser.id());
            model.setEmail(vendorUser.email());
            // Commission remains system-owned. The contract ceiling defaults from settings,
            // while staff may override it for this signed contract.
            model.setCommissionRate(vendorAllocationPolicyResolver.resolve().commissionRate());
            Integer configuredContractCap = vendorAllocationPolicyResolver.defaultContractMaxPerBatch();
            model.setContractMaxDailyCap(request.contractMaxDailyCap() != null
                    ? request.contractMaxDailyCap()
                    : configuredContractCap);
        }
        model.setDepositBalance(BigDecimal.ZERO);
        generateContractCodeIfNeeded(model);
        synchronizeOperationalStatus(model, false);

        StreetAgentProfileModel saved = streetAgentProfileRepositoryPort.save(model);
        log.info("Street agent profile created with id: {}", saved.getId());
        return toResponse(saved);
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

        boolean contractTermsChanged = profile.hasSignedContractTermsChanged(
                request.contractStartDate(),
                request.contractEndDate(),
                request.contractMaxDailyCap());
        streetAgentProfileApplicationMapper.updateModel(profile, request);
        if (contractTermsChanged) {
            // A signature is valid only for the exact terms that were signed.  Clear it
            // atomically, issue a fresh contract reference, and let status synchronization
            // keep the profile out of vendor allocation until the new file is uploaded.
            profile.requireContractResign();
            regenerateContractCode(profile);
        }
        generateContractCodeIfNeeded(profile);
        synchronizeOperationalStatus(profile, true);

        StreetAgentProfileModel saved = streetAgentProfileRepositoryPort.save(profile);
        log.info("Street agent profile updated with id: {}", saved.getId());
        return toResponse(saved);
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

    @Override
    @Transactional
    public StreetAgentProfileResponse uploadSignedContractDocument(Long id, UploadRequest request) {
        StreetAgentProfileModel profile = streetAgentProfileRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));
        validateSignedContractUpload(request);

        StorageResult result = storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.STREET_AGENT_SIGNED_CONTRACT_FOLDER
        ));

        profile.setContractDocumentUrl(result.url());
        synchronizeOperationalStatus(profile, true);
        StreetAgentProfileModel saved = streetAgentProfileRepositoryPort.save(profile);
        log.info("Uploaded signed contract document for street agent profile id: {}", id);
        return toResponse(saved);
    }

    private StreetAgentProfileResponse toResponse(StreetAgentProfileModel profile) {
        if (profile.hasValidContractDailyCap() && vendorConfidencePolicyResolver != null) {
            profile.setEffectiveDailyCap(VendorDailyCapCalculator.effective(
                    profile.getContractMaxDailyCap(),
                    vendorConfidencePolicyResolver.capPercentage(profile.getConfidenceTier())
            ));
        } else {
            profile.setEffectiveDailyCap(null);
        }
        // Remaining cap is business-date-specific and comes from the allocation suggestion API.
        profile.setRemainingDailyCap(null);
        return streetAgentProfileApplicationMapper.toResponse(profile);
    }

    private void validateSignedContractUpload(UploadRequest request) {
        if (request == null || request.data() == null || request.data().length == 0) {
            throw new DomainException(ErrorCode.STREET_AGENT_CONTRACT_DOCUMENT_REQUIRED);
        }
        String contentType = request.contentType() == null
                ? ""
                : request.contentType().trim().toLowerCase(Locale.ROOT);
        if (!SIGNED_CONTRACT_CONTENT_TYPES.contains(contentType)) {
            throw new DomainException(ErrorCode.STREET_AGENT_CONTRACT_DOCUMENT_INVALID_TYPE);
        }
    }

    private void generateContractCodeIfNeeded(StreetAgentProfileModel profile) {
        boolean hasNoContractCode = profile.getContractCode() == null || profile.getContractCode().isBlank();
        boolean hasContractTerms = profile.getContractStartDate() != null
                && profile.getContractEndDate() != null
                && profile.hasValidContractDailyCap();
        if (!hasNoContractCode || !hasContractTerms) {
            return;
        }
        profile.setContractCode(streetAgentContractCodeGenerator.nextCode());
    }

    private void regenerateContractCode(StreetAgentProfileModel profile) {
        profile.setContractCode(streetAgentContractCodeGenerator.nextCode());
    }

    /**
     * An explicitly inactive profile remains disabled. Otherwise, operational status is derived
     * from vendor-allocation prerequisites instead of being accepted from the request payload.
     */
    private void synchronizeOperationalStatus(
            StreetAgentProfileModel profile, boolean preserveExplicitInactiveStatus) {
        if (preserveExplicitInactiveStatus && profile.getStatus() == StreetAgentProfileStatus.INACTIVE) {
            return;
        }
        profile.setStatus(profile.isVendorAllocationEligible(vietnamClock.today())
                ? StreetAgentProfileStatus.ACTIVE
                : StreetAgentProfileStatus.PENDING);
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
        if (contractEndDate != null && contractEndDate.isBefore(vietnamClock.today())) {
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
