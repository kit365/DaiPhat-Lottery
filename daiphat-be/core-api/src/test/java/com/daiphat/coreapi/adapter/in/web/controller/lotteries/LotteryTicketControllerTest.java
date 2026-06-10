package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.base.Views;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.converter.json.MappingJacksonValue;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LotteryTicketController Unit Tests")
class LotteryTicketControllerTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID PRODUCT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID TICKET_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID IMPORTED_BY_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID VERIFIED_BY_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");

    private LotteryTicketController lotteryTicketController;

    @Mock
    private LotteryTicketServicePort lotteryTicketServicePort;

    @BeforeEach
    void setUp() {
        lotteryTicketController = new LotteryTicketController(lotteryTicketServicePort);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("GET /lottery-tickets: Admin xem danh sách vé số trả về đầy đủ field")
    void getAll_asAdmin_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ADMIN, "ticket:view");

        when(lotteryTicketServicePort.getAll(1, 10, PRODUCT_ID, "IN_STOCK", "2026-06-10", "123456", "createdAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                PRODUCT_ID,
                "IN_STOCK",
                "2026-06-10",
                "123456",
                "createdAt",
                "desc",
                principal
        );

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);
        assertThat(response.getValue()).isInstanceOf(ApiResponse.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getMessage()).isNull();
        assertThat(body.getData()).isEqualTo(serviceResponse);
        assertThat(body.getData().getRecordList()).hasSize(1);
        assertThat(body.getData().getRecordList().getFirst().batchCode()).isEqualTo("BATCH-01");
        assertThat(body.getData().getRecordList().getFirst().importedById()).isEqualTo(IMPORTED_BY_ID);
        assertThat(body.getData().getRecordList().getFirst().verifiedById()).isEqualTo(VERIFIED_BY_ID);
        assertThat(body.getData().getRecordList().getFirst().createdBy()).isEqualTo("admin01");
        assertThat(body.getData().getRecordList().getFirst().lastModifiedBy()).isEqualTo("operator01");

        verify(lotteryTicketServicePort).getAll(1, 10, PRODUCT_ID, "IN_STOCK", "2026-06-10", "123456", "createdAt", "desc");
    }

    @Test
    @DisplayName("GET /lottery-tickets: Operator xem danh sách vé số trả về đầy đủ field")
    void getAll_asOperator_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "operator01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(2, 5);
        setAuthentication(principal, RoleConstants.ROLE_STAFF_OPERATOR, "ticket:view");

        when(lotteryTicketServicePort.getAll(2, 5, null, null, null, null, null, null))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                2,
                5,
                null,
                null,
                null,
                null,
                null,
                null,
                principal
        );

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(serviceResponse);
        assertThat(body.getData().getPagination().getCurrentPage()).isEqualTo(2);
        assertThat(body.getData().getPagination().getLimit()).isEqualTo(5);

        verify(lotteryTicketServicePort).getAll(2, 5, null, null, null, null, null, null);
    }

    @Test
    @DisplayName("GET /lottery-tickets: Truyền đầy đủ tham số lọc và sắp xếp xuống service cho trang quản trị")
    void getAll_forAdmin_forwardsAllFilterParams() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(3, 20);
        UUID anotherProductId = UUID.fromString("66666666-6666-6666-6666-666666666666");
        setAuthentication(principal, RoleConstants.ADMIN, "ticket:view");

        when(lotteryTicketServicePort.getAll(3, 20, anotherProductId, "RESERVED", "2026-06-12", "654321", "drawDate", "asc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                3,
                20,
                anotherProductId,
                "RESERVED",
                "2026-06-12",
                "654321",
                "drawDate",
                "asc",
                principal
        );

        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.getData()).isEqualTo(serviceResponse);

        verify(lotteryTicketServicePort).getAll(3, 20, anotherProductId, "RESERVED", "2026-06-12", "654321", "drawDate", "asc");
    }

    @Test
    @DisplayName("GET /lottery-tickets: User có ticket:view nhưng không phải member-only vẫn dùng admin view")
    void getAll_withTicketViewAuthority_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "street-agent01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_STREET_AGENT, "ticket:view");

        when(lotteryTicketServicePort.getAll(1, 10, null, "SOLD_ONLINE", null, "0001", "updatedAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                "SOLD_ONLINE",
                null,
                "0001",
                "updatedAt",
                "desc",
                principal
        );

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.getData().getRecordList().getFirst().verified()).isTrue();
        assertThat(body.getData().getRecordList().getFirst().returnedAt()).isEqualTo(LocalDateTime.of(2026, 6, 15, 8, 30));

        verify(lotteryTicketServicePort).getAll(1, 10, null, "SOLD_ONLINE", null, "0001", "updatedAt", "desc");
    }

    @Test
    @DisplayName("GET /lottery-tickets: Member-only xem danh sách vé số dùng public view")
    void getAll_asMemberOnly_returnsPublicView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(1, 10, null, "IN_STOCK", "2026-06-10", "123456", "createdAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                "IN_STOCK",
                "2026-06-10",
                "123456",
                "createdAt",
                "desc",
                principal
        );

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(serviceResponse);

        verify(lotteryTicketServicePort).getAll(1, 10, null, "IN_STOCK", "2026-06-10", "123456", "createdAt", "desc");
    }

    private PageResponse<LotteryTicketResponse> buildPageResponse(int currentPage, int limit) {
        LotteryTicketResponse ticketResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .productId(PRODUCT_ID)
                .productName("Vé số TP.HCM")
                .ticketImg("https://cdn.example.com/tickets/33333333.png")
                .serialNumber("A123456")
                .numbers("123456")
                .drawDate(LocalDate.of(2026, 6, 10))
                .batchCode("BATCH-01")
                .status("IN_STOCK")
                .statusDisplayName("Còn trong kho")
                .importedById(IMPORTED_BY_ID)
                .importedAt(LocalDateTime.of(2026, 6, 1, 9, 0))
                .verified(true)
                .verifiedById(VERIFIED_BY_ID)
                .verifiedAt(LocalDateTime.of(2026, 6, 2, 10, 15))
                .returnedAt(LocalDateTime.of(2026, 6, 15, 8, 30))
                .createdAt(LocalDateTime.of(2026, 6, 1, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 6, 3, 14, 45))
                .createdBy("admin01")
                .lastModifiedBy("operator01")
                .build();

        return PageResponse.<LotteryTicketResponse>builder()
                .recordList(List.of(ticketResponse))
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(1)
                        .totalPages(1)
                        .currentPage(currentPage)
                        .limit(limit)
                        .isFirst(currentPage == 1)
                        .isLast(true)
                        .build())
                .build();
    }

    private void setAuthentication(AuthenticatedUserPrincipal principal, String... authorities) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(authorities).stream().map(SimpleGrantedAuthority::new).toList()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
