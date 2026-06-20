import { Button, Stack, Text } from "@blibliki/ui";
import { ClipboardPaste, Copy } from "lucide-react";

type ClipboardToolbarProps = {
  selectionLabel: string;
  status?: string;
  onCopy: () => void;
  onPaste: () => void;
};

export default function ClipboardToolbar({
  selectionLabel,
  status,
  onCopy,
  onPaste,
}: ClipboardToolbarProps) {
  return (
    <Stack
      direction="row"
      align="center"
      justify="between"
      gap={3}
      className="flex-wrap"
    >
      <Stack direction="row" align="center" gap={2}>
        <Text size="sm" weight="medium" data-testid="clipboard-selection-label">
          {selectionLabel}
        </Text>
        {status && (
          <Text size="xs" tone="muted" role="status">
            {status}
          </Text>
        )}
      </Stack>

      <Stack direction="row" gap={2}>
        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          onClick={onCopy}
          title="Copy selection (Cmd/Ctrl+C)"
        >
          <Copy className="h-4 w-4" />
          Copy
        </Button>
        <Button
          size="sm"
          variant="outlined"
          color="neutral"
          onClick={onPaste}
          title="Paste selection (Cmd/Ctrl+V)"
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste
        </Button>
      </Stack>
    </Stack>
  );
}
