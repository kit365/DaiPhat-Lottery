import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { TicketServiceCategoryList } from "./sections/ServiceCategoryList";

export const TicketServiceCategoryListPage = () => {
    const navigate = useNavigate();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách danh mục dịch vụ" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Danh mục loại vé", to: `/${prefixAdmin}/ticketService/categories` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
                <Button
                    onClick={() => navigate(`/${prefixAdmin}/ticketService/categories/create`)}
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
                    Thêm danh mục
                </Button>
            </div>
            <TicketServiceCategoryList />
        </>
    )
}




