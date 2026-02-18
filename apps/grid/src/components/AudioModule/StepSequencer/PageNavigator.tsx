import { IPage } from "@blibliki/engine";
import { Button } from "@blibliki/ui";
import { Plus } from "lucide-react";

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
      <Button
        variant="outlined"
        size="sm"
        onClick={() => {
          if (canGoPrev) onPageChange(activePageNo - 1);
        }}
        disabled={!canGoPrev}
      >
        ←
      </Button>

      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Page {activePageNo + 1} / {pages.length}
      </div>

      <Button
        variant="outlined"
        size="sm"
        onClick={() => {
          if (canGoNext) onPageChange(activePageNo + 1);
        }}
        disabled={!canGoNext}
      >
        →
      </Button>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        {pages[activePageNo]?.name ?? "Unnamed Page"}
      </div>

      <Button color="success" size="sm" onClick={onAddPage}>
        <Plus className="w-4 h-4" />
        Page
      </Button>
      {pages.length > 1 && (
        <Button
          color="error"
          size="sm"
          onClick={() => {
            onDeletePage(activePageNo);
          }}
          title="Delete current page"
        >
          Delete Page
        </Button>
      )}
    </div>
  );
}
