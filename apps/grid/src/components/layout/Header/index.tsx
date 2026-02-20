import {
  Button,
  Divider,
  IconButton,
  Input,
  Label,
  Stack,
  Surface,
} from "@blibliki/ui";
import { SignedIn, SignedOut, useClerk, UserButton } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Cpu, LogIn, Play, Square } from "lucide-react";
import { ChangeEvent, useCallback, useEffect } from "react";
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
    <Surface
      tone="panel"
      border="subtle"
      className="flex h-12 items-center border-x-0 border-t-0 px-4"
    >
      <Stack direction="row" align="center" gap={2} className="mr-4">
        <h1 className="text-lg font-bold tracking-tight">Blibliki</h1>
      </Stack>

      <Stack direction="row" align="center" gap={2}>
        <FileMenu />
        <SignedIn>
          <Button asChild variant="text" color="neutral" size="sm">
            <Link to="/devices">
              <Cpu className="w-4 h-4" />
              <span>Devices</span>
            </Link>
          </Button>
        </SignedIn>
      </Stack>

      <Stack direction="row" align="center" gap={3} className="ml-6 min-w-70">
        <Divider orientation="vertical" className="h-6" />

        <Stack direction="row" align="center" gap={2}>
          <Label className={fieldLabelClassName}>Project</Label>
          <Input
            size="sm"
            className="w-40 font-medium"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              dispatch(setPatchName(event.target.value))
            }
            value={patchName}
            placeholder="Untitled Patch"
          />
        </Stack>
      </Stack>

      <Stack
        direction="row"
        align="center"
        justify="center"
        gap={4}
        className="flex-1"
      >
        <Stack direction="row" align="center" gap={3}>
          <Stack direction="row" align="center" gap={2}>
            <Label className={fieldLabelClassName}>BPM</Label>
            <Input
              size="sm"
              className="w-18 text-center font-mono"
              type="number"
              min="10"
              max="999"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                dispatch(setBpm(+event.target.value));
              }}
              value={bpm}
            />
          </Stack>

          <Divider orientation="vertical" className="h-6" />

          <IconButton
            aria-label={isStarted ? "Stop transport" : "Start transport"}
            icon={
              isStarted ? (
                <Square className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )
            }
            onClick={togglePlay}
            variant="contained"
            color="neutral"
          />
        </Stack>
      </Stack>

      <Stack
        direction="row"
        align="center"
        gap={3}
        justify="end"
        className="min-w-50"
      >
        <Divider orientation="vertical" className="h-6" />

        <ColorSchemeToggle />
        <Button asChild variant="text" color="neutral" size="sm">
          <a
            href="https://github.com/mikezaby/blibliki"
            target="_blank"
            rel="noreferrer"
          >
            <Github />
          </a>
        </Button>

        <Divider orientation="vertical" className="h-6" />

        <SignedIn>
          <UserButton userProfileUrl="/user" />
        </SignedIn>
        <SignedOut>
          <Button
            variant="text"
            color="neutral"
            size="sm"
            onClick={() => {
              openSignIn();
            }}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Button>
        </SignedOut>
      </Stack>
      {modalName === "patch" && <LoadModal />}
    </Surface>
  );
}

const fieldLabelClassName = "text-xs font-medium uppercase tracking-wide";

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
