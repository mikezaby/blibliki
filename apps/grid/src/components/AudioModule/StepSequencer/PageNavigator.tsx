import { IPage } from "@blibliki/engine";
import { Button, Stack, Text } from "@blibliki/ui";
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
    <Stack direction="row" align="center" gap={3} className="flex-wrap">
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

      <Text size="sm" weight="medium">
        Page {activePageNo + 1} / {pages.length}
      </Text>

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

      <Text tone="muted" size="xs">
        {pages[activePageNo]?.name ?? "Unnamed Page"}
      </Text>

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
    </Stack>
  );
}
