"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "../../../../hooks/useAuth";
import { AppToast as toast } from "../../../../../utils/toast.util";

const DEFAULT_DOB = '';
const DEFAULT_GENDER = '';

export const ProfileInfoTab = () => {
    const { user, handleUpdateProfile, updateProfileMutation } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        lastName: user?.lastName || '',
        firstName: user?.firstName || '',
        phone: user?.phone || '',
        dob: user?.dob || DEFAULT_DOB,
        gender: user?.gender || DEFAULT_GENDER
    });

    useEffect(() => {
        if (!user) {
            return;
        }

        setFormData({
            lastName: user.lastName || '',
            firstName: user.firstName || '',
            phone: user.phone || '',
            dob: user.dob || DEFAULT_DOB,
            gender: user.gender || DEFAULT_GENDER
        });
    }, [user]);

    if (!user) return null;



    const handleCancel = () => {
        setFormData({
            lastName: user.lastName || '',
            firstName: user.firstName || '',
            phone: user.phone || '',
            dob: user.dob || DEFAULT_DOB,
            gender: user.gender || DEFAULT_GENDER
        });
        setIsEditing(false);
    };

    const handleSave = () => {
        if (!formData.lastName.trim() && !formData.firstName.trim()) {
            toast.error("Họ và tên không được để trống");
            return;
        }
        if (!formData.phone.trim()) {
            toast.error("Số điện thoại không được để trống");
            return;
        }

        handleUpdateProfile(
            {
                id: user.id,
                data: {
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    phone: formData.phone.trim(),
                    gender: formData.gender,
                    dob: formData.dob || null
                }
            },
            {
                onSuccess: () => {
                    setIsEditing(false);
                }
            }
        );
    };

    const isSaving = updateProfileMutation.isPending;

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] p-6 md:p-8">
                <div className="flex justify-between items-start mb-8 border-b border-[#E5E8EB] pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-xl shrink-0">
                            <i className="fa-regular fa-user"></i>
                        </div>
                        <div>
                            <h3 className="text-[20px] font-bold text-[#212B36] mb-1">Thông tin cá nhân</h3>
                            <p className="text-[13px] text-[#637381]">Quản lý thông tin và bảo mật tài khoản của bạn</p>
                        </div>
                    </div>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-[#ee1314] text-[#ee1314] rounded-lg text-[13px] font-bold hover:bg-[#FFF4F4] transition-colors cursor-pointer shrink-0"
                        >
                            <i className="fa-solid fa-pen"></i> Chỉnh sửa
                        </button>
                    ) : (
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-4 py-2 border border-[#E5E8EB] text-[#637381] rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-[#ee1314] text-white rounded-lg text-[13px] font-bold hover:bg-[#c80f11] transition-colors cursor-pointer disabled:opacity-60"
                            >
                                {isSaving ? "Đang lưu..." : "Lưu"}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col px-2">
                    <div className="flex flex-col md:flex-row md:items-center py-5 border-b border-[#F4F6F8] gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-solid fa-id-card w-6 text-left text-[15px] opacity-80"></i>
                            <span>Tên đăng nhập</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36] flex items-center flex-wrap gap-3">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={user.username}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none bg-slate-50 text-slate-500 font-normal"
                                    disabled
                                />
                            ) : (
                                user.username || "Chưa cập nhật"
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center py-5 border-b border-[#F4F6F8] gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-regular fa-user w-6 text-left text-[16px]"></i>
                            <span>Họ và tên</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36]">
                            {isEditing ? (
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-2/3">
                                    <input
                                        type="text"
                                        placeholder="Họ (Last Name)"
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        className="flex-1 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#ee1314] transition-colors font-normal"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Tên (First Name)"
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        className="flex-1 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#ee1314] transition-colors font-normal"
                                    />
                                </div>
                            ) : (
                                user.fullName || `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.username || "Chưa cập nhật"
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center py-5 border-b border-[#F4F6F8] gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-regular fa-envelope w-6 text-left text-[16px]"></i>
                            <span>Email</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36] flex items-center flex-wrap gap-3">
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={user.email}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none bg-slate-50 text-slate-500 font-normal"
                                    disabled
                                />
                            ) : (
                                <>
                                    {user.email}
                                    <span className="bg-[#E4F8ED] text-[#1CD162] px-2.5 py-0.5 rounded-md text-[11px] font-bold">Đã xác thực</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center py-5 border-b border-[#F4F6F8] gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-solid fa-phone w-6 text-left text-[15px] opacity-80"></i>
                            <span>Số điện thoại</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36] flex items-center flex-wrap gap-3">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#ee1314] transition-colors font-normal"
                                />
                            ) : (
                                <>
                                    {formData.phone || "Chưa cập nhật"}
                                    {formData.phone && <span className="bg-[#E4F8ED] text-[#1CD162] px-2.5 py-0.5 rounded-md text-[11px] font-bold">Đã xác thực</span>}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center py-5 border-b border-[#F4F6F8] gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-regular fa-calendar w-6 text-left text-[16px]"></i>
                            <span>Ngày sinh</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36]">
                            {isEditing ? (
                                <input
                                    type="date"
                                    value={formData.dob}
                                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#ee1314] transition-colors font-normal"
                                />
                            ) : (
                                formData.dob ? formData.dob.split('-').reverse().join('/') : "Chưa cập nhật"
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center py-5 border-b border-[#F4F6F8] gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-solid fa-venus-mars w-6 text-left text-[16px]"></i>
                            <span>Giới tính</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36]">
                            {isEditing ? (
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="MALE"
                                            checked={formData.gender === 'MALE'}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            className="accent-[#ee1314] w-4 h-4"
                                        />
                                        <span className="text-[14px] font-normal">Nam</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="FEMALE"
                                            checked={formData.gender === 'FEMALE'}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            className="accent-[#ee1314] w-4 h-4"
                                        />
                                        <span className="text-[14px] font-normal">Nữ</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="OTHER"
                                            checked={formData.gender === 'OTHER'}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            className="accent-[#ee1314] w-4 h-4"
                                        />
                                        <span className="text-[14px] font-normal">Khác</span>
                                    </label>
                                </div>
                            ) : (
                                formData.gender === 'MALE' ? 'Nam' : formData.gender === 'FEMALE' ? 'Nữ' : formData.gender === 'OTHER' ? 'Khác' : "Chưa cập nhật"
                            )}
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};
