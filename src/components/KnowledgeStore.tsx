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

type Paper = {
  id: string;
  name: string;
  type: string;
};

const mockPapers: Paper[] = [
  { id: "1", name: "AI in Medicine", type: "PDF" },
  { id: "2", name: "Quantum Computing Basics", type: "PDF" },
  { id: "3", name: "Neural Networks", type: "PDF" },
  { id: "4", name: "Machine Learning 101", type: "PDF" },
  { id: "5", name: "Edge AI", type: "PDF" },
];

export default function KnowledgeStore() {
  const [papers, setPapers] = useState<Paper[]>(mockPapers);
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

  const removeSelected = () => {
    setPapers(papers.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    setLastCheckedIndex(null);
  };

  const addPaper = () => {
    const newPaper: Paper = {
      id: Date.now().toString(),
      name: `New Paper ${papers.length + 1}`,
      type: "Unknown",
    };
    setPapers([...papers, newPaper]);
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
