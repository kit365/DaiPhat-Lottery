type TitleProps = {
    title: string;
};

export const Title = ({ title }: TitleProps) => {
    return (
        <h6 className="text-[1.4375rem] font-[700] mb-[16px]">
            {title}
        </h6>
    );
};
