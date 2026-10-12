import { ROUTES } from "@/lib/routes";

/**
 * 탭바·헤더를 숨기고 화면 전체를 쓰는 경로. 화면 안의 닫기(X)·뒤로(‹)로 돌아간다.
 * 이 경로의 화면은 ScreenHeader(pt-safe)와 PinnedFooter(pb-safe)로 안전 영역을 직접 맡는다.
 */
const FULLSCREEN_ROUTES: readonly string[] = [ROUTES.upload, ROUTES.dailyQuiz];

/** 이 경로 아래는 모두 전체 화면 — 파티 채팅방, 질문 상세 (질문 목록 /qna는 아님) */
const FULLSCREEN_PREFIXES: readonly string[] = ["/party/", "/qna/"];

/** 경로 경계까지 맞춰 비교한다. `/study/uploads`처럼 이름만 같은 경로는 제외한다. */
export function isFullscreenPath(pathname: string) {
  return (
    FULLSCREEN_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    ) || FULLSCREEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}
