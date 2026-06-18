import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import Button from '@mui/material/Button';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { ProviderList } from "./sections/ProviderList";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useProviderList } from "./hooks/useProviderList";
import { toast } from 'react-toastify';
import { SyncProviderModal } from './sections/SyncProviderModal';
import { useState } from 'react';

export const ProviderListPage = () => {
    const navigate = useNavigate();
    const providerHook = useProviderList();
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

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
                <div style={{ display: 'flex', gap: '16px' }}>
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
                        Đồng bộ đài
                    </Button>
                    <LoadingButton
                        onClick={() => navigate(`/${prefixAdmin}/provider/create`)}
                        label="Thêm nhà đài"
                        startIcon={<AddIcon />}
                        sx={{
                            minHeight: "2.25rem",
                            padding: "var(--shape-borderRadius-sm) calc(2 * var(--spacing))",
                        }}
                    />
                </div>
            </div>
            <ProviderList providerHook={providerHook} />
            <SyncProviderModal 
                open={isSyncModalOpen} 
                onClose={() => setIsSyncModalOpen(false)} 
            />
        </>
    )
}
