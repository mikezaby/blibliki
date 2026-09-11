import { Button } from "@blibliki/ui";
import { FolderOpen } from "lucide-react";
import { useRef } from "react";
import { useAppDispatch } from "@/hooks";
import { store } from "@/store";
import { setMediaFile } from "@/video/videoHost";
import { updateVideoModuleProps } from "@/video/videoPatchSlice";

type Props = { id: string; file: string; accept: string };

// Picks the file behind an Image or Video module. The file goes to the
// host for this session; only its name is saved with the patch.
export default function MediaBody({ id, file, accept }: Props) {
  const dispatch = useAppDispatch();
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (!picked) return;
          setMediaFile(store, id, picked);
          dispatch(
            updateVideoModuleProps({ id, props: { file: picked.name } }),
          );
          event.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="contained"
        color="neutral"
        className="max-w-48 truncate"
        onClick={() => input.current?.click()}
      >
        <FolderOpen className="h-4 w-4" />
        {file || "Choose file"}
      </Button>
    </>
  );
}
