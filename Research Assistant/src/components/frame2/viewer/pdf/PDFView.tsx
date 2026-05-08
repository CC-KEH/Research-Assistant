import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { pdfjs, Document, Page } from "react-pdf";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  ChevronLeft,
  ChevronRight,
  EraserIcon,
  HighlighterIcon,
  MoonIcon,
  PenIcon,
  SunIcon,
  DownloadIcon,
} from "lucide-react";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

import type {
  AnnotationPath,
  PagePathsMap,
  FileAnnotations,
} from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";
import Loading from "@/components/common/Loader";
import { error } from "@/lib/logger";
import { saveContentToPDF } from "@/lib/backend";
import { useConfig } from "@/components/providers/ConfigProvider";

interface PDFViewerProps {
  file: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [tool, setTool] = useState<"pen" | "highlight" | "eraser" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const focusTimeoutRef = useRef<number | null>(null);

  const [drawing, setDrawing] = useState(false);
  const [pagePathsMap, setPagePathsMap] = useState<PagePathsMap>({});
  const [currentPath, setCurrentPath] = useState<AnnotationPath | null>(null);
  const [historyMap, setHistoryMap] = useState<
    Record<number, AnnotationPath[][]>
  >({});
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [pageRendered, setPageRendered] = useState<boolean>(false);

  const { config, updateConfig } = useConfig();

  // ─── Toolbar styles ──────────────────────────────────────────────────────

  const toolbarStyles = useMemo(
    () => ({
      base: isDarkMode
        ? "bg-[#1C1917]/80 border-[#2E2820]/60 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_1px_0_rgba(237,232,223,0.04)_inset] backdrop-blur-2xl backdrop-saturate-200"
        : "bg-[#2C2416]/85 border-[#DDD6CB]/15 shadow-[0_8px_32px_rgba(28,25,23,0.35)]",
      btn: isDarkMode
        ? "text-[#EDE8DF]/40 hover:text-[#EDE8DF]/80 hover:bg-[#EDE8DF]/[0.08]"
        : "text-[#F8F5F0]/50 hover:text-[#F8F5F0] hover:bg-[#F8F5F0]/10",
      btnActive:
        "bg-[#C9A96E]/25 text-[#F8F5F0] shadow-[inset_0_1px_2px_rgba(28,25,23,0.3)]",
      divider: isDarkMode ? "bg-[#EDE8DF]/10" : "bg-[#F8F5F0]/15",
    }),
    [isDarkMode],
  );

  // ─── currentPaths ────────────────────────────────────────────────────────

  const currentPaths = useMemo<AnnotationPath[]>(
    () => pagePathsMap[pageNumber] ?? [],
    [pagePathsMap, pageNumber],
  );

  // ─── Annotations: persist ────────────────────────────────────────────────

  const persistAnnotations = useCallback(
    (updatedPagePathsMap: PagePathsMap) => {
      if (!config) return;
      updateConfig({
        ...config,
        annotations: {
          ...(config.annotations ?? {}),
          [file]: {
            pagePathsMap: updatedPagePathsMap,
          } satisfies FileAnnotations,
        },
      });
    },
    [file, config, updateConfig],
  );

  // ─── Annotations: read ───────────────────────────────────────────────────

  const readAnnotationsFromConfig = useCallback((): PagePathsMap => {
    const fileAnnotations: FileAnnotations | undefined =
      config?.annotations?.[file];
    if (!fileAnnotations) return {};

    const normalised: PagePathsMap = {};
    for (const [k, v] of Object.entries(fileAnnotations.pagePathsMap)) {
      normalised[Number(k)] = v;
    }
    return normalised;
  }, [file, config]);

  // ─── Annotations: update page paths ─────────────────────────────────────

  const updatePagePaths = useCallback(
    (page: number, updater: (prev: AnnotationPath[]) => AnnotationPath[]) => {
      setPagePathsMap((prev) => {
        const updated: PagePathsMap = {
          ...prev,
          [page]: updater(prev[page] ?? []),
        };
        return updated;
      });
      setPagePathsMap((prev) => {
        persistAnnotations(prev);
        return prev;
      });
    },
    [persistAnnotations],
  );

  // ─── Load PDF on file change ─────────────────────────────────────────────

  useEffect(() => {
    if (!file) return;
    setPageNumber(1);
    setPagePathsMap({});
    setHistoryMap({});
    setCurrentPath(null);
    setDrawing(false);
    setPageRendered(false);
    setPdfSource(null);

    let cancelled = false;
    setIsLoadingPdf(true);

    invoke<string>("read_pdf_file", { filePath: file })
      .then((base64String) => {
        if (!cancelled)
          setPdfSource(`data:application/pdf;base64,${base64String}`);
      })
      .catch((err) => {
        if (!cancelled) error(`Failed to load PDF from ${file}: ${err}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPdf(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  // ─── Load annotations on file change ────────────────────────────────────

  useEffect(() => {
    if (!file) return;
    const saved = readAnnotationsFromConfig();
    if (Object.keys(saved).length > 0) {
      setPagePathsMap(saved);
    }
  }, [file, readAnnotationsFromConfig]);

  // ─── Document load ───────────────────────────────────────────────────────

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => setNumPages(numPages),
    [],
  );

  // ─── Page render: size annotation canvas to CSS pixels ──────────────────

  const onPageRenderSuccess = useCallback(() => {
    const canvas = canvasRef.current;
    const container = pageContainerRef.current;
    if (!canvas || !container) return;

    const pdfCanvas = container.querySelector(
      ".react-pdf__Page__canvas",
    ) as HTMLCanvasElement | null;

    if (pdfCanvas) {
      const cssW = parseFloat(pdfCanvas.style.width) || pdfCanvas.offsetWidth;
      const cssH = parseFloat(pdfCanvas.style.height) || pdfCanvas.offsetHeight;

      canvas.width = cssW;
      canvas.height = cssH;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }

    setPageRendered(true);
  }, []);

  // Reset pageRendered when navigating
  useEffect(() => {
    setPageRendered(false);
  }, [pageNumber]);

  // ─── Redraw canvas ───────────────────────────────────────────────────────

  const redrawCanvas = useCallback((paths: AnnotationPath[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paths.forEach((path) => {
      if (path.points.length === 0) return;
      ctx.beginPath();
      path.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = path.tool === "pen" ? "red" : "rgba(255,255,0,0.4)";
      ctx.lineWidth = path.tool === "pen" ? 2 : 20;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    });
  }, []);

  useEffect(() => {
    if (!pageRendered) return;
    redrawCanvas(pagePathsMap[pageNumber] ?? []);
  }, [pagePathsMap, pageNumber, pageRendered, redrawCanvas]);

  // ─── Coordinate helper ───────────────────────────────────────────────────

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ─── Eraser ──────────────────────────────────────────────────────────────

  const eraseAt = useCallback(
    (pos: { x: number; y: number }) => {
      const ERASER_RADIUS = 20;

      let erasedPaths: AnnotationPath[] | null = null;

      setPagePathsMap((prevMap) => {
        const paths = prevMap[pageNumber] ?? [];
        if (paths.length === 0) return prevMap;

        const remaining = paths.filter(
          (path) =>
            !path.points.some(
              (pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < ERASER_RADIUS,
            ),
        );

        if (remaining.length === paths.length) return prevMap;

        setHistoryMap((h) => ({
          ...h,
          [pageNumber]: [...(h[pageNumber] ?? []), paths],
        }));

        const updated: PagePathsMap = { ...prevMap, [pageNumber]: remaining };
        persistAnnotations(updated);
        erasedPaths = remaining;
        return updated;
      });

      if (erasedPaths !== null) redrawCanvas(erasedPaths);
    },
    [pageNumber, persistAnnotations, redrawCanvas],
  );

  // ─── Canvas drawing ──────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e);
      if (tool === "pen" || tool === "highlight") {
        setDrawing(true);
        setCurrentPath({ points: [pos], tool });
      } else if (tool === "eraser") {
        setDrawing(true);
        eraseAt(pos);
      }
    },
    [tool, eraseAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawing) return;
      const pos = getCanvasPos(e);

      if (tool === "pen" || tool === "highlight") {
        setCurrentPath((prev) => {
          if (!prev) return null;
          const updated: AnnotationPath = {
            ...prev,
            points: [...prev.points, pos],
          };
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx && prev.points.length > 0) {
            const last = prev.points[prev.points.length - 1];
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle =
              prev.tool === "pen" ? "red" : "rgba(255,255,0,0.4)";
            ctx.lineWidth = prev.tool === "pen" ? 2 : 20;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
          }
          return updated;
        });
      } else if (tool === "eraser") {
        eraseAt(pos);
      }
    },
    [drawing, tool, eraseAt],
  );

  const handleMouseUp = useCallback(() => {
    if (currentPath && currentPath.points.length > 0) {
      setHistoryMap((prev) => ({
        ...prev,
        [pageNumber]: [...(prev[pageNumber] ?? []), [...currentPaths]],
      }));
      updatePagePaths(pageNumber, (prev) => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setDrawing(false);
  }, [currentPath, currentPaths, pageNumber, updatePagePaths]);

  // ─── Undo ────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    setHistoryMap((prevHistoryMap) => {
      const pageHistory = prevHistoryMap[pageNumber] ?? [];
      if (pageHistory.length === 0) return prevHistoryMap;

      const lastPaths = pageHistory[pageHistory.length - 1];
      setPagePathsMap((prev) => {
        const updated: PagePathsMap = { ...prev, [pageNumber]: lastPaths };
        persistAnnotations(updated);
        return updated;
      });

      return { ...prevHistoryMap, [pageNumber]: pageHistory.slice(0, -1) };
    });
  }, [pageNumber, persistAnnotations]);

  // ─── Search highlighting ─────────────────────────────────────────────────

  const highlightMatches = useCallback(() => {
    pageContainerRef.current
      ?.querySelectorAll(".react-pdf__Page__textContent span")
      .forEach((span) => {
        const el = span as HTMLElement;
        const text = el.textContent || "";
        el.style.backgroundColor =
          searchTerm && text.toLowerCase().includes(searchTerm.toLowerCase())
            ? isDarkMode
              ? "orange"
              : "yellow"
            : "";
      });
  }, [searchTerm, isDarkMode]);

  useEffect(() => {
    const id = requestAnimationFrame(() => highlightMatches());
    return () => cancelAnimationFrame(id);
  }, [highlightMatches, pageNumber]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const handlePrevPage = useCallback(() => {
    if (pageNumber > 1) setPageNumber((p) => p - 1);
  }, [pageNumber]);

  const handleNextPage = useCallback(() => {
    if (pageNumber < numPages) setPageNumber((p) => p + 1);
  }, [pageNumber, numPages]);

  // ─── Download ────────────────────────────────────────────────────────────

  const createDocument = useCallback(async () => {
    try {
      saveContentToPDF(
        config?.basicConfig ?? null,
        config?.knowledgeStoreConfig ?? null,
        config?.tabsConfig ?? null,
        file,
      );
    } catch (err) {
      error(`Failed to create document: ${err}`);
    }
  }, [config, file]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBox(true);
        focusTimeoutRef.current = window.setTimeout(() => {
          searchInputRef.current?.focus();
          focusTimeoutRef.current = null;
        }, 0);
      } else if (e.key === "Escape") {
        setShowSearchBox(false);
        setSearchTerm("");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (focusTimeoutRef.current !== null) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [handleUndo]);

  // ─── Derived: should show skeleton ──────────────────────────────────────

  const showSkeleton = isLoadingPdf || (!!pdfSource && !pageRendered);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className={`mt-2.5 min-h-0 rounded-md flex flex-col ${
        pageRendered
          ? isDarkMode
            ? "bg-black text-white"
            : "bg-white text-black"
          : ""
      }`}
    >
      {showSearchBox && (
        <Card className="fixed top-24 right-26 p-3 z-50 w-72 shadow-xl">
          <Input
            ref={searchInputRef}
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </Card>
      )}

      <div className="relative flex-1 min-h-0 overflow-y-auto flex justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Toolbar */}
        <div
          className={`fixed bottom-6 z-50 flex flex-row items-center gap-0.5 p-1.5 rounded-2xl border ${toolbarStyles.base}`}
        >
          <Button
            onClick={handlePrevPage}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
          >
            <ChevronLeft className="h-[15px] w-[15px]" />
          </Button>
          <Button
            onClick={handleNextPage}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
          >
            <ChevronRight className="h-[15px] w-[15px]" />
          </Button>

          <div
            className={`mx-1 h-4 w-px rounded-full ${toolbarStyles.divider}`}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool(tool === "pen" ? null : "pen")}
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${
              tool === "pen" ? toolbarStyles.btnActive : toolbarStyles.btn
            }`}
          >
            <PenIcon className="h-[15px] w-[15px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool(tool === "highlight" ? null : "highlight")}
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${
              tool === "highlight" ? toolbarStyles.btnActive : toolbarStyles.btn
            }`}
          >
            <HighlighterIcon className="h-[15px] w-[15px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool(tool === "eraser" ? null : "eraser")}
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${
              tool === "eraser" ? toolbarStyles.btnActive : toolbarStyles.btn
            }`}
          >
            <EraserIcon className="h-[15px] w-[15px]" />
          </Button>

          <div
            className={`mx-1 h-4 w-px rounded-full ${toolbarStyles.divider}`}
          />

          <Button
            onClick={() => setIsDarkMode((d) => !d)}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
          >
            {isDarkMode ? (
              <SunIcon className="h-[15px] w-[15px]" />
            ) : (
              <MoonIcon className="h-[15px] w-[15px]" />
            )}
          </Button>

          <Button
            onClick={createDocument}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
          >
            <DownloadIcon className="h-[15px] w-[15px]" />
          </Button>
        </div>

        {/* Your skeleton — shown while fetching OR while page hasn't rendered yet */}
        {showSkeleton && <Loading />}

        {/* No PDF state */}
        {!isLoadingPdf && !pdfSource && (
          <div className="flex items-center justify-center h-full">
            <p>No PDF loaded</p>
          </div>
        )}

        {/* PDF + canvas overlay — always mounted once source exists, hidden until rendered */}
        {pdfSource && (
          <div
            ref={pageContainerRef}
            style={{
              // Hide (but keep mounted) so react-pdf can render in the background
              // without flashing its own built-in loader.
              visibility: pageRendered ? "visible" : "hidden",
              position: pageRendered ? "relative" : "absolute",
              display: "inline-block",
              filter: isDarkMode ? "invert(1) hue-rotate(180deg)" : "none",
            }}
          >
            <Document
              file={pdfSource}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={null} // suppress react-pdf's built-in spinner
              noData={null} // suppress react-pdf's no-data message
            >
              <Page
                pageNumber={pageNumber}
                renderAnnotationLayer
                renderTextLayer
                onRenderSuccess={onPageRenderSuccess}
                loading={null} // suppress react-pdf's page-level spinner
              />
            </Document>
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 10,
                backgroundColor: "transparent",
              }}
              className={
                tool === "pen" || tool === "highlight" || tool === "eraser"
                  ? "pointer-events-auto cursor-crosshair"
                  : "pointer-events-none"
              }
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
