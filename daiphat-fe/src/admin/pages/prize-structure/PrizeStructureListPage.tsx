import { useState } from "react";
import SyncIcon from '@mui/icons-material/Sync';
import { Box, Button, Select, MenuItem, FormControl, InputLabel, Card } from "@mui/material";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { PrizeStructureList } from "./sections/PrizeStructureList";
import { SyncPrizeStructureModal } from "./sections/SyncPrizeStructureModal";
import { usePrizeStructuresByRegion } from "./hooks/usePrizeStructure";
import { PermissionGuard } from "../../components/auth/PermissionGuard";
import { PERMISSIONS } from "../../constants/permission.constants";

export const PrizeStructureListPage = () => {
    const hook = usePrizeStructuresByRegion('MIEN_NAM');
    const { region, setRegion } = hook;
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Cơ cấu giải thưởng" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Cơ cấu giải thưởng", to: `/${prefixAdmin}/prize-structures/list` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <PermissionGuard permission={PERMISSIONS.PRIZE_STRUCTURE.SYNC}>
                        <Button
                            onClick={() => setIsSyncModalOpen(true)}
                            variant="contained"
                            startIcon={<SyncIcon />}
                            sx={{
                                minHeight: "2.25rem",
                                padding: "6px 16px",
                                textTransform: "none",
                                fontWeight: 600,
                                background: "var(--palette-grey-800)",
                                "&:hover": {
                                    background: "var(--palette-grey-700)"
                                }
                            }}
                        >
                            Đồng bộ dữ liệu
                        </Button>
                    </PermissionGuard>
                </div>
            </div>

            <PrizeStructureList hook={hook} />

            <SyncPrizeStructureModal 
                open={isSyncModalOpen} 
                onClose={() => setIsSyncModalOpen(false)} 
            />
        </>
    );
};
