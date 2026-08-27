package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OcrTicketTemplateRepositoryPort {

    OcrTicketTemplateModel save(OcrTicketTemplateModel model);

    Optional<OcrTicketTemplateModel> findById(Long id);

    List<OcrTicketTemplateModel> findByStationId(Long stationId);

    Optional<OcrTicketTemplateModel> findDefaultByStationId(Long stationId);

    boolean existsActiveDefault();

    long countActiveDefaults();

    void clearDefaultsForStation(Long stationId, Long excludeId);

    Optional<OcrTicketTemplateModel> resolveForStation(Long stationId, LocalDate drawDate);
}
