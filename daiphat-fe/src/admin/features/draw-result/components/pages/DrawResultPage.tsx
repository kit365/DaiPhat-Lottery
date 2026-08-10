"use client";

import React, { useState } from 'react';
import { Button } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import dayjs from 'dayjs';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { prefixAdmin } from '../../../../constants/routes';
import { DrawResultList } from '../sections/DrawResultList';
import { DrawResultSyncModal } from '../sections/DrawResultSyncModal';
import { DrawResultDetailModal } from '../sections/DrawResultDetailModal';
import { useLotteryResultsManagementBoard, useSyncLotteryResults } from '../../hooks/useDrawResult';
import { DrawResultDateMode } from '../../types/draw-result';
import { CanAccess } from '../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { AppToast } from '../../../../../utils/toast.util';

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
    const { mutateAsync: syncResults, isPending: isSyncing } = useSyncLotteryResults();

    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
    const filteredRows = rows.filter((row) =>
        !search || row.stationName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <PageHeader
                title="Kết quả Xổ số"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Kết quả xổ số", to: `/${prefixAdmin}/draw-results` },
                            { label: "Danh sách" }
                        ]}
                action={
                    <div>
                    <CanAccess permission={PERMISSIONS.LOTTERY_RESULT.SYNC}>
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
                loading={isSyncing}
                onApply={async (filter) => {
                    try {
                        const response = await syncResults({
                            region: filter.region,
                            fromDate: filter.dateMode === 'range' ? filter.fromDate : filter.drawDate,
                            toDate: filter.dateMode === 'range' ? filter.toDate : filter.drawDate,
                            source: filter.source,
                        });
                        setRegion(filter.region);
                        setDateMode(filter.dateMode);
                        setDrawDate(filter.drawDate);
                        setFromDate(filter.fromDate);
                        setToDate(filter.toDate);
                        setSource(filter.source);
                        setIsSyncModalOpen(false);
                        AppToast.success(`Đã đưa ${response.data?.queuedCount ?? 0} kết quả vào hàng chờ đồng bộ.`);
                    } catch (syncError: any) {
                        AppToast.error(syncError.response?.data?.message || 'Không thể đồng bộ kết quả xổ số.');
                    }
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
