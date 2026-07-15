package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.permission.PermissionItem;
import com.daiphat.coreapi.application.dto.request.permission.PermissionRegistrationRequest;
import com.daiphat.coreapi.application.dto.response.auth.RoleResponse;
import com.daiphat.coreapi.application.mapper.RoleApplicationMapper;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.coreapi.application.port.in.auth.RoleServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.PermissionModel;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.enums.auth.PermissionConstants;
import com.daiphat.coreapi.domain.model.enums.auth.AppPermission;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Core RoleService - Test Suite")
class RoleServiceTest {

    @Mock
    private RoleRepositoryPort roleRepositoryPort;
    @Mock
    private RoleApplicationMapper roleApplicationMapper;
    @Mock
    private UserLookupServicePort userLookupServicePort;

    private RoleServicePort roleService;

    @BeforeEach
    void setUp() {
        roleService = new RoleService(roleRepositoryPort, roleApplicationMapper, userLookupServicePort);
    }

    @Test
    void getDefaultRole_success() {
        RoleModel role = RoleModel.builder().code(RoleConstants.ROLE_MEMBER).build();
        when(roleRepositoryPort.findByCode(RoleConstants.ROLE_MEMBER)).thenReturn(Optional.of(role));

        RoleModel result = roleService.getDefaultRole();

        assertThat(result).isSameAs(role);
    }

    @Test
    void getDefaultRole_notFound_throws() {
        when(roleRepositoryPort.findByCode(RoleConstants.ROLE_MEMBER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roleService.getDefaultRole())
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    @Test
    void getRoleByCode_success() {
        RoleModel role = RoleModel.builder().code("CUSTOM").build();
        when(roleRepositoryPort.findByCode("CUSTOM")).thenReturn(Optional.of(role));

        RoleModel result = roleService.getRoleByCode("CUSTOM");

        assertThat(result).isSameAs(role);
    }

    @Test
    void getRoleByCode_notFound_throws() {
        when(roleRepositoryPort.findByCode("CUSTOM")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roleService.getRoleByCode("CUSTOM"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ROLE_NOT_FOUND);
    }

    @Test
    void getAllRoles_filtersAndSorts() {
        RoleModel admin = RoleModel.builder().code(RoleConstants.ADMIN).name("Admin").build();
        RoleModel member = RoleModel.builder().code(RoleConstants.ROLE_MEMBER).name("Member").build();
        RoleModel bRole = RoleModel.builder().code("B").name("B").build();
        RoleModel aRole = RoleModel.builder().code("A").name("A").build();
        RoleModel nullName = RoleModel.builder().code("C").name(null).build();

        when(roleRepositoryPort.findAll()).thenReturn(List.of(admin, member, bRole, aRole, nullName));
        when(roleApplicationMapper.toResponse(aRole)).thenReturn(RoleResponse.builder().code("A").build());
        when(roleApplicationMapper.toResponse(bRole)).thenReturn(RoleResponse.builder().code("B").build());
        when(roleApplicationMapper.toResponse(nullName)).thenReturn(RoleResponse.builder().code("C").build());

        List<RoleResponse> result = roleService.getAllRoles();

        assertThat(result).hasSize(3);
        assertThat(result.get(0).code()).isEqualTo("A");
        assertThat(result.get(1).code()).isEqualTo("B");
        assertThat(result.get(2).code()).isEqualTo("C"); // null sorted last
    }

    @Test
    void updatePermissions_success() {
        UUID roleId = UUID.randomUUID();
        RoleModel role = RoleModel.builder().id(roleId).build();
        when(roleRepositoryPort.findAll()).thenReturn(List.of(role));
        when(roleRepositoryPort.save(role)).thenReturn(role);
        when(roleApplicationMapper.toResponse(role)).thenReturn(RoleResponse.builder().build());

        roleService.updatePermissions(roleId, Set.of("PERM_1"));

        assertThat(role.getPermissions()).hasSize(1);
        assertThat(role.getPermissions().iterator().next().getCode()).isEqualTo("PERM_1");
        verify(roleRepositoryPort).save(role);
    }

    @Test
    void updatePermissions_notFound_throws() {
        UUID roleId = UUID.randomUUID();
        when(roleRepositoryPort.findAll()).thenReturn(List.of());

        assertThatThrownBy(() -> roleService.updatePermissions(roleId, Set.of()))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ROLE_NOT_FOUND);
    }

    @Test
    void registerPermissions_nullRequest_doesNothing() {
        roleService.registerPermissions(null);
        roleService.registerPermissions(new PermissionRegistrationRequest(null));

        verifyNoInteractions(roleRepositoryPort);
    }

    @Test
    void registerPermissions_success() {
        List<PermissionItem> items = List.of(PermissionItem.builder().code("P1").build());
        roleService.registerPermissions(new PermissionRegistrationRequest(items));

        verify(roleRepositoryPort).upsertPermissions(items);
    }

    @Test
    void syncAdminPermissions_success() {
        roleService.syncAdminPermissions();
        verify(roleRepositoryPort).assignAllPermissionsToRole(RoleConstants.ADMIN);
    }

    @Test
    void syncOperatorStaffPermissions_roleNotFound_doesNothing() {
        when(roleRepositoryPort.findByCode(RoleConstants.ROLE_STAFF_OPERATOR)).thenReturn(Optional.empty());
        roleService.syncOperatorStaffPermissions();
        verify(roleRepositoryPort).findByCode(RoleConstants.ROLE_STAFF_OPERATOR);
    }

    @Test
    void syncOperatorStaffPermissions_replacesExistingPermissionsWithTheDefaultPolicy() {
        RoleModel role = RoleModel.builder().permissions(Set.of(PermissionModel.builder().code("P1").build())).build();
        when(roleRepositoryPort.findByCode(RoleConstants.ROLE_STAFF_OPERATOR)).thenReturn(Optional.of(role));
        roleService.syncOperatorStaffPermissions();

        verify(roleRepositoryPort).assignPermissionsToRole(
                RoleConstants.ROLE_STAFF_OPERATOR,
                Arrays.stream(AppPermission.values())
                        .filter(AppPermission::isDefaultOperatorPermission)
                        .map(AppPermission::getCode)
                        .collect(java.util.stream.Collectors.toUnmodifiableSet())
        );
    }

    @Test
    void syncOperatorStaffPermissions_emptyPermissions_syncs() {
        RoleModel role = RoleModel.builder().permissions(Set.of()).build();
        when(roleRepositoryPort.findByCode(RoleConstants.ROLE_STAFF_OPERATOR)).thenReturn(Optional.of(role));
        roleService.syncOperatorStaffPermissions();

        verify(roleRepositoryPort).assignPermissionsToRole(
                RoleConstants.ROLE_STAFF_OPERATOR,
                Arrays.stream(AppPermission.values())
                        .filter(AppPermission::isDefaultOperatorPermission)
                        .map(AppPermission::getCode)
                        .collect(java.util.stream.Collectors.toUnmodifiableSet())
        );
    }

    @Test
    void initializeTestAccounts_doesNothing() {
        roleService.initializeTestAccounts();
    }

    @Test
    void getAllPermissions_filtersAndSorts() {
        PermissionModel pRole = PermissionModel.builder().code(PermissionConstants.ROLE).position(1).build();
        PermissionModel p1 = PermissionModel.builder().code("P1").position(10).build();
        PermissionModel p2 = PermissionModel.builder().code("P2").position(20).build();
        PermissionModel pNull = PermissionModel.builder().code("P3").position(null).build();

        when(roleRepositoryPort.findAllPermissions()).thenReturn(List.of(pRole, p1, p2, pNull));

        List<PermissionItem> result = roleService.getAllPermissions();

        assertThat(result).hasSize(3);
        assertThat(result.get(0).getCode()).isEqualTo("P2");
        assertThat(result.get(1).getCode()).isEqualTo("P1");
        assertThat(result.get(2).getCode()).isEqualTo("P3");
    }

    @Test
    void reorderPermissions_delegates() {
        Map<String, Integer> map = Map.of("P1", 1);
        roleService.reorderPermissions(map);
        verify(roleRepositoryPort).updatePermissionPositions(map);
    }

    @Test
    void getUserPermissionCodes_noRole_returnsEmpty() {
        UUID userId = UUID.randomUUID();
        UserModel user = UserModel.builder().id(userId).role(null).build();
        when(userLookupServicePort.findActiveByIdOrThrow(userId)).thenReturn(user);

        Set<String> codes = roleService.getUserPermissionCodes(userId);
        assertThat(codes).isEmpty();
    }

    @Test
    void getUserPermissionCodes_noPermissions_returnsEmpty() {
        UUID userId = UUID.randomUUID();
        UserModel user = UserModel.builder().id(userId).role(RoleModel.builder().permissions(null).build()).build();
        when(userLookupServicePort.findActiveByIdOrThrow(userId)).thenReturn(user);

        Set<String> codes = roleService.getUserPermissionCodes(userId);
        assertThat(codes).isEmpty();
    }

    @Test
    void getUserPermissionCodes_success() {
        UUID userId = UUID.randomUUID();
        RoleModel role = RoleModel.builder().permissions(Set.of(PermissionModel.builder().code("P1").build(), PermissionModel.builder().code("P2").build())).build();
        UserModel user = UserModel.builder().id(userId).role(role).build();
        when(userLookupServicePort.findActiveByIdOrThrow(userId)).thenReturn(user);

        Set<String> codes = roleService.getUserPermissionCodes(userId);
        assertThat(codes).containsExactlyInAnyOrder("P1", "P2");
    }
}
