import React from 'react';
import { Download, Clock } from 'lucide-react';
import { User } from '../../../../../types/user.type';

interface ProfileHeaderProps {
  user: User;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#102937]">Tổng quan tài khoản</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">
          Chào mừng trở lại, {user.fullName || user.username}! Dưới đây là tóm tắt hoạt động của bạn.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-[13px] font-bold text-slate-500">
          <Clock size={16} />
          <span>Cập nhật lần cuối: 12:45 PM</span>
        </div>
        <button className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-[13px] font-bold text-[#102937] hover:bg-slate-50 transition-all cursor-pointer">
          <Download size={16} />
          <span>Tải báo cáo</span>
        </button>
      </div>
    </header>
  );
};
