import { Button } from "../../../components/ui/Button"
import { SaleOff } from "../../../components/ui/SaleOff"

export const Section4 = () => {
    return (
        <section className="relative px-[30px] py-[150px] bg-white">
            <div className="app-container flex gap-[30px]">
                <div
                    className="bg-client-primary relative flex rounded-[20px] w-[50%] h-[324px] bg-center bg-no-repeat bg-cover p-[15px]"
                    style={{ backgroundImage: "url('https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/h1-filler-img-1.jpg')" }}
                >
                    <div className="w-[50%]"></div>
                    <div className="w-[50%] py-[40px]">
                        <div className="inline-block uppercase text-white bg-[#C32643] px-[18px] py-[5px] rounded-[30px] mb-[10px]">
                            Ưu đãi có hạn!
                        </div>
                        <h3 className="text-white text-[2.5rem] font-secondary leading-[1.2] mb-[20px]">Giảm giá đặc biệt</h3>
                        <Button
                            content="Mua ngay"
                            svgColor="text-white"
                            textColor="text-client-secondary"
                            iconColor="before:bg-client-secondary after:bg-client-secondary"
                            url="/shop"
                        />
                    </div>
                    <SaleOff content="20% OFF" backgroundColor="bg-[#C32643]" textColor="text-white" position="absolute bottom-[10px] right-[15px]" />
                </div>
                <div
                    className="bg-[#E67E20] relative flex rounded-[20px] w-[50%] h-[324px] bg-center bg-no-repeat bg-cover p-[15px]"
                    style={{ backgroundImage: "url('https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/h1-filler-img-2.jpg')" }}
                >
                    <div className="w-[50%] py-[40px] pl-[40px] relative">
                        <img className="absolute left-0 top-0" src="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/Circle-lines-Design.png" alt="" width={303} height={303} />
                        <div className="inline-block uppercase text-white bg-[#AF6900] px-[18px] py-[5px] rounded-[30px] mb-[10px]">
                            Tiết kiệm tuyệt vời
                        </div>
                        <h3 className="text-white text-[2.5rem] font-secondary leading-[1.2] mb-[20px]">Nhận ngay ưu đãi này</h3>
                        <Button
                            content="Đặt ngay"
                            svgColor="text-white"
                            textColor="text-client-secondary"
                            iconColor="before:bg-client-secondary after:bg-client-secondary"
                            url="/shop"
                        />
                    </div>
                    <SaleOff content="40% OFF" backgroundColor="bg-white" textColor="text-client-secondary" position="absolute top-[10px] right-[15px]" />
                </div>
            </div>
        </section>
    )
}