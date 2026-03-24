import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { info } from "@/lib/logger";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileInfo } from "@/lib/types";
import { uploadFilesToKnowledgeStore } from "@/lib/backend";
import { useConfig } from "@/components/providers/ConfigProvider";

export default function KnowledgeStore() {
  const {
    getBasicConfig,
    getKnowledgeStoreConfig,
    updateKnowledgeStoreConfig,
  } = useConfig();
  const basicConfig = getBasicConfig();
  const knowledgeStoreConfig = getKnowledgeStoreConfig();
  const projectPath = basicConfig?.projectPath;
  const [papers, setPapers] = useState<FileInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Load papers from knowledge store config on mount
  useEffect(() => {
    if (knowledgeStoreConfig?.files) {
      const loadedPapers = knowledgeStoreConfig.files.map((file) => ({
        file_name: file.fileName,
        file_path: file.filePath,
        file_type: file.fileType,
      }));
      setPapers(loadedPapers);
    }
  }, [knowledgeStoreConfig]);

  const isAllSelected = papers.length > 0 && selected.size === papers.length;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      info(`Selecting all rows: ${checked}`);
      setSelected(new Set(papers.map((p) => p.file_name)));
    } else {
      info(`Deselecting all rows: ${checked}`);
      setSelected(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selected);
    if (checked) {
      info(`Selecting row ${id}: ${checked}`);
      newSelected.add(id);
    } else {
      info(`Deselecting row ${id}: ${checked}`);
      newSelected.delete(id);
    }
    setSelected(newSelected);
  };

  const addPaper = async () => {
    if (!projectPath) return;
    const newFiles = await uploadFilesToKnowledgeStore(projectPath);
    if (newFiles.length > 0) {
      setPapers((prev) => [...prev, ...newFiles]);
    }
  };

  const removePaper = async (fileIds: string[]) => {
    info(`Removing papers:", ${fileIds}`);
    if (!knowledgeStoreConfig) return;
    const updatedFiles = knowledgeStoreConfig.files.filter(
      (file) => !fileIds.includes(file.fileName),
    );
    await updateKnowledgeStoreConfig({
      ...knowledgeStoreConfig,
      files: updatedFiles,
    });
  };

  const removeSelected = async () => {
    const selectedArray = [...selected];
    setPapers(papers.filter((p) => !selected.has(p.file_name)));
    await removePaper(selectedArray);
    setSelected(new Set());
  };

  return (
    <div className="flex flex-col justify-center items-center gap-6 max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-semibold">Knowledge Store</h1>
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  id="select-all-checkbox"
                  name="select-all-checkbox"
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {papers.map((paper) => (
              <TableRow
                key={paper.file_name}
                data-state={
                  selected.has(paper.file_name) ? "selected" : undefined
                }
              >
                <TableCell>
                  <Checkbox
                    id={`row-${paper.file_name}-checkbox`}
                    name={`row-${paper.file_name}-checkbox`}
                    checked={selected.has(paper.file_name)}
                    onCheckedChange={(checked) =>
                      handleSelectRow(paper.file_name, checked === true)
                    }
                  />
                </TableCell>
                <TableCell>{paper.file_name}</TableCell>
                <TableCell>{paper.file_type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mb-4 flex gap-2">
        <Button onClick={addPaper}>Add</Button>
        <Button onClick={removeSelected} disabled={selected.size === 0}>
          Remove
        </Button>
      </div>
    </div>
  );
}
