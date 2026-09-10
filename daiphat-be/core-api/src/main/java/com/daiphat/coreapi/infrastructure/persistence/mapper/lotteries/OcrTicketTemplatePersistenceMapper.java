package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrTicketTemplateEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OcrTicketTemplatePersistenceMapper {

    @Mapping(target = "isDefault", expression = "java(model.isDefault())")
    OcrTicketTemplateEntity toEntity(OcrTicketTemplateModel model);

    @Mapping(target = "isDefault", expression = "java(entity.isDefault())")
    OcrTicketTemplateModel toDomain(OcrTicketTemplateEntity entity);
}
