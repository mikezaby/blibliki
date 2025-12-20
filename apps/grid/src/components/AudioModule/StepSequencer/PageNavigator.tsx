import { IPage } from "@blibliki/engine";

type PageNavigatorProps = {
  pages: IPage[];
  activePageNo: number;
  onPageChange: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
};

export default function PageNavigator({
  pages,
  activePageNo,
  onPageChange,
  onAddPage,
  onDeletePage,
}: PageNavigatorProps) {
  const canGoPrev = activePageNo > 0;
  const canGoNext = activePageNo < pages.length - 1;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => {
          if (canGoPrev) onPageChange(activePageNo - 1);
        }}
        disabled={!canGoPrev}
        className={`
          px-2 py-1 text-sm rounded
          ${
            canGoPrev
              ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          }
        `}
      >
        ←
      </button>

      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Page {activePageNo + 1} / {pages.length}
      </div>

      <button
        onClick={() => {
          if (canGoNext) onPageChange(activePageNo + 1);
        }}
        disabled={!canGoNext}
        className={`
          px-2 py-1 text-sm rounded
          ${
            canGoNext
              ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          }
        `}
      >
        →
      </button>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        {pages[activePageNo]?.name ?? "Unnamed Page"}
      </div>

      {pages.length > 1 && (
        <button
          onClick={() => {
            onDeletePage(activePageNo);
          }}
          className="px-3 py-1 text-sm font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
          title="Delete current page"
        >
          Delete Page
        </button>
      )}

      <button
        onClick={onAddPage}
        className="ml-auto px-3 py-1 text-sm font-medium rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
      >
        + Page
      </button>
    </div>
  );
}
