import { ReactNode } from "react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate } from "react-router-dom";

interface Props {
    permission?: string;
    children: ReactNode;
    fallback?: ReactNode;
}

export const PermissionGuard = ({ children }: Props) => {
    return <>{children}</>;
};

