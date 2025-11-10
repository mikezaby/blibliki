import { useUser } from "@clerk/tanstack-react-start";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { TriggerModal } from "@/components/Modal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  Button,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui";
import { useAppDispatch, usePatch } from "@/hooks";
import useUpload from "@/hooks/useUpload";
import { IPatch } from "@/models/Patch";
import { destroy, load, save } from "@/patchSlice";
import Export from "./Export";

export default function Patch() {
  const dispatch = useAppDispatch();
  const { patch, canCreate, canUpdate, canDelete } = usePatch();
  const { open: openUpload } = useUpload({
    accept: ".json",
    onFilesSelected: async (value) => {
      const file = value[0]!;
      const text = await file.text();
      const patch = JSON.parse(text) as IPatch;
      dispatch(load(patch));
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Patch</Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 p-3">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link to="/patch/$patchId" params={{ patchId: "new" }}>
              New
            </Link>
          </DropdownMenuItem>

          {(canCreate || canUpdate) && (
            <DropdownMenuItem>
              <Save asNew={false}>Save</Save>
            </DropdownMenuItem>
          )}
          {patch.id && canCreate && (
            <DropdownMenuItem>
              <Save asNew={true}>Copy</Save>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem>
            <TriggerModal modalName="patch" type="open">
              <span>Load</span>
            </TriggerModal>
          </DropdownMenuItem>

          {canDelete && (
            <DropdownMenuItem>
              <Destroy disabled={!patch.id}>Delete</Destroy>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <button onClick={openUpload}>Import</button>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Export />
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Save(props: { asNew: boolean; children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const { asNew, children } = props;

  const onSave = () => {
    if (!user) throw Error("You can't save without login");

    void dispatch(save({ userId: user.id, asNew }));
  };

  return <button onClick={onSave}>{children}</button>;
}

function Destroy(props: { disabled: boolean; children: ReactNode }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { disabled, children } = props;

  const onDestroy = async () => {
    await dispatch(destroy());
    await navigate({ to: "/patch/$patchId", params: { patchId: "new" } });
  };

  return (
    <button
      onClick={() => {
        void onDestroy();
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
