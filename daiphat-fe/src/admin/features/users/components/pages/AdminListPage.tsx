import { RoleEnum } from "../../../../../types/role.type";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { UserListPageBase } from "./UserListPageBase";

export const AdminListPage = () => (
    <UserListPageBase
        title="Danh sách Nhân viên"
        defaultRoleIds={[RoleEnum.ADMIN, RoleEnum.MEMBER, RoleEnum.STAFF_OPERATOR]}
        createPermission={PERMISSIONS.ACCOUNT.CREATE}
        createPath="account-admin/create"
        createLabel="Thêm nhân viên"
        isClient={false}
    />
);
