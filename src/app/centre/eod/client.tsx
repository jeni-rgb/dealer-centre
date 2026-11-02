"use client";
import { useRef } from "react";
import { EndOfDay } from "./form";
import { Recorded, type RecordedHandle, type RecordedSale } from "./recorded";

export function EodClient({ centreId, centreName, recorded }: { centreId: string; centreName: string; recorded: RecordedSale[] }) {
  const list = useRef<RecordedHandle>(null);
  return (
    <div className="mx-auto max-w-[520px]">
      <EndOfDay centreId={centreId} centreName={centreName} onRecorded={() => list.current?.reload()} />
      <Recorded ref={list} centreId={centreId} initial={recorded} />
    </div>
  );
}
