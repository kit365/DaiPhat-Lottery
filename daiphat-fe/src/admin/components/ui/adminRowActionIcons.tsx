import type { ReactNode } from "react";
import { DeleteIcon, EditIcon, EyeIcon } from "../../assets/icons";

export type AdminRowActionIconKey = "view" | "detail" | "edit" | "delete";

export const ADMIN_ROW_ACTION_ICONS: Record<AdminRowActionIconKey, ReactNode> = {
    view: <EyeIcon />,
    detail: <EyeIcon />,
    edit: <EditIcon />,
    delete: <DeleteIcon />,
};

export const resolveAdminRowActionIcon = (
    icon?: AdminRowActionIconKey | ReactNode
): ReactNode => {
    if (!icon) {
        return null;
    }

    if (typeof icon === "string") {
        return ADMIN_ROW_ACTION_ICONS[icon];
    }

    return icon;
};
