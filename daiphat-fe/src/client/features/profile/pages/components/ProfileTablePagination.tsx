import { buildPageItems, normalizePagination } from '../../../../utils/pagination.util';
import type { PaginationMetadata } from '../../../../../types/api.type';

type ProfileTablePaginationProps = {
    page: number;
    pageSize?: number;
    pagination?: PaginationMetadata | null;
    onPageChange: (page: number) => void;
};

export const ProfileTablePagination = ({
    page,
    pageSize = 10,
    pagination: rawPagination,
    onPageChange,
}: ProfileTablePaginationProps) => {
    const pagination = normalizePagination(rawPagination, page, pageSize);
    if (pagination.totalPages <= 1) {
        return null;
    }

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, pagination.totalRecords);
    const pageItems = buildPageItems(page, pagination.totalPages);
    const isFirst = page <= 1;
    const isLast = page >= pagination.totalPages;

    return (
        <div className="flex items-center justify-between p-5 border-t border-[#E5E8EB]">
            <div className="text-[14px] text-[#637381]">
                Hiển thị {from} đến {to} trong tổng số {pagination.totalRecords}
            </div>
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={isFirst}
                    className={`w-8 h-8 rounded border border-[#E5E8EB] flex items-center justify-center transition-colors ${
                        isFirst
                            ? 'text-[#C4CDD5] cursor-not-allowed bg-[#F9FAFB]'
                            : 'text-[#919EAB] hover:bg-[#F4F6F8] cursor-pointer'
                    }`}
                >
                    <i className="fa-solid fa-chevron-left text-[12px]"></i>
                </button>

                {pageItems.map((item, index) =>
                    item === -1 ? (
                        <span
                            key={`ellipsis-${index}`}
                            className="w-8 h-8 flex items-center justify-center text-[13px] text-[#919EAB]"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onPageChange(item)}
                            className={`w-8 h-8 rounded flex items-center justify-center font-medium text-[13px] transition-colors cursor-pointer ${
                                item === page
                                    ? 'bg-[#ee1314] text-white'
                                    : 'border border-[#E5E8EB] text-[#637381] hover:bg-[#F4F6F8]'
                            }`}
                        >
                            {item}
                        </button>
                    )
                )}

                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
                    disabled={isLast}
                    className={`w-8 h-8 rounded border border-[#E5E8EB] flex items-center justify-center transition-colors ${
                        isLast
                            ? 'text-[#C4CDD5] cursor-not-allowed bg-[#F9FAFB]'
                            : 'text-[#919EAB] hover:bg-[#F4F6F8] cursor-pointer'
                    }`}
                >
                    <i className="fa-solid fa-chevron-right text-[12px]"></i>
                </button>
            </div>
        </div>
    );
};
