import React, { useState } from 'react';
import { useAuth } from "../../../hooks/useAuth";
import { AppToast as toast } from "../../../utils/toast.util";

export const ProfileInfoTab = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    
    // local state for editing
    const [formData, setFormData] = useState({
        fullName: user?.fullName || user?.username || '',
        phone: user?.phone || '0901 234 567',
        email: user?.email || 'nguyenvana@gmail.com',
        dob: '1990-06-15',
        gender: 'Nam'
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
            <div className="bg-white border border-[#E5E8EB] rounded-xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] p-6 md:p-8">
                <div className="flex justify-between items-center mb-8 border-b border-[#E5E8EB] pb-4">
                    <div>
                        <h3 className="text-[17px] font-bold text-[#212B36]">Thông tin cá nhân</h3>
                        <p className="text-[14px] text-[#637381] mt-1">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
                    </div>
                    {!isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-[#BA0000] text-[#BA0000] rounded-lg text-[13px] font-bold hover:bg-[#FFF4F4] transition-colors cursor-pointer"
                        >
                            <i className="fa-solid fa-pen"></i> Chỉnh sửa
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 border border-[#E5E8EB] text-[#637381] rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleSave}
                                className="px-4 py-2 bg-[#BA0000] text-white rounded-lg text-[13px] font-bold hover:bg-[#990000] transition-colors cursor-pointer"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    {/* Full Name */}
                    <div className="flex items-center py-5 border-b border-[#E5E8EB] last:border-0">
                        <div className="w-10 h-10 rounded-full bg-[#FAFBFC] flex items-center justify-center text-[#919EAB] shrink-0 mr-4">
                            <i className="fa-regular fa-user text-[16px]"></i>
                        </div>
                        <div className="w-1/3 min-w-[120px] text-[14px] text-[#637381]">Họ và tên</div>
                        <div className="flex-1 text-right md:text-left text-[15px] font-medium text-[#212B36]">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={formData.fullName}
                                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#BA0000] transition-colors"
                                />
                            ) : (
                                formData.fullName
                            )}
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center py-5 border-b border-[#E5E8EB] last:border-0">
                        <div className="w-10 h-10 rounded-full bg-[#FAFBFC] flex items-center justify-center text-[#919EAB] shrink-0 mr-4">
                            <i className="fa-solid fa-phone text-[16px]"></i>
                        </div>
                        <div className="w-1/3 min-w-[120px] text-[14px] text-[#637381]">Số điện thoại</div>
                        <div className="flex-1 text-right md:text-left text-[15px] font-medium text-[#212B36]">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#BA0000] transition-colors"
                                />
                            ) : (
                                formData.phone
                            )}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center py-5 border-b border-[#E5E8EB] last:border-0">
                        <div className="w-10 h-10 rounded-full bg-[#FAFBFC] flex items-center justify-center text-[#919EAB] shrink-0 mr-4">
                            <i className="fa-regular fa-envelope text-[16px]"></i>
                        </div>
                        <div className="w-1/3 min-w-[120px] text-[14px] text-[#637381]">Email</div>
                        <div className="flex-1 text-right md:text-left text-[15px] font-medium text-[#212B36]">
                            {isEditing ? (
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#BA0000] transition-colors"
                                />
                            ) : (
                                formData.email
                            )}
                        </div>
                    </div>

                    {/* DOB */}
                    <div className="flex items-center py-5 border-b border-[#E5E8EB] last:border-0">
                        <div className="w-10 h-10 rounded-full bg-[#FAFBFC] flex items-center justify-center text-[#919EAB] shrink-0 mr-4">
                            <i className="fa-regular fa-calendar text-[16px]"></i>
                        </div>
                        <div className="w-1/3 min-w-[120px] text-[14px] text-[#637381]">Ngày sinh</div>
                        <div className="flex-1 text-right md:text-left text-[15px] font-medium text-[#212B36]">
                            {isEditing ? (
                                <input 
                                    type="date" 
                                    value={formData.dob}
                                    onChange={e => setFormData({...formData, dob: e.target.value})}
                                    className="w-full md:w-2/3 border border-[#E5E8EB] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[#BA0000] transition-colors"
                                />
                            ) : (
                                formData.dob.split('-').reverse().join('/')
                            )}
                        </div>
                    </div>

                    {/* Gender */}
                    <div className="flex items-center py-5 border-b border-[#E5E8EB] last:border-0">
                        <div className="w-10 h-10 rounded-full bg-[#FAFBFC] flex items-center justify-center text-[#919EAB] shrink-0 mr-4">
                            <i className="fa-solid fa-venus-mars text-[16px]"></i>
                        </div>
                        <div className="w-1/3 min-w-[120px] text-[14px] text-[#637381]">Giới tính</div>
                        <div className="flex-1 text-right md:text-left text-[15px] font-medium text-[#212B36]">
                            {isEditing ? (
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="gender" 
                                            value="Nam" 
                                            checked={formData.gender === 'Nam'}
                                            onChange={e => setFormData({...formData, gender: e.target.value})}
                                            className="accent-[#BA0000]"
                                        />
                                        <span className="text-[14px]">Nam</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="gender" 
                                            value="Nữ" 
                                            checked={formData.gender === 'Nữ'}
                                            onChange={e => setFormData({...formData, gender: e.target.value})}
                                            className="accent-[#BA0000]"
                                        />
                                        <span className="text-[14px]">Nữ</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="gender" 
                                            value="Khác" 
                                            checked={formData.gender === 'Khác'}
                                            onChange={e => setFormData({...formData, gender: e.target.value})}
                                            className="accent-[#BA0000]"
                                        />
                                        <span className="text-[14px]">Khác</span>
                                    </label>
                                </div>
                            ) : (
                                formData.gender
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Card */}
            <div className="bg-[#FFF4F4] border border-[#FFE5E5] rounded-xl shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full bg-white border border-[#FFE5E5] flex items-center justify-center text-[#BA0000] shrink-0">
                        <i className="fa-solid fa-shield-halved text-[20px]"></i>
                    </div>
                    <div>
                        <h3 className="text-[16px] font-bold text-[#212B36] mb-1">Bảo mật tài khoản</h3>
                        <p className="text-[14px] text-[#637381]">Để bảo vệ tài khoản, vui lòng không chia sẻ thông tin đăng nhập cho bất kỳ ai.</p>
                    </div>
                </div>
                
                <button className="flex items-center justify-center gap-2 text-[#BA0000] font-bold text-[14px] whitespace-nowrap hover:underline shrink-0 cursor-pointer">
                    Đổi mật khẩu <i className="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </div>
    );
};
