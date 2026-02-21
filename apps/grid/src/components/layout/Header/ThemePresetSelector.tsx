import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@blibliki/ui";
import { Check, SwatchBook } from "lucide-react";
import { useThemePreset } from "@/hooks";
import { THEME_PRESET_OPTIONS } from "@/theme/presets";

export default function ThemePresetSelector() {
  const { themePreset, setThemePreset } = useThemePreset();
  const selectedPreset =
    THEME_PRESET_OPTIONS.find((preset) => preset.id === themePreset) ??
    THEME_PRESET_OPTIONS[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="text"
          color="neutral"
          size="sm"
          className="h-10 px-3"
          aria-label="Theme preset"
        >
          <SwatchBook className="w-4 h-4" />
          {selectedPreset.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1">
        {THEME_PRESET_OPTIONS.map((preset) => (
          <DropdownMenuItem
            key={preset.id}
            onSelect={() => {
              setThemePreset(preset.id);
            }}
            className="justify-between"
          >
            <span>{preset.label}</span>
            <Check
              className={`w-4 h-4 ${
                themePreset === preset.id ? "opacity-100" : "opacity-0"
              }`}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
