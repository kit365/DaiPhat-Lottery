package com.daiphat.coreapi.domain.model.support;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("SupportTicketModel Phase 2 comment rules")
class SupportTicketModelTest {

    @Test
    void ensureCommentAllowed_rejectsResolvedRejectedAndClosed() {
        SupportTicketModel resolved = SupportTicketModel.builder().status(TicketStatus.RESOLVED).build();
        SupportTicketModel rejected = SupportTicketModel.builder().status(TicketStatus.REJECTED).build();
        SupportTicketModel closed = SupportTicketModel.builder().status(TicketStatus.CLOSED).build();

        assertThatThrownBy(resolved::ensureCommentAllowed)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_NOT_ALLOWED);

        assertThatThrownBy(rejected::ensureCommentAllowed)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_NOT_ALLOWED);

        assertThatThrownBy(closed::ensureCommentAllowed)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_NOT_ALLOWED);
    }

    @Test
    void ensureSenderTurn_rejectsSamePartyTwice() {
        List<SupportTicketCommentModel> comments = List.of(
                comment(TicketCommentSenderRole.CUSTOMER, "Hello"),
                comment(TicketCommentSenderRole.OPERATOR, "Reply"),
                comment(TicketCommentSenderRole.SYSTEM, "Audit log"));

        assertThatThrownBy(() -> SupportTicketModel.ensureSenderTurn(comments, TicketCommentSenderRole.OPERATOR))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_TURN_VIOLATION);
    }

    @Test
    void ensureSenderTurn_ignoresSystemWhenFindingLastConversationalComment() {
        List<SupportTicketCommentModel> comments = List.of(
                comment(TicketCommentSenderRole.CUSTOMER, "Hello"),
                comment(TicketCommentSenderRole.SYSTEM, "Staff assigned"));

        assertThatThrownBy(() -> SupportTicketModel.ensureSenderTurn(comments, TicketCommentSenderRole.CUSTOMER))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_TURN_VIOLATION);
    }

    @Test
    void recordOperatorComment_setsWaitingForCustomer() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.IN_PROGRESS).build();

        ticket.recordOperatorComment();

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.WAITING_FOR_CUSTOMER);
    }

    @Test
    void recordCustomerComment_movesWaitingForCustomerToInProgress() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.WAITING_FOR_CUSTOMER).build();

        ticket.recordCustomerComment();

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
    }

    @Test
    void assignByStaff_fromOpen_setsInProgressAndAssignee() {
        UUID staffId = UUID.randomUUID();
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.OPEN).build();

        ticket.assignByStaff(staffId);

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(ticket.getAssignedTo()).isEqualTo(staffId);
    }

    @Test
    void assignByStaff_whenNotOpen_throwsCannotAssign() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.IN_PROGRESS).build();

        assertThatThrownBy(() -> ticket.assignByStaff(UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_CANNOT_ASSIGN);
    }

    @Test
    void resolveByStaff_fromInProgress_setsResolvedFields() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.IN_PROGRESS).build();

        ticket.resolveByStaff(55L, "Refund processed");

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.CLOSED);
        assertThat(ticket.getResponse()).isEqualTo("Refund processed");
        assertThat(ticket.getResolvedReasonId()).isEqualTo(55L);
        assertThat(ticket.getRejectedReasonId()).isNull();
        assertThat(ticket.getResolvedAt()).isNotNull();
    }

    @Test
    void resolveByStaff_fromWaitingForCustomer_setsResolvedFields() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.WAITING_FOR_CUSTOMER).build();

        ticket.resolveByStaff(56L, "Issue fixed");

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.CLOSED);
        assertThat(ticket.getResolvedReasonId()).isEqualTo(56L);
    }

    @Test
    void resolveByStaff_whenClosed_throwsCannotResolve() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.CLOSED).build();

        assertThatThrownBy(() -> ticket.resolveByStaff(1L, "Done"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_CANNOT_RESOLVE);
    }

    @Test
    void rejectByStaff_setsRejectedFields() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.IN_PROGRESS).build();

        ticket.rejectByStaff(77L, "Not eligible");

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.REJECTED);
        assertThat(ticket.getRejectedReasonId()).isEqualTo(77L);
        assertThat(ticket.getResolvedReasonId()).isNull();
        assertThat(ticket.getResponse()).isEqualTo("Not eligible");
        assertThat(ticket.getResolvedAt()).isNotNull();
    }

    @Test
    void acceptResolutionByCustomer_fromResolved_closes() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.RESOLVED).build();

        ticket.acceptResolutionByCustomer();

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.CLOSED);
    }

    @Test
    void reopenAfterDissatisfaction_clearsAssigneeAndResetsSla() {
        UUID staffId = UUID.randomUUID();
        LocalDateTime newDueAt = LocalDateTime.now().plusDays(2);
        SupportTicketModel ticket = SupportTicketModel.builder()
                .status(TicketStatus.RESOLVED)
                .assignedTo(staffId)
                .resolvedReasonId(10L)
                .response("Old resolution")
                .resolvedAt(LocalDateTime.now().minusHours(1))
                .build();

        ticket.reopenAfterDissatisfaction(newDueAt);

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.OPEN);
        assertThat(ticket.getAssignedTo()).isNull();
        assertThat(ticket.getDueAt()).isEqualTo(newDueAt);
        assertThat(ticket.getResolvedAt()).isNull();
        assertThat(ticket.getResponse()).isNull();
        assertThat(ticket.getResolvedReasonId()).isNull();
    }

    @Test
    void autoCloseResolved_fromResolved_closes() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.RESOLVED).build();

        ticket.autoCloseResolved();

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.CLOSED);
    }

    @Test
    void autoCloseResolved_whenNotResolved_throws() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.IN_PROGRESS).build();

        assertThatThrownBy(ticket::autoCloseResolved)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_CANNOT_AUTO_CLOSE);
    }

    @Test
    void ensureOperatorCanComment_rejectsOpenStatus() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.OPEN).build();

        assertThatThrownBy(ticket::ensureOperatorCanComment)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_OPERATOR_MUST_ASSIGN_FIRST);
    }

    @Test
    void closeByCustomer_allowsOpenInProgressAndWaiting() {
        for (TicketStatus status : List.of(
                TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_CUSTOMER)) {
            SupportTicketModel ticket = SupportTicketModel.builder().status(status).build();
            ticket.closeByCustomer();
            assertThat(ticket.getStatus()).isEqualTo(TicketStatus.CLOSED);
            assertThat(ticket.getResolvedAt()).isNotNull();
        }
    }

    @Test
    void closeByCustomer_rejectsTerminalStatuses() {
        for (TicketStatus status : List.of(
                TicketStatus.RESOLVED, TicketStatus.REJECTED, TicketStatus.CLOSED)) {
            SupportTicketModel ticket = SupportTicketModel.builder().status(status).build();
            assertThatThrownBy(ticket::closeByCustomer)
                    .isInstanceOf(DomainException.class)
                    .extracting(ex -> ((DomainException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.TICKET_CANNOT_CLOSE);
        }
    }

    private static SupportTicketCommentModel comment(TicketCommentSenderRole role, String content) {
        return SupportTicketCommentModel.builder()
                .senderRole(role)
                .content(content)
                .build();
    }
}
