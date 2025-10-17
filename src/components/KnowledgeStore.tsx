// npx shadcn@latest add "https://21st.dev/r/isaiahbjork/"
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileInfo } from "@/lib/types";
import { uploadFiles } from "@/lib/backend";

export default function KnowledgeStore() {
  const projectRoot = "/Users/you/Projects/MyProject"; // TODO: dynamic later, Create a Provider in Workspace
  const [papers, setPapers] = useState<FileInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);

  const toggleSelect = (index: number, shiftKey: boolean) => {
    const id = papers[index].id;
    const newSelected = new Set(selected);

    if (shiftKey && lastCheckedIndex !== null) {
      const [start, end] = [lastCheckedIndex, index].sort((a, b) => a - b);
      const isSelecting = !selected.has(papers[index].id); // infer intent from target checkbox
      for (let i = start; i <= end; i++) {
        const paperId = papers[i].id;
        isSelecting ? newSelected.add(paperId) : newSelected.delete(paperId);
      }
    } else {
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setLastCheckedIndex(index);
    }

    setSelected(newSelected);
  };

  const isAllSelected = papers.length > 0 && selected.size === papers.length;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(papers.map((p) => p.id)));
    } else {
      setSelected(new Set());
    }
  };

  const addPaper = async () => {
    const newFiles = await uploadFiles(projectRoot);
    if (newFiles.length > 0) {
      setPapers((prev) => [...prev, ...newFiles]);
    }
  };

  const removeSelected = () => {
    setPapers(papers.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    setLastCheckedIndex(null);
  };

  return (
    <div className="flex flex-col justify-center items-center gap-6 max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-semibold">Knowledge Store</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {papers.map((paper, index) => (
            <TableRow key={paper.id}>
              <TableCell>
                <Checkbox
                  checked={selected.has(paper.id)}
                  onClick={(e) => {
                    e.preventDefault(); // prevent double toggle from both onClick and onChange
                    toggleSelect(index, (e as React.MouseEvent).shiftKey);
                  }}
                />
              </TableCell>
              <TableCell>{paper.name}</TableCell>
              <TableCell>{paper.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mb-4 flex gap-2">
        <Button onClick={addPaper}>Add</Button>
        <Button onClick={removeSelected} disabled={selected.size === 0}>
          Remove
        </Button>
      </div>
    </div>
  );
}
