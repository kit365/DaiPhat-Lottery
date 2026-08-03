import { RoleEnum } from "../../../../../types/role.type";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { UserListPageBase } from "./UserListPageBase";

export const ClientListPage = () => (
    <UserListPageBase
        title="Danh sách Khách hàng"
        defaultRoleIds={[RoleEnum.MEMBER]}
        createPermission={PERMISSIONS.USER.CREATE}
        createPath="account-user/create"
        createLabel="Thêm khách hàng"
        isClient={true}
    />
);
