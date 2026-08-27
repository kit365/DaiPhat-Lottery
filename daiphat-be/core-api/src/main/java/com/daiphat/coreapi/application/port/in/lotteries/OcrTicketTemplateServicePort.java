package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrFieldLayoutRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrTicketTemplateRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.UpdateOcrFieldLayoutRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.UpdateOcrTicketTemplateRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrFieldLayoutResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrTemplateDefaultReadyResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrTicketTemplateResponse;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.List;

public interface OcrTicketTemplateServicePort {

    OcrTemplateDefaultReadyResponse defaultReady();

    List<OcrTicketTemplateResponse> listByStation(Long stationId);

    OcrTicketTemplateResponse getById(Long id);

    OcrTicketTemplateResponse create(CreateOcrTicketTemplateRequest request);

    OcrTicketTemplateResponse update(Long id, UpdateOcrTicketTemplateRequest request);

    OcrTicketTemplateResponse uploadSampleImage(Long id, UploadRequest request);

    OcrTicketTemplateResponse setDefault(Long id);

    void softDelete(Long id);

    void applyStationDefault(Long stationId, Long templateId);

    Long findDefaultTemplateId(Long stationId);

    List<OcrFieldLayoutResponse> listFieldLayouts(Long templateId);

    OcrFieldLayoutResponse createFieldLayout(Long templateId, CreateOcrFieldLayoutRequest request);

    OcrFieldLayoutResponse updateFieldLayout(Long templateId, Long layoutId, UpdateOcrFieldLayoutRequest request);

    void softDeleteFieldLayout(Long templateId, Long layoutId);
}
