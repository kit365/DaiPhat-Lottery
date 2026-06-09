package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryProductEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PrizeStructurePersistenceMapper {

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "isOnly", expression = "java(entity.isOnly())")
    PrizeStructureModel toDomain(PrizeStructureEntity entity);

    List<PrizeStructureModel> toDomainList(List<PrizeStructureEntity> entities);

    @Mapping(target = "product", source = "productId", qualifiedByName = "productIdToProductEntity")
    @Mapping(target = "isOnly", expression = "java(model.isOnly())")
    PrizeStructureEntity toEntity(PrizeStructureModel model);

    List<PrizeStructureEntity> toEntityList(List<PrizeStructureModel> models);

    @Named("productIdToProductEntity")
    default LotteryProductEntity productIdToProductEntity(UUID productId) {
        if (productId == null) return null;
        LotteryProductEntity product = new LotteryProductEntity();
        product.setId(productId);
        return product;
    }
}
