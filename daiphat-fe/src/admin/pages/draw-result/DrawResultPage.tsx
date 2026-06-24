import React, { useState } from 'react';
import { Button } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import dayjs from 'dayjs';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { prefixAdmin } from '../../constants/routes';
import { DrawResultList } from './sections/DrawResultList';
import { DrawResultSyncModal } from './sections/DrawResultSyncModal';
import { DrawResultDetailModal } from './sections/DrawResultDetailModal';
import { useLotteryResultsManagementBoard } from './hooks/useDrawResult';
import { DrawResultDateMode } from './types/draw-result';
import { CanAccess } from '../../components/auth/CanAccess';
import { PERMISSIONS } from '../../constants/permission.constants';

export const DrawResultPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [region, setRegion] = useState('MIEN_NAM');
    const [dateMode, setDateMode] = useState<DrawResultDateMode>('single');
    const [drawDate, setDrawDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [fromDate, setFromDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [source, setSource] = useState<'MINH_NGOC' | 'XOSO_VN'>('MINH_NGOC');

    const { rows, isLoading, isFetching, error } = useLotteryResultsManagementBoard({
        region,
        dateMode,
        drawDate: dateMode === 'single' ? drawDate : fromDate,
        fromDate: dateMode === 'range' ? fromDate : drawDate,
        toDate: dateMode === 'range' ? toDate : drawDate,
        source,
    });

    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
    const filteredRows = rows.filter((row) =>
        !search || row.stationName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Kết quả Xổ số" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Kết quả xổ số", to: `/${prefixAdmin}/draw-results` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <CanAccess permission={PERMISSIONS.LOTTERY_RESULT.SYNC}>
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
                    </CanAccess>
                </div>
            </div>

            <DrawResultList 
                data={filteredRows}
                isLoading={isLoading}
                isRefreshing={isFetching && !isLoading}
                error={error}
                onSearch={(val) => setSearch(val)}
                region={region}
                dateMode={dateMode}
                drawDate={drawDate}
                fromDate={fromDate}
                toDate={toDate}
                source={source}
                onRegionChange={setRegion}
                onDateModeChange={setDateMode}
                onDrawDateChange={setDrawDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onSourceChange={setSource}
                onViewDetails={(id) => setSelectedResultId(id)}
            />

            <DrawResultSyncModal 
                open={isSyncModalOpen}
                initialRegion={region}
                initialDateMode={dateMode}
                initialDrawDate={drawDate}
                initialFromDate={fromDate}
                initialToDate={toDate}
                initialSource={source}
                onApply={(filter) => {
                    setRegion(filter.region);
                    setDateMode(filter.dateMode);
                    setDrawDate(filter.drawDate);
                    setFromDate(filter.fromDate);
                    setToDate(filter.toDate);
                    setSource(filter.source);
                    setIsSyncModalOpen(false);
                }}
                onClose={() => setIsSyncModalOpen(false)}
            />

            <DrawResultDetailModal 
                resultId={selectedResultId}
                onClose={() => setSelectedResultId(null)}
            />
        </>
    );
};
