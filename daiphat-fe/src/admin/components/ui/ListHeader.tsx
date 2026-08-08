"use client";

import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { ReactNode } from "react";
import { useNavigate } from "@/components/router-compat";
import { PageHeader, type BreadcrumbItem } from "./PageHeader";

interface ListHeaderProps {
    title: string;
    breadcrumbItems: BreadcrumbItem[];
    addButtonLabel?: string;
    addButtonPath?: string;
    action?: ReactNode;
}

/** @deprecated Use PageHeader directly. */
export const ListHeader = ({
    title,
    breadcrumbItems,
    addButtonLabel,
    addButtonPath,
    action,
}: ListHeaderProps) => {
    const navigate = useNavigate();

    const resolvedAction = (
        <>
            {action}
            {addButtonLabel && addButtonPath ? (
                <Button
                    onClick={() => navigate(addButtonPath)}
                    className="btn-primary-admin"
                    variant="contained"
                    startIcon={<AddIcon />}
                >
                    {addButtonLabel}
                </Button>
            ) : null}
        </>
    );

    return (
        <PageHeader
            title={title}
            breadcrumbItems={breadcrumbItems}
            action={addButtonLabel || action ? resolvedAction : undefined}
        />
    );
};
