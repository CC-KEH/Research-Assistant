import { info } from "@/lib/logger";
import { useState, useEffect } from "react";
import { FileInfo, TreeNode } from "@/lib/types";
import { TreeView } from "@/components/small/Treeview";
import { useConfig } from "@/components/providers/ConfigProvider";
import { getLibraryData, mapExtensionToType } from "@/lib/backend";
import { KnowledgeStoreButton } from "@/components/small/KnowledgeStoreButton";
import { LibraryContextMenu } from "@/components/small/context-menus/LibraryContextMenu";

interface LibraryProps {
  onFileSelect: (file: FileInfo) => void;
}

export default function Library({ onFileSelect }: LibraryProps) {
  const { getBasicConfig } = useConfig();
  const basicConfig = getBasicConfig();
  info(`Basic config loaded: ${JSON.stringify(basicConfig)}`);
  const projectPath = basicConfig?.find((p) => p.projectPath)?.projectPath;

  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (!projectPath) {
      info("Project path not found");
      return;
    }

    const loadLibrary = async () => {
      info(`Loading library data from: ${projectPath}`);
      const data = await getLibraryData(projectPath);
      setTreeData(data);
    };

    loadLibrary();
  }, [projectPath]);

  const handleNewFile = () => {
    const updated = structuredClone(treeData);
    const documents = updated.find((node) => node.label === "Documents");

    if (documents?.children) {
      const notes = documents.children.find((child) => child.label === "Notes");

      if (notes?.children) {
        notes.children.push({
          id: Date.now().toString(),
          label: "New File.txt",
        });
        setTreeData(updated);
      }
    }
  };

  const handleDelete = () => {
    const updated = structuredClone(treeData);
    const documents = updated.find((node) => node.label === "Documents");

    if (documents?.children) {
      const projects = documents.children.find(
        (child) => child.label === "Notes"
      );

      if (projects?.children?.length) {
        projects.children.pop();
        setTreeData(updated);
      }
    }
  };

  const handleNewProject = () => {
    alert("New Project logic here");
  };

  const handleReportBug = () => {
    alert("Redirecting to bug report...");
  };

  const handleNodeClick = (node: TreeNode) => {
    info(`Clicked: ${node.label}`);

    const isFile = !node.children || node.children.length === 0;
    if (isFile) {
      const ext = node.label.split(".").pop()?.toLowerCase() || "";
      const fileInfo: FileInfo = {
        name: node.label,
        type: mapExtensionToType(ext),
        path: `/virtual/${node.label}`,
        id: `${node.label}`,
      };

      onFileSelect(fileInfo);
    }
  };

  return (
    <LibraryContextMenu
      onNewFile={handleNewFile}
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
