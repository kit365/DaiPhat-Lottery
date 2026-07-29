import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRecords?: number;
  limit?: number;
  siblingCount?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  totalRecords,
  limit = 10,
  siblingCount = 1,
}) => {
  // Hide controls entirely when everything fits on one page.
  const effectiveTotalPages =
    totalRecords != null && totalRecords > 0
      ? Math.max(1, Math.ceil(totalRecords / Math.max(1, limit)))
      : totalPages;
  const pagesToShow = Math.min(totalPages, effectiveTotalPages);

  if (pagesToShow <= 1) return null;

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page) return;
    onPageChange(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate range of page numbers to display
  const getPageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 5; // siblingCount + first + last + active + 2*dots
    if (pagesToShow <= totalNumbers) {
      return Array.from({ length: pagesToShow }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, pagesToShow);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < pagesToShow - 1;

    const firstPageIndex = 1;
    const lastPageIndex = pagesToShow;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "...", lastPageIndex];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => pagesToShow - rightItemCount + i + 1
      );
      return [firstPageIndex, "...", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
    }

    return [];
  };

  const pages = getPageNumbers();

  // Calculate display text range: e.g., "Hiển thị 1 - 10 trong 45 kết quả"
  const itemStart = (page - 1) * limit + 1;
  const itemEnd = Math.min(page * limit, totalRecords || 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-4 py-3 bg-white/40 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] transition-all duration-300">
      
      {/* Show pagination range info if totalRecords is provided */}
      {totalRecords !== undefined && totalRecords > 0 ? (
        <div className="text-[13px] text-slate-500 font-medium font-client-main">
          Hiển thị <span className="text-slate-800 font-bold">{itemStart}</span> –{" "}
          <span className="text-slate-800 font-bold">{itemEnd}</span> trong{" "}
          <span className="text-slate-800 font-bold">{totalRecords}</span> kết quả
        </div>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-1.5 select-none">
        
        {/* First Page Button */}
        {page > 2 && pagesToShow > 5 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => handlePageChange(1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E5E8EB] text-slate-500 hover:text-[#ee1314] hover:border-[#ee1314]/30 hover:bg-[#FFF4F4]/30 transition-all duration-200 shadow-sm cursor-pointer"
            title="Trang đầu"
          >
            <ChevronsLeft size={16} strokeWidth={2.2} />
          </motion.button>
        )}

        {/* Previous Button */}
        <motion.button
          whileHover={{ scale: 1.05, x: -1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          disabled={page === 1}
          onClick={() => handlePageChange(page - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E5E8EB] text-slate-600 hover:text-[#ee1314] hover:border-[#ee1314]/30 hover:bg-[#FFF4F4]/30 transition-all duration-200 shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          title="Trang trước"
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
        </motion.button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((pNum, index) => {
            if (pNum === "...") {
              return (
                <span
                  key={`dots-${index}`}
                  className="w-9 h-9 flex items-center justify-center text-slate-400 font-bold text-[14px]"
                >
                  &middot;&middot;&middot;
                </span>
              );
            }

            const isCurrent = pNum === page;
            return (
              <motion.button
                key={`page-${pNum}`}
                type="button"
                whileHover={{ scale: isCurrent ? 1 : 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(pNum as number)}
                className={`relative w-9 h-9 flex items-center justify-center rounded-xl text-[14px] font-bold transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? "text-white shadow-md shadow-[#ee1314]/15 border-transparent"
                    : "text-slate-600 bg-white border border-[#E5E8EB] hover:text-[#ee1314] hover:border-[#ee1314]/30 hover:bg-[#FFF4F4]/20"
                }`}
              >
                {/* Active Indicator Background Slider using Framer Motion layoutId */}
                {isCurrent && (
                  <motion.div
                    layoutId="activePageBg"
                    className="absolute inset-0 bg-[#ee1314] rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{pNum}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Next Button */}
        <motion.button
          whileHover={{ scale: 1.05, x: 1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          disabled={page === pagesToShow}
          onClick={() => handlePageChange(page + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E5E8EB] text-slate-600 hover:text-[#ee1314] hover:border-[#ee1314]/30 hover:bg-[#FFF4F4]/30 transition-all duration-200 shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          title="Trang sau"
        >
          <ChevronRight size={16} strokeWidth={2.2} />
        </motion.button>

        {/* Last Page Button */}
        {page < pagesToShow - 1 && pagesToShow > 5 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => handlePageChange(pagesToShow)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E5E8EB] text-slate-500 hover:text-[#ee1314] hover:border-[#ee1314]/30 hover:bg-[#FFF4F4]/30 transition-all duration-200 shadow-sm cursor-pointer"
            title="Trang cuối"
          >
            <ChevronsRight size={16} strokeWidth={2.2} />
          </motion.button>
        )}
      </div>
    </div>
  );
};
