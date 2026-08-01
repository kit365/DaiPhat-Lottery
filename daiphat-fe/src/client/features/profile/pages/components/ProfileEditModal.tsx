"use client";

import React from 'react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#102937]/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full scale-in-center animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-black text-[#102937] mb-4">Chỉnh sửa hồ sơ</h2>
        <p className="text-slate-500 font-medium mb-8">
          Tính năng cập nhật thông tin cá nhân qua Modal đang được xây dựng.
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 bg-[#FF6262] text-white font-black rounded-2xl shadow-xl shadow-[#FF6262]/20 hover:-translate-y-1 transition-all cursor-pointer"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
};
