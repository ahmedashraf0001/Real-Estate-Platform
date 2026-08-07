import { redirect } from 'next/navigation';

export default async function AdminRootPage() {
  // Redirect base /admin to English admin panel /admin/en
  redirect('/admin/en');
}
