import {
  ChartBar,
  ChatsCircle,
  ChatTeardropText,
  Exam,
  House,
  Images,
  type Icon,
} from "@phosphor-icons/react";
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
  {
    href: ROUTES.tracker,
    label: "트래커",
    tabLabel: "트래커",
    icon: ChartBar,
    match: [ROUTES.tracker],
  },
  // 모바일 하단 탭은 카메라 버튼 양쪽 2개씩이라 넣지 않고, 트래커·홈 피드의 링크로 들어간다
  { href: ROUTES.records, label: "인증 기록", icon: Images, match: [ROUTES.records] },
  {
    href: ROUTES.quizzes,
    label: "테스트",
    tabLabel: "테스트",
    icon: Exam,
    match: [ROUTES.quizzes],
  },
  {
    href: ROUTES.qna,
    label: "질문 창구",
    tabLabel: "질문",
    icon: ChatsCircle,
    match: [ROUTES.qna],
  },
  // 모바일은 헤더의 채팅 아이콘으로 진입
  // 현재 파티의 채팅방으로 보내는 주소 (파티 id를 여기서 고정하면 다른 파티에서 404가 난다)
  { href: ROUTES.chatShortcut, label: "파티 채팅", icon: ChatTeardropText, match: ["/party/"] },
];

export const TAB_ITEMS = NAV_ITEMS.filter((item) => item.tabLabel);

export function isActive(pathname: string, item: NavItem) {
  return item.match.some((m) => pathname.startsWith(m));
}
