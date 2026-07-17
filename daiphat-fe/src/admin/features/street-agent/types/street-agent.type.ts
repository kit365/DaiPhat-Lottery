export interface StreetAgentProfile {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    cccd: string;
    imageUrl?: string;
    contactAddress?: string;
    contactProvince?: string;
    coverageArea?: string;
    commissionRate?: number;
    contractStartDate?: string;
    contractEndDate?: string;
    depositBalance?: number;
    depositAdjustmentReason?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    lastModifiedBy?: string;
}

export interface StreetAgentQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}
