import { IPage } from "@blibliki/engine";
import { Button, Flex, Text } from "@chakra-ui/react";

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
    <Flex align="center" gap="3" wrap="wrap">
      <Button
        onClick={() => {
          if (canGoPrev) onPageChange(activePageNo - 1);
        }}
        disabled={!canGoPrev}
        size="xs"
        variant="subtle"
      >
        ←
      </Button>

      <Text fontSize="sm" fontWeight="medium" color="fg">
        Page {activePageNo + 1} / {pages.length}
      </Text>

      <Button
        onClick={() => {
          if (canGoNext) onPageChange(activePageNo + 1);
        }}
        disabled={!canGoNext}
        size="xs"
        variant="subtle"
      >
        →
      </Button>

      <Text fontSize="xs" color="fg.muted">
        {pages[activePageNo]?.name ?? "Unnamed Page"}
      </Text>

      {pages.length > 1 && (
        <Button
          onClick={() => {
            onDeletePage(activePageNo);
          }}
          size="xs"
          colorPalette="red"
          variant="solid"
          title="Delete current page"
        >
          Delete Page
        </Button>
      )}

      <Button
        onClick={onAddPage}
        size="xs"
        colorPalette="green"
        variant="solid"
        marginInlineStart="auto"
      >
        + Page
      </Button>
    </Flex>
  );
}
