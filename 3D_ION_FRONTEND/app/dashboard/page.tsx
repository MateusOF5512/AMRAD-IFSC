import { redirect } from 'next/navigation'

/** Legacy route — redirects to the current researcher experiments page. */
export default function DashboardRedirect() {
  redirect('/meus-experimentos')
}
