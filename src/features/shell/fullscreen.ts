import { ROUTES } from "@/lib/routes";

/** 탭바·헤더를 숨기고 화면 전체를 쓰는 경로. 화면 안의 닫기(X)로 돌아간다. */
const FULLSCREEN_ROUTES: readonly string[] = [ROUTES.upload, ROUTES.dailyQuiz];

/** 경로 경계까지 맞춰 비교한다. `/study/uploads`처럼 이름만 같은 경로는 제외한다. */
export function isFullscreenPath(pathname: string) {
  return FULLSCREEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
