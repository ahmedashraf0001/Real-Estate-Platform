import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export default async function AdminERPPage({ params }: Props) {
  const { adminLocale } = await params;
  redirect(`/fin-os/${adminLocale}`);
}
