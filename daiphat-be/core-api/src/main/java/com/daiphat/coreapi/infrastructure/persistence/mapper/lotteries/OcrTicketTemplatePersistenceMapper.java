package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrTicketTemplateEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface OcrTicketTemplatePersistenceMapper {

    OcrTicketTemplateEntity toEntity(OcrTicketTemplateModel model);

    OcrTicketTemplateModel toDomain(OcrTicketTemplateEntity entity);
}
