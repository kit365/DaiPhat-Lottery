package com.daiphat.coreapi.application.mapper.support;

import com.daiphat.coreapi.application.dto.response.support.*;
import com.daiphat.coreapi.domain.model.support.SupportTicketCommentModel;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SupportApplicationMapper {

    TicketCategoryResponse toCategoryResponse(TicketCategoryModel model);

    List<TicketCategoryResponse> toCategoryResponses(List<TicketCategoryModel> models);

    SupportTicketSummaryResponse toSummaryResponse(SupportTicketModel model);

    List<SupportTicketSummaryResponse> toSummaryResponses(List<SupportTicketModel> models);

    SupportTicketCommentResponse toCommentResponse(SupportTicketCommentModel model);

    List<SupportTicketCommentResponse> toCommentResponses(List<SupportTicketCommentModel> models);

    @Mapping(target = "comments", ignore = true)
    SupportTicketResponse toTicketResponse(SupportTicketModel model);

    default SupportTicketResponse toTicketResponse(
            SupportTicketModel model,
            List<SupportTicketCommentModel> comments) {
        SupportTicketResponse base = toTicketResponse(model);
        if (base == null) {
            return null;
        }
        return new SupportTicketResponse(
                base.id(),
                base.ticketCategoryId(),
                base.customerId(),
                base.assignedTo(),
                base.title(),
                base.description(),
                base.attachmentUrl(),
                base.refId(),
                base.refType(),
                base.status(),
                base.response(),
                base.resolvedAt(),
                base.dueAt(),
                base.createdAt(),
                base.updatedAt(),
                toCommentResponses(comments)
        );
    }
}
