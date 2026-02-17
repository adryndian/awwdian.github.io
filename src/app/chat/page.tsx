export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChatContainer } from '@/components/chat/ChatContainer.tsx';

export default async function ChatPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    // Updated: match glassmorphism theme from globals.css
    <div className="h-screen flex overflow-hidden">
      <ChatContainer userId={session.user.id} />
    </div>
  );
}
