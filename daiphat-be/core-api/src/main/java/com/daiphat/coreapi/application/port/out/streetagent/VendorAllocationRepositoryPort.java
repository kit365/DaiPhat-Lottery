package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationBatchModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.*;
import java.util.*;

public interface VendorAllocationRepositoryPort {
    boolean existsOpenBatchByProfileId(Long profileId, Collection<AllocationBatchStatus> statuses);
    Optional<VendorAllocationBatchModel> findOpenByProfileId(Long profileId, Collection<AllocationBatchStatus> statuses);
    Page<VendorAllocationBatchModel> search(
            Long profileId,
            Collection<AllocationBatchStatus> statuses,
            LocalDate businessDateFrom,
            LocalDate businessDateTo,
            Pageable pageable);
    long sumAllocatedForDay(Long profileId, LocalDate date, Collection<AllocationBatchStatus> statuses);
    List<VendorAllocationSerialModel> findCandidates(LocalDate drawDate);
    List<VendorAllocationSerialModel> lockCandidates(Collection<Long> serialIds);
    List<VendorAllocationSerialModel> lockCandidatesForStations(LocalDate drawDate, Collection<Long> stationIds);
    VendorAllocationBatchModel save(VendorAllocationBatchModel model);
    Optional<VendorAllocationBatchModel> findById(Long id);
    Optional<VendorAllocationBatchModel> findByIdForUpdate(Long id);
    List<VendorAllocationBatchModel> findExpiredDrafts(LocalDateTime now);
    List<VendorAllocationBatchModel> findOpenDrafts();
    void saveSerials(List<VendorAllocationSerialModel> serials);
    List<VendorAllocationSerialModel> findAllLiveSerials();
}
