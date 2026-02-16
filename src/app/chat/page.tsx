export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChatContainer } from '@/components/chat/ChatContainer';

export default async function ChatPage() {
  const supabase = createClient();
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      <ChatContainer userId={session.user.id} />
    </div>
  );
}
