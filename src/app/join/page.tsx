import { Suspense } from "react";
import { JoinParty } from "@/features/party/join-party";

export default function JoinPage() {
  return (
    <Suspense fallback={<p>초대 정보를 불러오고 있어요…</p>}>
      <JoinParty />
    </Suspense>
  );
}
