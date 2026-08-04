"use client";

import { useState } from "react";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
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
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Quản lý Vùng Miền" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Vùng Miền", to: `/${prefixAdmin}/region/list` },
                            { label: "Danh sách" },
                        ]}
                    />
                </div>
            </div>

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
