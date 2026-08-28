package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrFieldLayoutModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrFieldLayoutEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface OcrFieldLayoutPersistenceMapper {

    OcrFieldLayoutEntity toEntity(OcrFieldLayoutModel model);

    OcrFieldLayoutModel toDomain(OcrFieldLayoutEntity entity);
}
