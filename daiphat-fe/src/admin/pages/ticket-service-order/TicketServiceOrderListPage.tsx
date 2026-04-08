import { useNavigate } from "react-router-dom";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Box, Button } from "@mui/material";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Title } from "../../components/ui/Title";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { prefixAdmin } from "../../constants/routes";
import { TicketServiceOrderList } from "./sections/TicketServiceOrderList";
import 'dayjs/locale/vi';

export const TicketServiceOrderListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
            <Box sx={{ maxWidth: '1200px', mx: 'auto', p: "calc(3 * var(--spacing))" }}>
                <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Title title={t("admin.ticketServiceOrder.title.list")} />
                        <Breadcrumb
                            items={[
                                { label: t("admin.dashboard.title"), to: `/${prefixAdmin}` },
                                { label: t("admin.ticketServiceOrder.title.list") }
                            ]}
                        />
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<Icon icon="eva:plus-fill" />}
                        onClick={() => navigate(`/${prefixAdmin}/ticketServiceOrder/create`)}
                        sx={{
                            bgcolor: 'var(--palette-text-primary)',
                            color: "var(--palette-common-white)",
                            minHeight: "2.5rem",
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            padding: "0 calc(2 * var(--spacing))",
                            borderRadius: 'var(--shape-borderRadius)',
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: "var(--palette-grey-700)",
                                boxShadow: "var(--customShadows-z8)"
                            }
                        }}
                    >
                        {t("admin.ticketServiceOrder.title.create")}
                    </Button>
                </Box>

                <TicketServiceOrderList />
            </Box>
        </LocalizationProvider>
    );
};




