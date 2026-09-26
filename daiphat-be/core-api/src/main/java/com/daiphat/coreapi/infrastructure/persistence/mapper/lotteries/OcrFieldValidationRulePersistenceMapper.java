package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationRuleModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrFieldValidationRuleEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OcrFieldValidationRulePersistenceMapper {

    @Mapping(target = "active", source = "active")
    OcrFieldValidationRuleEntity toEntity(OcrFieldValidationRuleModel model);

    @Mapping(target = "active", source = "active")
    OcrFieldValidationRuleModel toDomain(OcrFieldValidationRuleEntity entity);
}
