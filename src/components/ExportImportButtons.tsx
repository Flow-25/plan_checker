import type { AppDataApi } from "../hooks/useAppData";
import { exportToFile } from "../storage/persistence";

interface Props {
  api: AppDataApi;
}

export default function ExportImportButtons({ api }: Props) {
  return (
    <button
      onClick={() => exportToFile(api.data)}
      className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700"
    >
      ⭳ Export backup
    </button>
  );
}
