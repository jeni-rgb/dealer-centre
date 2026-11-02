"use client";
import { useRef, useState } from "react";
import { EndOfDay } from "./form";
import { Recorded, type RecordedHandle, type RecordedSale } from "./recorded";

export function EodClient({ centreId, centreName, recorded }: { centreId: string; centreName: string; recorded: RecordedSale[] }) {
  const list = useRef<RecordedHandle>(null);
  const [clearToken, setClearToken] = useState(0);
  return (
    <div className="mx-auto max-w-[520px]">
      <EndOfDay centreId={centreId} centreName={centreName} onRecorded={() => list.current?.reload()} clearToken={clearToken} />
      <Recorded ref={list} centreId={centreId} initial={recorded} onChanged={() => setClearToken((n) => n + 1)} />
    </div>
  );
}
