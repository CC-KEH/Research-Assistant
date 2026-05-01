import { error, info } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DialogType, LibraryProps, TreeNode } from "@/lib/types";
import { TreeView } from "@/components/small/Treeview";
import { useConfig } from "@/components/providers/ConfigProvider";
import {
  createDir,
  deleteItem,
  getLibraryData,
  writeFile,
  uploadFilesToLibrary,
} from "@/lib/backend";
import { extname } from "@tauri-apps/api/path";
import { KnowledgeStoreButton } from "@/components/small/KnowledgeStoreButton";
import { LibraryContextMenu } from "@/components/small/context-menus/LibraryContextMenu";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import LibraryLoader from "./small/LibraryLoader";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Library({ onFileSelect }: LibraryProps) {
  const navigate = useNavigate();
  const { config, loading } = useConfig();

  const projectPath = config?.basicConfig?.projectPath ?? "";
  const knowledgeStoreFiles = config?.knowledgeStoreConfig?.files;

  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [dialogName, setDialogName] = useState("");
  const [dialogType, setDialogType] = useState<DialogType | null>(null);

  // ── All hooks must come before any early return ───────────────────────────

  const reloadTreeData = useCallback(async () => {
    if (!projectPath) return;
    try {
      setIsLoading(true);
      const data = await getLibraryData(projectPath);
      setTreeData(data);
    } catch (err) {
      error(`Failed to reload tree data: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    if (!projectPath) return;
    reloadTreeData();
    const timer = setTimeout(() => reloadTreeData(), 1000);
    return () => clearTimeout(timer);
  }, [projectPath, reloadTreeData, knowledgeStoreFiles]);

  const getBasePath = useCallback((): string => {
    if (!selectedNodeId) return projectPath;
    const node = findNodeById(treeData, selectedNodeId);
    if (!node) return projectPath;
    return node.nodeType === "folder" ? node.path : projectPath;
  }, [selectedNodeId, treeData, projectPath]);

  const handleNewFileUpload = useCallback(async () => {
    const destination = getBasePath();
    const newFiles = await uploadFilesToLibrary(destination);
    if (newFiles) {
      info("✅ Files uploaded");
      await reloadTreeData();
    }
  }, [getBasePath, reloadTreeData]);

  const handleNewFile = useCallback(() => {
    setDialogType("file");
    setDialogName("");
    setShowNameDialog(true);
  }, []);

  const handleNewFolder = useCallback(() => {
    setDialogType("folder");
    setDialogName("");
    setShowNameDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setShowNameDialog(false);
    setDialogName("");
    setDialogType(null);
  }, []);

  const confirmCreateItem = useCallback(async () => {
    if (!projectPath || !dialogName.trim() || !dialogType) {
      error("Please enter a valid name");
      return;
    }
    try {
      setIsLoading(true);
      const basePath = getBasePath();
      if (dialogType === "file") {
        const fileName = dialogName.endsWith(".md")
          ? dialogName
          : `${dialogName}.md`;
        await writeFile(`${basePath}/${fileName}`, "");
        info("✅ New file created");
      } else {
        await createDir(`${basePath}/${dialogName.trim()}`);
        info("✅ New folder created");
      }
      handleCloseDialog();
      await reloadTreeData();
    } catch (err) {
      error(`Failed to create item: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [
    projectPath,
    dialogName,
    dialogType,
    getBasePath,
    handleCloseDialog,
    reloadTreeData,
  ]);

  const handleDelete = useCallback(async () => {
    if (!selectedNodeId) {
      error("No node selected");
      return;
    }
    try {
      setIsLoading(true);
      const node = findNodeById(treeData, selectedNodeId);
      if (!node) {
        error("Selected node not found");
        return;
      }
      await deleteItem(node.path);
      info("✅ Item deleted");
      setSelectedNodeId(null);
      await reloadTreeData();
    } catch (err) {
      error(`Failed to delete item: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNodeId, treeData, reloadTreeData]);

  const handleNewProject = useCallback(() => {
    navigate("/project-setup");
  }, [navigate]);

  const handleNodeClick = useCallback(
    async (node: TreeNode) => {
      setSelectedNodeId(node.id);
      if (node.nodeType === "file") {
        info(`Selected file: ${node.label}`);
        const ext = (await extname(node.path)).toLowerCase();
        onFileSelect({
          file_name: node.label,
          file_type: ext,
          file_path: node.path,
        });
      }
    },
    [onFileSelect],
  );

  // ── Early return AFTER all hooks ──────────────────────────────────────────

  if (loading || !projectPath) {
    return <LibraryLoader />;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <LibraryContextMenu
      onNewFileUpload={handleNewFileUpload}
      onNewFile={handleNewFile}
      onNewFolder={handleNewFolder}
      onDelete={handleDelete}
      onNewProject={handleNewProject}
    >
      <div className="max-w-xl mx-auto w-full h-full flex flex-col gap-2">
        <KnowledgeStoreButton />
        <TreeView
          className="flex-1 min-h-0 overflow-y-auto scrollbar-thin"
          data={treeData}
          onNodeClick={handleNodeClick}
          defaultExpandedIds={["1"]}
        />
      </div>

      <Dialog
        open={showNameDialog}
        onOpenChange={(open) => !open && handleCloseDialog()}
      >
        <DialogContent className="w-96">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "file" ? "Create New File" : "Create New Folder"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={dialogName}
            onChange={(e) => setDialogName(e.target.value)}
            placeholder={
              dialogType === "file" ? "Enter file name" : "Enter folder name"
            }
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmCreateItem();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={confirmCreateItem}
              disabled={isLoading || !dialogName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LibraryContextMenu>
  );
}
