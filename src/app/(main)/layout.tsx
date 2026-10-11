import { InstallGuide } from "@/features/pwa/install-guide";
import { QuestionDialog } from "@/features/qna/question-dialog";
import { ScoreDialog } from "@/features/quiz/score-dialog";
import { MobileHeader, MobileTabBar } from "@/features/shell/mobile-chrome";
import { Sidebar } from "@/features/shell/sidebar";
import { UploadDialog } from "@/features/study/upload-dialog";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudyProvider } from "@/features/party/study-provider";
import { PartyControls, PartySetup } from "@/features/party/party-setup";
import { demoSnapshot, loadStudySnapshot } from "@/lib/study-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  let initial;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    try {
      initial = await loadStudySnapshot(
        supabase,
        user.id,
        (await cookies()).get("study-party")?.value,
      );
    } catch {
      return (
        <main className="p-8">
          <h1>기록을 불러오지 못했어요</h1>
          <p>
            잠시 후 새로고침해 주세요. 문제가 계속되면 운영자에게 알려 주세요.
          </p>
        </main>
      );
    }
  } else initial = demoSnapshot();
  if (!initial.party)
    return (
      <StudyProvider key={initial.me.id} initial={initial}>
        <PartySetup />
      </StudyProvider>
    );
  return (
    <StudyProvider
      key={`${initial.me.id}:${initial.party.id}`}
      initial={initial}
    >
      <div className="flex min-h-dvh bg-bg text-text">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col gap-4.5 px-5 pt-4 pb-tabbar md:gap-8 md:px-page-x md:pt-8 md:pb-16 md:glow-main">
          <MobileHeader />
          <PartyControls />
          {children}
        </main>
        <MobileTabBar />
        <InstallGuide />
        <UploadDialog />
        <ScoreDialog />
        <QuestionDialog />
      </div>
    </StudyProvider>
  );
}
