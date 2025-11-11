import { Link } from "@tanstack/react-router";
import { FolderOpen, Search, User, ChevronRight } from "lucide-react";
import { useState } from "react";
import Modal, { close as closeModal } from "@/components/Modal";
import { Button, Input } from "@/components/ui";
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
      className="sm:max-w-2xl max-w-[calc(100vw-2rem)] p-0 gap-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-lg">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
          <FolderOpen className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
            Load Patch
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a patch to load into the grid
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search patches..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
          />
        </div>
      </div>

      {/* Patches List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredPatches.length === 0 ? (
          <div className="p-8 text-center">
            <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {searchQuery
                ? "No patches match your search"
                : "No patches found"}
            </p>
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {filteredPatches.map(({ id, name, userId }) => (
              <li key={id}>
                <Link
                  to="/patch/$patchId"
                  params={{ patchId: id }}
                  onClick={close}
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full group-hover:scale-110 transition-transform duration-200" />
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">
                        {name || "Untitled Patch"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      {userId && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {userId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            {filteredPatches.length}{" "}
            {filteredPatches.length === 1 ? "patch" : "patches"} available
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
