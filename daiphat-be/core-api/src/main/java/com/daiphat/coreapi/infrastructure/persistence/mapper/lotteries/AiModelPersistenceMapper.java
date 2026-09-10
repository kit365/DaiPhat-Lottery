package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.AiModelMetricModel;
import com.daiphat.coreapi.domain.model.lotteries.AiModelRegistryModel;
import com.daiphat.coreapi.domain.model.lotteries.TrainingDatasetExportModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AiModelMetricEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AiModelRegistryEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.TrainingDatasetExportEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AiModelPersistenceMapper {

    @Mapping(target = "isDefault", expression = "java(model.isDefault())")
    AiModelRegistryEntity toEntity(AiModelRegistryModel model);

    @Mapping(target = "isDefault", expression = "java(entity.isDefault())")
    AiModelRegistryModel toDomain(AiModelRegistryEntity entity);

    AiModelMetricEntity toEntity(AiModelMetricModel model);

    AiModelMetricModel toDomain(AiModelMetricEntity entity);

    TrainingDatasetExportEntity toEntity(TrainingDatasetExportModel model);

    TrainingDatasetExportModel toDomain(TrainingDatasetExportEntity entity);
}
