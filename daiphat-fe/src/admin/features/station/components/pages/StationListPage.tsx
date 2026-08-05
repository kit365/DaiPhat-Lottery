"use client";

import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import Button from '@mui/material/Button';
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import { prefixAdmin } from "../../../../constants/routes";
import { useNavigate } from "react-router-dom";
import { StationList } from "../sections/StationList";
import { SyncStationModal } from "../sections/SyncStationModal";
import { SyncStationPreviewModal, SyncPreviewParams } from "../sections/SyncStationPreviewModal";
import { useState } from 'react';
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";

export const StationListPage = () => {
    const navigate = useNavigate();
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [previewState, setPreviewState] = useState<{
        preview: any;
        params: SyncPreviewParams;
    } | null>(null);

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách Nhà đài" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
                <div className="flex gap-4">
                    <CanAccess permission={PERMISSIONS.PROVIDER.SYNC}>
                        <Button
                            onClick={() => setIsSyncModalOpen(true)}
                            className="btn-primary-admin"
                            variant="contained"
                            startIcon={<SyncIcon />}
                        >
                            Đồng bộ đài
                        </Button>
                    </CanAccess>
                    <CanAccess permission={PERMISSIONS.PROVIDER.CREATE}>
                        <Button
                            onClick={() => navigate(`/${prefixAdmin}/provider/create`)}
                            className="btn-primary-admin"
                            variant="contained"
                            startIcon={<AddIcon />}
                        >
                            Thêm nhà đài
                        </Button>
                    </CanAccess>
                </div>
            </div>

            <StationList />

            <SyncStationModal
                open={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                onPreviewSuccess={(preview, params) => {
                    setIsSyncModalOpen(false);
                    setPreviewState({ preview, params });
                }}
            />
            <SyncStationPreviewModal
                open={!!previewState}
                onClose={() => setPreviewState(null)}
                previewData={previewState?.preview}
                syncParams={previewState?.params ?? null}
            />
        </>
    );
};
