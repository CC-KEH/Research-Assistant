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
  ZoomInIcon,
  ZoomOutIcon,
  StickyNoteIcon,
  XIcon,
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

interface MatchRect {
  top: number;
  left: number;
  width: number;
  height: number;
  pageNum: number;
  globalIndex: number;
}

interface SelectionHighlight {
  id: string;
  pageNum: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TextNote {
  id: string;
  pageNum: number;
  rects: { top: number; left: number; width: number; height: number }[];
  selectedText: string;
  markdown: string;
}

interface PendingNote {
  pageNum: number;
  rects: { top: number; left: number; width: number; height: number }[];
  selectedText: string;
}

// Snapshot of the user's current text selection on a PDF page
interface SelectionSnapshot {
  pageNum: number;
  rects: { top: number; left: number; width: number; height: number }[];
  text: string;
}

const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br/>");
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  // "pen" and "eraser" are persistent draw modes; highlight/note are now toolbar actions,
  // not persistent modes — the tool state only tracks pen/eraser.
  const [drawTool, setDrawTool] = useState<"pen" | "eraser" | null>(null);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [pagePathsMap, setPagePathsMap] = useState<PagePathsMap>({});
  const [historyMap, setHistoryMap] = useState<
    Record<number, AnnotationPath[][]>
  >({});
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [scale, setScale] = useState<number>(1);

  const [selectionHighlights, setSelectionHighlights] = useState<
    SelectionHighlight[]
  >([]);
  const [notes, setNotes] = useState<TextNote[]>([]);
  const [pendingNote, setPendingNote] = useState<PendingNote | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [notePopupPos, setNotePopupPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // The contextual popover shown after the user finishes a text selection
  const [selectionSnapshot, setSelectionSnapshot] =
    useState<SelectionSnapshot | null>(null);

  const [matchRects, setMatchRects] = useState<MatchRect[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1);

  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const drawingState = useRef<{
    active: boolean;
    page: number;
    currentPath: AnnotationPath | null;
  }>({ active: false, page: 1, currentPath: null });
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const thumbDragRef = useRef<{
    startY: number;
    startScrollTop: number;
  } | null>(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);

  const { config, updateConfig } = useConfig();

  // ─── Zoom ────────────────────────────────────────────────────────────────

  const zoomIn = useCallback(
    () => setScale((s) => Math.min(+(s + ZOOM_STEP).toFixed(2), ZOOM_MAX)),
    [],
  );
  const zoomOut = useCallback(
    () => setScale((s) => Math.max(+(s - ZOOM_STEP).toFixed(2), ZOOM_MIN)),
    [],
  );

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
      zoomLabel: isDarkMode ? "text-[#EDE8DF]/50" : "text-[#F8F5F0]/60",
    }),
    [isDarkMode],
  );

  // ─── Annotations persist / read ──────────────────────────────────────────

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
    setSelectionHighlights([]);
    setNotes([]);
    setPendingNote(null);
    setNoteInput("");
    setSelectionSnapshot(null);
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

  // ─── Canvas redraw ────────────────────────────────────────────────────────

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
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    },
    [],
  );

  useEffect(() => {
    for (const [k, paths] of Object.entries(pagePathsMap))
      redrawCanvas(Number(k), paths);
  }, [pagePathsMap, redrawCanvas]);

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

  // ─── Selection snapshot ───────────────────────────────────────────────────
  //
  // On every mouseup inside a page wrapper we read window.getSelection() and
  // store it. The browser clears the selection when the user clicks a toolbar
  // button, so we must capture it BEFORE that happens.

  const captureSelection = useCallback(
    (pageNum: number): SelectionSnapshot | null => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

      const range = sel.getRangeAt(0);
      const clientRects = Array.from(range.getClientRects());
      if (!clientRects.length) return null;

      const wrapper = pageWrapperRefs.current[pageNum];
      if (!wrapper) return null;
      const wrapperRect = wrapper.getBoundingClientRect();

      const rects = clientRects
        .filter((r) => r.width > 1 && r.height > 1)
        .map((r) => ({
          top: r.top - wrapperRect.top,
          left: r.left - wrapperRect.left,
          width: r.width,
          height: r.height,
        }));

      const text = sel.toString().trim();
      if (!rects.length || !text) return null;

      return { pageNum, rects, text };
    },
    [],
  );

  // Called on mouseup of every page wrapper — always, regardless of mode
  const handlePageMouseUp = useCallback(
    (pageNum: number) => (_e: React.MouseEvent<HTMLDivElement>) => {
      // Give the browser a tick to finalise the selection range
      setTimeout(() => {
        const snapshot = captureSelection(pageNum);
        setSelectionSnapshot(snapshot);
      }, 0);
    },
    [captureSelection],
  );

  // ─── Contextual action: highlight ────────────────────────────────────────

  const applyHighlight = useCallback(() => {
    if (!selectionSnapshot) return;
    const { pageNum, rects } = selectionSnapshot;
    const newHighlights: SelectionHighlight[] = rects.map((r) => ({
      id: `${pageNum}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pageNum,
      ...r,
    }));
    setSelectionHighlights((prev) => [...prev, ...newHighlights]);
    setSelectionSnapshot(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionSnapshot]);

  // ─── Contextual action: open note composer ────────────────────────────────

  const openNoteComposer = useCallback(() => {
    if (!selectionSnapshot) return;
    setPendingNote({
      pageNum: selectionSnapshot.pageNum,
      rects: selectionSnapshot.rects,
      selectedText: selectionSnapshot.text,
    });
    setNoteInput("");
    setSelectionSnapshot(null);
    window.getSelection()?.removeAllRanges();
    setTimeout(() => noteTextareaRef.current?.focus(), 50);
  }, [selectionSnapshot]);

  // ─── Save / cancel note ───────────────────────────────────────────────────

  const saveNote = useCallback(() => {
    if (!pendingNote || !noteInput.trim()) return;
    const note: TextNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pageNum: pendingNote.pageNum,
      rects: pendingNote.rects,
      selectedText: pendingNote.selectedText,
      markdown: noteInput.trim(),
    };
    setNotes((prev) => [...prev, note]);
    setPendingNote(null);
    setNoteInput("");
  }, [pendingNote, noteInput]);

  const cancelNote = useCallback(() => {
    setPendingNote(null);
    setNoteInput("");
  }, []);

  // ─── Erase highlights / notes near a canvas position ─────────────────────

  const eraseSelectionHighlightsAt = useCallback(
    (pageNum: number, pos: { x: number; y: number }) => {
      const R = 20;
      setSelectionHighlights((prev) =>
        prev.filter((h) => {
          if (h.pageNum !== pageNum) return true;
          return !(
            pos.x >= h.left - R &&
            pos.x <= h.left + h.width + R &&
            pos.y >= h.top - R &&
            pos.y <= h.top + h.height + R
          );
        }),
      );
      setNotes((prev) =>
        prev.filter((n) => {
          if (n.pageNum !== pageNum) return true;
          return !n.rects.some(
            (r) =>
              pos.x >= r.left - R &&
              pos.x <= r.left + r.width + R &&
              pos.y >= r.top - R &&
              pos.y <= r.top + r.height + R,
          );
        }),
      );
    },
    [],
  );

  // ─── Search ───────────────────────────────────────────────────────────────

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
      wrapper
        .querySelectorAll<HTMLElement>(".react-pdf__Page__textContent span")
        .forEach((span) => {
          if (!(span.textContent ?? "").toLowerCase().includes(lower)) return;
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

  useEffect(() => {
    const id = setTimeout(computeMatchRects, 150);
    return () => clearTimeout(id);
  }, [computeMatchRects]);

  useEffect(() => {
    if (activeMatchIndex < 0 || !matchRects[activeMatchIndex]) return;
    const m = matchRects[activeMatchIndex];
    const wrapper = pageWrapperRefs.current[m.pageNum];
    const container = scrollContainerRef.current;
    if (!wrapper || !container) return;
    container.scrollTo({
      top:
        wrapper.offsetTop + m.top + m.height / 2 - container.clientHeight / 2,
      behavior: "smooth",
    });
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
    setThumbHeight(tH);
    setThumbTop(
      maxScroll > 0 ? (el.scrollTop / maxScroll) * (el.clientHeight - tH) : 0,
    );
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
      el.scrollTop =
        drag.startScrollTop +
        (ev.clientY - drag.startY) * (el.scrollHeight / el.clientHeight);
    };
    const onUp = () => {
      thumbDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // ─── Canvas drawing ───────────────────────────────────────────────────────

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const eraseAt = useCallback(
    (pageNum: number, pos: { x: number; y: number }) => {
      const R = 20;
      setPagePathsMap((prev) => {
        const paths = prev[pageNum] ?? [];
        const remaining = paths.filter(
          (p) =>
            !p.points.some((pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < R),
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
      eraseSelectionHighlightsAt(pageNum, pos);
    },
    [persistAnnotations, redrawCanvas, eraseSelectionHighlightsAt],
  );

  const handleMouseDown = useCallback(
    (pageNum: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (drawTool !== "pen" && drawTool !== "eraser") return;
      const pos = getCanvasPos(e);
      if (drawTool === "pen") {
        drawingState.current = {
          active: true,
          page: pageNum,
          currentPath: { points: [pos], tool: drawTool },
        };
      } else {
        drawingState.current = {
          active: true,
          page: pageNum,
          currentPath: null,
        };
        eraseAt(pageNum, pos);
      }
    },
    [drawTool, eraseAt],
  );

  const handleMouseMove = useCallback(
    (pageNum: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
      const ds = drawingState.current;
      if (!ds.active || ds.page !== pageNum) return;
      const pos = getCanvasPos(e);
      if (drawTool === "pen" && ds.currentPath) {
        const prev = ds.currentPath;
        const ctx = canvasRefs.current[pageNum]?.getContext("2d");
        if (ctx && prev.points.length > 0) {
          const last = prev.points[prev.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
        drawingState.current.currentPath = {
          ...prev,
          points: [...prev.points, pos],
        };
      } else if (drawTool === "eraser") {
        eraseAt(pageNum, pos);
      }
    },
    [drawTool, eraseAt],
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

  // ─── Undo ─────────────────────────────────────────────────────────────────

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

  // ─── Download ─────────────────────────────────────────────────────────────

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

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

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
        if (pendingNote) {
          cancelNote();
          return;
        }
        setShowSearchBox(false);
        setSearchTerm("");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "Enter" && showSearchBox) {
        e.preventDefault();
        navigateMatch(e.shiftKey ? -1 : 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (focusTimeoutRef.current !== null)
        window.clearTimeout(focusTimeoutRef.current);
    };
  }, [
    handleUndo,
    navigateMatch,
    showSearchBox,
    pendingNote,
    cancelNote,
    zoomIn,
    zoomOut,
  ]);

  // ─── Page wrapper style ───────────────────────────────────────────────────
  // Text selection is ALWAYS allowed. We only block it when the pen/eraser
  // canvas is active (pointer-events on the canvas handle that).

  const pageWrapperStyle = useCallback(
    (dark: boolean): React.CSSProperties => ({
      position: "relative",
      display: "inline-block",
      filter: dark ? "invert(1) hue-rotate(180deg)" : "none",
      // Always allow text cursor / selection — the canvas sits on top for drawing
      cursor: "text",
      userSelect: "text",
    }),
    [],
  );

  // ─── Misc ─────────────────────────────────────────────────────────────────

  const isLoading = isLoadingPdf || (!!pdfSource && numPages === 0);
  const showScrollbar =
    thumbHeight < (scrollContainerRef.current?.clientHeight ?? 0);
  const hoveredNote = useMemo(
    () => notes.find((n) => n.id === hoveredNoteId) ?? null,
    [notes, hoveredNoteId],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`mt-2.5 min-h-0 rounded-md flex flex-col ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}
    >
      {/* ── Search box ── */}
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
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateMatch(1)}
              disabled={!searchTerm}
              className="shrink-0 px-2"
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

      {/* ── Note composer panel ── */}
      {pendingNote && (
        <div
          className="fixed right-6 top-1/2 -translate-y-1/2 z-50 w-80 rounded-2xl shadow-2xl border overflow-hidden"
          style={{
            background: isDarkMode ? "#1C1917" : "#FFFDF8",
            borderColor: isDarkMode
              ? "rgba(237,232,223,0.12)"
              : "rgba(180,160,120,0.25)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: isDarkMode
                ? "rgba(237,232,223,0.08)"
                : "rgba(180,160,120,0.15)",
            }}
          >
            <div className="flex items-center gap-2">
              <StickyNoteIcon
                className="h-4 w-4"
                style={{ color: "#7CB9A8" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: isDarkMode ? "#EDE8DF" : "#2C2416" }}
              >
                Add Note
              </span>
            </div>
            <button
              onClick={cancelNote}
              className="opacity-40 hover:opacity-80 transition-opacity"
            >
              <XIcon
                className="h-4 w-4"
                style={{ color: isDarkMode ? "#EDE8DF" : "#2C2416" }}
              />
            </button>
          </div>

          <div
            className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs italic leading-relaxed"
            style={{
              background: "rgba(124,185,168,0.12)",
              borderLeft: "3px solid #7CB9A8",
              color: isDarkMode ? "#B8D4CD" : "#3A6B5E",
              maxHeight: 72,
              overflowY: "auto",
            }}
          >
            "{pendingNote.selectedText.slice(0, 200)}
            {pendingNote.selectedText.length > 200 ? "…" : ""}"
          </div>

          <div className="px-4 pt-3 pb-1">
            <textarea
              ref={noteTextareaRef}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Write your note in Markdown…"
              rows={5}
              className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: isDarkMode
                  ? "rgba(237,232,223,0.05)"
                  : "rgba(44,36,22,0.04)",
                border: `1px solid ${isDarkMode ? "rgba(237,232,223,0.12)" : "rgba(44,36,22,0.12)"}`,
                color: isDarkMode ? "#EDE8DF" : "#2C2416",
                fontFamily: "monospace",
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") saveNote();
              }}
            />
            <p
              className="text-xs mt-1 mb-2 opacity-40"
              style={{ color: isDarkMode ? "#EDE8DF" : "#2C2416" }}
            >
              Markdown supported · ⌘↵ to save
            </p>
          </div>

          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={saveNote}
              disabled={!noteInput.trim()}
              className="flex-1 rounded-xl py-2 text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: "#7CB9A8", color: "#fff" }}
            >
              Save Note
            </button>
            <button
              onClick={cancelNote}
              className="px-4 rounded-xl py-2 text-sm transition-all"
              style={{
                background: isDarkMode
                  ? "rgba(237,232,223,0.08)"
                  : "rgba(44,36,22,0.06)",
                color: isDarkMode ? "#EDE8DF" : "#2C2416",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Note hover popup ── */}
      {hoveredNote && (
        <div
          className="fixed z-50 w-72 rounded-2xl shadow-2xl border pointer-events-none"
          style={{
            top: notePopupPos.y + 12,
            left: notePopupPos.x + 12,
            background: isDarkMode ? "#1C1917" : "#FFFDF8",
            borderColor: isDarkMode
              ? "rgba(124,185,168,0.3)"
              : "rgba(124,185,168,0.4)",
            boxShadow:
              "0 12px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(124,185,168,0.15)",
          }}
        >
          <div
            className="h-1 rounded-t-2xl"
            style={{ background: "linear-gradient(90deg, #7CB9A8, #5A9A86)" }}
          />
          <div className="px-4 py-3">
            <p
              className="text-xs italic mb-2 leading-relaxed line-clamp-2"
              style={{
                color: isDarkMode ? "#8BBFB2" : "#4A8A7A",
                borderLeft: "2px solid #7CB9A8",
                paddingLeft: 8,
              }}
            >
              "{hoveredNote.selectedText.slice(0, 120)}
              {hoveredNote.selectedText.length > 120 ? "…" : ""}"
            </p>
            <div
              className="text-sm leading-relaxed"
              style={{ color: isDarkMode ? "#EDE8DF" : "#2C2416" }}
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(hoveredNote.markdown),
              }}
            />
          </div>
          <div
            className="px-4 py-2 border-t text-xs opacity-40 text-right"
            style={{
              borderColor: isDarkMode
                ? "rgba(237,232,223,0.08)"
                : "rgba(44,36,22,0.08)",
              color: isDarkMode ? "#EDE8DF" : "#2C2416",
            }}
          >
            Use eraser to remove
          </div>
        </div>
      )}

      {/* ── Main scroll area ── */}
      <div className="relative flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 top-80 flex items-center justify-center z-20">
            <Loading />
          </div>
        )}
        {!isLoadingPdf && !pdfSource && (
          <div className="flex items-center justify-center h-full">
            <p>No PDF loaded</p>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="h-full w-full overflow-y-auto flex flex-col items-center gap-4 py-4"
          style={{ scrollbarWidth: "none" }}
        >
          {/* ── Floating toolbar ── */}
          <div
            className={`fixed bottom-6 z-50 flex flex-row items-center gap-0.5 p-1.5 rounded-2xl border ${toolbarStyles.base}`}
          >
            {/* Pen */}
            <Button
              variant="ghost"
              size="icon"
              title="Pen"
              onClick={() => setDrawTool(drawTool === "pen" ? null : "pen")}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${drawTool === "pen" ? toolbarStyles.btnActive : toolbarStyles.btn}`}
            >
              <PenIcon className="h-[15px] w-[15px]" />
            </Button>
            {/* Eraser */}
            <Button
              variant="ghost"
              size="icon"
              title="Eraser"
              onClick={() =>
                setDrawTool(drawTool === "eraser" ? null : "eraser")
              }
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${drawTool === "eraser" ? toolbarStyles.btnActive : toolbarStyles.btn}`}
            >
              <EraserIcon className="h-[15px] w-[15px]" />
            </Button>

            {/* Highlight & Note — dim when nothing is selected, normal when ready to use */}
            <Button
              variant="ghost"
              size="icon"
              title="Select text to highlight"
              onClick={applyHighlight}
              disabled={!selectionSnapshot}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
            >
              <HighlighterIcon className="h-[15px] w-[15px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Select text to add a note"
              onClick={openNoteComposer}
              disabled={!selectionSnapshot}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
            >
              <StickyNoteIcon className="h-[15px] w-[15px]" />
            </Button>

            <div
              className={`mx-1 h-4 w-px rounded-full ${toolbarStyles.divider}`}
            />

            {/* Zoom */}
            <Button
              variant="ghost"
              size="icon"
              title="Zoom out (⌘-)"
              onClick={zoomOut}
              disabled={scale <= ZOOM_MIN}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
            >
              <ZoomOutIcon className="h-[15px] w-[15px]" />
            </Button>
            <span
              className={`text-[11px] font-mono select-none tabular-nums w-9 text-center ${toolbarStyles.zoomLabel}`}
            >
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              title="Zoom in (⌘+)"
              onClick={zoomIn}
              disabled={scale >= ZOOM_MAX}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
            >
              <ZoomInIcon className="h-[15px] w-[15px]" />
            </Button>

            <div
              className={`mx-1 h-4 w-px rounded-full ${toolbarStyles.divider}`}
            />

            {/* Dark mode */}
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
            {/* Download */}
            <Button
              onClick={createDocument}
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
            >
              <DownloadIcon className="h-[15px] w-[15px]" />
            </Button>
          </div>

          {pdfSource && (
            <div style={{ visibility: isLoading ? "hidden" : "visible" }}>
              <Document
                file={pdfSource}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={null}
                noData={null}
              >
                {Array.from({ length: numPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <div
                      key={pageNum}
                      ref={(el) => {
                        pageWrapperRefs.current[pageNum] = el;
                      }}
                      style={pageWrapperStyle(isDarkMode)}
                      onMouseUp={handlePageMouseUp(pageNum)}
                    >
                      <Page
                        pageNumber={pageNum}
                        scale={scale}
                        renderAnnotationLayer
                        renderTextLayer
                        onRenderSuccess={onPageRenderSuccess(pageNum)}
                        loading={null}
                      />

                      {/* Yellow highlights */}
                      {selectionHighlights
                        .filter((h) => h.pageNum === pageNum)
                        .map((h) => (
                          <div
                            key={h.id}
                            style={{
                              position: "absolute",
                              top: h.top,
                              left: h.left,
                              width: h.width,
                              height: h.height,
                              background: "rgba(255,220,0,0.40)",
                              borderRadius: 2,
                              pointerEvents: "none",
                              zIndex: 10,
                              mixBlendMode: "multiply",
                            }}
                          />
                        ))}

                      {/* Teal note highlights */}
                      {notes
                        .filter((n) => n.pageNum === pageNum)
                        .flatMap((note) =>
                          note.rects.map((r, ri) => (
                            <div
                              key={`${note.id}-${ri}`}
                              style={{
                                position: "absolute",
                                top: r.top,
                                left: r.left,
                                width: r.width,
                                height: r.height,
                                background:
                                  hoveredNoteId === note.id
                                    ? "rgba(124,185,168,0.55)"
                                    : "rgba(124,185,168,0.35)",
                                borderRadius: 2,
                                zIndex: 10,
                                mixBlendMode: "multiply",
                                cursor: "default",
                                transition: "background 0.15s",
                                ...(ri === 0
                                  ? {
                                      boxShadow:
                                        "inset -3px 0 0 0 rgba(90,154,134,0.9)",
                                    }
                                  : {}),
                              }}
                              onMouseEnter={(e) => {
                                setHoveredNoteId(note.id);
                                setNotePopupPos({ x: e.clientX, y: e.clientY });
                              }}
                              onMouseMove={(e) =>
                                setNotePopupPos({ x: e.clientX, y: e.clientY })
                              }
                              onMouseLeave={() => setHoveredNoteId(null)}
                            />
                          )),
                        )}

                      {/* Search highlights */}
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
                              background:
                                m.globalIndex === activeMatchIndex
                                  ? "rgba(255,140,0,0.55)"
                                  : "rgba(255,220,0,0.35)",
                              borderRadius: 2,
                              pointerEvents: "none",
                              zIndex: 11,
                              outline:
                                m.globalIndex === activeMatchIndex
                                  ? "2px solid rgba(255,100,0,0.8)"
                                  : "none",
                            }}
                          />
                        ))}

                      {/* Drawing canvas — sits on top, blocks pointer only when pen/eraser active */}
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
                          drawTool === "pen" || drawTool === "eraser"
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
            </div>
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
                cursor: "grab",
                transition: "background 0.15s",
                background: isDarkMode
                  ? "rgba(237,232,223,0.25)"
                  : "rgba(44,36,22,0.2)",
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
