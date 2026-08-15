import { ClientPage } from './ClientPage';

type PageProps = {
  params: Promise<{ id: string; lineId: string }>;
};

export default async function AdminImportBatchLineDetailRoute({ params }: PageProps) {
  const { id, lineId } = await params;
  return <ClientPage id={id} lineId={lineId} />;
}
