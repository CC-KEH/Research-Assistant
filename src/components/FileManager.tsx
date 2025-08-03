import { useState } from "react";
import { TreeView } from "@/components/small/Treeview";
import { KnowledgeStoreButton } from "@/components/small/KnowledgeStoreButton";
import { LibraryContextMenu } from "@/components/small/context-menus/LibraryContextMenu";

type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

export default function FileManager() {
  const [treeData, setTreeData] = useState<TreeNode[]>(getLibraryData());

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

  const handleNewDrawing = () => {
    const updated = structuredClone(treeData);
    const canvases = updated.find((node) => node.label === "Canvas");

    if (canvases?.children) {
      canvases.children.push({
        id: Date.now().toString(),
        label: "New Drawing",
        children: [],
      });
      setTreeData(updated);
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

  return (
    <LibraryContextMenu
      onNewFile={handleNewFile}
      onNewDrawing={handleNewDrawing}
      onDelete={handleDelete}
      onNewProject={handleNewProject}
      onReportBug={handleReportBug}
    >
      <div className="max-w-xl mx-auto w-full h-[500px] flex flex-col gap-2 overflow-y-auto scrollbar-thin">
        <KnowledgeStoreButton />
        <TreeView
          data={treeData}
          onNodeClick={(node) => console.log("Clicked:", node.label)}
          defaultExpandedIds={["1"]}
        />
      </div>
    </LibraryContextMenu>
  );
}

function getLibraryData(): TreeNode[] {
  return [
    {
      id: "1",
      label: "Documents",
      children: [
        {
          id: "1-1",
          label: "Papers",
          children: [
            { id: "1-1-1", label: "Monthly Report.pdf" },
            { id: "1-1-2", label: "Annual Report.pdf" },
          ],
        },
        {
          id: "1-2",
          label: "Reports",
          children: [
            { id: "1-2-1", label: "Monthly Report.xlsx" },
            { id: "1-2-2", label: "Annual Report.pdf" },
          ],
        },
        {
          id: "1-3",
          label: "Archive",
          children: [
            { id: "1-3-1", label: "Yearly Report.xlsx" },
            { id: "1-3-2", label: "January Report.pdf" },
          ],
        },
      ],
    },
    {
      id: "2",
      label: "Notes",
      children: [
        { id: "2-1", label: "Note 1.md" },
        { id: "2-2", label: "Note 2.md" },
      ],
    },
    {
      id: "3",
      label: "Bookmarks",
      children: [
        { id: "3-1", label: "Bookmark 1" },
        { id: "3-2", label: "Bookmark 2" },
      ],
    },
    {
      id: "4",
      label: "Canvas",
      children: [
        { id: "4-1", label: "board1.excalidraw" },
        { id: "4-2", label: "board2.excalidraw" },
      ],
    },
  ];
}
