import { Box, Flex, HStack, Text } from "@chakra-ui/react";
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
    <Box
      as="header"
      h="12"
      px="4"
      bg="surfaceBg"
      borderBottomWidth="1px"
      borderColor="border"
      boxShadow="sm"
    >
      <Flex align="center" h="full">
        <HStack gap="2" mr="4">
          <Text fontSize="lg" fontWeight="bold" letterSpacing="tight">
            Blibliki
          </Text>
        </HStack>

        <HStack gap="2">
          <FileMenu />
          <SignedIn>
            <Button as={Link} to="/devices" variant="ghost" size="sm">
              <Cpu size={16} />
              <Text fontSize="sm">Devices</Text>
            </Button>
          </SignedIn>
        </HStack>

        <HStack gap="3" minW="280px" ml="6">
          <VerticalDivider />

          <HStack gap="2">
            <Text fontSize="xs" fontWeight="medium" textTransform="uppercase">
              Project
            </Text>
            <Input
              h="7"
              w="10rem"
              fontSize="sm"
              fontWeight="medium"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                dispatch(setPatchName(event.target.value))
              }
              value={patchName}
              placeholder="Untitled Patch"
            />
          </HStack>
        </HStack>

        <Flex flex="1" justify="center">
          <HStack gap="3">
            <HStack gap="2">
              <Text fontSize="xs" fontWeight="medium" textTransform="uppercase">
                BPM
              </Text>
              <Input
                h="7"
                w="4.5rem"
                textAlign="center"
                fontSize="sm"
                fontFamily="mono"
                type="number"
                min="10"
                max="999"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  dispatch(setBpm(+event.target.value));
                }}
                value={bpm}
              />
            </HStack>

            <VerticalDivider />

            <Button
              onClick={togglePlay}
              variant="secondary"
              size="icon"
              rounded="full"
            >
              {isStarted ? <Square size={16} /> : <Play size={16} />}
            </Button>
          </HStack>
        </Flex>

        <HStack gap="3" minW="200px" justify="flex-end">
          <VerticalDivider />

          <ColorSchemeToggle />
          <Button
            as="a"
            href="https://github.com/mikezaby/blibliki"
            target="_blank"
            rel="noreferrer"
            variant="ghost"
            size="sm"
          >
            <Github />
          </Button>

          <VerticalDivider />

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
            >
              <LogIn size={16} />
              <Text fontSize="sm">Sign In</Text>
            </Button>
          </SignedOut>
        </HStack>
        {modalName === "patch" && <LoadModal />}
      </Flex>
    </Box>
  );
}

function VerticalDivider() {
  return <Box h="6" w="1px" bg="border" />;
}

function Github() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
    </svg>
  );
}
