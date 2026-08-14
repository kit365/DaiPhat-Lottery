import { DatePicker } from '../common/DatePicker';

interface ChatScheduleDatePickProps {
  onSelect: (displayDate: string) => void;
  className?: string;
}

/** Lịch chọn ngày/tháng/năm trong bubble chat — chỉ cho phép hôm nay và quá khứ. */
export const ChatScheduleDatePick = ({ onSelect, className = '' }: ChatScheduleDatePickProps) => (
  <div className={`mt-3 rounded-xl border border-gray-100 bg-slate-50/80 p-2 ${className}`}>
    <p className="text-[13px] text-gray-500 px-1 mb-1">Chọn ngày (ngày / tháng / năm)</p>
    <DatePicker
      selectedDate=""
      onDateSelect={onSelect}
      className="shadow-none"
    />
  </div>
);
