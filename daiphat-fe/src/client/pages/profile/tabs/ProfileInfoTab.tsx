import React, { useState } from 'react';
import { useAuth } from "../../../hooks/useAuth";
import { AppToast as toast } from "../../../utils/toast.util";

export const ProfileInfoTab = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    
    // local state for editing
    const [formData, setFormData] = useState({
        fullName: user?.fullName || user?.username || 'Doe John',
        phone: user?.phoneNumber || user?.phone || '',
        email: user?.email || 'john.doe@gmail.com',
        dob: '1990-05-15',
        gender: 'Nam',
        address: user?.address || ''
    });

    if (!user) return null;

    const handleSave = () => {
        if (!formData.fullName.trim()) {
            toast.error("Họ và tên không được để trống");
            return;
        }
        if (!formData.phone.trim()) {
            toast.error("Số điện thoại không được để trống");
            return;
        }
        
        // Mock API call delay
        setTimeout(() => {
            toast.success("Cập nhật thông tin thành công!");
            setIsEditing(false);
        }, 500);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Personal Info Card */}
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
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 border border-[#E5E8EB] text-[#637381] rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleSave}
                                className="px-4 py-2 bg-[#ee1314] text-white rounded-lg text-[13px] font-bold hover:bg-[#c80f11] transition-colors cursor-pointer"
                            >
                                Lưu
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col px-2">
                    {/* Full Name */}
                    <div className="flex flex-col md:flex-row md:items-center py-5 border-b border-[#F4F6F8] gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-regular fa-user w-6 text-left text-[16px]"></i>
                            <span>Họ và tên</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36]">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={formData.fullName}
                                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#ee1314] transition-colors font-normal"
                                />
                            ) : (
                                formData.fullName
                            )}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col md:flex-row md:items-center py-5 border-b border-[#F4F6F8] gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-regular fa-envelope w-6 text-left text-[16px]"></i>
                            <span>Email</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36] flex items-center flex-wrap gap-3">
                            {isEditing ? (
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#ee1314] transition-colors font-normal"
                                />
                            ) : (
                                <>
                                    {formData.email}
                                    <span className="bg-[#E4F8ED] text-[#1CD162] px-2.5 py-0.5 rounded-md text-[11px] font-bold">Đã xác thực</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Phone */}
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
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
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

                    {/* DOB */}
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
                                    onChange={e => setFormData({...formData, dob: e.target.value})}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#ee1314] transition-colors font-normal"
                                />
                            ) : (
                                formData.dob.split('-').reverse().join('/')
                            )}
                        </div>
                    </div>

                    {/* Gender */}
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
                                            value="Nam" 
                                            checked={formData.gender === 'Nam'}
                                            onChange={e => setFormData({...formData, gender: e.target.value})}
                                            className="accent-[#ee1314] w-4 h-4"
                                        />
                                        <span className="text-[14px] font-normal">Nam</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="gender" 
                                            value="Nữ" 
                                            checked={formData.gender === 'Nữ'}
                                            onChange={e => setFormData({...formData, gender: e.target.value})}
                                            className="accent-[#ee1314] w-4 h-4"
                                        />
                                        <span className="text-[14px] font-normal">Nữ</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="gender" 
                                            value="Khác" 
                                            checked={formData.gender === 'Khác'}
                                            onChange={e => setFormData({...formData, gender: e.target.value})}
                                            className="accent-[#ee1314] w-4 h-4"
                                        />
                                        <span className="text-[14px] font-normal">Khác</span>
                                    </label>
                                </div>
                            ) : (
                                formData.gender
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="flex flex-col md:flex-row md:items-center py-5 gap-2 md:gap-0">
                        <div className="md:w-[250px] flex items-center text-[14px] text-[#637381] shrink-0">
                            <i className="fa-solid fa-location-dot w-6 text-left text-[16px]"></i>
                            <span>Địa chỉ</span>
                        </div>
                        <div className="flex-1 text-[15px] font-semibold text-[#212B36]">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#ee1314] transition-colors font-normal"
                                />
                            ) : (
                                formData.address || "Chưa cập nhật"
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
