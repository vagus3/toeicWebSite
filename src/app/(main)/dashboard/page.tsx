import type { Metadata } from "next";
import { Feed, MobileSocialCards } from "@/features/party/feed";
import { MembersTable } from "@/features/party/members-table";
import { QuickTests } from "@/features/quiz/quick-tests";
import { TaskCards, TaskChecklist } from "@/features/study/task-list";
import { TodayHeaderDesktop, TodayHeaderMobile } from "@/features/study/today-header";

export const metadata: Metadata = { title: "홈" };

export default function DashboardPage() {
  return (
    <>
      {/* 데스크톱 (웹 시안) */}
      <div className="hidden flex-wrap items-start gap-10 md:flex">
        <div className="flex min-w-0 flex-1 basis-col-main flex-col gap-8">
          <TodayHeaderDesktop />
          <TaskCards />
          <MembersTable />
          <QuickTests />
        </div>
        <Feed />
      </div>

      {/* 모바일 (프로토타입 시안) */}
      <div className="flex flex-col gap-4.5 md:hidden">
        <TodayHeaderMobile />
        <TaskChecklist />
        <MobileSocialCards />
      </div>
    </>
  );
}
