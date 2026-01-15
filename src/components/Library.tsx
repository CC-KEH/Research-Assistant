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

interface LibraryProps {
  onFileSelect: (file: FileInfo) => void;
}

export default function Library({ onFileSelect }: LibraryProps) {
  const navigate = useNavigate();
  const { getBasicConfig } = useConfig();

  const basicConfig = getBasicConfig();
  info(`Basic config loaded: ${JSON.stringify(basicConfig)}`);
  const projectPath = basicConfig?.find((p) => p.projectPath)?.projectPath;

  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reload tree data from project path
  const reloadTreeData = async () => {
    if (!projectPath) return;

    try {
      setIsLoading(true);
      info(`Reloading library data from: ${projectPath}`);
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
  }, [projectPath]);

  // Helper function to find node by ID in tree
  const findNodeById = (
    nodes: TreeNode[],
    id: string
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

  // Helper function to build full path from node
  const buildPathForNode = (nodeId: string): string => {
    const node = findNodeById(treeData, nodeId);
    if (!node || !projectPath) return "";

    // For now, just use label as filename
    // In a real app, you'd want to track the full path
    return `${projectPath}/${node.label}`;
  };

  const handleNewFile = async () => {
    if (!projectPath) {
      error("Project path not found");
      return;
    }

    try {
      setIsLoading(true);

      let filePath: string;

      if (!selectedNodeId) {
        // Create in root (cwd)
        filePath = `${projectPath}/New File.txt`;
      } else {
        const selectedNode = findNodeById(treeData, selectedNodeId);

        if (!selectedNode) {
          error("Selected node not found");
          return;
        }

        if (selectedNode.nodeType === "file") {
          error("Please select a folder to create a file in");
          return;
        }

        filePath = `${projectPath}/${selectedNode.label}/New File.txt`;
      }

      // Call Rust function to create file
      await writeFile(filePath, "");
      info("✅ New file created");

      // Reload tree data
      await reloadTreeData();
    } catch (err) {
      error(`Failed to create file: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewFolder = async () => {
    if (!projectPath) {
      error("Project path not found");
      return;
    }

    try {
      setIsLoading(true);

      let dirPath: string;

      if (!selectedNodeId) {
        // Create in root (cwd)
        dirPath = `${projectPath}/New Folder`;
      } else {
        const selectedNode = findNodeById(treeData, selectedNodeId);

        if (!selectedNode) {
          error("Selected node not found");
          return;
        }

        if (selectedNode.nodeType === "file") {
          error("Please select a folder to create a folder in");
          return;
        }

        dirPath = `${projectPath}/${selectedNode.label}/New Folder`;
      }

      // Call Rust function to create directory
      await createDir(dirPath);
      info("✅ New folder created");

      // Reload tree data
      await reloadTreeData();
    } catch (err) {
      error(`Failed to create folder: ${err}`);
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

      const selectedNode = findNodeById(treeData, selectedNodeId);

      if (!selectedNode || !projectPath) {
        error("Selected node not found");
        return;
      }

      const itemPath = `${projectPath}/${selectedNode.label}`;

      // Call Rust function to delete
      await deleteItem(itemPath);
      info("✅ Node deleted");

      setSelectedNodeId(null);

      // Reload tree data
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

  const handleReportBug = () => {};

  const handleNodeClick = (node: TreeNode) => {
    info(`Clicked: ${node.label}`);
    setSelectedNodeId(node.id);

    const isFile = node.nodeType === "file" || !node.children;
    if (isFile) {
      const ext = node.label.split(".").pop()?.toLowerCase() || "";
      const fileInfo: FileInfo = {
        name: node.label,
        type: ext,
        path: node.path,
        id: `${node.label}`,
      };
      info(`File Info: ${JSON.stringify(fileInfo)}`);
      onFileSelect(fileInfo);
    }
  };

  return (
    <LibraryContextMenu
      onNewFile={handleNewFile}
      onNewFolder={handleNewFolder}
      onDelete={handleDelete}
      onNewProject={handleNewProject}
      onReportBug={handleReportBug}
    >
      <div className="max-w-xl mx-auto w-full h-[580px] flex flex-col gap-2 overflow-y-auto scrollbar-thin">
        <KnowledgeStoreButton />
        <TreeView
          data={treeData}
          onNodeClick={handleNodeClick}
          defaultExpandedIds={["1"]}
        />
      </div>
    </LibraryContextMenu>
  );
}
