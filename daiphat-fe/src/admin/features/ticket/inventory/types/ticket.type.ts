export interface ITicket {
    id: number | string;
    providerName: string;
    serialNumber: string;
    numbers: string;
    drawDate: string;
    batchCode: string;
    image: string;
    createdAt: Date;
    status: string;
    statusDisplayName: string;
}
