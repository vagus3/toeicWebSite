"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { DEMO_TODAY } from "@/lib/demo-data";
import { weekTestLabel } from "@/lib/utils";
import { useModal, useStudyStore } from "@/stores/study-store";
import { useToast } from "@/stores/toast-store";

const sectionScore = z.coerce
  .number<string>()
  .int("정수로 입력해 주세요")
  .min(0, "0 이상")
  .max(495, "495 이하");
const schema = z.object({ lc: sectionScore, rc: sectionScore });
type ScoreForm = z.input<typeof schema>;

/** 주간 테스트 점수 입력 (LC/RC 0–495) */
export function ScoreDialog() {
  const { open, close, onOpenChange } = useModal("score");
  const addScore = useStudyStore((s) => s.addScore);
  const flash = useToast((s) => s.flash);

  const { register, handleSubmit, control, formState } = useForm<
    ScoreForm,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: { lc: "370", rc: "385" },
  });
  const [lc, rc] = useWatch({ control, name: ["lc", "rc"] });
  const total = (parseInt(lc) || 0) + (parseInt(rc) || 0);

  const onSave = handleSubmit(({ lc, rc }) => {
    const sum = lc + rc;
    addScore(sum, weekTestLabel(DEMO_TODAY));
    flash(`점수 ${sum}점 저장 · 파티에 공유`);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>주간 테스트 점수</DialogTitle>
        <form onSubmit={onSave} className="flex flex-col gap-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="score-lc"
              label="LC (0–495)"
              inputMode="numeric"
              error={formState.errors.lc?.message}
              {...register("lc")}
            />
            <TextField
              id="score-rc"
              label="RC (0–495)"
              inputMode="numeric"
              error={formState.errors.rc?.message}
              {...register("rc")}
            />
          </div>
          <span className="text-meta text-muted">
            합계 <span className="text-title text-text">{total}</span>
          </span>
          <DialogActions>
            <Button variant="secondary" onClick={close}>
              취소
            </Button>
            <Button type="submit" variant="primary">
              저장
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
