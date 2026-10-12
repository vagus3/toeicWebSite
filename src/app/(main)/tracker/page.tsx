import type { Metadata } from "next";
import { DetailGate } from "@/features/party/detail-gate";
import { TrackerBoard } from "@/features/tracker/tracker-board";
import { TrackerMobile } from "@/features/tracker/tracker-week";

export const metadata: Metadata = { title: "트래커" };

export default function TrackerPage() {
  return (
    <>
      <div className="hidden md:block">
        <DetailGate>
          <TrackerBoard />
        </DetailGate>
      </div>
      <div className="md:hidden">
        <DetailGate>
          <TrackerMobile />
        </DetailGate>
      </div>
    </>
  );
}
