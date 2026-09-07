import { useRef, useState } from "react";
import type { AppDataApi } from "../hooks/useAppData";
import { exportToFile, normalize } from "../storage/persistence";

interface Props {
  api: AppDataApi;
}

export default function ExportImportButtons({ api }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { courses?: unknown }).courses)) {
        throw new Error("Not an Elenya backup");
      }
      const next = normalize(parsed);
      if (!confirm(`Replace current data with ${next.courses.length} course(s) from this backup?`)) return;
      api.replaceAll(next);
      setStatus(`Restored ${next.courses.length} course(s)`);
    } catch {
      setStatus("That file is not a valid Elenya backup");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="backup-actions">
      <button onClick={() => input.current?.click()} className="backup-button">↑ Restore JSON</button>
      <button onClick={() => exportToFile(api.data)} className="backup-button">↓ Export JSON</button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e.target.files?.[0])} />
      {status && <span role="status" className="backup-status">{status}</span>}
    </div>
  );
}
