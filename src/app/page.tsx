import { redirect } from 'next/navigation';
// Tambahkan baris ini setelah semua import
export const dynamic = 'force-dynamic';


export default function Home() {
  redirect('/login');
}
