import React, { useState, useRef, useEffect, useCallback } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  BookmarkCheck,
  BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  EraserIcon,
  HighlighterIcon,
  MoonIcon,
  PenIcon,
  SunIcon,
  DownloadIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { saveContentToPDF } from "@/lib/backend";
import { error } from "@/lib/logger";
import { useConfig } from "../providers/ConfigProvider";
import {
  Bookmark,
  AnnotationPath,
  PagePathsMap,
  FileAnnotations,
} from "@/lib/types";

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

  // Not used for drawing math — just informational.
  // All coordinates are stored in CSS-pixel space (what getBoundingClientRect gives us).
  const scaleRef = useRef<{ x: number; y: number }>({ x: 1, y: 1 });

  const [drawing, setDrawing] = useState(false);
  const [pagePathsMap, setPagePathsMap] = useState<PagePathsMap>({});
  const [currentPath, setCurrentPath] = useState<AnnotationPath | null>(null);
  const [historyMap, setHistoryMap] = useState<
    Record<number, AnnotationPath[][]>
  >({});

  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [pageRendered, setPageRendered] = useState<boolean>(false);

  const {
    getBasicConfig,
    getKnowledgeStoreConfig,
    getFullConfig,
    getBookmarks,
    updateBookmarks,
    updateConfig,
  } = useConfig();

  const basicConfig = getBasicConfig();
  const knowledgeStoreConfig = getKnowledgeStoreConfig();
  const fileName = file.split(/[\\/]/).pop() ?? file;

  // ─── Current page paths ───────────────────────────────────────────────────────

  const currentPaths: AnnotationPath[] = pagePathsMap[pageNumber] ?? [];

  // ─── Bookmarks ────────────────────────────────────────────────────────────────

  const fileBookmarks: Bookmark[] = (getBookmarks() ?? []).filter(
    (b) => b.filePath === file,
  );

  const isCurrentPageBookmarked = fileBookmarks.some(
    (b) => b.pageNo === String(pageNumber),
  );

  const toggleBookmark = () => {
    const allBookmarks = getBookmarks() ?? [];
    const updated: Bookmark[] = isCurrentPageBookmarked
      ? allBookmarks.filter(
          (b) => !(b.filePath === file && b.pageNo === String(pageNumber)),
        )
      : [
          ...allBookmarks,
          { fileName, filePath: file, pageNo: String(pageNumber) },
        ];
    updateBookmarks(updated);
  };

  // ─── Annotations ──────────────────────────────────────────────────────────────

  const readAnnotationsFromConfig = useCallback((): PagePathsMap => {
    const fullConfig = getFullConfig();
    const fileAnnotations: FileAnnotations | undefined =
      fullConfig?.annotations?.[file];
    if (!fileAnnotations) return {};

    const normalised: PagePathsMap = {};
    for (const [k, v] of Object.entries(fileAnnotations.pagePathsMap)) {
      normalised[Number(k)] = v;
    }
    return normalised;
  }, [file, getFullConfig]);

  const persistAnnotations = useCallback(
    (updatedPagePathsMap: PagePathsMap) => {
      const fullConfig = getFullConfig();
      if (!fullConfig) return;
      updateConfig({
        ...fullConfig,
        annotations: {
          ...(fullConfig.annotations ?? {}),
          [file]: {
            pagePathsMap: updatedPagePathsMap,
          } satisfies FileAnnotations,
        },
      });
    },
    [file, getFullConfig, updateConfig],
  );

  const updatePagePaths = useCallback(
    (page: number, updater: (prev: AnnotationPath[]) => AnnotationPath[]) => {
      setPagePathsMap((prev) => {
        const updated: PagePathsMap = {
          ...prev,
          [page]: updater(prev[page] ?? []),
        };
        persistAnnotations(updated);
        return updated;
      });
    },
    [persistAnnotations],
  );

  // ─── Load PDF on file change ──────────────────────────────────────────────────

  useEffect(() => {
    if (!file) return;
    setPageNumber(1);
    setPagePathsMap({});
    setHistoryMap({});
    setCurrentPath(null);
    setDrawing(false);
    setPageRendered(false);
    setPdfSource(null);

    const loadPdf = async () => {
      setIsLoadingPdf(true);
      try {
        const base64String = await invoke<string>("read_pdf_file", {
          filePath: file,
        });
        setPdfSource(`data:application/pdf;base64,${base64String}`);
      } catch (err) {
        error(`Failed to load PDF from ${file}: ${err}`);
      } finally {
        setIsLoadingPdf(false);
      }
    };
    loadPdf();
  }, [file]);

  // ─── Load annotations separately so config is always fresh ───────────────────

  useEffect(() => {
    if (!file) return;
    const saved = readAnnotationsFromConfig();
    if (Object.keys(saved).length > 0) {
      setPagePathsMap(saved);
    }
  }, [file, readAnnotationsFromConfig]);

  // ─── Document load ────────────────────────────────────────────────────────────

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // ─── Page render: size annotation canvas to CSS pixels ────────────────────────
  //
  // THE FIX FOR "marks in wrong position":
  //   react-pdf renders its internal canvas at device-pixel resolution (e.g. 2x
  //   on retina screens). pdfCanvas.width may be 1684 while CSS display is 842px.
  //   We must set our annotation canvas to the CSS size — because mouse events
  //   (clientX/Y via getBoundingClientRect) are in CSS pixels. If we set
  //   canvas.width = pdfCanvas.width (1684), our canvas would be 2x larger than
  //   what the user sees, making every stroke appear at half the intended position.

  const onPageRenderSuccess = useCallback(() => {
    const canvas = canvasRef.current;
    const container = pageContainerRef.current;
    if (!canvas || !container) return;

    const pdfCanvas = container.querySelector(
      ".react-pdf__Page__canvas",
    ) as HTMLCanvasElement | null;

    if (pdfCanvas) {
      // CSS display size — mouse coordinates live in this space
      const cssW = parseFloat(pdfCanvas.style.width) || pdfCanvas.offsetWidth;
      const cssH = parseFloat(pdfCanvas.style.height) || pdfCanvas.offsetHeight;

      // Set annotation canvas to match CSS display size exactly (1:1 with mouse)
      canvas.width = cssW;
      canvas.height = cssH;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      scaleRef.current = {
        x: pdfCanvas.width / cssW,
        y: pdfCanvas.height / cssH,
      };
    }

    setPageRendered(true);
  }, []);

  // Reset pageRendered when navigating so we wait for new page to finish rendering
  useEffect(() => {
    setPageRendered(false);
  }, [pageNumber]);

  // ─── Redraw canvas ─────────────────────────────────────────────────────────────

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

  // ─── Coordinate helper ────────────────────────────────────────────────────────
  //
  // Always derive position from getBoundingClientRect so scroll offsets and any
  // parent CSS transforms don't shift coordinates. This is more reliable than
  // e.nativeEvent.offsetX which is relative to the target element (and can jump
  // if the event target is a child element rather than the canvas itself).

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // ─── Canvas drawing ───────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (tool === "pen" || tool === "highlight") {
      setDrawing(true);
      setCurrentPath({ points: [pos], tool });
    } else if (tool === "eraser") {
      setDrawing(true);
      eraseAt(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const pos = getCanvasPos(e);

    if (tool === "pen" || tool === "highlight") {
      setCurrentPath((prev) => {
        if (!prev) return null;
        const updated: AnnotationPath = {
          ...prev,
          points: [...prev.points, pos],
        };
        // Incremental draw for smooth real-time strokes
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && prev.points.length > 0) {
          const last = prev.points[prev.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = prev.tool === "pen" ? "red" : "rgba(255,255,0,0.4)";
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
  };

  const handleMouseUp = () => {
    if (currentPath && currentPath.points.length > 0) {
      setHistoryMap((prev) => ({
        ...prev,
        [pageNumber]: [...(prev[pageNumber] ?? []), [...currentPaths]],
      }));
      updatePagePaths(pageNumber, (prev) => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setDrawing(false);
  };

  // ─── Eraser ───────────────────────────────────────────────────────────────────
  //
  // THE FIX FOR "can't erase all lines":
  //   1. Previous eraseAt read `currentPaths` from closure — stale after the first
  //      erase since state hadn't updated yet. Now we read directly from
  //      setPagePathsMap's functional updater so we always have the latest paths.
  //   2. Radius increased to 20px so it reliably hits thin pen strokes.
  //   3. History snapshot taken inside the updater (only when something is erased).

  const eraseAt = useCallback(
    (pos: { x: number; y: number }) => {
      const ERASER_RADIUS = 20;

      setPagePathsMap((prevMap) => {
        const paths = prevMap[pageNumber] ?? [];
        if (paths.length === 0) return prevMap;

        const remaining = paths.filter(
          (path) =>
            !path.points.some(
              (pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < ERASER_RADIUS,
            ),
        );

        if (remaining.length === paths.length) return prevMap; // nothing changed

        // Record history before the erase
        setHistoryMap((h) => ({
          ...h,
          [pageNumber]: [...(h[pageNumber] ?? []), paths],
        }));

        const updated: PagePathsMap = { ...prevMap, [pageNumber]: remaining };
        persistAnnotations(updated);
        redrawCanvas(remaining);
        return updated;
      });
    },
    [pageNumber, persistAnnotations, redrawCanvas],
  );

  // ─── Undo ─────────────────────────────────────────────────────────────────────

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

  // ─── Search highlighting ──────────────────────────────────────────────────────

  const highlightMatches = useCallback(() => {
    document
      .querySelectorAll(".react-pdf__Page__textContent span")
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

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBox(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if (e.key === "Escape") {
        setShowSearchBox(false);
        setSearchTerm("");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo]);

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const handlePrevPage = () => {
    if (pageNumber > 1) setPageNumber((p) => p - 1);
  };
  const handleNextPage = () => {
    if (pageNumber < numPages) setPageNumber((p) => p + 1);
  };

  // ─── Download ─────────────────────────────────────────────────────────────────

  const createDocument = async () => {
    try {
      saveContentToPDF(basicConfig, knowledgeStoreConfig, file);
    } catch (err) {
      error(`Failed to create document: ${err}`);
    }
  };

  // ─── Toolbar styles ───────────────────────────────────────────────────────────

  const toolbarBase = isDarkMode
    ? "bg-white/[0.08] border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.06)_inset] backdrop-blur-2xl backdrop-saturate-200"
    : "bg-black/75 border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]";
  const toolbarBtn = isDarkMode
    ? "text-white/40 hover:text-white/80 hover:bg-white/[0.08]"
    : "text-white/50 hover:text-white hover:bg-white/10";
  const toolbarBtnActive =
    "bg-white/20 text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]";
  const toolbarDivider = isDarkMode ? "bg-white/10" : "bg-white/15";

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className={`mt-3 h-[690px] rounded-md flex flex-col ${
        isDarkMode ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {showSearchBox && (
        <Card className="fixed top-4 right-6 p-3 z-50 w-72 shadow-xl">
          <Input
            ref={searchInputRef}
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </Card>
      )}

      <div className="relative flex-1 min-h-0 overflow-y-auto flex justify-center">
        {/* Toolbar */}
        <div
          className={`fixed bottom-6 z-50 flex flex-row items-center gap-0.5 p-1.5 rounded-2xl border ${toolbarBase}`}
        >
          <Button
            onClick={handlePrevPage}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarBtn}`}
          >
            <ChevronLeft className="h-[15px] w-[15px]" />
          </Button>
          <Button
            onClick={handleNextPage}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarBtn}`}
          >
            <ChevronRight className="h-[15px] w-[15px]" />
          </Button>

          <div className={`mx-1 h-4 w-px rounded-full ${toolbarDivider}`} />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool(tool === "pen" ? null : "pen")}
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${
              tool === "pen" ? toolbarBtnActive : toolbarBtn
            }`}
          >
            <PenIcon className="h-[15px] w-[15px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool(tool === "highlight" ? null : "highlight")}
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${
              tool === "highlight" ? toolbarBtnActive : toolbarBtn
            }`}
          >
            <HighlighterIcon className="h-[15px] w-[15px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool(tool === "eraser" ? null : "eraser")}
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${
              tool === "eraser" ? toolbarBtnActive : toolbarBtn
            }`}
          >
            <EraserIcon className="h-[15px] w-[15px]" />
          </Button>

          <div className={`mx-1 h-4 w-px rounded-full ${toolbarDivider}`} />

          <Button
            onClick={toggleBookmark}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${
              isCurrentPageBookmarked
                ? "text-rose-400 bg-rose-400/15"
                : toolbarBtn
            }`}
          >
            {isCurrentPageBookmarked ? (
              <BookmarkCheck className="h-[15px] w-[15px]" />
            ) : (
              <BookmarkIcon className="h-[15px] w-[15px]" />
            )}
          </Button>

          <Button
            onClick={() => setIsDarkMode(!isDarkMode)}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarBtn}`}
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
            className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarBtn}`}
          >
            <DownloadIcon className="h-[15px] w-[15px]" />
          </Button>
        </div>

        {/* PDF + canvas overlay */}
        {isLoadingPdf ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading PDF...</p>
          </div>
        ) : pdfSource ? (
          <div
            ref={pageContainerRef}
            style={{
              position: "relative",
              display: "inline-block",
              filter: isDarkMode ? "invert(1) hue-rotate(180deg)" : "none",
            }}
          >
            <Document file={pdfSource} onLoadSuccess={onDocumentLoadSuccess}>
              <Page
                pageNumber={pageNumber}
                renderAnnotationLayer
                renderTextLayer
                onRenderSuccess={onPageRenderSuccess}
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
                // width/height set dynamically by onPageRenderSuccess
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
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>No PDF loaded</p>
          </div>
        )}
      </div>

      <p
        className={`mt-4 text-sm ${
          isDarkMode ? "bg-black text-white" : "bg-white text-black"
        }`}
      >
        Page {pageNumber} of {numPages} {isCurrentPageBookmarked && "🔖"}
      </p>
    </div>
  );
};

export default PDFViewer;
