import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ProductBanner } from "../product/sections/ProductBanner";
import { Sidebar } from "./sections/Sidebar";
import { useAuthStore } from "../../../stores/useAuthStore";
import { deletePet, getMyPets } from "../../api/pet.api";
import { Camera } from "lucide-react";

export const PetListPage = () => {
    const { user, isHydrated } = useAuthStore();
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/overview" },
        { label: "Danh sách thú cưng", to: "/dashboard/pet" },
    ];

    const fetchPets = async () => {
        try {
            const response = await getMyPets();
            if (response.code === 200) {
                setPets(Array.isArray(response.data) ? response.data : []);
            } else {
                toast.error(response.message || "Không tải được danh sách thú cưng");
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Không tải được danh sách thú cưng");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchPets();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa bé ${name}?`)) return;

        try {
            const response = await deletePet(id);
            if (response.code === 200) {
                toast.success(response.message || "Đã xóa thú cưng");
                setPets((prev) => prev.filter((item) => item._id !== id));
                return;
            }

            toast.error(response.message || "Xóa thất bại");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Đã có lỗi xảy ra!");
        }
    };

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
                pageTitle="Danh sách thú cưng"
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
                            Danh sách thú cưng
                            <Link className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[12px] font-[500] text-[14px] text-white flex items-center gap-[8px]" to="/dashboard/pet/create">
                                <span className="relative z-10">Thêm thú cưng</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </Link>
                        </h3>

                        {loading ? (
                            <div className="py-[100px] text-center">
                                <p className="text-[16px] text-gray-500">Đang tải danh sách bé cưng...</p>
                            </div>
                        ) : pets.length > 0 ? (
                            <div className="grid grid-cols-2 gap-[30px] mt-[30px]">
                                {pets.map((item) => (
                                    <div key={item._id} className="group h-full">
                                        <div className="relative border rounded-[16px] p-[25px] transition-all duration-300 bg-white border-[#eee] hover:shadow-[0px_10px_30px_rgba(0,0,0,0.08)] hover:border-client-primary/30 h-full flex items-start gap-5">
                                            <div className="w-[80px] h-[80px] rounded-[12px] overflow-hidden bg-gray-50 border border-[#eee] shrink-0">
                                                {item.avatar ? (
                                                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <Camera className="w-8 h-8 opacity-40" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-[18px] font-[700] text-client-secondary truncate pr-2">{item.name}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-[600] uppercase tracking-wider ${item.type === "dog" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                                                        {item.type === "dog" ? "Chó" : "Mèo"}
                                                    </span>
                                                </div>

                                                <div className="mt-2 space-y-1">
                                                    <p className="text-[14px] text-[#555]">
                                                        <span className="text-gray-400 font-medium">Giống:</span> {item.breed || "Chưa xác định"}
                                                    </p>
                                                    <p className="text-[14px] text-[#555]">
                                                        <span className="text-gray-400 font-medium">Cân nặng:</span> {item.weight || "?"} kg
                                                    </p>
                                                </div>

                                                <div className="pt-[15px] flex items-center gap-[15px] opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                                                    <Link to={`/dashboard/pet/edit/${item._id}`} className="text-[14px] font-[600] text-client-primary hover:underline">
                                                        Chỉnh sửa
                                                    </Link>
                                                    <div className="w-[1px] h-[12px] bg-gray-300"></div>
                                                    <button onClick={() => handleDelete(item._id, item.name)} className="text-[14px] font-[600] text-red-500 hover:underline">
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-[80px] text-center border-2 border-dashed border-gray-100 rounded-[20px] bg-gray-50/50 mt-[30px]">
                                <p className="text-[16px] text-gray-500 italic">Bạn chưa thêm bé cưng nào.</p>
                                <Link to="/dashboard/pet/create" className="text-client-primary font-bold mt-4 inline-block hover:underline">Thêm ngay bé cưng đầu tiên nào!</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
