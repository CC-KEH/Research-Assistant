import { useState, useCallback, useMemo } from "react";
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
import { uploadFilesToKnowledgeStore } from "@/lib/backend";
import { useConfig } from "@/components/providers/ConfigProvider";
import { error } from "@/lib/logger";

export default function KnowledgeStore() {
  const { config, reloadConfig, updateKnowledgeStoreConfig } = useConfig();
  const papers = useMemo(
    () =>
      config?.knowledgeStoreConfig?.files.map((file) => ({
        file_name: file.fileName,
        file_path: file.filePath,
        file_type: file.fileType,
      })) ?? [],
    [config],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const projectPath = config?.basicConfig?.projectPath;

  const isAllSelected = papers.length > 0 && selected.size === papers.length;

  const isPartiallySelected =
    selected.size > 0 && selected.size < papers.length;

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelected(
        checked ? new Set(papers.map((p) => p.file_path)) : new Set(),
      );
    },
    [papers],
  );

  const handleSelectRow = useCallback((filePath: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(filePath);
      else next.delete(filePath);
      return next;
    });
  }, []);

  const addPaper = useCallback(async () => {
    if (!projectPath) return;
    try {
      setIsLoading(true);
      const newFiles = await uploadFilesToKnowledgeStore(projectPath);
      if (newFiles.length > 0) {
        await reloadConfig();
      }
    } catch (err) {
      error(`Failed to add files: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, reloadConfig]);

  const removeSelected = useCallback(async () => {
    if (!config?.knowledgeStoreConfig) return;
    try {
      setIsLoading(true);
      const updatedFiles = config.knowledgeStoreConfig.files.filter(
        (file) => !selected.has(file.filePath),
      );
      updateKnowledgeStoreConfig({
        ...config.knowledgeStoreConfig,
        files: updatedFiles,
      });
      setSelected(new Set());
    } catch (err) {
      error(`Failed to remove files: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, selected, updateKnowledgeStoreConfig]);

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto py-10 h-full min-h-0">
      <h1 className="text-3xl font-semibold">Knowledge Store</h1>

      {/* FIX: replaced max-h-80 (too cramped for a desktop app) with
          flex-1 min-h-0 so the table fills available space at any window size */}
      <div className="w-full flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  id="select-all-checkbox"
                  name="select-all-checkbox"
                  checked={isAllSelected}
                  data-indeterminate={isPartiallySelected}
                  onCheckedChange={(checked) =>
                    toggleSelectAll(checked === true)
                  }
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {papers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground py-10 text-sm"
                >
                  No files in knowledge store. Click Add to upload files.
                </TableCell>
              </TableRow>
            ) : (
              papers.map((paper) => (
                <TableRow
                  key={paper.file_path}
                  data-state={
                    selected.has(paper.file_path) ? "selected" : undefined
                  }
                >
                  <TableCell>
                    <Checkbox
                      id={`row-${paper.file_path}-checkbox`}
                      name={`row-${paper.file_path}-checkbox`}
                      checked={selected.has(paper.file_path)}
                      onCheckedChange={(checked) =>
                        handleSelectRow(paper.file_path, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell>{paper.file_name}</TableCell>
                  <TableCell>{paper.file_type}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mb-4 flex gap-2">
        <Button onClick={addPaper} disabled={isLoading}>
          Add
        </Button>
        <Button
          onClick={removeSelected}
          disabled={isLoading || selected.size === 0}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
