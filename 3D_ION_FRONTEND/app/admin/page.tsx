import { redirect } from 'next/navigation'

/** Legacy Supabase admin — redirects to the FastAPI admin panel. */
export default function AdminRedirect() {
  redirect('/admin/configuracoes-avancadas')
}
