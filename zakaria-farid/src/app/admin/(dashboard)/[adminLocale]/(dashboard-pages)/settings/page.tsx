import {getSiteContent,getSettingsLastSaved} from '@/lib/siteContent/server';
import AdminPlatformSettings from '@/components/admin/AdminPlatformSettings';
import {settingsGroupFromUrl} from '@/lib/siteContent/settingsDraft';
interface Props {params:Promise<{adminLocale:string}>;searchParams:Promise<{group?:string}>;}
export async function generateMetadata({params}:Props){const {adminLocale}=await params;return {title:adminLocale==='ar'?'الإعدادات':'Settings'};}
export default async function AdminSettingsPage({params,searchParams}:Props){
  const [{adminLocale},search,initialAboutContent,lastSaved]=await Promise.all([params,searchParams,getSiteContent('about_page'),getSettingsLastSaved()]);
  return <AdminPlatformSettings {...{adminLocale,initialAboutContent,lastSaved}} initialGroup={settingsGroupFromUrl(new URLSearchParams({group:search.group||'home'}).toString())}/>;
}
