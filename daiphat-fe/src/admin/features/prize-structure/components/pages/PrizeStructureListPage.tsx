"use client";

import { useState } from "react";
import SyncIcon from '@mui/icons-material/Sync';
import { Button } from "@mui/material";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { prefixAdmin } from "../../../../constants/routes";
import { PrizeStructureList } from "../sections/PrizeStructureList";
import { SyncPrizeStructureModal } from "../sections/SyncPrizeStructureModal";
import { usePrizeStructuresByRegion } from "../../hooks/usePrizeStructure";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";

export const PrizeStructureListPage = () => {
    const hook = usePrizeStructuresByRegion('MIEN_NAM');
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    return (
        <>
            <PageHeader
                title="Cơ cấu giải thưởng"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Cơ cấu giải thưởng", to: `/${prefixAdmin}/prize-structures/list` },
                            { label: "Danh sách" }
                        ]}
                action={
                    <div>
                    <CanAccess permission={PERMISSIONS.PRIZE_STRUCTURE.SYNC}>
                        <Button
                            onClick={() => setIsSyncModalOpen(true)}
                            variant="contained"
                            startIcon={<SyncIcon />}
                            className="btn-primary-admin"
                        >
                            Đồng bộ dữ liệu
                        </Button>
                    </CanAccess>
                </div>
                }
            />

            <PrizeStructureList hook={hook} />

            <SyncPrizeStructureModal
                open={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
            />
        </>
    );
};
