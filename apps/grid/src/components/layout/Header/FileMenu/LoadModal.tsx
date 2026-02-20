import { Button, Divider, Input, Stack, Surface } from "@blibliki/ui";
import { Link } from "@tanstack/react-router";
import { FolderOpen, Search, User, ChevronRight } from "lucide-react";
import { useState } from "react";
import Modal, { close as closeModal } from "@/components/Modal";
import { useAppDispatch, usePatches } from "@/hooks";

export default function LoadPatchModal() {
  const dispatch = useAppDispatch();
  const patches = usePatches();
  const [searchQuery, setSearchQuery] = useState("");

  const close = () => {
    dispatch(closeModal("patch"));
  };

  const filteredPatches = patches.filter((patch) =>
    patch.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal
      modalName="patch"
      className="sm:max-w-2xl max-w-[calc(100vw-2rem)] p-0 gap-0 border-0 bg-transparent shadow-none"
    >
      <Surface
        tone="raised"
        border="subtle"
        radius="lg"
        className="overflow-hidden"
      >
        <Surface tone="panel" radius="none" asChild>
          <header className="p-6">
            <Stack direction="row" align="center" gap={3}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  Load Patch
                </h2>
                <p
                  className="text-sm"
                  style={{ color: "var(--ui-color-text-muted)" }}
                >
                  Select a patch to load into the grid
                </p>
              </div>
            </Stack>
          </header>
        </Surface>

        <Divider />

        <Surface tone="panel" radius="none" asChild>
          <section className="p-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--ui-color-text-muted)" }}
              />
              <Input
                placeholder="Search patches..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="pl-10"
              />
            </div>
          </section>
        </Surface>

        <Divider />

        <div className="max-h-96 overflow-y-auto">
          {filteredPatches.length === 0 ? (
            <div className="p-8 text-center">
              <FolderOpen
                className="mx-auto mb-4 h-12 w-12"
                style={{ color: "var(--ui-color-text-muted)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--ui-color-text-muted)" }}
              >
                {searchQuery
                  ? "No patches match your search"
                  : "No patches found"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1 p-2">
              {filteredPatches.map(({ id, name, userId }) => (
                <li key={id}>
                  <Button
                    asChild
                    variant="text"
                    color="neutral"
                    size="sm"
                    className="h-auto w-full justify-between p-3"
                  >
                    <Link
                      to="/patch/$patchId"
                      params={{ patchId: id }}
                      onClick={close}
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
                          <h3 className="truncate font-medium">
                            {name || "Untitled Patch"}
                          </h3>
                        </div>
                        <div
                          className="flex items-center gap-4 text-xs"
                          style={{ color: "var(--ui-color-text-muted)" }}
                        >
                          {userId && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {userId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className="h-4 w-4"
                        style={{ color: "var(--ui-color-text-muted)" }}
                      />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Divider />

        <Surface tone="panel" radius="none" asChild>
          <footer className="p-4">
            <Stack direction="row" align="center" justify="between">
              <p
                className="text-xs italic"
                style={{ color: "var(--ui-color-text-muted)" }}
              >
                {filteredPatches.length}{" "}
                {filteredPatches.length === 1 ? "patch" : "patches"} available
              </p>
              <Button
                variant="text"
                color="secondary"
                size="sm"
                onClick={close}
              >
                Cancel
              </Button>
            </Stack>
          </footer>
        </Surface>
      </Surface>
    </Modal>
  );
}
