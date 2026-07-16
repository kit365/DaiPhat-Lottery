import { BaseQueryParams } from '../../../../types/api.type';

export interface Station {
    id: number;
    _id?: number | string;
    name: string;
    province?: string;
    region?: string;
    price?: number;
    drawDays?: string[] | string;
    drawTime?: string;
    drawSchedule?: string;
    thumbnailUrl?: string;
    avatar?: string;
    image?: string;
    description?: string;
    status?: string;
    type?: string;
    numberLength?: number;
    minNumber?: number;
    maxNumber?: number;
    displayOrder?: number;
    priority?: number;
    scanEnabled?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface StationQueryParams extends BaseQueryParams {
    search?: string;
    region?: string;
    drawDay?: string;
    status?: string;
}

export interface CreateStationRequest {
    name: string;
    province?: string;
    region?: string;
    price?: number;
    drawDays: string[];
    drawTime: string;
    image?: string;
    description?: string;
    status?: string;
    type?: string;
    numberLength?: number;
    minNumber?: number;
    maxNumber?: number;
    displayOrder?: number;
}

export type UpdateStationRequest = CreateStationRequest;

export interface SyncStationPreviewParams {
    source: string;
    region: string;
    defaultPrice: number;
}

export interface SyncStationConfirmItem {
    name: string;
    canonicalName: string;
    drawDays: string[];
    drawTime: string;
    commissionRate: number | null;
    action: string;
    existingStationId: number | null;
}

export interface SyncStationConfirmRequest extends SyncStationPreviewParams {
    items: SyncStationConfirmItem[];
}

export interface StationListFilters {
    status?: string[];
    region?: string[];
    drawDay?: string[];
    search?: string;
    sortBy?: string;
    direction?: string;
    page: number;
    limit: number;
}

export interface ISelectOption {
    value: string;
    label: string;
}
