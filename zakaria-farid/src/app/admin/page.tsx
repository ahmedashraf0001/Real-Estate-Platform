import { redirect } from 'next/navigation';

export default async function AdminRootPage() {
  // Redirect base /admin to Arabic admin panel /admin/ar
  redirect('/admin/ar');
}
