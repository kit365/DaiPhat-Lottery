export type OrderStatusBadge = {
    label: string;
    color: string;
    bg: string;
    activeColor: string;
    activeBg: string;
};

export type OrderStatusTab = OrderStatusBadge & { value: string };
