import { InstallGuide } from "@/features/pwa/install-guide";
import { MobileHeader, MobileTabBar } from "@/features/shell/mobile-chrome";
import { MainFrame } from "@/features/shell/main-frame";
import { Sidebar } from "@/features/shell/sidebar";
import { ModalHost } from "@/features/shell/modal-host";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudyProvider } from "@/features/party/study-provider";
import { PartySetup } from "@/features/party/party-setup";
import { demoSnapshot, loadStudyCore } from "@/lib/study-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DriveBanner } from "@/features/study/drive-banner";

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
      // 상세 기록은 StudyProvider가 마운트된 뒤 클라이언트에서 따로 불러온다
      initial = {
        ...(await loadStudyCore(
          supabase,
          user.id,
          (await cookies()).get("study-party")?.value,
        )),
        detail: null,
      };
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
        <MainFrame>
          <MobileHeader />
          <DriveBanner />
          {children}
        </MainFrame>
        <MobileTabBar />
        <InstallGuide />
        <ModalHost />
      </div>
    </StudyProvider>
  );
}
