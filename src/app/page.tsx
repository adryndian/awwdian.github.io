'use client';

import { ChatContainer } from '@/components/chat/ChatContainer';
import { DEFAULT_MODEL } from '@/lib/models/config';

export default function Home() {
  return <ChatContainer initialModel={DEFAULT_MODEL} />;
}