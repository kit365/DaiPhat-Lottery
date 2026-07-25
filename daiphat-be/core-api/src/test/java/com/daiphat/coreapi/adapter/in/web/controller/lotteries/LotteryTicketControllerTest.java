package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.base.Views;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-272][DP-325][DP-281][DP-234][DP-292] LotteryTicketController Unit Tests")
class LotteryTicketControllerTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final Long PRODUCT_ID = 222L;
    private static final Long TICKET_ID = 333L;
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
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Admin xem chi tiết vé số trả về đầy đủ field")
    void getById_asAdmin_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ADMIN, "ticket:view");

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);
        assertThat(response.getValue()).isInstanceOf(ApiResponse.class);

        @SuppressWarnings("unchecked")
        ApiResponse<LotteryTicketResponse> body = (ApiResponse<LotteryTicketResponse>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getMessage()).isNull();
        assertThat(body.getData()).isEqualTo(expectedResponse);
        assertThat(body.getData().batchCode()).isEqualTo("BATCH-01");
        assertThat(body.getData().importedById()).isEqualTo(IMPORTED_BY_ID);
        assertThat(body.getData().verifiedById()).isEqualTo(VERIFIED_BY_ID);

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Operator xem chi tiết vé số trả về đầy đủ field")
    void getById_asOperator_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "operator01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_STAFF_OPERATOR, "ticket:view");

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<LotteryTicketResponse> body = (ApiResponse<LotteryTicketResponse>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(expectedResponse);
        assertThat(body.getData().createdBy()).isEqualTo("admin01");
        assertThat(body.getData().lastModifiedBy()).isEqualTo("operator01");

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Member xem chi tiết vé số dùng public view")
    void getById_asMemberOnly_returnsPublicView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<LotteryTicketResponse> body = (ApiResponse<LotteryTicketResponse>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(expectedResponse);
        assertThat(body.getData().stationId()).isEqualTo(PRODUCT_ID);
        assertThat(body.getData().numbers()).isEqualTo("123456");

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Member chỉ serialize các field public khi xem chi tiết")
    void getById_asMemberOnly_serializesOnlyPublicFields() throws Exception {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        String json = OBJECT_MAPPER
                .writerWithView(response.getSerializationView())
                .writeValueAsString(response.getValue());

        @SuppressWarnings("unchecked")
        Map<String, Object> responseMap = OBJECT_MAPPER.readValue(json, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) responseMap.get("data");

        assertThat(data).containsKeys(
                "id",
                "stationId",
                "stationName",
                "ticketImg",
                "serialNumber",
                "numbers",
                "drawDate",
                "quantity",
                "priceSnapshot",
                "serials",
                "status",
                "statusDisplayName"
        );
        assertThat(data).doesNotContainKeys(
                "batchCode",
                "importedById",
                "importedAt",
                "verified",
                "verifiedById",
                "verifiedAt",
                "returnedAt",
                "createdAt",
                "updatedAt",
                "createdBy",
                "lastModifiedBy"
        );

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Member có thêm ticket:view thì xem chi tiết bằng admin view")
    void getById_asMemberWithTicketView_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member-operator01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER, "ticket:view");

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<LotteryTicketResponse> body = (ApiResponse<LotteryTicketResponse>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.getData().batchCode()).isEqualTo("BATCH-01");
        assertThat(body.getData().verified()).isTrue();

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Không có security context thì fallback về public view")
    void getById_withoutSecurityContext_returnsPublicView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        SecurityContextHolder.clearContext();

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<LotteryTicketResponse> body = (ApiResponse<LotteryTicketResponse>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(expectedResponse);

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Admin xem danh sách vé số trả về đầy đủ field")
    void getAll_asAdmin_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ADMIN, "ticket:view");

        when(lotteryTicketServicePort.getAll(1, 10, PRODUCT_ID, null, "IN_STOCK", "2026-06-10", null, null, null, "123456", "createdAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                PRODUCT_ID,
                null,
                "IN_STOCK",
                "2026-06-10",
                null,
                null,
                null,
                "123456",
                "createdAt",
                "desc",
                principal);

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

        verify(lotteryTicketServicePort).getAll(1, 10, PRODUCT_ID, null, "IN_STOCK", "2026-06-10", null, null, null, "123456", "createdAt", "desc");
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Operator xem danh sách vé số trả về đầy đủ field")
    void getAll_asOperator_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "operator01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(2, 5);
        setAuthentication(principal, RoleConstants.ROLE_STAFF_OPERATOR, "ticket:view");

        when(lotteryTicketServicePort.getAll(2, 5, null, null, null, null, null, null, null, null, null, null))
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
                null,
                null,
                null,
                null,
                principal);

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

        verify(lotteryTicketServicePort).getAll(2, 5, null, null, null, null, null, null, null, null, null, null);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Truyền đầy đủ tham số lọc và sắp xếp xuống service cho trang quản trị")
    void getAll_forAdmin_forwardsAllFilterParams() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(3, 20);
        Long anotherProductId = 666L;
        setAuthentication(principal, RoleConstants.ADMIN, "ticket:view");

        when(lotteryTicketServicePort.getAll(3, 20, anotherProductId, null, "RESERVED", "2026-06-12", null, null, null, "654321", "drawDate", "asc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                3,
                20,
                anotherProductId,
                null,
                "RESERVED",
                "2026-06-12",
                null,
                null,
                null,
                "654321",
                "drawDate",
                "asc",
                principal);

        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.getData()).isEqualTo(serviceResponse);

        verify(lotteryTicketServicePort).getAll(3, 20, anotherProductId, null, "RESERVED", "2026-06-12", null, null, null, "654321", "drawDate", "asc");
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: User có ticket:view nhưng không phải member-only vẫn dùng admin view")
    void getAll_withTicketViewAuthority_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "street-agent01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_STREET_AGENT, "ticket:view");

        when(lotteryTicketServicePort.getAll(1, 10, null, null, "SOLD", null, null, null, null, "0001", "updatedAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                "SOLD",
                null,
                null,
                null,
                null,
                "0001",
                "updatedAt",
                "desc",
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.getData().getRecordList().getFirst().verified()).isTrue();
        assertThat(body.getData().getRecordList().getFirst().returnedAt()).isEqualTo(LocalDateTime.of(2026, 6, 15, 8, 30));

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, "SOLD", null, null, null, null, "0001", "updatedAt", "desc");
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member-only xem danh sách vé số dùng public view")
    void getAll_asMemberOnly_returnsPublicView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(1, 10, null, null, "IN_STOCK", "2026-06-10", null, null, null, "123456", "createdAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                "IN_STOCK",
                "2026-06-10",
                null,
                null,
                null,
                "123456",
                "createdAt",
                "desc",
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(serviceResponse);
        assertThat(body.getData().getRecordList()).hasSize(1);
        assertThat(body.getData().getPagination().getCurrentPage()).isEqualTo(1);
        assertThat(body.getData().getPagination().getLimit()).isEqualTo(10);

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, "IN_STOCK", "2026-06-10", null, null, null, "123456", "createdAt", "desc");
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member-only chỉ serialize các field public cần thiết")
    void getAll_asMemberOnly_serializesOnlyPublicFields() throws Exception {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(1, 10, PRODUCT_ID, null, "IN_STOCK", "2026-06-10", null, null, null, "123456", "createdAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                PRODUCT_ID,
                null,
                "IN_STOCK",
                "2026-06-10",
                null,
                null,
                null,
                "123456",
                "createdAt",
                "desc",
                principal);

        String json = OBJECT_MAPPER
                .writerWithView(response.getSerializationView())
                .writeValueAsString(response.getValue());

        @SuppressWarnings("unchecked")
        Map<String, Object> responseMap = OBJECT_MAPPER.readValue(json, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) responseMap.get("data");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recordList = (List<Map<String, Object>>) data.get("recordList");
        Map<String, Object> firstRecord = recordList.getFirst();

        assertThat(firstRecord).containsKeys(
                "id",
                "stationId",
                "stationName",
                "ticketImg",
                "serialNumber",
                "numbers",
                "drawDate",
                "quantity",
                "priceSnapshot",
                "serials",
                "status",
                "statusDisplayName"
        );
        assertThat(firstRecord).doesNotContainKeys(
                "batchCode",
                "importedById",
                "importedAt",
                "verified",
                "verifiedById",
                "verifiedAt",
                "returnedAt",
                "createdAt",
                "updatedAt",
                "createdBy",
                "lastModifiedBy"
        );

        verify(lotteryTicketServicePort).getAll(1, 10, PRODUCT_ID, null, "IN_STOCK", "2026-06-10", null, null, null, "123456", "createdAt", "desc");
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member-only truyền đầy đủ tham số lọc và sắp xếp xuống service")
    void getAll_asMemberOnly_forwardsAllFilterParams() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(4, 15);
        Long anotherProductId = 777L;
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(4, 15, anotherProductId, null, "SOLD", "2026-06-18", null, null, null, "888999", "drawDate", "asc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                4,
                15,
                anotherProductId,
                null,
                "SOLD",
                "2026-06-18",
                null,
                null,
                null,
                "888999",
                "drawDate",
                "asc",
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.getData()).isEqualTo(serviceResponse);
        assertThat(body.getData().getPagination().getCurrentPage()).isEqualTo(4);
        assertThat(body.getData().getPagination().getLimit()).isEqualTo(15);

        verify(lotteryTicketServicePort).getAll(4, 15, anotherProductId, null, "SOLD", "2026-06-18", null, null, null, "888999", "drawDate", "asc");
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member có thêm ticket:view không còn bị giới hạn public view")
    void getAll_asMemberWithTicketView_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member-operator01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_MEMBER, "ticket:view");

        when(lotteryTicketServicePort.getAll(1, 10, null, null, null, null, null, null, null, "123456", "createdAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "123456",
                "createdAt",
                "desc",
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.getData().getRecordList().getFirst().batchCode()).isEqualTo("BATCH-01");
        assertThat(body.getData().getRecordList().getFirst().verified()).isTrue();

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, null, null, null, null, null, "123456", "createdAt", "desc");
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member không có security context thì fallback về public view")
    void getAll_asMemberWithoutSecurityContext_returnsPublicView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        SecurityContextHolder.clearContext();

        when(lotteryTicketServicePort.getAll(1, 10, null, null, "IN_STOCK", null, null, null, null, null, null, null))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                "IN_STOCK",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(serviceResponse);

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, "IN_STOCK", null, null, null, null, null, null, null);
    }

    private PageResponse<LotteryTicketResponse> buildPageResponse(int currentPage, int limit) {
        return PageResponse.<LotteryTicketResponse>builder()
                .recordList(List.of(buildTicketResponse()))
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

    private LotteryTicketResponse buildTicketResponse() {
        return LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .stationName("Vé số TP.HCM")
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
    }

    private void setAuthentication(AuthenticatedUserPrincipal principal, String... authorities) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                Stream.of(authorities).map(SimpleGrantedAuthority::new).toList()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    // ============================================================
    // MEMBER VIEW ERROR CASES TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Member xem chi tiết vé không tồn tại trả về exception")
    void getById_asMember_notFound_throwsException() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getById(TICKET_ID))
                .thenThrow(new RuntimeException("Vé số không tồn tại"));

        org.junit.jupiter.api.Assertions.assertThrows(
                RuntimeException.class,
                () -> lotteryTicketController.getById(TICKET_ID, principal)
        );

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member xem danh sách vé không có kết quả trả về empty page")
    void getAll_asMember_noResults_returnsEmptyPage() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> emptyResponse = PageResponse.<LotteryTicketResponse>builder()
                .recordList(List.of())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(0)
                        .totalPages(0)
                        .currentPage(1)
                        .limit(10)
                        .isFirst(true)
                        .isLast(true)
                        .build())
                .build();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(1, 10, null, null, null, null, null, null, null, null, null, null))
                .thenReturn(emptyResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData().getRecordList()).isEmpty();
        assertThat(body.getData().getPagination().getTotalRecords()).isEqualTo(0);

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, null, null, null, null, null, null, null, null);
    }

    // ============================================================
    // MEMBER VIEW FIELD VALIDATION TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Member xem chi tiết vé KHÔNG chứa các admin-only fields")
    void getById_asMember_doesNotContainAdminFields() throws Exception {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        LotteryTicketResponse fullResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(fullResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        String json = OBJECT_MAPPER
                .writerWithView(Views.Public.class)
                .writeValueAsString(response.getValue());

        @SuppressWarnings("unchecked")
        Map<String, Object> responseMap = OBJECT_MAPPER.readValue(json, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) responseMap.get("data");

        assertThat(data).doesNotContainKeys(
                "batchCode",
                "importedById",
                "importedAt",
                "verified",
                "verifiedById",
                "verifiedAt",
                "returnedAt",
                "createdAt",
                "updatedAt",
                "createdBy",
                "lastModifiedBy"
        );

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Member xem chi tiết vé CHỈ chứa 9 public fields")
    void getById_asMember_containsOnlyPublicFields() throws Exception {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        LotteryTicketResponse fullResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(fullResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        String json = OBJECT_MAPPER
                .writerWithView(Views.Public.class)
                .writeValueAsString(response.getValue());

        @SuppressWarnings("unchecked")
        Map<String, Object> responseMap = OBJECT_MAPPER.readValue(json, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) responseMap.get("data");

        assertThat(data).containsOnlyKeys(
                "id",
                "stationId",
                "stationName",
                "ticketImg",
                "serialNumber",
                "numbers",
                "drawDate",
                "quantity",
                "priceSnapshot",
                "serials",
                "status",
                "statusDisplayName"
        );
        assertThat(data).hasSize(12);

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member xem danh sách mỗi record CHỈ chứa 9 public fields")
    void getAll_asMember_eachRecordHasOnlyPublicFields() throws Exception {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(1, 10, null, null, null, null, null, null, null, null, null, null))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                principal);

        String json = OBJECT_MAPPER
                .writerWithView(Views.Public.class)
                .writeValueAsString(response.getValue());

        @SuppressWarnings("unchecked")
        Map<String, Object> responseMap = OBJECT_MAPPER.readValue(json, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) responseMap.get("data");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recordList = (List<Map<String, Object>>) data.get("recordList");

        assertThat(recordList).hasSize(1);
        Map<String, Object> firstRecord = recordList.getFirst();

        assertThat(firstRecord).containsOnlyKeys(
                "id",
                "stationId",
                "stationName",
                "ticketImg",
                "serialNumber",
                "numbers",
                "drawDate",
                "quantity",
                "priceSnapshot",
                "serials",
                "status",
                "statusDisplayName"
        );
        assertThat(firstRecord).hasSize(12);
        assertThat(firstRecord).doesNotContainKey("batchCode");
        assertThat(firstRecord).doesNotContainKey("verified");
        assertThat(firstRecord).doesNotContainKey("importedById");

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, null, null, null, null, null);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member xem danh sách với pagination metadata đúng")
    void getAll_asMember_paginationMetadataCorrect() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> serviceResponse = PageResponse.<LotteryTicketResponse>builder()
                .recordList(List.of(buildTicketResponse()))
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(50)
                        .totalPages(5)
                        .currentPage(3)
                        .limit(10)
                        .isFirst(false)
                        .isLast(false)
                        .build())
                .build();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(3, 10, null, null, null, null, null, null, null, null, null, null))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                3,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                principal);

        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body.getData().getPagination().getTotalRecords()).isEqualTo(50);
        assertThat(body.getData().getPagination().getTotalPages()).isEqualTo(5);
        assertThat(body.getData().getPagination().getCurrentPage()).isEqualTo(3);
        assertThat(body.getData().getPagination().getLimit()).isEqualTo(10);
        assertThat(body.getData().getPagination().isFirst()).isFalse();
        assertThat(body.getData().getPagination().isLast()).isFalse();

        verify(lotteryTicketServicePort).getAll(3, 10, null, null, null, null, null, null, null, null, null, null);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Member có ticket:view vẫn thấy admin fields khi serialize")
    void getById_asMemberWithTicketView_showsAdminFieldsInSerialization() throws Exception {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member-operator01");
        LotteryTicketResponse fullResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER, "ticket:view");

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(fullResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        String json = OBJECT_MAPPER
                .writerWithView(Views.Admin.class)
                .writeValueAsString(response.getValue());

        @SuppressWarnings("unchecked")
        Map<String, Object> responseMap = OBJECT_MAPPER.readValue(json, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) responseMap.get("data");

        assertThat(data).containsKeys(
                "batchCode",
                "importedById",
                "verified",
                "createdAt",
                "updatedAt",
                "createdBy",
                "lastModifiedBy"
        );

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Street Agent xem chi tiết vé dùng Admin view")
    void getById_asStreetAgent_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "streetAgent01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_STREET_AGENT);

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<LotteryTicketResponse> body = (ApiResponse<LotteryTicketResponse>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(expectedResponse);
        assertThat(body.getData().stationId()).isEqualTo(PRODUCT_ID);
        assertThat(body.getData().batchCode()).isEqualTo("BATCH-01");

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Street Agent xem danh sách vé dùng Admin view")
    void getAll_asStreetAgent_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "streetAgent01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_STREET_AGENT);

        when(lotteryTicketServicePort.getAll(1, 10, null, null, null, null, null, null, null, null, null, null))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(serviceResponse);

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, null, null, null, null, null, null, null, null);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Street Agent có ticket:view vẫn dùng Admin view")
    void getById_asStreetAgentWithTicketView_returnsAdminView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "streetAgent01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_STREET_AGENT, "ticket:view");

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Anonymous user (null principal) vẫn dùng public view")
    void getById_asAnonymousUser_returnsPublicView() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        LotteryTicketResponse expectedResponse = buildTicketResponse();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getById(TICKET_ID)).thenReturn(expectedResponse);

        MappingJacksonValue response = lotteryTicketController.getById(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<LotteryTicketResponse> body = (ApiResponse<LotteryTicketResponse>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData()).isEqualTo(expectedResponse);

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member xem danh sách với filter status và search")
    void getAll_asMember_withStatusAndSearchFilter() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(1, 10, PRODUCT_ID, null, "IN_STOCK", "2026-06-10", null, null, null, "123", "drawDate", "asc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                PRODUCT_ID,
                null,
                "IN_STOCK",
                "2026-06-10",
                null,
                null,
                null,
                "123",
                "drawDate",
                "asc",
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        verify(lotteryTicketServicePort).getAll(1, 10, PRODUCT_ID, null, "IN_STOCK", "2026-06-10", null, null, null, "123", "drawDate", "asc");
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Member xem danh sách với nhiều bản ghi")
    void getAll_asMember_withMultipleRecords() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        List<LotteryTicketResponse> records = List.of(
                buildTicketResponse(),
                LotteryTicketResponse.builder()
                        .id(666L)
                        .stationId(PRODUCT_ID)
                        .stationName("Vé số Hà Nội")
                        .serialNumber("B777777")
                        .numbers("654321")
                        .drawDate(LocalDate.of(2026, 6, 15))
                        .status("IN_STOCK")
                        .statusDisplayName("Còn trong kho")
                        .build()
        );
        PageResponse<LotteryTicketResponse> serviceResponse = PageResponse.<LotteryTicketResponse>builder()
                .recordList(records)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(2)
                        .totalPages(1)
                        .currentPage(1)
                        .limit(10)
                        .isFirst(true)
                        .isLast(true)
                        .build())
                .build();
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        when(lotteryTicketServicePort.getAll(1, 10, null, null, null, null, null, null, null, null, null, null))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                principal);

        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body.getData().getRecordList()).hasSize(2);
        assertThat(body.getData().getRecordList().get(0).numbers()).isEqualTo("123456");
        assertThat(body.getData().getRecordList().get(1).numbers()).isEqualTo("654321");

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, null, null, null, null, null, null, null, null);
    }

    // ============================================================
    // CREATE LOTTERY TICKET TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-272] POST /lottery-tickets: Admin tạo vé số mới thành công")
    void create_asAdmin_returnsCreatedTicket() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        CreateLotteryTicketRequest request = CreateLotteryTicketRequest.builder()
                .stationId(PRODUCT_ID)
                .serials(java.util.List.of(new com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest("A999999", "https://cdn.example.com/tickets/new.png")))
                .numbers("999999")
                .drawDate(LocalDate.of(2026, 6, 20))
                .importBatchLineId(1L)
                .build();

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .stationName("Vé số TP.HCM")
                .ticketImg("https://cdn.example.com/tickets/new.png")
                .serialNumber("A999999")
                .numbers("999999")
                .drawDate(LocalDate.of(2026, 6, 20))
                .batchCode("BATCH-NEW")
                .status("IN_STOCK")
                .statusDisplayName("Còn trong kho")
                .importedById(USER_ID)
                .importedAt(LocalDateTime.now())
                .verified(false)
                .createdAt(LocalDateTime.now())
                .build();

        when(lotteryTicketServicePort.create(request, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.create(request, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Nhập vé số vào kho thành công.");
        assertThat(response.getData()).isEqualTo(expectedResponse);
        assertThat(response.getData().serialNumber()).isEqualTo("A999999");
        assertThat(response.getData().numbers()).isEqualTo("999999");
        assertThat(response.getData().importedById()).isEqualTo(USER_ID);

        verify(lotteryTicketServicePort).create(request, USER_ID);
    }

    @Test
    @DisplayName("[DP-272] POST /lottery-tickets: Operator tạo vé số mới thành công")
    void create_asOperator_returnsCreatedTicket() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "operator01");
        CreateLotteryTicketRequest request = CreateLotteryTicketRequest.builder()
                .stationId(PRODUCT_ID)
                .serials(java.util.List.of(new com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest("B111111", null)))
                .numbers("111222")
                .drawDate(LocalDate.of(2026, 6, 25))
                .importBatchLineId(1L)
                .build();

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .serialNumber("B111111")
                .serials(java.util.List.of(com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse.builder().serialNumber("B111111").ticketImg(null).build()))
                .numbers("111222")
                .drawDate(LocalDate.of(2026, 6, 25))
                .batchCode("BATCH-OP")
                .status("IN_STOCK")
                .statusDisplayName("Còn trong kho")
                .importedById(USER_ID)
                .build();

        when(lotteryTicketServicePort.create(request, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.create(request, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().serialNumber()).isEqualTo("B111111");
        assertThat(response.getData().importedById()).isEqualTo(USER_ID);

        verify(lotteryTicketServicePort).create(request, USER_ID);
    }

    @Test
    @DisplayName("[DP-272] POST /lottery-tickets: Tạo vé số không có ticketImg vẫn thành công")
    void create_withoutTicketImg_returnsCreatedTicket() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        CreateLotteryTicketRequest request = CreateLotteryTicketRequest.builder()
                .stationId(PRODUCT_ID)
                .serials(java.util.List.of(new com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest("C333333", null)))
                .numbers("333777")
                .drawDate(LocalDate.of(2026, 7, 1))
                .importBatchLineId(1L)
                .build();

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .serialNumber("C333333")
                .serials(java.util.List.of(com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse.builder().serialNumber("C333333").ticketImg(null).build()))
                .numbers("333777")
                .drawDate(LocalDate.of(2026, 7, 1))
                .batchCode("BATCH-NO-IMG")
                .status("IN_STOCK")
                .statusDisplayName("Còn trong kho")
                .importedById(USER_ID)
                .build();

        when(lotteryTicketServicePort.create(request, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.create(request, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().ticketImg()).isNull();
        assertThat(response.getData().serialNumber()).isEqualTo("C333333");

        verify(lotteryTicketServicePort).create(request, USER_ID);
    }

    // ============================================================
    // UPDATE LOTTERY TICKET TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-325] PUT /lottery-tickets/{id}: Admin cập nhật vé số thành công")
    void update_asAdmin_returnsUpdatedTicket() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                "https://cdn.example.com/tickets/updated.png",
                "888999",
                LocalDate.of(2026, 7, 5),
                com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus.RESERVED,
                null
        );

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .stationName("Vé số TP.HCM")
                .ticketImg("https://cdn.example.com/tickets/updated.png")
                .serialNumber("A888888")
                .numbers("888999")
                .drawDate(LocalDate.of(2026, 7, 5))
                .batchCode("BATCH-UPD")
                .status("RESERVED")
                .statusDisplayName("Đã đặt trước")
                .importedById(IMPORTED_BY_ID)
                .verified(true)
                .updatedAt(LocalDateTime.now())
                .lastModifiedBy("admin01")
                .build();

        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        when(lotteryTicketServicePort.update(TICKET_ID, request, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.update(TICKET_ID, request, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Cập nhật thông tin vé số thành công.");
        assertThat(response.getData()).isEqualTo(expectedResponse);
        assertThat(response.getData().serialNumber()).isEqualTo("A888888");
        assertThat(response.getData().status()).isEqualTo("RESERVED");

        verify(lotteryTicketServicePort).update(TICKET_ID, request, USER_ID);
    }

    @Test
    @DisplayName("[DP-325] PUT /lottery-tickets/{id}: Operator cập nhật vé số thành công")
    void update_asOperator_returnsUpdatedTicket() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                null,
                "654321",
                null,
                com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus.SOLD,
                null
        );

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .numbers("654321")
                .status("SOLD")
                .statusDisplayName("Đã bán")
                .lastModifiedBy("operator01")
                .build();

        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "operator01");
        when(lotteryTicketServicePort.update(TICKET_ID, request, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.update(TICKET_ID, request, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().numbers()).isEqualTo("654321");
        assertThat(response.getData().status()).isEqualTo("SOLD");

        verify(lotteryTicketServicePort).update(TICKET_ID, request, USER_ID);
    }

    @Test
    @DisplayName("[DP-325] PUT /lottery-tickets/{id}: Cập nhật chỉ một trường riêng lẻ thành công")
    void update_partialUpdate_returnsUpdatedTicket() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                "https://cdn.example.com/tickets/new-image.png",
                null,
                null,
                null,
                null
        );

        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .ticketImg("https://cdn.example.com/tickets/new-image.png")
                .serialNumber("A123456")
                .numbers("123456")
                .status("IN_STOCK")
                .build();

        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        when(lotteryTicketServicePort.update(TICKET_ID, request, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.update(TICKET_ID, request, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().ticketImg()).isEqualTo("https://cdn.example.com/tickets/new-image.png");
        assertThat(response.getData().serialNumber()).isEqualTo("A123456");

        verify(lotteryTicketServicePort).update(TICKET_ID, request, USER_ID);
    }

    // ============================================================
    // VERIFY LOTTERY TICKET TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/verify: Admin xác minh vé số thành công")
    void verify_asAdmin_returnsVerifiedTicket() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .serialNumber("A123456")
                .numbers("123456")
                .status("IN_STOCK")
                .verified(true)
                .verifiedById(USER_ID)
                .verifiedAt(LocalDateTime.of(2026, 6, 11, 10, 0))
                .build();

        when(lotteryTicketServicePort.verify(TICKET_ID, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.verify(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Xác minh vé số thành công.");
        assertThat(response.getData()).isEqualTo(expectedResponse);
        assertThat(response.getData().verified()).isTrue();
        assertThat(response.getData().verifiedById()).isEqualTo(USER_ID);
        assertThat(response.getData().verifiedAt()).isEqualTo(LocalDateTime.of(2026, 6, 11, 10, 0));

        verify(lotteryTicketServicePort).verify(TICKET_ID, USER_ID);
    }

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/verify: Operator xác minh vé số thành công")
    void verify_asOperator_returnsVerifiedTicket() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "operator01");
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .serialNumber("B555555")
                .verified(true)
                .verifiedById(USER_ID)
                .verifiedAt(LocalDateTime.now())
                .build();

        when(lotteryTicketServicePort.verify(TICKET_ID, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.verify(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().verified()).isTrue();
        assertThat(response.getData().verifiedById()).isEqualTo(USER_ID);

        verify(lotteryTicketServicePort).verify(TICKET_ID, USER_ID);
    }

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/verify: Xác minh vé số đã được xác minh trước đó vẫn thành công")
    void verify_alreadyVerified_returnsVerifiedTicket() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .verified(true)
                .verifiedById(VERIFIED_BY_ID)
                .verifiedAt(LocalDateTime.of(2026, 6, 10, 8, 30))
                .build();

        when(lotteryTicketServicePort.verify(TICKET_ID, USER_ID)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.verify(TICKET_ID, principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().verified()).isTrue();
        assertThat(response.getData().verifiedById()).isEqualTo(VERIFIED_BY_ID);

        verify(lotteryTicketServicePort).verify(TICKET_ID, USER_ID);
    }

    // ============================================================
    // CHANGE STATUS LOTTERY TICKET TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/status: Admin đổi trạng thái vé số sang RESERVED thành công")
    void changeStatus_asAdmin_toReserved_returnsUpdatedTicket() {
        LotteryTicketStatus newStatus = LotteryTicketStatus.RESERVED;
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .serialNumber("A123456")
                .status("RESERVED")
                .statusDisplayName("Đã đặt trước")
                .build();

        when(lotteryTicketServicePort.changeStatus(TICKET_ID, newStatus)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.changeStatus(TICKET_ID, newStatus);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Cập nhật trạng thái vé số thành công.");
        assertThat(response.getData()).isEqualTo(expectedResponse);
        assertThat(response.getData().status()).isEqualTo("RESERVED");
        assertThat(response.getData().statusDisplayName()).isEqualTo("Đã đặt trước");

        verify(lotteryTicketServicePort).changeStatus(TICKET_ID, newStatus);
    }

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/status: Operator đổi trạng thái vé số sang SOLD thành công")
    void changeStatus_asOperator_toSold_returnsUpdatedTicket() {
        LotteryTicketStatus newStatus = LotteryTicketStatus.SOLD;
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .serialNumber("A123456")
                .status("SOLD")
                .statusDisplayName("Đã bán")
                .build();

        when(lotteryTicketServicePort.changeStatus(TICKET_ID, newStatus)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.changeStatus(TICKET_ID, newStatus);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().status()).isEqualTo("SOLD");

        verify(lotteryTicketServicePort).changeStatus(TICKET_ID, newStatus);
    }

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/status: Đổi trạng thái vé số sang RETURNED thành công")
    void changeStatus_toReturned_returnsUpdatedTicket() {
        LotteryTicketStatus newStatus = LotteryTicketStatus.RETURNED;
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .status("RETURNED")
                .statusDisplayName("Đã trả lại")
                .build();

        when(lotteryTicketServicePort.changeStatus(TICKET_ID, newStatus)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.changeStatus(TICKET_ID, newStatus);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().status()).isEqualTo("RETURNED");
        assertThat(response.getData().statusDisplayName()).isEqualTo("Đã trả lại");

        verify(lotteryTicketServicePort).changeStatus(TICKET_ID, newStatus);
    }

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/status: Đổi trạng thái vé số sang CANCELLED thành công")
    void changeStatus_toCancelled_returnsUpdatedTicket() {
        LotteryTicketStatus newStatus = LotteryTicketStatus.ISSUER_FAULT;
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .status("CANCELLED")
                .statusDisplayName("Đã hủy")
                .build();

        when(lotteryTicketServicePort.changeStatus(TICKET_ID, newStatus)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.changeStatus(TICKET_ID, newStatus);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().status()).isEqualTo("CANCELLED");

        verify(lotteryTicketServicePort).changeStatus(TICKET_ID, newStatus);
    }

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/status: Đổi trạng thái vé số sang IN_STOCK thành công")
    void changeStatus_toInStock_returnsUpdatedTicket() {
        LotteryTicketStatus newStatus = LotteryTicketStatus.IN_STOCK;
        LotteryTicketResponse expectedResponse = LotteryTicketResponse.builder()
                .id(TICKET_ID)
                .stationId(PRODUCT_ID)
                .status("IN_STOCK")
                .statusDisplayName("Còn trong kho")
                .build();

        when(lotteryTicketServicePort.changeStatus(TICKET_ID, newStatus)).thenReturn(expectedResponse);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.changeStatus(TICKET_ID, newStatus);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().status()).isEqualTo("IN_STOCK");

        verify(lotteryTicketServicePort).changeStatus(TICKET_ID, newStatus);
    }

    // ============================================================
    // GET BY ID ERROR CASES TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/{id}: Lấy chi tiết vé không tồn tại trả về 404")
    void getById_notFound_throwsException() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        setAuthentication(principal, RoleConstants.ADMIN, "ticket:view");

        when(lotteryTicketServicePort.getById(TICKET_ID))
                .thenThrow(new RuntimeException("Vé số không tồn tại"));

        org.junit.jupiter.api.Assertions.assertThrows(
                RuntimeException.class,
                () -> lotteryTicketController.getById(TICKET_ID, principal)
        );

        verify(lotteryTicketServicePort).getById(TICKET_ID);
    }

    // ============================================================
    // GET ALL ERROR CASES TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets: Lấy danh sách vé với không có kết quả trả về empty page")
    void getAll_noResults_returnsEmptyPage() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        PageResponse<LotteryTicketResponse> emptyResponse = PageResponse.<LotteryTicketResponse>builder()
                .recordList(List.of())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(0)
                        .totalPages(0)
                        .currentPage(1)
                        .limit(10)
                        .isFirst(true)
                        .isLast(true)
                        .build())
                .build();
        setAuthentication(principal, RoleConstants.ADMIN, "ticket:view");

        when(lotteryTicketServicePort.getAll(1, 10, null, null, null, null, null, null, null, null, null, null))
                .thenReturn(emptyResponse);

        MappingJacksonValue response = lotteryTicketController.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                principal);

        assertThat(response).isNotNull();
        assertThat(response.getSerializationView()).isEqualTo(Views.Admin.class);

        @SuppressWarnings("unchecked")
        ApiResponse<PageResponse<LotteryTicketResponse>> body =
                (ApiResponse<PageResponse<LotteryTicketResponse>>) response.getValue();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getData().getRecordList()).isEmpty();
        assertThat(body.getData().getPagination().getTotalRecords()).isEqualTo(0);

        verify(lotteryTicketServicePort).getAll(1, 10, null, null, null, null, null, null, null, null, null, null);
    }

    // ============================================================
    // AUTHORIZATION TESTS - MEMBER SHOULD NOT HAVE WRITE ACCESS
    // ============================================================

    @Test
    @DisplayName("[DP-272] POST /lottery-tickets: Member-only không có quyền tạo vé")
    void create_asMemberOnly_shouldNotBeCalledDirectly() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        CreateLotteryTicketRequest request = CreateLotteryTicketRequest.builder()
                .stationId(PRODUCT_ID)
                .serials(java.util.List.of(new com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest("X111111", null)))
                .numbers("111222")
                .drawDate(LocalDate.of(2026, 7, 1))
                .importBatchLineId(1L)
                .build();

        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.create(request, principal);

        verify(lotteryTicketServicePort).create(request, USER_ID);
    }

    @Test
    @DisplayName("[DP-325] PUT /lottery-tickets/{id}: Member-only không có quyền cập nhật vé")
    void update_asMemberOnly_shouldNotBeCalledDirectly() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                "https://cdn.example.com/new.png",
                "999888",
                LocalDate.of(2026, 7, 5),
                com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus.RESERVED,
                null
        );

        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.update(TICKET_ID, request, principal);

        verify(lotteryTicketServicePort).update(TICKET_ID, request, USER_ID);
    }

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/verify: Member-only không có quyền xác minh vé")
    void verify_asMemberOnly_shouldNotBeCalledDirectly() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        setAuthentication(principal, RoleConstants.ROLE_MEMBER);

        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.verify(TICKET_ID, principal);

        verify(lotteryTicketServicePort).verify(TICKET_ID, USER_ID);
    }

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/status: Member-only không có quyền đổi trạng thái vé")
    void changeStatus_asMemberOnly_shouldNotBeCalledDirectly() {
        ApiResponse<LotteryTicketResponse> response = lotteryTicketController.changeStatus(TICKET_ID, LotteryTicketStatus.RESERVED);

        verify(lotteryTicketServicePort).changeStatus(TICKET_ID, LotteryTicketStatus.RESERVED);
    }

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Member-only gọi delete (authorization được xử lý ở tầng security)")
    void delete_byMemberOnly_callsServiceAnyway() {
        doNothing().when(lotteryTicketServicePort).delete(TICKET_ID);

        ApiResponse<Void> response = lotteryTicketController.delete(TICKET_ID);

        verify(lotteryTicketServicePort).delete(TICKET_ID);
    }

    // ============================================================
    // UPDATE ERROR CASES TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-325] PUT /lottery-tickets/{id}: Cập nhật vé không tồn tại trả về exception")
    void update_ticketNotFound_throwsException() {
        UpdateLotteryTicketRequest request = new UpdateLotteryTicketRequest(
                "https://cdn.example.com/updated.png",
                "888999",
                LocalDate.of(2026, 7, 5),
                com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus.RESERVED,
                null
        );

        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        when(lotteryTicketServicePort.update(TICKET_ID, request, USER_ID))
                .thenThrow(new RuntimeException("Vé số không tồn tại"));

        org.junit.jupiter.api.Assertions.assertThrows(
                RuntimeException.class,
                () -> lotteryTicketController.update(TICKET_ID, request, principal)
        );

        verify(lotteryTicketServicePort).update(TICKET_ID, request, USER_ID);
    }

    // ============================================================
    // VERIFY ERROR CASES TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/verify: Xác minh vé không tồn tại trả về exception")
    void verify_ticketNotFound_throwsException() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "admin01");
        setAuthentication(principal, RoleConstants.ADMIN, "ticket:view");

        when(lotteryTicketServicePort.verify(TICKET_ID, USER_ID))
                .thenThrow(new RuntimeException("Vé số không tồn tại"));

        org.junit.jupiter.api.Assertions.assertThrows(
                RuntimeException.class,
                () -> lotteryTicketController.verify(TICKET_ID, principal)
        );

        verify(lotteryTicketServicePort).verify(TICKET_ID, USER_ID);
    }

    // ============================================================
    // CHANGE STATUS ERROR CASES TESTS
    // ============================================================

    @Test
    @DisplayName("[DP-325] PATCH /lottery-tickets/{id}/status: Đổi trạng thái vé không tồn tại trả về exception")
    void changeStatus_ticketNotFound_throwsException() {
        when(lotteryTicketServicePort.changeStatus(TICKET_ID, LotteryTicketStatus.RESERVED))
                .thenThrow(new RuntimeException("Vé số không tồn tại"));

        org.junit.jupiter.api.Assertions.assertThrows(
                RuntimeException.class,
                () -> lotteryTicketController.changeStatus(TICKET_ID, LotteryTicketStatus.RESERVED)
        );

        verify(lotteryTicketServicePort).changeStatus(TICKET_ID, LotteryTicketStatus.RESERVED);
    }



    // ============================================================
    // DELETE LOTTERY TICKET - SUCCESS CASES
    // ============================================================

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Admin xóa vé số thành công và trả về message chuẩn")
    void delete_asAdmin_returnsSuccessWithCorrectMessage() {
        doNothing().when(lotteryTicketServicePort).delete(TICKET_ID);

        ApiResponse<Void> response = lotteryTicketController.delete(TICKET_ID);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Xóa vé số khỏi kho thành công.");
        assertThat(response.getData()).isNull();

        verify(lotteryTicketServicePort).delete(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Operator xóa vé số thành công")
    void delete_asOperator_returnsSuccess() {
        doNothing().when(lotteryTicketServicePort).delete(TICKET_ID);

        ApiResponse<Void> response = lotteryTicketController.delete(TICKET_ID);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Xóa vé số khỏi kho thành công.");

        verify(lotteryTicketServicePort).delete(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Street Agent xóa vé số thành công")
    void delete_asStreetAgent_returnsSuccess() {
        doNothing().when(lotteryTicketServicePort).delete(TICKET_ID);

        ApiResponse<Void> response = lotteryTicketController.delete(TICKET_ID);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();

        verify(lotteryTicketServicePort).delete(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Gọi đúng method với đúng ticket ID")
    void delete_callsServiceWithCorrectId() {
        Long specificTicketId = 999L;
        doNothing().when(lotteryTicketServicePort).delete(specificTicketId);

        lotteryTicketController.delete(specificTicketId);

        verify(lotteryTicketServicePort).delete(specificTicketId);
    }

    // ============================================================
    // DELETE LOTTERY TICKET - ERROR CASES
    // ============================================================

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Xóa vé không tồn tại ném DomainException NOT_FOUND")
    void delete_ticketNotFound_throwsDomainException() {
        org.mockito.Mockito.doThrow(new com.daiphat.coreapi.domain.exception.DomainException(
                com.daiphat.coreapi.domain.exception.ErrorCode.LOTTERY_TICKET_NOT_FOUND))
                .when(lotteryTicketServicePort).delete(TICKET_ID);

        org.junit.jupiter.api.Assertions.assertThrows(
                com.daiphat.coreapi.domain.exception.DomainException.class,
                () -> lotteryTicketController.delete(TICKET_ID)
        );

        verify(lotteryTicketServicePort).delete(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Xóa vé đã bị xóa trước đó ném DomainException")
    void delete_alreadyDeleted_throwsDomainException() {
        org.mockito.Mockito.doThrow(new com.daiphat.coreapi.domain.exception.DomainException(
                com.daiphat.coreapi.domain.exception.ErrorCode.LOTTERY_TICKET_NOT_FOUND,
                "Vé số đã bị xóa trước đó."))
                .when(lotteryTicketServicePort).delete(TICKET_ID);

        org.junit.jupiter.api.Assertions.assertThrows(
                com.daiphat.coreapi.domain.exception.DomainException.class,
                () -> lotteryTicketController.delete(TICKET_ID)
        );

        verify(lotteryTicketServicePort).delete(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Xóa vé không tồn tại ném RuntimeException generic")
    void delete_ticketNotFound_throwsRuntimeException() {
        org.mockito.Mockito.doThrow(new RuntimeException("Vé số không tồn tại"))
                .when(lotteryTicketServicePort).delete(TICKET_ID);

        org.junit.jupiter.api.Assertions.assertThrows(
                RuntimeException.class,
                () -> lotteryTicketController.delete(TICKET_ID)
        );

        verify(lotteryTicketServicePort).delete(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Xóa vé khi service throw DataAccessException")
    void delete_repositoryThrowsDataAccessException_propagatesException() {
        org.mockito.Mockito.doThrow(new org.springframework.dao.DataAccessResourceFailureException("Database connection failed"))
                .when(lotteryTicketServicePort).delete(TICKET_ID);

        org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.dao.DataAccessResourceFailureException.class,
                () -> lotteryTicketController.delete(TICKET_ID)
        );

        verify(lotteryTicketServicePort).delete(TICKET_ID);
    }

    // ============================================================
    // DELETE LOTTERY TICKET - AUTHORIZATION CASES
    // ============================================================

    @Test
    @DisplayName("[DP-292] DELETE /lottery-tickets/{id}: Anonymous user vẫn có thể gọi delete (authorization ở tầng security)")
    void delete_byAnonymous_callsService() {
        doNothing().when(lotteryTicketServicePort).delete(TICKET_ID);

        ApiResponse<Void> response = lotteryTicketController.delete(TICKET_ID);

        verify(lotteryTicketServicePort).delete(TICKET_ID);
        assertThat(response).isNotNull();
    }

    @Test
    @DisplayName("[DP-281][DP-234] GET /lottery-tickets/public: Khách xem vé IN_STOCK không cần đăng nhập")
    void getPublicTickets_returnsPublicViewWithoutAuth() throws Exception {
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        when(lotteryTicketServicePort.getPublicTickets(1, 10, PRODUCT_ID, null, "2026-06-15", "123456",
                com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.CONTAINS,
                null, null, null, "createdAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getPublicTickets(
                1, 10, PRODUCT_ID, null, "2026-06-15", "123456", "CONTAINS",
                null, null, null, "createdAt", "desc");

        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);

        String json = OBJECT_MAPPER
                .writerWithView(response.getSerializationView())
                .writeValueAsString(response.getValue());

        @SuppressWarnings("unchecked")
        Map<String, Object> responseMap = OBJECT_MAPPER.readValue(json, Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) responseMap.get("data");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recordList = (List<Map<String, Object>>) data.get("recordList");
        Map<String, Object> firstRecord = recordList.getFirst();

        assertThat(firstRecord).containsKeys("id", "stationId", "numbers", "drawDate", "status", "statusDisplayName");
        assertThat(firstRecord).doesNotContainKeys("batchCode", "importedById", "verified");

        verify(lotteryTicketServicePort).getPublicTickets(1, 10, PRODUCT_ID, null, "2026-06-15", "123456",
                com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.CONTAINS,
                null, null, null, "createdAt", "desc");
    }

    @Test
    @DisplayName("[DP-37][DP-255] GET /lottery-tickets/public: searchMode SUFFIX được parse và truyền xuống service")
    void getPublicTickets_passesSuffixSearchMode() {
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        when(lotteryTicketServicePort.getPublicTickets(1, 10, PRODUCT_ID, null, "2026-07-24", "68",
                com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.SUFFIX,
                null, null, null, "createdAt", "desc"))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getPublicTickets(
                1, 10, PRODUCT_ID, null, "2026-07-24", "68", "SUFFIX",
                null, null, null, "createdAt", "desc");

        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);
        verify(lotteryTicketServicePort).getPublicTickets(1, 10, PRODUCT_ID, null, "2026-07-24", "68",
                com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.SUFFIX,
                null, null, null, "createdAt", "desc");
    }

    @Test
    @DisplayName("[DP-37][DP-255] GET /lottery-tickets/home: tomorrow → ngày mai VN; searchMode đuôi số")
    void getHomeTickets_tomorrowAndSuffix() {
        String tomorrow = com.daiphat.coreapi.shared.util.DrawScheduleUtils.today().plusDays(1).toString();
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(20), eq(PRODUCT_ID), eq(null), eq(tomorrow), eq("68"),
                eq(com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.SUFFIX),
                eq(null), eq(null), eq(null),
                eq("createdAt"), eq("desc")))
                .thenReturn(serviceResponse);

        MappingJacksonValue response = lotteryTicketController.getHomeTickets(
                1, 20, PRODUCT_ID, null, "tomorrow", "68", "suffix",
                null, null, null, "createdAt", "desc");

        assertThat(response.getSerializationView()).isEqualTo(Views.Public.class);
        verify(lotteryTicketServicePort).getPublicTickets(
                1, 20, PRODUCT_ID, null, tomorrow, "68",
                com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.SUFFIX,
                null, null, null,
                "createdAt", "desc");
    }

    @Test
    @DisplayName("[DP-37][DP-255] GET /lottery-tickets/home: today/blank → ngày bán mặc định (sau cutoff = ngày mai)")
    void getHomeTickets_todayResolvesToDefaultSellableDate() {
        String defaultSellable = com.daiphat.coreapi.shared.util.DrawScheduleUtils
                .resolveDefaultSellableDrawDate()
                .toString();
        PageResponse<LotteryTicketResponse> serviceResponse = buildPageResponse(1, 10);
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(20), eq(null), eq(null), eq(defaultSellable), eq(null),
                eq(com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.CONTAINS),
                eq(null), eq(null), eq(null),
                eq("createdAt"), eq("desc")))
                .thenReturn(serviceResponse);

        lotteryTicketController.getHomeTickets(1, 20, null, null, "today", null, null,
                null, null, null, "createdAt", "desc");

        verify(lotteryTicketServicePort).getPublicTickets(
                1, 20, null, null, defaultSellable, null,
                com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.CONTAINS,
                null, null, null,
                "createdAt", "desc");
    }
}
