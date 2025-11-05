import {
  SignedIn,
  SignedOut,
  UserButton,
  useClerk,
} from "@clerk/tanstack-react-start";
import { LogIn, Octagon, Play } from "lucide-react";
import { ChangeEvent, ReactNode } from "react";
import { Button, Input, buttonVariants } from "@/components/ui";
import { start, stop, setBpm } from "@/globalSlice";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { setName as setPatchName } from "@/patchSlice";
import ColorSchemeToggle from "./ColorSchemeToggle";
import Patch from "./Patch";
import LoadModal from "./Patch/LoadModal";

export default function Header() {
  const dispatch = useAppDispatch();
  const { openSignIn } = useClerk();

  const { isStarted, bpm } = useAppSelector((state) => state.global);
  const {
    patch: { name: patchName },
  } = useAppSelector((state) => state.patch);

  const togglePlay = () => {
    const toggle = isStarted ? stop : start;
    dispatch(toggle());
  };

  return (
    <div className="flex items-center justify-between p-2 border-b-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-900">
      <Group>
        <Patch />
        <Input
          className="w-40"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            dispatch(setPatchName(event.target.value))
          }
          value={patchName}
        />
        <Input
          className="w-20"
          type="number"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            dispatch(setBpm(+event.target.value));
          }}
          value={bpm}
        />
      </Group>
      <Group>
        <Button variant="outline" onClick={togglePlay}>
          {isStarted ? <Octagon /> : <Play />}
        </Button>
      </Group>
      <Group>
        <ColorSchemeToggle />
        <a
          href="https://github.com/mikezaby/blibliki"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          <Github />
        </a>

        <SignedIn>
          <UserButton userProfileUrl="/user" />
        </SignedIn>
        <SignedOut>
          <Button
            variant="outline"
            onClick={() => {
              openSignIn();
            }}
          >
            <LogIn />
          </Button>
        </SignedOut>
      </Group>

      <LoadModal />
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
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
