import { useUser } from "@clerk/tanstack-react-start";
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
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 h-10 px-3 gap-1.5 font-medium"
        >
          <TableOfContents className="w-4 h-4" />
          File
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
        align="start"
        sideOffset={0}
        alignOffset={-4}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors">
            <Plus className="w-4 h-4" />
            <Link to="/patch/$patchId" params={{ patchId: "new" }}>
              New
            </Link>
          </DropdownMenuItem>

          {(canCreate || canUpdate) && (
            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors">
              <Save className="w-4 h-4" />
              <SaveButton asNew={false}>Save</SaveButton>
            </DropdownMenuItem>
          )}
          {patch.id && canCreate && (
            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors">
              <Copy className="w-4 h-4" />
              <SaveButton asNew={true}>Save As Copy</SaveButton>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors">
            <FolderOpen className="w-4 h-4" />
            <TriggerModal modalName="patch" type="open">
              <span>Load</span>
            </TriggerModal>
          </DropdownMenuItem>

          {canDelete && (
            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm cursor-pointer transition-colors">
              <Trash2 className="w-4 h-4" />
              <Destroy disabled={!patch.id}>Delete</Destroy>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-1 bg-slate-200 dark:bg-slate-700" />

        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <button onClick={openUpload} className="w-full text-left">
              Import
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm cursor-pointer transition-colors">
            <Download className="w-4 h-4" />
            <Export />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SaveButton(props: { asNew: boolean; children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const { asNew, children } = props;

  const onSave = () => {
    if (!user) throw Error("You can't save without login");

    void dispatch(save({ userId: user.id, asNew }));
  };

  return (
    <button onClick={onSave} className="w-full text-left">
      {children}
    </button>
  );
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
      className="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={() => {
        void onDestroy();
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
