import { MapPin, Phone, User } from "iconoir-react";
import { ProductBanner } from "../product/sections/ProductBanner";
import { Link } from "react-router-dom";
import { Sidebar } from "./sections/Sidebar";
import { useEffect, useState } from "react";
import { getAddresses, deleteAddress, changeDefaultAddress } from "../../api/dashboard.api";
import { useAuthStore } from "../../../stores/useAuthStore";
import { toast } from "react-toastify";

export const AddressListPage = () => {
    const { user, isHydrated } = useAuthStore();
    const [addresses, setAddresses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Danh sách địa chỉ", to: `/dashboard/address` },
    ];

    const fetchAddresses = async () => {
        try {
            const response = await getAddresses();
            if (response.success) {
                setAddresses(response.data);
            }
        } catch (error) {
            console.error("Error fetching addresses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    const handleDelete = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) {
            try {
                const response = await deleteAddress(id);
                if (response.success) {
                    toast.success(response.message);
                    setAddresses(addresses.filter(item => item._id !== id));
                } else {
                    toast.error(response.message);
                }
            } catch (error) {
                toast.error("Đã có lỗi xảy ra!");
            }
        }
    }

    const handleChangeDefault = async (id: string) => {
        try {
            const response = await changeDefaultAddress(id);
            if (response.success) {
                toast.success(response.message);
                // Cập nhật lại state local để hiển thị đúng radio và label mặc định
                setAddresses(addresses.map(item => ({
                    ...item,
                    isDefault: item._id === id
                })));
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Đã có lỗi xảy ra!");
        }
    }

    if (!isHydrated) return null;

    if (!user) {
        return (
            <>
                <ProductBanner
                    pageTitle="Tài khoản"
                    breadcrumbs={breadcrumbs}
                    url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                    className="bg-top"
                />
                <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 bg-[#f9f9f9]">
                    <p className="text-[18px] text-client-secondary">Vui lòng đăng nhập để xem thông tin tài khoản.</p>
                    <Link to="/auth/login" className="bg-client-secondary text-white px-8 py-3 rounded-full text-[16px] hover:bg-client-primary transition-all">Đăng nhập ngay</Link>
                </div>
            </>
        );
    }

    return (
        <>
            <ProductBanner
                pageTitle="Danh sách địa chỉ"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                className="bg-top"
            />

            <div className="mt-[-150px] mb-[100px] app-container flex items-stretch">
                <div className="w-[25%] px-[12px] flex">
                    <Sidebar />
                </div>
                <div className="w-[75%] px-[12px]">
                    <div className="mt-[100px] p-[35px] bg-white shadow-[0px_8px_24px_#959da533] rounded-[12px]">
                        <h3 className="text-[24px] font-[600] text-client-secondary flex items-center justify-between mb-[10px]">
                            Danh sách địa chỉ
                            <Link className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[12px] font-[500] text-[14px] text-white flex items-center gap-[8px]" to={"/dashboard/address/create"}>
                                <span className="relative z-10">Thêm địa chỉ</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </Link>
                        </h3>

                        {loading ? (
                            <div className="py-[50px] text-center text-[16px] text-gray-500">Đang tải danh sách địa chỉ...</div>
                        ) : addresses.length > 0 ? (
                            <div className="grid grid-cols-2 gap-[30px] mt-[30px]">
                                {addresses.map((item) => (
                                    <div key={item._id} className="group cursor-pointer h-full" onClick={() => !item.isDefault && handleChangeDefault(item._id)}>
                                        <div className={`relative border rounded-[16px] p-[30px] transition-all duration-300 bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.04)] border-[#eee] group-hover:shadow-[0px_10px_30px_rgba(0,0,0,0.08)] group-hover:border-client-primary/30 group-hover:-translate-y-1 h-full flex flex-col ${item.isDefault ? 'ring-2 ring-client-primary/20 bg-client-primary/[0.02]' : ''}`}>
                                            {item.isDefault && (
                                                <div className="absolute top-[20px] right-[20px] bg-client-primary/10 text-client-primary text-[12px] font-[600] px-[12px] py-[4px] rounded-full">
                                                    Mặc định
                                                </div>
                                            )}
                                            <div className="flex gap-[20px] flex-1">
                                                <div className="mt-[6px]">
                                                    <input
                                                        type="radio"
                                                        name="address_selection"
                                                        className="appearance-none w-[20px] h-[20px] border-[2px] border-[#ddd] rounded-full checked:border-client-primary checked:border-[6px] transition-all cursor-pointer bg-white"
                                                        checked={item.isDefault}
                                                        onChange={() => handleChangeDefault(item._id)}
                                                    />
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    <div className="flex-1 space-y-[15px]">
                                                        <div className="flex items-center gap-[12px] text-[16px] text-client-secondary font-[700]">
                                                            <User className="w-[20px] h-[20px] text-client-primary" />
                                                            {item.fullName}
                                                        </div>
                                                        <div className="flex items-center gap-[12px] text-[15px] text-[#555]">
                                                            <Phone className="w-[20px] h-[20px] text-gray-400" />
                                                            {item.phone}
                                                        </div>
                                                        <div className="flex items-start gap-[12px] text-[15px] text-[#555] leading-relaxed">
                                                            <MapPin className="w-[20px] h-[20px] text-gray-400 mt-[2px]" />
                                                            <span className="flex-1">{item.address}</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-[20px] flex items-center gap-[15px] opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                                                        <Link to={`/dashboard/address/edit/${item._id}`} onClick={(e) => e.stopPropagation()} className="text-[14px] font-[600] text-client-primary hover:underline">Chỉnh sửa</Link>
                                                        <div className="w-[1px] h-[12px] bg-gray-300"></div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(item._id);
                                                            }}
                                                            className="text-[14px] font-[600] text-red-500 hover:underline"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-[50px] text-center text-[16px] text-gray-500 italic">Bạn chưa có địa chỉ nào.</div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
