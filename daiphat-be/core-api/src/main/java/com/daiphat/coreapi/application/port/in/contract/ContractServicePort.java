package com.daiphat.coreapi.application.port.in.contract;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.request.contract.UpsertContractRequest;
import com.daiphat.coreapi.application.dto.response.contract.ContractResponse;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;

import java.util.List;

public interface ContractServicePort {

    List<ContractResponse> list(ContractType type);

    ContractResponse getById(Long id);

    ContractResponse create(UpsertContractRequest request);

    ContractResponse update(Long id, UpsertContractRequest request);

    ContractResponse setDefault(Long id);

    void delete(Long id);

    ContractPdfDocument previewPdf(Long id);

    ContractPdfDocument previewDefaultPdf(ContractType type);
}
