import { error, info } from "@/lib/logger";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileInfo, TreeNode } from "@/lib/types";
import { TreeView } from "@/components/small/Treeview";
import { useConfig } from "@/components/providers/ConfigProvider";
import {
  createDir,
  deleteItem,
  getLibraryData,
  writeFile,
} from "@/lib/backend";
import { KnowledgeStoreButton } from "@/components/small/KnowledgeStoreButton";
import { LibraryContextMenu } from "@/components/small/context-menus/LibraryContextMenu";
import { Button } from "./ui/button";

interface LibraryProps {
  onFileSelect: (file: FileInfo) => void;
}

export default function Library({ onFileSelect }: LibraryProps) {
  const navigate = useNavigate();
  const { getBasicConfig } = useConfig();
  const basicConfig = getBasicConfig();
  const projectPath =
    basicConfig?.find((p) => p.projectPath)?.projectPath ?? "";
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog state
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [dialogName, setDialogName] = useState("");
  const [dialogType, setDialogType] = useState<"file" | "folder" | null>(null);

  const reloadTreeData = async () => {
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
  };

  useEffect(() => {
    if (!projectPath) {
      info("Project path not found");
      return;
    }

    reloadTreeData();

    // Retry once after 1s in case backend isn't ready yet
    const timer = setTimeout(() => reloadTreeData(), 1000);
    return () => clearTimeout(timer);
  }, [projectPath]);

  const findNodeById = (
    nodes: TreeNode[],
    id: string,
  ): TreeNode | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const getBasePath = (): string => {
    if (!selectedNodeId) return projectPath;
    const node = findNodeById(treeData, selectedNodeId);
    if (!node) return projectPath;
    return node.nodeType === "folder" ? node.path : projectPath;
  };

  const handleNewFile = () => {
    setDialogType("file");
    setDialogName("");
    setShowNameDialog(true);
  };

  const handleNewFolder = () => {
    setDialogType("folder");
    setDialogName("");
    setShowNameDialog(true);
  };

  const confirmCreateItem = async () => {
    if (!projectPath || !dialogName.trim()) {
      error("Please enter a valid name");
      return;
    }

    try {
      setIsLoading(true);
      const basePath = getBasePath();
      let itemPath: string;

      if (dialogType === "file") {
        const fileName = dialogName.endsWith(".md")
          ? dialogName
          : `${dialogName}.md`;
        itemPath = `${basePath}/${fileName}`;
        await writeFile(itemPath, "");
        info("✅ New file created");
      } else if (dialogType === "folder") {
        itemPath = `${basePath}/${dialogName.trim()}`;
        await createDir(itemPath);
        info("✅ New folder created");
      }

      setShowNameDialog(false);
      setDialogName("");
      setDialogType(null);
      await reloadTreeData();
    } catch (err) {
      error(`Failed to create item: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
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
  };

  const handleNewProject = () => {
    navigate("/project-setup");
  };

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNodeId(node.id);

    if (node.nodeType === "file") {
      info(`Selected file: ${node.label}`);
      const ext = node.label.split(".").pop()?.toLowerCase() || "";
      const fileInfo: FileInfo = {
        name: node.label,
        type: ext,
        path: node.path,
      };
      onFileSelect(fileInfo);
    }
  };

  return (
    <LibraryContextMenu
      onNewFile={handleNewFile}
      onNewFolder={handleNewFolder}
      onDelete={handleDelete}
      onNewProject={handleNewProject}
    >
      <div className="max-w-xl mx-auto w-full h-[580px] flex flex-col gap-2">
        <KnowledgeStoreButton />
        <TreeView
          className="overflow-y-auto scrollbar-thin"
          data={treeData}
          onNodeClick={handleNodeClick}
          defaultExpandedIds={["1"]}
        />
      </div>

      {showNameDialog && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="dark:bg-[#0e0f11] bg-white rounded-lg p-6 w-96">
            <h4 className="text-lg font-semibold mb-4 text-muted-foreground">
              {dialogType === "file" ? "Create New File" : "Create New Folder"}
            </h4>

            <input
              type="text"
              value={dialogName}
              onChange={(e) => setDialogName(e.target.value)}
              placeholder={
                dialogType === "file" ? "Enter file name" : "Enter folder name"
              }
              className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-1 border-gray-300 focus:border-gray-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmCreateItem();
                if (e.key === "Escape") setShowNameDialog(false);
              }}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNameDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={confirmCreateItem}
                disabled={isLoading || !dialogName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </LibraryContextMenu>
  );
}
