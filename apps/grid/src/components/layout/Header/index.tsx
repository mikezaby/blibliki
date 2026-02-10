import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Cpu, LogIn, Play, Square } from "lucide-react";
import { ChangeEvent, useCallback, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import { start, stop, setBpm } from "@/globalSlice";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { setName as setPatchName } from "@/patchSlice";
import ColorSchemeToggle from "./ColorSchemeToggle";
import FileMenu from "./FileMenu";
import LoadModal from "./FileMenu/LoadModal";
import { shouldToggleTransportOnSpace } from "./transportKeyboardShortcut";

export default function Header() {
  const dispatch = useAppDispatch();
  const { openSignIn } = useClerk();

  const { isStarted, bpm } = useAppSelector((state) => state.global);
  const { modalName } = useAppSelector((state) => state.modal);
  const {
    patch: { name: patchName },
  } = useAppSelector((state) => state.patch);

  const togglePlay = useCallback(() => {
    const toggle = isStarted ? stop : start;
    dispatch(toggle());
  }, [dispatch, isStarted]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldToggleTransportOnSpace(event)) return;

      event.preventDefault();
      togglePlay();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [togglePlay]);

  return (
    <header className="flex items-center h-12 px-4 bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-lg">
      {/* Logo in Transport Area */}
      <div className="flex items-center gap-2 mr-4">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Blibliki
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <FileMenu />
        <SignedIn>
          <Button
            as={Link}
            to="/devices"
            variant="ghost"
            size="sm"
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
            <span className="ml-2 text-sm">Devices</span>
          </Button>
        </SignedIn>
      </div>

      {/* Project Controls Section */}
      <div className="flex items-center gap-3 min-w-[280px] ml-6">
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wide">
            Project
          </label>
          <Input
            className="h-7 w-40 bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              dispatch(setPatchName(event.target.value))
            }
            value={patchName}
            placeholder="Untitled Patch"
          />
        </div>
      </div>

      {/* Transport Controls Section with Logo */}
      <div className="flex items-center justify-center flex-1 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wide">
              BPM
            </label>
            <Input
              className="h-7 w-18 bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm font-mono text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              type="number"
              min="10"
              max="999"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                dispatch(setBpm(+event.target.value));
              }}
              value={bpm}
            />
          </div>

          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />

          <Button
            onClick={togglePlay}
            className="h-8 w-8 rounded-full shadow-lg transition-all duration-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-slate-400/25 dark:shadow-slate-800/50 cursor-pointer"
          >
            {isStarted ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
        </div>
      </div>

      {/* User & Settings Section */}
      <div className="flex items-center gap-3 min-w-[200px] justify-end">
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />

        <ColorSchemeToggle />
        <Button
          as="a"
          href="https://github.com/mikezaby/blibliki"
          target="_blank"
          rel="noreferrer"
          variant="ghost"
          size="sm"
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"
        >
          <Github />
        </Button>

        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />

        <SignedIn>
          <UserButton userProfileUrl="/user" />
        </SignedIn>
        <SignedOut>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              openSignIn();
            }}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span className="ml-2 text-sm">Sign In</span>
          </Button>
        </SignedOut>
      </div>
      {modalName === "patch" && <LoadModal />}
    </header>
  );
}

function Github() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-5 h-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
    </svg>
  );
}
