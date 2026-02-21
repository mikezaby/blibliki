import { Engine } from "@blibliki/engine";
import { IPatch } from "@blibliki/models";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@blibliki/ui";
import { useUser } from "@clerk/clerk-react";
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
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import { open as openModal } from "@/components/Modal/modalSlice";
import { useAppDispatch, useAppSelector, usePatch } from "@/hooks";
import useUpload from "@/hooks/useUpload";
import { destroy, load, save } from "@/patchSlice";

export default function FileMenu() {
  const dispatch = useAppDispatch();
  const { patch, canCreate, canUpdate, canDelete } = usePatch();
  const { bpm } = useAppSelector((state) => state.global);
  const gridNodes = useAppSelector((state) => state.gridNodes);
  const modules = useAppSelector((state) => modulesSelector.selectAll(state));
  const navigate = useNavigate();
  const { user } = useUser();
  const { open: openUpload } = useUpload({
    accept: ".json",
    onFilesSelected: async (value) => {
      const file = value[0]!;
      const text = await file.text();
      const patch = JSON.parse(text) as IPatch;
      dispatch(load({ ...patch, id: "", userId: "" }));
    },
  });

  const onSave = (asNew: boolean) => {
    if (!user) throw Error("You can't save without login");

    void dispatch(save({ userId: user.id, asNew }));
  };

  const onDestroy = async () => {
    await dispatch(destroy());
    await navigate({ to: "/patch/$patchId", params: { patchId: "new" } });
  };

  const exportGridJSON = () => {
    const data: IPatch = {
      id: "",
      userId: "",
      name: patch.name,
      config: { bpm, modules, gridNodes },
    };

    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${patch.name.split(" ").join("_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportEngineJSON = () => {
    const data = Engine.current.serialize();

    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${patch.name.split(" ").join("_")}_engine.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" color="neutral" size="sm" className="h-10 px-3">
          <TableOfContents className="w-4 h-4" />
          File
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 p-2" align="start" alignOffset={-4}>
        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem asChild>
            <Link to="/patch/$patchId" params={{ patchId: "new" }}>
              <Plus className="w-4 h-4" />
              New
            </Link>
          </DropdownMenuItem>

          {(canCreate || canUpdate) && (
            <DropdownMenuItem
              onSelect={() => {
                onSave(false);
              }}
            >
              <Save className="w-4 h-4" />
              Save
            </DropdownMenuItem>
          )}

          {patch.id && canCreate && (
            <DropdownMenuItem
              onSelect={() => {
                onSave(true);
              }}
            >
              <Copy className="w-4 h-4" />
              Save As Copy
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onSelect={() => {
              dispatch(openModal("patch"));
            }}
          >
            <FolderOpen className="w-4 h-4" />
            Load
          </DropdownMenuItem>

          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              disabled={!patch.id}
              onSelect={() => {
                void onDestroy();
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem
            onSelect={() => {
              openUpload();
            }}
          >
            <Upload className="w-4 h-4" />
            Import
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              exportGridJSON();
            }}
          >
            <Download className="w-4 h-4" />
            Export for Grid
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              exportEngineJSON();
            }}
          >
            <Download className="w-4 h-4" />
            Export for engine
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
