import { ProductBanner } from "../product/sections/ProductBanner";
import { Sidebar } from "./sections/Sidebar";
import { useParams, Link } from "react-router-dom";

export const OrderInvoicePage = () => {
    const { id } = useParams();
    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: `Hóa đơn đặt hàng`, to: `/dashboard/order/invoice/${id}` },
    ];

    return (
        <>
            <ProductBanner
                pageTitle={`Hóa đơn đặt hàng`}
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                className="bg-top"
            />

            <div className="mt-[-150px] mb-[100px] app-container flex items-stretch">
                <div className="w-[25%] px-[12px] flex">
                    <Sidebar />
                </div>
                <div className="w-[75%] px-[12px]">
                    <div className="mt-[100px] bg-white shadow-[0px_8px_24px_#959da533] rounded-[12px]">
                        <h3 className="text-[24px] font-[600] text-client-secondary flex items-center justify-between px-[35px] pt-[35px] mb-[25px]">
                            Hóa đơn đặt hàng
                            <Link className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[12px] font-[500] text-[14px] text-white flex items-center gap-[8px] cursor-pointer" to={"/dashboard/overview"}>
                                <span className="relative z-10">Trở lại</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </Link>
                        </h3>
                        <div className="px-[35px] pb-[35px]">
                            <div className="border border-[#eee] rounded-[10px] overflow-hidden">
                                <div className="bg-[#F5F5F5] flex items-center justify-between p-[30px]">
                                    <div className="w-[15%] flex justify-center">
                                        <Link to="/">
                                            <img src="https://i.imgur.com/V2kwkkK.png" alt="" className="w-[190px] object-cover" />
                                        </Link>
                                    </div>
                                    <div>
                                        <h2 className="uppercase text-[18px] text-client-secondary font-[600] mb-[10px]">Hóa đơn</h2>
                                        <p className="text-[#7d7b7b] text-[15px] mb-[2px]">Mã hóa đơn: #4574</p>
                                        <p className="text-[#7d7b7b] text-[15px]">Ngày: 16-10-2024</p>
                                    </div>
                                </div>
                                <div className="p-[30px] flex justify-between mb-[30px]">
                                    <div className="w-[45%]">
                                        <h2 className="text-[21px] font-[600] mb-[15px]">Người thanh toán</h2>
                                        <p className="text-[#7d7b7b] mt-[5px] text-[15px]">7232 Broadway Suite 308, Jackson Heights, 11372, NY, United States</p>
                                        <p className="text-[#7d7b7b] mt-[5px] text-[15px]">+1347-430-9510</p>
                                        <p className="text-[#7d7b7b] mt-[5px] text-[15px]">example@gmail.com</p>
                                    </div>
                                    <div className="w-[45%]">
                                        <h2 className="text-[21px] font-[600] mb-[15px]">Người nhận hàng</h2>
                                        <p className="text-[#7d7b7b] mt-[5px] text-[15px] flex"><span className="text-client-secondary w-[80px] block">Họ tên:</span>Koile Lavendra</p>
                                        <p className="text-[#7d7b7b] mt-[5px] text-[15px] flex"><span className="text-client-secondary w-[80px] block">Email:</span>example@yahoo.com</p>
                                        <p className="text-[#7d7b7b] mt-[5px] text-[15px] flex"><span className="text-client-secondary w-[80px] block">SĐT:</span>(123) - 222 -1452</p>
                                        <p className="text-[#7d7b7b] mt-[5px] text-[15px] flex"><span className="text-client-secondary w-[80px] block">Địa chỉ:</span>441, 4th street, Washington DC, USA</p>
                                    </div>
                                </div>

                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#F9F9F9] border-y border-[#eee]">
                                            <th className="py-[15px] px-[25px] text-[16px] font-[600] text-client-secondary border-r border-[#eee]">Tên sản phẩm</th>
                                            <th className="py-[15px] px-[25px] text-[16px] font-[600] text-client-secondary border-r border-[#eee]">Giá</th>
                                            <th className="py-[15px] px-[25px] text-[16px] font-[600] text-client-secondary text-center border-r border-[#eee]">Số lượng</th>
                                            <th className="py-[15px] px-[25px] text-[16px] font-[600] text-client-secondary">Tổng cộng</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee]">
                                        {[
                                            { name: "Lemon Meat Bone", price: "25.000đ", qty: "01", total: "25.000đ" },
                                            { name: "Fresh Red Seedless", price: "30.000đ", qty: "02", total: "60.000đ" },
                                            { name: "Carrot Vegetables", price: "50.000đ", qty: "01", total: "50.000đ" },
                                        ].map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-[15px] px-[25px] text-[15px] text-[#7d7b7b] border-r border-[#eee]">{item.name}</td>
                                                <td className="py-[15px] px-[25px] text-[15px] text-[#7d7b7b] border-r border-[#eee]">{item.price}</td>
                                                <td className="py-[15px] px-[25px] text-[15px] text-[#7d7b7b] text-center border-r border-[#eee]">{item.qty}</td>
                                                <td className="py-[15px] px-[25px] text-[15px] text-[#7d7b7b]">{item.total}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan={3} className="py-[15px] px-[25px] text-[16px] font-[500] text-client-secondary border-r border-[#eee]">Tạm tính</td>
                                            <td className="py-[15px] px-[25px] text-[15px] text-client-secondary font-[500]">440.000đ</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} className="py-[15px] px-[25px] text-[15px] font-[500] text-[#7d7b7b] border-r border-[#eee]">Phí vận chuyển</td>
                                            <td className="py-[15px] px-[25px] text-[15px] text-[#7d7b7b] font-[500]">10.000đ</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} className="py-[15px] px-[25px] text-[16px] font-[600] text-client-secondary uppercase border-r border-[#eee]">Tổng cộng</td>
                                            <td className="py-[15px] px-[25px] text-[16px] text-client-secondary font-[700]">450.000đ</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={4} className="pb-[25px] pt-[60px] px-[25px]">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <h4 className="text-[18px] font-[600] text-client-secondary mb-[10px]">Ghi chú</h4>
                                                        <p className="text-[#7d7b7b] text-[15px]">Cảm ơn bạn đã mua hàng!</p>
                                                    </div>
                                                    <button className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[12px] font-[600] text-[15px] text-white flex items-center gap-[8px] cursor-pointer">
                                                        <span className="relative z-10">In PDF</span>
                                                        <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
