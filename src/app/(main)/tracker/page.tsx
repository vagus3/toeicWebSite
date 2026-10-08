import type { Metadata } from "next";
import { TrackerBoard } from "@/features/tracker/tracker-board";
import { TrackerWeek } from "@/features/tracker/tracker-week";

export const metadata: Metadata = { title: "트래커" };

export default function TrackerPage() {
  return (
    <>
      <div className="hidden md:block">
        <TrackerBoard />
      </div>
      <div className="md:hidden">
        <TrackerWeek />
      </div>
    </>
  );
}
