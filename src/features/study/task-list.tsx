"use client";

import { TASKS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import type { StudyTask } from "@/types";
import { TaskStatusIcon } from "./task-status-icon";
import { useStartUpload } from "./use-start-upload";

/** 오늘 할당량 + 인증 여부 + 누르면 인증 시작 */
function useTaskItems() {
  const done = useStudyStore((s) => s.done);
  const startUpload = useStartUpload();
  return TASKS.map((task) => ({
    task,
    done: done[task.id],
    buttonProps: {
      type: "button" as const,
      disabled: done[task.id],
      title: done[task.id] ? "이미 인증 완료" : "인증하기",
      onClick: () => startUpload(task.id),
    },
  }));
}

function TaskCard({
  task,
  done,
  buttonProps,
}: {
  task: StudyTask;
  done: boolean;
  buttonProps: React.ComponentProps<"button">;
}) {
  return (
    <button
      {...buttonProps}
      className={cn(
        "card elev-sm gap-2 p-4 text-left",
        done ? "cursor-not-allowed opacity-45" : "cursor-pointer",
      )}
    >
      <span className="flex items-center justify-between text-meta">
        <span>{task.short}</span>
        <TaskStatusIcon done={done} className="text-icon" todoClassName="text-muted" />
      </span>
      <span className="text-stat font-medium">{task.big}</span>
      <span className="text-label text-muted">{task.sub}</span>
    </button>
  );
}

/** 데스크톱 — 오늘 할당량 카드 4개 (누르면 인증 모달) */
export function TaskCards() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-task-min),1fr))] gap-3">
      {useTaskItems().map((item) => (
        <TaskCard key={item.task.id} {...item} />
      ))}
    </div>
  );
}

/** 모바일 — 체크 리스트 (프로토타입) */
export function TaskChecklist() {
  return (
    <ul className="flex flex-col">
      {useTaskItems().map(({ task, done, buttonProps }) => (
        <li key={task.id}>
          <button
            {...buttonProps}
            className={cn(
              "flex w-full items-center gap-3 py-3 text-left",
              done ? "cursor-not-allowed" : "cursor-pointer",
            )}
          >
            <TaskStatusIcon done={done} className="text-icon-lg" />
            <span className="flex flex-1 flex-col">
              <span className={cn("text-body", done && "opacity-45")}>{task.label}</span>
              <span className="text-label text-muted">{task.mobileSub}</span>
            </span>
            {!done && <span className="tag tag-neutral">인증</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
