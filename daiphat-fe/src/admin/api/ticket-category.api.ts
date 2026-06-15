import { CategoryNode } from '../components/ui/CategoryTreeSelect';
import { ApiResponse } from '../config/type';
import { mockCategories } from '../data/categories';

const STORAGE_KEY = 'daiphat_ticket_categories';

export interface TicketCategoryRecord {
    _id: string;
    name: string;
    slug: string;
    status: string;
    parent: string;
    description?: string;
    avatar?: string;
    deletedAt?: string | null;
}

const cloneDefaults = (): TicketCategoryRecord[] =>
    mockCategories.map((item) => ({
        ...item,
        parent: item.parent || '',
        description: '',
        avatar: '',
        deletedAt: null,
    }));

const loadAll = (): TicketCategoryRecord[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as TicketCategoryRecord[];
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch {
        // ignore corrupted storage
    }
    const defaults = cloneDefaults();
    saveAll(defaults);
    return defaults;
};

const saveAll = (categories: TicketCategoryRecord[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
};

const generateSlug = (name: string): string =>
    name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

const nextId = (categories: TicketCategoryRecord[]): string => {
    const numbers = categories
        .map((item) => Number.parseInt(item._id.replace(/\D/g, ''), 10))
        .filter((value) => !Number.isNaN(value));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `C${String(max + 1).padStart(3, '0')}`;
};

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export const getTicketCategories = async (params?: any): Promise<ApiResponse<any>> => {
    await delay();
    const isTrash = Boolean(params?.is_trash);
    const keyword = String(params?.keyword || '').trim().toLowerCase();
    const statusFilter = params?.status ? String(params.status).split(',') : [];

    let recordList = loadAll().filter((item) =>
        isTrash ? Boolean(item.deletedAt) : !item.deletedAt
    );

    if (keyword) {
        recordList = recordList.filter((item) =>
            item.name.toLowerCase().includes(keyword) ||
            item.slug.toLowerCase().includes(keyword)
        );
    }

    if (statusFilter.length > 0) {
        recordList = recordList.filter((item) => statusFilter.includes(item.status));
    }

    const page = Number(params?.page || 1);
    const limit = Number(params?.limit || 10);
    const start = (page - 1) * limit;
    const paged = recordList.slice(start, start + limit);

    return {
        success: true,
        data: {
            recordList: paged,
            pagination: {
                totalRecords: recordList.length,
                totalPages: Math.max(1, Math.ceil(recordList.length / limit)),
                currentPage: page,
                limit,
                deletedCount: loadAll().filter((item) => item.deletedAt).length,
            },
        },
    } as any;
};

export const getNestedTicketCategories = async (): Promise<ApiResponse<CategoryNode[]>> => {
    await delay();
    const categories = loadAll().filter((item) => !item.deletedAt);
    return {
        success: true,
        data: categories.map((item) => ({
            id: item._id,
            label: item.name,
            value: item._id,
            children: [],
        })),
    } as any;
};

export const createTicketCategory = async (data: any): Promise<any> => {
    await delay();
    const categories = loadAll();
    const record: TicketCategoryRecord = {
        _id: nextId(categories),
        name: data.name,
        slug: data.slug || generateSlug(data.name),
        parent: data.parent || '',
        description: data.description || '',
        avatar: data.avatar || '',
        status: data.status || 'active',
        deletedAt: null,
    };
    categories.push(record);
    saveAll(categories);
    return {
        success: true,
        message: 'Tạo Miền/Tỉnh thành thành công.',
        data: record,
    };
};

export const getTicketCategoryById = async (id: string | number): Promise<any> => {
    await delay();
    const category = loadAll().find((item) => item._id === String(id));
    if (!category) {
        return {
            success: false,
            message: 'Không tìm thấy danh mục.',
            data: null,
        };
    }
    return {
        success: true,
        data: category,
    };
};

export const updateTicketCategory = async (id: string | number, data: any): Promise<any> => {
    await delay();
    const categories = loadAll();
    const index = categories.findIndex((item) => item._id === String(id));
    if (index < 0) {
        return {
            success: false,
            message: 'Không tìm thấy danh mục để cập nhật.',
        };
    }

    const current = categories[index];
    const updated: TicketCategoryRecord = {
        ...current,
        name: data.name ?? current.name,
        slug: data.slug || generateSlug(data.name ?? current.name),
        parent: data.parent ?? current.parent ?? '',
        description: data.description ?? current.description ?? '',
        avatar: data.avatar ?? current.avatar ?? '',
        status: data.status ?? current.status ?? 'active',
    };

    categories[index] = updated;
    saveAll(categories);

    return {
        success: true,
        message: 'Cập nhật Miền/Tỉnh thành thành công.',
        data: updated,
    };
};

export const deleteTicketCategory = async (id: string | number): Promise<any> => {
    await delay();
    const categories = loadAll();
    const index = categories.findIndex((item) => item._id === String(id));
    if (index < 0) {
        return { success: false, message: 'Không tìm thấy danh mục.' };
    }
    categories[index] = {
        ...categories[index],
        deletedAt: new Date().toISOString(),
    };
    saveAll(categories);
    return { success: true, message: 'Đã chuyển danh mục vào thùng rác.' };
};

export const restoreTicketCategory = async (id: string | number): Promise<any> => {
    await delay();
    const categories = loadAll();
    const index = categories.findIndex((item) => item._id === String(id));
    if (index < 0) {
        return { success: false, message: 'Không tìm thấy danh mục.' };
    }
    categories[index] = {
        ...categories[index],
        deletedAt: null,
    };
    saveAll(categories);
    return { success: true, message: 'Khôi phục danh mục thành công.' };
};

export const forceDeleteTicketCategory = async (id: string | number): Promise<any> => {
    await delay();
    const categories = loadAll().filter((item) => item._id !== String(id));
    saveAll(categories);
    return { success: true, message: 'Xóa vĩnh viễn danh mục thành công.' };
};
