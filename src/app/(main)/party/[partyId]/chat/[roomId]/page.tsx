import type { Metadata } from "next";
import { ChatRoom } from "@/features/chat/chat-room";

export const metadata: Metadata = { title: "파티 채팅" };

/** 푸시 알림을 누르면 이 경로로 들어온다 (/party/[partyId]/chat/[roomId]) */
export default async function ChatPage({ params }: PageProps<"/party/[partyId]/chat/[roomId]">) {
  const { partyId, roomId } = await params;
  return <ChatRoom partyId={partyId} roomId={roomId} />;
}
