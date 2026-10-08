import { ChartBar, ChatsCircle, ChatTeardropText, Exam, House, type Icon } from "@phosphor-icons/react";
import { ROUTES } from "@/lib/routes";

export interface NavItem {
  href: string;
  label: string;
  /** 모바일 하단 탭에서 쓰는 짧은 이름 — 없으면 탭에 넣지 않음 */
  tabLabel?: string;
  icon: Icon;
  /** 이 경로들로 시작하면 활성 (예: 퀴즈 화면은 테스트 탭) */
  match: string[];
}

/** 데스크톱 사이드바와 모바일 하단 탭이 같은 목록을 쓴다 */
export const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "홈", tabLabel: "홈", icon: House, match: [ROUTES.dashboard] },
  { href: ROUTES.tracker, label: "트래커", tabLabel: "트래커", icon: ChartBar, match: [ROUTES.tracker] },
  { href: ROUTES.quizzes, label: "테스트", tabLabel: "테스트", icon: Exam, match: [ROUTES.quizzes] },
  { href: ROUTES.qna, label: "질문 창구", tabLabel: "질문", icon: ChatsCircle, match: [ROUTES.qna] },
  // 모바일은 헤더의 채팅 아이콘으로 진입
  { href: ROUTES.chat(), label: "파티 채팅", icon: ChatTeardropText, match: ["/party/"] },
];

export const TAB_ITEMS = NAV_ITEMS.filter((item) => item.tabLabel);

export function isActive(pathname: string, item: NavItem) {
  return item.match.some((m) => pathname.startsWith(m));
}
