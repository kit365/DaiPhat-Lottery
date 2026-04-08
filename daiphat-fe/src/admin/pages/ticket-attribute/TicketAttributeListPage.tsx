import { useState } from "react";
import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { TicketAttributeList } from "./sections/TicketAttributeList";

export const TicketAttributeListPage = () => {
    const navigate = useNavigate();
    const [isTrash, setIsTrash] = useState(false);

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={isTrash ? "Thùng rác thông số" : "Thông số vé số"} />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Vé số", to: `/${prefixAdmin}/ticket/list` },
                            { label: isTrash ? "Thùng rác" : "Thông số vé số" }
                        ]}
                    />
                </div>
                <Button
                    onClick={() => setIsTrash(!isTrash)}
                    sx={{
                        background: isTrash ? 'var(--palette-text-secondary)' : 'var(--palette-error-main)',
                        minHeight: "2.25rem",
                        minWidth: "4rem",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        padding: "6px 12px",
                        borderRadius: "var(--shape-borderRadius)",
                        textTransform: "none",
                        boxShadow: "none",
                        color: "white",
                        "&:hover": {
                            background: isTrash ? "var(--palette-grey-600)" : "var(--palette-error-dark)",
                            boxShadow: "var(--customShadows-z8)"
                        }
                    }}
                    variant="contained"
                    startIcon={isTrash ? <ArrowBackIcon /> : <DeleteIcon />}
                >
                    {isTrash ? "Quay lại" : "Thùng rác"}
                </Button>
                {!isTrash && (
                    <Button
                        onClick={() => navigate(`/${prefixAdmin}/ticket/attribute/create`)}
                        sx={{
                            background: 'var(--palette-text-primary)',
                            minHeight: "2.25rem",
                            minWidth: "4rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            padding: "6px 12px",
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: "none",
                            boxShadow: "none",
                            "&:hover": {
                                background: "var(--palette-grey-700)",
                                boxShadow: "var(--customShadows-z8)"
                            }
                        }}
                        variant="contained"
                        startIcon={<AddIcon />}
                    >
                        Thêm thông số
                    </Button>
                )}
            </div>

            <TicketAttributeList isTrash={isTrash} />
        </>
    )
}
