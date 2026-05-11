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
  EraserIcon,
  HighlighterIcon,
  MoonIcon,
  PenIcon,
  SunIcon,
  DownloadIcon,
  ChevronLeft,
  ChevronRight,
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

// A positioned highlight rect over the page
interface MatchRect {
  top: number;
  left: number;
  width: number;
  height: number;
  pageNum: number; // which page wrapper it belongs to
  globalIndex: number; // across all pages
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [tool, setTool] = useState<"pen" | "highlight" | "eraser" | null>(null);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [pagePathsMap, setPagePathsMap] = useState<PagePathsMap>({});
  const [historyMap, setHistoryMap] = useState<
    Record<number, AnnotationPath[][]>
  >({});
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Search match state
  const [matchRects, setMatchRects] = useState<MatchRect[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1);

  // One canvas ref + page wrapper ref per page
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Drawing state in a ref to avoid stale closures
  const drawingState = useRef<{
    active: boolean;
    page: number;
    currentPath: AnnotationPath | null;
  }>({ active: false, page: 1, currentPath: null });

  // Track how many pages have rendered so we can re-scan after all are ready
  const renderedPagesRef = useRef<Set<number>>(new Set());

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Scrollbar thumb drag state
  const thumbDragRef = useRef<{
    startY: number;
    startScrollTop: number;
  } | null>(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);

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

  // ─── Annotations: persist / read ────────────────────────────────────────

  const persistAnnotations = useCallback(
    (updatedMap: PagePathsMap) => {
      if (!config) return;
      updateConfig({
        ...config,
        annotations: {
          ...(config.annotations ?? {}),
          [file]: { pagePathsMap: updatedMap } satisfies FileAnnotations,
        },
      });
    },
    [file, config, updateConfig],
  );

  const readAnnotationsFromConfig = useCallback((): PagePathsMap => {
    const fa: FileAnnotations | undefined = config?.annotations?.[file];
    if (!fa) return {};
    const out: PagePathsMap = {};
    for (const [k, v] of Object.entries(fa.pagePathsMap)) out[Number(k)] = v;
    return out;
  }, [file, config]);

  // ─── Load PDF ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!file) return;
    setPagePathsMap({});
    setHistoryMap({});
    setPdfSource(null);
    setMatchRects([]);
    setActiveMatchIndex(-1);
    canvasRefs.current = {};
    pageWrapperRefs.current = {};
    renderedPagesRef.current = new Set();

    let cancelled = false;
    setIsLoadingPdf(true);
    invoke<string>("read_pdf_file", { filePath: file })
      .then((b64) => {
        if (!cancelled) setPdfSource(`data:application/pdf;base64,${b64}`);
      })
      .catch((err) => {
        if (!cancelled) error(`Failed to load PDF: ${err}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPdf(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const saved = readAnnotationsFromConfig();
    if (Object.keys(saved).length > 0) setPagePathsMap(saved);
  }, [file, readAnnotationsFromConfig]);

  // ─── Document load ───────────────────────────────────────────────────────

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      renderedPagesRef.current = new Set();
    },
    [],
  );

  // ─── Canvas: redraw ───────────────────────────────────────────────────────

  const redrawCanvas = useCallback(
    (pageNum: number, paths: AnnotationPath[]) => {
      const canvas = canvasRefs.current[pageNum];
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      paths.forEach((path) => {
        if (!path.points.length) return;
        ctx.beginPath();
        path.points.forEach((pt, i) =>
          i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y),
        );
        ctx.strokeStyle = path.tool === "pen" ? "red" : "rgba(255,255,0,0.4)";
        ctx.lineWidth = path.tool === "pen" ? 2 : 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    },
    [],
  );

  useEffect(() => {
    for (const [k, paths] of Object.entries(pagePathsMap)) {
      redrawCanvas(Number(k), paths);
    }
  }, [pagePathsMap, redrawCanvas]);

  // ─── Page render: size the overlay canvas ────────────────────────────────

  const onPageRenderSuccess = useCallback(
    (pageNum: number) => () => {
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;
      const pdfCanvas = canvas.parentElement?.querySelector(
        ".react-pdf__Page__canvas",
      ) as HTMLCanvasElement | null;
      if (!pdfCanvas) return;
      const w = parseFloat(pdfCanvas.style.width) || pdfCanvas.offsetWidth;
      const h = parseFloat(pdfCanvas.style.height) || pdfCanvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      redrawCanvas(pageNum, pagePathsMap[pageNum] ?? []);
      renderedPagesRef.current.add(pageNum);
    },
    [pagePathsMap, redrawCanvas],
  );

  // ─── Search: compute match rects from text layer spans ───────────────────
  //
  // react-pdf's text layer applies CSS transforms (scale, rotate) to each span
  // to match the PDF glyph positions. We must NOT use innerHTML injection because
  // the highlight would be the wrong size/position after the transform.
  //
  // Instead: for each matching span, get its getBoundingClientRect() (already
  // accounts for the CSS transform), then translate it into coordinates relative
  // to the page wrapper div. This gives us pixel-perfect overlay rects.

  const computeMatchRects = useCallback(() => {
    if (!searchTerm) {
      setMatchRects([]);
      setActiveMatchIndex(-1);
      return;
    }

    const lower = searchTerm.toLowerCase();
    const rects: MatchRect[] = [];
    let globalIndex = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const wrapper = pageWrapperRefs.current[pageNum];
      if (!wrapper) continue;

      const wrapperRect = wrapper.getBoundingClientRect();

      const spans = wrapper.querySelectorAll<HTMLElement>(
        ".react-pdf__Page__textContent span",
      );

      spans.forEach((span) => {
        const text = span.textContent ?? "";
        if (!text.toLowerCase().includes(lower)) return;

        // getBoundingClientRect already accounts for CSS transforms on the span
        const sr = span.getBoundingClientRect();
        rects.push({
          top: sr.top - wrapperRect.top,
          left: sr.left - wrapperRect.left,
          width: sr.width,
          height: sr.height,
          pageNum,
          globalIndex: globalIndex++,
        });
      });
    }

    setMatchRects(rects);
    setActiveMatchIndex(rects.length > 0 ? 0 : -1);
  }, [searchTerm, numPages]);

  // Re-scan whenever term changes or pages finish rendering.
  // The 150ms delay ensures text layers are mounted after onRenderSuccess.
  useEffect(() => {
    const id = setTimeout(computeMatchRects, 150);
    return () => clearTimeout(id);
  }, [computeMatchRects]);

  // ─── Scroll active match into view ───────────────────────────────────────

  useEffect(() => {
    if (activeMatchIndex < 0 || !matchRects[activeMatchIndex]) return;
    const m = matchRects[activeMatchIndex];
    const wrapper = pageWrapperRefs.current[m.pageNum];
    const container = scrollContainerRef.current;
    if (!wrapper || !container) return;

    // Scroll so the match is centred in the viewport
    const wrapperTop = wrapper.offsetTop; // relative to scroll container
    const matchMidY = wrapperTop + m.top + m.height / 2;
    const targetScrollTop = matchMidY - container.clientHeight / 2;
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  }, [activeMatchIndex, matchRects]);

  const navigateMatch = useCallback(
    (direction: 1 | -1) => {
      setActiveMatchIndex((prev) => {
        if (matchRects.length === 0) return -1;
        if (prev < 0) return 0;
        return (prev + direction + matchRects.length) % matchRects.length;
      });
    },
    [matchRects.length],
  );

  // ─── Scrollbar ────────────────────────────────────────────────────────────

  const updateScrollbar = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ratio = el.clientHeight / el.scrollHeight;
    const tH = Math.max(el.clientHeight * ratio, 32);
    const maxScroll = el.scrollHeight - el.clientHeight;
    const tT =
      maxScroll > 0 ? (el.scrollTop / maxScroll) * (el.clientHeight - tH) : 0;
    setThumbHeight(tH);
    setThumbTop(tT);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollbar();
    el.addEventListener("scroll", updateScrollbar, { passive: true });
    const ro = new ResizeObserver(updateScrollbar);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollbar);
      ro.disconnect();
    };
  }, [updateScrollbar]);

  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = scrollContainerRef.current;
    if (!el) return;
    thumbDragRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };

    const onMove = (ev: MouseEvent) => {
      const drag = thumbDragRef.current;
      if (!drag || !el) return;
      const dy = ev.clientY - drag.startY;
      const ratio = el.scrollHeight / el.clientHeight;
      el.scrollTop = drag.startScrollTop + dy * ratio;
    };
    const onUp = () => {
      thumbDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // ─── Canvas coordinate helper ────────────────────────────────────────────

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ─── Eraser ──────────────────────────────────────────────────────────────

  const eraseAt = useCallback(
    (pageNum: number, pos: { x: number; y: number }) => {
      const RADIUS = 20;
      setPagePathsMap((prev) => {
        const paths = prev[pageNum] ?? [];
        const remaining = paths.filter(
          (p) =>
            !p.points.some(
              (pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < RADIUS,
            ),
        );
        if (remaining.length === paths.length) return prev;
        setHistoryMap((h) => ({
          ...h,
          [pageNum]: [...(h[pageNum] ?? []), paths],
        }));
        const updated = { ...prev, [pageNum]: remaining };
        persistAnnotations(updated);
        redrawCanvas(pageNum, remaining);
        return updated;
      });
    },
    [persistAnnotations, redrawCanvas],
  );

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (pageNum: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e);
      if (tool === "pen" || tool === "highlight") {
        drawingState.current = {
          active: true,
          page: pageNum,
          currentPath: { points: [pos], tool },
        };
      } else if (tool === "eraser") {
        drawingState.current = {
          active: true,
          page: pageNum,
          currentPath: null,
        };
        eraseAt(pageNum, pos);
      }
    },
    [tool, eraseAt],
  );

  const handleMouseMove = useCallback(
    (pageNum: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
      const ds = drawingState.current;
      if (!ds.active || ds.page !== pageNum) return;
      const pos = getCanvasPos(e);
      if ((tool === "pen" || tool === "highlight") && ds.currentPath) {
        const prev = ds.currentPath;
        const ctx = canvasRefs.current[pageNum]?.getContext("2d");
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
        drawingState.current.currentPath = {
          ...prev,
          points: [...prev.points, pos],
        };
      } else if (tool === "eraser") {
        eraseAt(pageNum, pos);
      }
    },
    [tool, eraseAt],
  );

  const handleMouseUp = useCallback(
    (pageNum: number) => () => {
      const ds = drawingState.current;
      if (!ds.active || ds.page !== pageNum) return;
      if (ds.currentPath && ds.currentPath.points.length > 0) {
        const path = ds.currentPath;
        setPagePathsMap((prev) => {
          setHistoryMap((h) => ({
            ...h,
            [pageNum]: [...(h[pageNum] ?? []), prev[pageNum] ?? []],
          }));
          const updated = {
            ...prev,
            [pageNum]: [...(prev[pageNum] ?? []), path],
          };
          persistAnnotations(updated);
          return updated;
        });
      }
      drawingState.current = {
        active: false,
        page: pageNum,
        currentPath: null,
      };
    },
    [persistAnnotations],
  );

  // ─── Undo ────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    const lastPage = drawingState.current.page;
    setHistoryMap((prevH) => {
      const pageHist = prevH[lastPage] ?? [];
      if (!pageHist.length) return prevH;
      const lastPaths = pageHist[pageHist.length - 1];
      setPagePathsMap((prev) => {
        const updated = { ...prev, [lastPage]: lastPaths };
        persistAnnotations(updated);
        redrawCanvas(lastPage, lastPaths);
        return updated;
      });
      return { ...prevH, [lastPage]: pageHist.slice(0, -1) };
    });
  }, [persistAnnotations, redrawCanvas]);

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
      } else if (e.key === "Enter" && showSearchBox) {
        e.preventDefault();
        navigateMatch(e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (focusTimeoutRef.current !== null)
        window.clearTimeout(focusTimeoutRef.current);
    };
  }, [handleUndo, navigateMatch, showSearchBox]);

  // ─── Render ──────────────────────────────────────────────────────────────

  const showScrollbar =
    thumbHeight < (scrollContainerRef.current?.clientHeight ?? 0);

  return (
    <div
      className={`mt-2.5 min-h-0 rounded-md flex flex-col ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}
    >
      {/* Search box */}
      {showSearchBox && (
        <Card className="fixed top-24 right-26 p-3 z-50 w-80 shadow-xl">
          <div className="flex gap-1">
            <Input
              ref={searchInputRef}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  navigateMatch(e.shiftKey ? -1 : 1);
                }
              }}
              className="w-full"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateMatch(-1)}
              disabled={!searchTerm}
              className="shrink-0 px-2"
              title="Previous (Shift+Enter)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateMatch(1)}
              disabled={!searchTerm}
              className="shrink-0 px-2"
              title="Next (Enter)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {matchRects.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {activeMatchIndex + 1} / {matchRects.length} · Shift+Enter ← ·
              Enter →
            </p>
          )}
          {searchTerm && matchRects.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">No matches</p>
          )}
        </Card>
      )}

      {/* Outer wrapper for scroll + scrollbar */}
      <div className="relative flex-1 min-h-0">
        {/* Scroll container */}
        <div
          ref={scrollContainerRef}
          className="h-full w-full overflow-y-auto flex flex-col items-center gap-4 py-4"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Floating toolbar */}
          <div
            className={`fixed bottom-6 z-50 flex flex-row items-center gap-0.5 p-1.5 rounded-2xl border ${toolbarStyles.base}`}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool(tool === "pen" ? null : "pen")}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${tool === "pen" ? toolbarStyles.btnActive : toolbarStyles.btn}`}
            >
              <PenIcon className="h-[15px] w-[15px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool(tool === "highlight" ? null : "highlight")}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${tool === "highlight" ? toolbarStyles.btnActive : toolbarStyles.btn}`}
            >
              <HighlighterIcon className="h-[15px] w-[15px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool(tool === "eraser" ? null : "eraser")}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${tool === "eraser" ? toolbarStyles.btnActive : toolbarStyles.btn}`}
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

          {isLoadingPdf && (
            <div className="flex items-center justify-center h-64">
              <Loading />
            </div>
          )}
          {!isLoadingPdf && !pdfSource && (
            <div className="flex items-center justify-center h-full">
              <p>No PDF loaded</p>
            </div>
          )}

          {pdfSource && (
            <Document
              file={pdfSource}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<Loading />}
              noData={null}
            >
              {Array.from({ length: numPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <div
                    key={pageNum}
                    ref={(el) => {
                      pageWrapperRefs.current[pageNum] = el;
                    }}
                    style={{
                      position: "relative",
                      display: "inline-block",
                      filter: isDarkMode
                        ? "invert(1) hue-rotate(180deg)"
                        : "none",
                    }}
                  >
                    <Page
                      pageNumber={pageNum}
                      renderAnnotationLayer
                      renderTextLayer
                      onRenderSuccess={onPageRenderSuccess(pageNum)}
                      loading={null}
                    />

                    {/* Search highlight overlays — pixel-perfect, above text layer */}
                    {matchRects
                      .filter((m) => m.pageNum === pageNum)
                      .map((m) => (
                        <div
                          key={m.globalIndex}
                          style={{
                            position: "absolute",
                            top: m.top,
                            left: m.left,
                            width: m.width,
                            height: m.height,
                            // Active match: vivid orange; others: semi-transparent yellow
                            background:
                              m.globalIndex === activeMatchIndex
                                ? "rgba(255, 140, 0, 0.55)"
                                : "rgba(255, 220, 0, 0.35)",
                            borderRadius: 2,
                            pointerEvents: "none",
                            zIndex: 11,
                            // Pop the active one with a subtle outline
                            outline:
                              m.globalIndex === activeMatchIndex
                                ? "2px solid rgba(255,100,0,0.8)"
                                : "none",
                          }}
                        />
                      ))}

                    {/* Drawing canvas — above highlights */}
                    <canvas
                      ref={(el) => {
                        canvasRefs.current[pageNum] = el;
                      }}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        zIndex: 12,
                        backgroundColor: "transparent",
                      }}
                      className={
                        tool === "pen" ||
                        tool === "highlight" ||
                        tool === "eraser"
                          ? "pointer-events-auto cursor-crosshair"
                          : "pointer-events-none"
                      }
                      onMouseDown={handleMouseDown(pageNum)}
                      onMouseMove={handleMouseMove(pageNum)}
                      onMouseUp={handleMouseUp(pageNum)}
                      onMouseLeave={handleMouseUp(pageNum)}
                    />
                  </div>
                ),
              )}
            </Document>
          )}
        </div>

        {/* Minimal custom scrollbar */}
        {showScrollbar && (
          <div
            className="absolute right-0 top-0 bottom-0 w-[10px] rounded-full"
            style={{ background: "transparent" }}
          >
            <div
              onMouseDown={handleThumbMouseDown}
              style={{
                position: "absolute",
                top: thumbTop,
                height: thumbHeight,
                width: "5px",
                borderRadius: "9999px",
                background: isDarkMode
                  ? "rgba(237,232,223,0.25)"
                  : "rgba(44,36,22,0.2)",
                cursor: "grab",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  isDarkMode ? "rgba(237,232,223,0.45)" : "rgba(44,36,22,0.4)";
              }}
              onMouseLeave={(e) => {
                if (!thumbDragRef.current)
                  (e.currentTarget as HTMLDivElement).style.background =
                    isDarkMode
                      ? "rgba(237,232,223,0.25)"
                      : "rgba(44,36,22,0.2)";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
