import { IPatch } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { useUser } from "@clerk/clerk-react";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Save,
  Copy,
  FolderOpen,
  Trash2,
  Upload,
  Download,
  TableOfContents,
} from "lucide-react";
import { ReactNode } from "react";
import { TriggerModal } from "@/components/Modal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui";
import { useAppDispatch, usePatch } from "@/hooks";
import useUpload from "@/hooks/useUpload";
import { destroy, load, save } from "@/patchSlice";
import ExportEngine from "./ExportEngine";
import ExportGrid from "./ExportGrid";

const menuItemClassName = "w-full justify-start";

export default function FileMenu() {
  const dispatch = useAppDispatch();
  const { patch, canCreate, canUpdate, canDelete } = usePatch();
  const { open: openUpload } = useUpload({
    accept: ".json",
    onFilesSelected: async (value) => {
      const file = value[0]!;
      const text = await file.text();
      const patch = JSON.parse(text) as IPatch;
      dispatch(load({ ...patch, id: "", userId: "" }));
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" color="neutral" size="sm" className="h-10 px-3">
          <TableOfContents className="w-4 h-4" />
          File
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg"
        align="start"
        sideOffset={4}
        alignOffset={-4}
      >
        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem asChild>
            <Button
              asChild
              variant="text"
              color="neutral"
              size="sm"
              className={menuItemClassName}
            >
              <Link to="/patch/$patchId" params={{ patchId: "new" }}>
                <Plus className="w-4 h-4" />
                New
              </Link>
            </Button>
          </DropdownMenuItem>

          {(canCreate || canUpdate) && (
            <DropdownMenuItem asChild>
              <SaveButton asNew={false} className={menuItemClassName}>
                <Save className="w-4 h-4" />
                Save
              </SaveButton>
            </DropdownMenuItem>
          )}

          {patch.id && canCreate && (
            <DropdownMenuItem asChild>
              <SaveButton asNew={true} className={menuItemClassName}>
                <Copy className="w-4 h-4" />
                Save As Copy
              </SaveButton>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild>
            <TriggerModal
              modalName="patch"
              type="open"
              className={menuItemClassName}
            >
              <FolderOpen className="w-4 h-4" />
              Load
            </TriggerModal>
          </DropdownMenuItem>

          {canDelete && (
            <DropdownMenuItem asChild>
              <Destroy disabled={!patch.id} className={menuItemClassName}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Destroy>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-3 bg-slate-200 dark:bg-slate-700" />

        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem asChild>
            <Button
              onClick={openUpload}
              variant="text"
              color="neutral"
              size="sm"
              className={menuItemClassName}
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <ExportGrid className={menuItemClassName}>
              <Download className="w-4 h-4" />
              Export for Grid
            </ExportGrid>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <ExportEngine className={menuItemClassName}>
              <Download className="w-4 h-4" />
              Export for engine
            </ExportEngine>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SaveButton(props: {
  asNew: boolean;
  children: ReactNode;
  className?: string;
}) {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const { asNew, children, className = "" } = props;

  const onSave = () => {
    if (!user) throw Error("You can't save without login");

    void dispatch(save({ userId: user.id, asNew }));
  };

  return (
    <Button
      onClick={onSave}
      variant="text"
      color="neutral"
      size="sm"
      className={className}
    >
      {children}
    </Button>
  );
}

function Destroy(props: {
  disabled: boolean;
  children: ReactNode;
  className?: string;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { disabled, children, className = "" } = props;

  const onDestroy = async () => {
    await dispatch(destroy());
    await navigate({ to: "/patch/$patchId", params: { patchId: "new" } });
  };

  return (
    <Button
      className={className}
      onClick={() => {
        void onDestroy();
      }}
      disabled={disabled}
      variant="text"
      color="error"
      size="sm"
    >
      {children}
    </Button>
  );
}
