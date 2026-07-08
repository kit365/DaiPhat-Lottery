package com.daiphat.coreapi.infrastructure.persistence.mapper.chat;

import com.daiphat.coreapi.domain.model.chat.AiIntentConfigModel;
import com.daiphat.coreapi.domain.model.chat.AiServiceConfigModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.AiIntentConfigEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.AiServiceConfigEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.Comparator;
import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AiServiceConfigPersistenceMapper {

    @Mapping(target = "intentConfigs", expression = "java(toIntentModels(entity.getIntentConfigs()))")
    AiServiceConfigModel toModel(AiServiceConfigEntity entity);

    @Mapping(target = "aiServiceConfigId", source = "aiServiceConfig.id")
    AiIntentConfigModel toIntentModel(AiIntentConfigEntity entity);

    default List<AiIntentConfigModel> toIntentModels(List<AiIntentConfigEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return List.of();
        }
        return entities.stream()
                .filter(entity -> entity.getDeletedAt() == null)
                .map(this::toIntentModel)
                .sorted(Comparator.comparing(
                        AiIntentConfigModel::getPriority,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .toList();
    }
}
