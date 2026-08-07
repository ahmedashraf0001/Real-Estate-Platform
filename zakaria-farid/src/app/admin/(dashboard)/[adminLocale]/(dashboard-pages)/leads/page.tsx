import { getAllLeads, getAllPropertiesAdmin } from '@/lib/supabase/queries';
import LeadPipeline from '@/components/admin/LeadPipeline';

interface Props {
  params: Promise<{ adminLocale: string }>;
}

export default async function AdminLeadsPage({ params }: Props) {
  const { adminLocale } = await params;
  const [leads, properties] = await Promise.all([getAllLeads().catch(() => []), getAllPropertiesAdmin().catch(() => [])]);

  return (
    <LeadPipeline initialLeads={leads} properties={properties} adminLocale={adminLocale} />
  );
}
