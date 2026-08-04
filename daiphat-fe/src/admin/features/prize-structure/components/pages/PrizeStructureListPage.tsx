"use client";

import { useState } from "react";
import SyncIcon from '@mui/icons-material/Sync';
import { Button } from "@mui/material";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
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
            </div>

            <PrizeStructureList hook={hook} />

            <SyncPrizeStructureModal
                open={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
            />
        </>
    );
};
