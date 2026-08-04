import React from 'react';

interface EmptyStatePlaceholderProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyStatePlaceholder: React.FC<EmptyStatePlaceholderProps> = ({
  title = 'Không tìm thấy dữ liệu',
  description = 'Chưa có dữ liệu phù hợp với yêu cầu của bạn.',
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] p-12 lg:p-16 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
        {icon || <span className="material-symbols-outlined text-[40px]">search_off</span>}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-[#111111] uppercase tracking-tight">{title}</h3>
        <p className="text-slate-400 font-medium text-sm max-w-[320px] mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-[#102937] text-white px-6 py-3 rounded-2xl font-bold text-[13px] hover:bg-[#ee1314] transition-all cursor-pointer active:scale-95 shadow-lg shadow-slate-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
