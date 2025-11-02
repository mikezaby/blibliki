import { useRef, useCallback } from "react";

type UseUploadProps = {
  accept: string;
  onFilesSelected?: (files: FileList) => void | Promise<void>;
  multiple?: boolean;
};

const useUpload = (props: UseUploadProps) => {
  const { accept, onFilesSelected, multiple = false } = props;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Create hidden input element if it doesn't exist
  const getFileInput = useCallback(() => {
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = "none";

      input.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        if (!target.files?.length) return;

        if (onFilesSelected) {
          void onFilesSelected(target.files);
        }
        // Reset the input value to allow selecting the same file again
        target.value = "";
      });

      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    return fileInputRef.current;
  }, [accept, multiple, onFilesSelected]);

  const open = useCallback(() => {
    const input = getFileInput();
    input.click();
  }, [getFileInput]);

  // Cleanup function to remove the input element
  const cleanup = useCallback(() => {
    if (fileInputRef.current) {
      document.body.removeChild(fileInputRef.current);
      fileInputRef.current = null;
    }
  }, []);

  return {
    open,
    cleanup,
  };
};

export default useUpload;
