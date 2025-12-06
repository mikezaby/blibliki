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
  Button,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui";
import { useAppDispatch, usePatch } from "@/hooks";
import useUpload from "@/hooks/useUpload";
import { IPatch } from "@/models/Patch";
import { destroy, load, save } from "@/patchSlice";
import ExportEngine from "./ExportEngine";
import ExportGrid from "./ExportGrid";

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
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 h-10 px-3 gap-1.5 font-medium cursor-pointer"
        >
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
            <Link
              to="/patch/$patchId"
              params={{ patchId: "new" }}
              className="group flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">New</span>
            </Link>
          </DropdownMenuItem>

          {(canCreate || canUpdate) && (
            <DropdownMenuItem asChild>
              <SaveButton
                asNew={false}
                className="group flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 w-full text-left border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              >
                <Save className="w-4 h-4" />
                <span className="font-medium">Save</span>
              </SaveButton>
            </DropdownMenuItem>
          )}
          {patch.id && canCreate && (
            <DropdownMenuItem asChild>
              <SaveButton
                asNew={true}
                className="group flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 w-full text-left border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              >
                <Copy className="w-4 h-4" />
                <span className="font-medium">Save As Copy</span>
              </SaveButton>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <TriggerModal
              modalName="patch"
              type="open"
              className="group flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 w-full border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="font-medium">Load</span>
            </TriggerModal>
          </DropdownMenuItem>

          {canDelete && (
            <DropdownMenuItem asChild>
              <Destroy
                disabled={!patch.id}
                className="group flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg cursor-pointer transition-all duration-200 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-red-200 dark:hover:border-red-800 disabled:hover:border-transparent"
              >
                <Trash2 className="w-4 h-4" />
                <span className="font-medium">Delete</span>
              </Destroy>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-3 bg-slate-200 dark:bg-slate-700" />

        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem asChild>
            <button
              onClick={openUpload}
              className="group flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 w-full text-left border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
            >
              <Upload className="w-4 h-4" />
              <span className="font-medium">Import</span>
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <div className="group flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 w-full border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
              <Download className="w-4 h-4" />
              <ExportGrid />
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <div className="group flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 w-full border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
              <Download className="w-4 h-4" />
              <ExportEngine />
            </div>
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
    <button onClick={onSave} className={className}>
      {children}
    </button>
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
    <button
      className={className}
      onClick={() => {
        void onDestroy();
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
