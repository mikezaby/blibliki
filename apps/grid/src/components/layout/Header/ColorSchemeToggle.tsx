import {
  IconButton,
  MenuContent,
  MenuItem,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
  Portal,
} from "@chakra-ui/react";
import { Moon, Sun } from "lucide-react";
import { ColorScheme, useColorScheme } from "@/hooks/useColorScheme";

const OPTIONS = [
  { label: "Light", value: ColorScheme.Light },
  { label: "Dark", value: ColorScheme.Dark },
  { label: "System", value: ColorScheme.System },
] as const;

export default function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();

  const icon =
    colorScheme === ColorScheme.Dark ? <Moon size={18} /> : <Sun size={18} />;

  return (
    <MenuRoot positioning={{ placement: "bottom-end" }}>
      <MenuTrigger asChild>
        <IconButton
          aria-label="Toggle theme"
          size="sm"
          variant="ghost"
          colorPalette="gray"
        >
          {icon}
        </IconButton>
      </MenuTrigger>
      <Portal>
        <MenuPositioner>
          <MenuContent minW="8rem">
            {OPTIONS.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                onClick={() => {
                  setColorScheme(option.value);
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </MenuContent>
        </MenuPositioner>
      </Portal>
    </MenuRoot>
  );
}
