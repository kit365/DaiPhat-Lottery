"use client";

import { useState } from "react";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { prefixAdmin } from "../../../../constants/routes";
import { useRegions } from "../../hooks/useRegion";
import { LotteryRegionResponse } from "../../types/region.type";
import { RegionList } from "../sections/RegionList";
import { RegionEditDialog } from "../sections/RegionEditDialog";

export const RegionListPage = () => {
    const { data: regionsRes, isLoading } = useRegions();
    const regions = regionsRes?.data || [];
    const [selectedRegion, setSelectedRegion] = useState<LotteryRegionResponse | null>(null);

    return (
        <>
            <PageHeader
                title="Quản lý Vùng Miền"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Vùng Miền", to: `/${prefixAdmin}/region/list` },
                            { label: "Danh sách" },
                        ]}
            />

            <RegionList
                regions={regions}
                isLoading={isLoading}
                onEdit={setSelectedRegion}
            />

            <RegionEditDialog
                region={selectedRegion}
                onClose={() => setSelectedRegion(null)}
            />
        </>
    );
};
