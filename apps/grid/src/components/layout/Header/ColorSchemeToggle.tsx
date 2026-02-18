import { Button } from "@blibliki/ui";
import { Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { ColorScheme, useColorScheme } from "@/hooks";

export default function ColorSchemToggle() {
  const { setColorScheme } = useColorScheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" color="neutral" size="icon" className="relative">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-32 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
      >
        <DropdownMenuItem
          className="flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors"
          onClick={() => {
            setColorScheme(ColorScheme.Light);
          }}
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors"
          onClick={() => {
            setColorScheme(ColorScheme.Dark);
          }}
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors"
          onClick={() => {
            setColorScheme(ColorScheme.System);
          }}
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
