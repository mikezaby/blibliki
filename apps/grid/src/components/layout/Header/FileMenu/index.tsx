import { IPatch } from "@blibliki/models";
import {
  HStack,
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuPositioner,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
  Portal,
  Text,
} from "@chakra-ui/react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import {
  Copy,
  Download,
  FolderOpen,
  Plus,
  Save,
  TableOfContents,
  Trash2,
  Upload,
} from "lucide-react";
import { open as openModal } from "@/components/Modal/modalSlice";
import { useAppDispatch, usePatch } from "@/hooks";
import useUpload from "@/hooks/useUpload";
import { destroy, load, save } from "@/patchSlice";
import { Button } from "@/ui-system/components";
import ExportEngine from "./ExportEngine";
import ExportGrid from "./ExportGrid";

export default function FileMenu() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useUser();
  const { patch, canCreate, canUpdate, canDelete } = usePatch();

  const { open: openUpload } = useUpload({
    accept: ".json",
    onFilesSelected: async (value) => {
      const file = value[0]!;
      const text = await file.text();
      const parsedPatch = JSON.parse(text) as IPatch;
      dispatch(load({ ...parsedPatch, id: "", userId: "" }));
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

  return (
    <MenuRoot positioning={{ placement: "bottom-start" }}>
      <MenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          h="10"
          px="3"
          gap="1.5"
          fontWeight="medium"
        >
          <TableOfContents size={16} />
          File
        </Button>
      </MenuTrigger>

      <Portal>
        <MenuPositioner>
          <MenuContent minW="18rem" p="2">
            <MenuItemGroup>
              <MenuItem
                value="new"
                onClick={() => {
                  void navigate({
                    to: "/patch/$patchId",
                    params: { patchId: "new" },
                  });
                }}
              >
                <HStack gap="3">
                  <Plus size={16} />
                  <Text fontSize="sm" fontWeight="medium">
                    New
                  </Text>
                </HStack>
              </MenuItem>

              {(canCreate || canUpdate) && (
                <MenuItem
                  value="save"
                  onClick={() => {
                    onSave(false);
                  }}
                >
                  <HStack gap="3">
                    <Save size={16} />
                    <Text fontSize="sm" fontWeight="medium">
                      Save
                    </Text>
                  </HStack>
                </MenuItem>
              )}

              {patch.id && canCreate && (
                <MenuItem
                  value="save-as-copy"
                  onClick={() => {
                    onSave(true);
                  }}
                >
                  <HStack gap="3">
                    <Copy size={16} />
                    <Text fontSize="sm" fontWeight="medium">
                      Save As Copy
                    </Text>
                  </HStack>
                </MenuItem>
              )}

              <MenuItem
                value="load"
                onClick={() => {
                  dispatch(openModal("patch"));
                }}
              >
                <HStack gap="3">
                  <FolderOpen size={16} />
                  <Text fontSize="sm" fontWeight="medium">
                    Load
                  </Text>
                </HStack>
              </MenuItem>

              {canDelete && (
                <MenuItem
                  value="delete"
                  disabled={!patch.id}
                  colorPalette="red"
                  onClick={() => {
                    void onDestroy();
                  }}
                >
                  <HStack gap="3">
                    <Trash2 size={16} />
                    <Text fontSize="sm" fontWeight="medium">
                      Delete
                    </Text>
                  </HStack>
                </MenuItem>
              )}
            </MenuItemGroup>

            <MenuSeparator my="3" />

            <MenuItemGroup>
              <MenuItem
                value="import"
                onClick={() => {
                  openUpload();
                }}
              >
                <HStack gap="3">
                  <Upload size={16} />
                  <Text fontSize="sm" fontWeight="medium">
                    Import
                  </Text>
                </HStack>
              </MenuItem>

              <MenuItem value="export-grid" closeOnSelect={false}>
                <HStack gap="3">
                  <Download size={16} />
                  <ExportGrid />
                </HStack>
              </MenuItem>

              <MenuItem value="export-engine" closeOnSelect={false}>
                <HStack gap="3">
                  <Download size={16} />
                  <ExportEngine />
                </HStack>
              </MenuItem>
            </MenuItemGroup>
          </MenuContent>
        </MenuPositioner>
      </Portal>
    </MenuRoot>
  );
}
