import { InstallGuide } from "@/features/pwa/install-guide";
import { QuestionDialog } from "@/features/qna/question-dialog";
import { ScoreDialog } from "@/features/quiz/score-dialog";
import { MobileHeader, MobileTabBar } from "@/features/shell/mobile-chrome";
import { Sidebar } from "@/features/shell/sidebar";
import { UploadDialog } from "@/features/study/upload-dialog";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-bg text-text">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col gap-4.5 px-5 pt-4 pb-tabbar md:gap-8 md:px-page-x md:pt-8 md:pb-16 md:glow-main">
        <MobileHeader />
        {children}
      </main>
      <MobileTabBar />
      <InstallGuide />
      <UploadDialog />
      <ScoreDialog />
      <QuestionDialog />
    </div>
  );
}
