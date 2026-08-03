"use client";

import { ReactNode } from "react";
import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "./Breadcrumb";
import { Title } from "./Title";
import { useNavigate } from "react-router-dom";

type BreadcrumbItem = {
    label: string;
    to?: string;
};

interface ListHeaderProps {
    title: string;
    breadcrumbItems: BreadcrumbItem[];
    addButtonLabel?: string;
    addButtonPath?: string;
    action?: ReactNode;
}

export const ListHeader = ({
    title,
    breadcrumbItems,
    addButtonLabel,
    addButtonPath,
    action
}: ListHeaderProps) => {
    const navigate = useNavigate();

    return (
        <div className="mb-[40px] gap-[16px] flex items-start justify-end flex-wrap">
            <div className="mr-auto">
                <Title title={title} />
                <Breadcrumb items={breadcrumbItems} />
            </div>

            <div className="flex gap-[16px] items-center">
                {action}
                {addButtonLabel && addButtonPath && (
                    <Button
                        onClick={() => navigate(addButtonPath)}
                        sx={{
                            background: '#1C252E',
                            minHeight: "2.25rem",
                            minWidth: "4rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            textTransform: "none",
                            boxShadow: "none",
                            "&:hover": {
                                background: "#454F5B",
                                boxShadow: "0 8px 16px 0 rgba(145 158 171 / 16%)"
                            }
                        }}
                        variant="contained"
                        startIcon={<AddIcon />}
                    >
                        {addButtonLabel}
                    </Button>
                )}
            </div>
        </div>
    );
};
