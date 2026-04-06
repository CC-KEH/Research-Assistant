import { jsPDF } from "jspdf";
import { BasicConfig, Config, KnowledgeFile, Tab } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { error, info } from "@/lib/logger";
import {
  Project,
  TreeNode,
  SessionCreateResponse,
  ChatResponse,
  FileInfo,
} from "@/lib/types";
const PYTHON_API_BASE = "http://localhost:8000";

//*********************** */
//* Server Management
//*********************** */

export const stopPythonServer = async (): Promise<string> => {
  try {
    const result = await invoke<string>("stop_python_server");
    return result;
  } catch (err) {
    error(`Failed to stop Python server: ${err}`);
    throw err;
  }
};

export const checkPythonServer = async (): Promise<boolean> => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    let retries = 5;
    while (retries > 0) {
      const isHealthy = await invoke<boolean>("check_python_server");
      if (isHealthy) {
        info("Python server is healthy");
        return isHealthy;
      }
      info(`Health check failed, retries remaining: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries--;
    }
    const error = new Error(
      "Server failed to become healthy after multiple retries.",
    );
    (error as any).code = "SERVER_HEALTH_CHECK_FAILED";
    throw error;
  } catch (err) {
    error(`Failed to check Python server: ${err}`);
    return false;
  }
};

export const stopServer = stopPythonServer;
export const checkServer = checkPythonServer;

//*********************** */
//* Python API - Initialization
//*********************** */

export interface InitializeResponse {
  status: string;
  config_path: string;
  chats_path: string;
  vector_store_loaded: boolean;
  components: any;
}

export const initializePythonBackend = async (
  config_path: string,
  chats_path: string,
): Promise<InitializeResponse> => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config_path: config_path,
        chats_path: chats_path,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to initialize Python backend");
    }

    const data = await response.json();
    info(`Python backend initialized: ${JSON.stringify(data)}`);
    return data;
  } catch (err) {
    error(`Failed to initialize Python backend: ${err}`);
    throw err;
  }
};

export const getPythonBackendStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/status`);
    if (!response.ok) throw new Error("Failed to get status");
    return await response.json();
  } catch (err) {
    error(`Failed to get Python backend status: ${err}`);
    throw err;
  }
};

//*********************** */
//* Python API - LLM Management
//*********************** */

export const switchLLM = async (llmProvider: string) => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/llm/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ llm_provider: llmProvider }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to switch LLM");
    }

    const data = await response.json();
    info(`✅ [switchLLM] : Switched LLM : ${data}`);
    return data;
  } catch (err) {
    error(`Failed to switch LLM: ${err}`);
    throw err;
  }
};

export const getLLMStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/llm/status`);
    if (!response.ok) throw new Error("Failed to get LLM status");
    return await response.json();
  } catch (err) {
    error(`Failed to get LLM status: ${err}`);
    throw err;
  }
};

//*********************** */
//* Python API - Sessions
//*********************** */

export const createSession = async (
  name: string,
  tags?: string[],
  context?: string,
): Promise<SessionCreateResponse> => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tags: tags || [],
        context: context || "",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create session");
    }

    const data = await response.json();
    info(`✅ [createSession] : Session created : ${name}`);
    return data;
  } catch (err) {
    error(`Failed to create session: ${err}`);
    throw err;
  }
};

export const getAllSessions = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions`);
    if (!response.ok) throw new Error("Failed to get sessions");
    const data = await response.json();
    return data.sessions;
  } catch (err) {
    error(`Failed to get sessions: ${err}`);
    throw err;
  }
};

export const getActiveSession = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions/active`);
    if (!response.ok) {
      // No active session is okay
      return null;
    }
    return await response.json();
  } catch (err) {
    // 404 is expected when no active session
    return null;
  }
};

export const getSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions/${sessionIndex}`);
    if (!response.ok) throw new Error("Failed to get session");
    return await response.json();
  } catch (err) {
    error(`Failed to get session ${sessionIndex}: ${err}`);
    throw err;
  }
};

export const getSessionHistory = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}/history`,
    );
    if (!response.ok) throw new Error("Failed to get session history");
    const data = await response.json();
    return data.history;
  } catch (err) {
    error(`Failed to get session history: ${err}`);
    throw err;
  }
};

export const getSessionStats = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}/stats`,
    );
    if (!response.ok) throw new Error("Failed to get session stats");
    return await response.json();
  } catch (err) {
    error(`Failed to get session stats: ${err}`);
    throw err;
  }
};

export const updateSession = async (
  sessionIndex: number,
  updates: {
    name?: string;
    context?: string;
    tags?: string[];
  },
) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      },
    );
    if (!response.ok) throw new Error("Failed to update session");
    const data = await response.json();
    info(`✅ [updateSession] : Session updated : ${sessionIndex}`);
    return data;
  } catch (err) {
    error(`Failed to update session: ${err}`);
    throw err;
  }
};

export const switchSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}/switch`,
      { method: "POST" },
    );
    if (!response.ok) throw new Error("Failed to switch session");
    const data = await response.json();
    info(`✅ [switchSession] : Switched to session ${sessionIndex}`);
    return data;
  } catch (err) {
    error(`Failed to switch session: ${err}`);
    throw err;
  }
};

export const deleteSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}`,
      { method: "DELETE" },
    );
    if (!response.ok) throw new Error("Failed to delete session");
    const data = await response.json();
    info(`✅ [deleteSession] : Session deleted : ${sessionIndex}`);
    return data;
  } catch (err) {
    error(`Failed to delete session: ${err}`);
    throw err;
  }
};

export const resetSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}/reset`,
      { method: "POST" },
    );
    if (!response.ok) throw new Error("Failed to reset session");
    const data = await response.json();
    info(`✅ [resetSession] : Session history cleared : ${sessionIndex}`);
    return data;
  } catch (err) {
    error(`Failed to reset session: ${err}`);
    throw err;
  }
};

export const sendChatMessage = async (
  message: string,
  useRAG: boolean = false,
  sessionIndex?: number,
  k: number = 4,
): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session_index: sessionIndex ?? null,
        use_rag: useRAG,
        k: k,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to send message");
    }

    const data = await response.json();
    info(`✅ [sendChatMessage] : Message sent and saved`);
    return data;
  } catch (err) {
    error(`Failed to send chat message: ${err}`);
    throw err;
  }
};

//*********************** */
//* Python API - Vector Store & RAG
//*********************** */

export const setupVectorStore = async (
  documents: string[],
  metadatas?: Record<string, any>[],
) => {
  try {
    // The Assistant.setup_rag method handles this
    // This endpoint may not exist - consider using addDocumentsToVectorStore instead
    const response = await fetch(`${PYTHON_API_BASE}/vectorstore/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents, metadatas }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to setup vector store");
    }

    const data = await response.json();
    info(
      `✅ [setupVectorStore] : Vector store setup with ${documents.length} documents`,
    );
    return data;
  } catch (err) {
    error(`Failed to setup vector store: ${err}`);
    throw err;
  }
};

export const addDocumentsToVectorStore = async (
  documents: string[],
  metadatas?: Record<string, any>[],
) => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/vectorstore/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents, metadatas }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to add documents");
    }

    const data = await response.json();
    info(
      `✅ [addDocumentsToVectorStore] : Added ${documents.length} documents`,
    );
    return data;
  } catch (err) {
    error(`Failed to add documents to vector store: ${err}`);
    throw err;
  }
};

export const getVectorStoreStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/vectorstore/status`);
    if (!response.ok) throw new Error("Failed to get vector store status");
    return await response.json();
  } catch (err) {
    error(`Failed to get vector store status: ${err}`);
    throw err;
  }
};

//*********************** */
//* File System Functions (via Tauri/Rust)
//*********************** */

export async function getLibraryData(
  project_path: string,
): Promise<TreeNode[]> {
  try {
    const nodes = await invoke<TreeNode[]>("get_library_tree", {
      projectPath: project_path,
    });
    return nodes;
  } catch (err) {
    error(`Failed to read directory ${project_path}: ${err}`);
    return [];
  }
}

export const readFile = async (file_path: string): Promise<string> => {
  try {
    const content = await invoke<string>("read_file", { path: file_path });
    return content;
  } catch (err) {
    error(`Error reading file: ${err}`);
    throw err;
  }
};

export const writeFile = async (
  path: string,
  content: string,
): Promise<void> => {
  try {
    await invoke("write_file", { path, content });
  } catch (err) {
    error(`Error writing file: ${err}`);
    throw err;
  }
};

export const listDir = async (dirPath: string): Promise<string[]> => {
  try {
    const entries = await invoke<string[]>("list_dir", { dirPath });
    return entries;
  } catch (err) {
    error(`Error listing directory: ${err}`);
    throw err;
  }
};

export const createDir = async (dirPath: string): Promise<void> => {
  try {
    await invoke("create_dir", { path: dirPath });
  } catch (err) {
    error(`Error creating directory: ${err}`);
    throw err;
  }
};

export const deleteItem = async (path: string): Promise<void> => {
  try {
    await invoke("delete_item", { path });
  } catch (err) {
    error(`Error deleting item: ${err}`);
    throw err;
  }
};

export async function uploadFilesToLibrary(
  destination: string,
  multiple: boolean = true,
): Promise<FileInfo[]> {
  const selected = await open({
    multiple: multiple,
    filters: [
      {
        name: "files",
        extensions: ["pdf", "md", "txt"],
      },
    ],
  });

  if (!selected || (Array.isArray(selected) && selected.length === 0))
    return [];

  const files = Array.isArray(selected) ? selected : [selected];
  const fileInfos: FileInfo[] = [];

  for (const filePath of files) {
    try {
      const fileInfo = await invoke<FileInfo>("upload_to_library", {
        sourcePath: filePath,
        destination: destination,
      });
      fileInfos.push(fileInfo);
    } catch (err) {
      error(`Failed to upload ${filePath}: ${err}`);
    }
  }

  return fileInfos;
}

export async function uploadFilesToKnowledgeStore(
  projectRoot: string,
  multiple: boolean = true,
  forLLM: boolean = true,
): Promise<FileInfo[]> {
  const selected = await open({
    multiple: multiple,
    filters: [
      {
        name: "Papers",
        extensions: ["pdf", "md"],
      },
    ],
  });

  if (!selected || (Array.isArray(selected) && selected.length === 0))
    return [];

  const files = Array.isArray(selected) ? selected : [selected];
  const fileInfos: FileInfo[] = [];

  for (const filePath of files) {
    try {
      const fileInfo = await invoke<FileInfo>("upload_to_knowledge_store", {
        sourcePath: filePath,
        projectRoot: projectRoot,
        forLlm: forLLM,
      });
      fileInfos.push(fileInfo);
    } catch (err) {
      error(`Failed to upload ${filePath}: ${err}`);
    }
  }

  return fileInfos;
}

//*********************** */
//* Config Functions (via Tauri/Rust)
//*********************** */

export const getConfig = async (
  config_path: string,
): Promise<Config | null> => {
  try {
    const config = await invoke<Config>("get_config", {
      configPath: config_path,
    });
    return config;
  } catch (err) {
    error(`Failed to load config: ${err}`);
    return null;
  }
};

export const saveConfig = async (
  config_path: string,
  new_config: Config,
): Promise<void> => {
  try {
    await invoke("update_config", {
      configPath: config_path,
      config: new_config,
    });
  } catch (err) {
    const errorMessage = `Failed to save config: ${err}`;
    error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const getPreviousProjects = async (): Promise<Project[]> => {
  try {
    const previousProjects = await invoke<Project[]>("get_previous_projects");
    return Array.isArray(previousProjects) ? previousProjects : [];
  } catch (err) {
    info(`Failed loading previous projects: ${error}`);
    return [];
  }
};

export const createProject = async (
  project_name: string,
  project_path: string,
  active_llm_provider: string,
) => {
  try {
    const result = await invoke("create_new_project", {
      project: {
        projectName: project_name,
        projectPath: project_path,
        activeLlmProvider: active_llm_provider,
      },
    });
    return result;
  } catch (err) {
    error(`Error creating a project: ${err}`);
    throw error;
  }
};

//*********************** */
//* Placeholder Functions
//*********************** */

const fetchContent = async (
  tab_id: string,
  file_info: FileInfo,
): Promise<string> => {
  const content = await fetch(`${PYTHON_API_BASE}/process_tabs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tab_id: tab_id, file_info: file_info }),
  });
  return content.text();
};

export const processTabs = async (
  file_info: FileInfo,
  tabs_config: {
    tabs: Tab[];
    customTabs: Tab[];
  },
  onTabComplete?: (tab_id: string, content: string) => void,
): Promise<Record<string, string>> => {
  const allTabs = [...tabs_config.tabs, ...tabs_config.customTabs];
  const enabledTabs = allTabs.filter((tab) => tab.enabled);

  const contentMap: Record<string, string> = {};

  for (const tab of enabledTabs) {
    try {
      const content = await fetchContent(tab.id, file_info);
      contentMap[tab.id] = content;
      onTabComplete?.(tab.id, content);
    } catch (err) {
      info(`Tab "${tab.id}" failed to fetch content: ${err}`);
      contentMap[tab.id] = "N/A";
      onTabComplete?.(tab.id, "N/A");
    }
  }

  return contentMap;
};

export const getContent = async (
  tab_id: string,
  file_name: string,
  config_path: string,
): Promise<string> => {
  const content = await invoke<string>("get_tab_content", {
    tabId: tab_id,
    fileName: file_name,
    configPath: config_path,
  });
  return content;
};

export const saveContentToPDF = async (
  basicConfig: BasicConfig | null,
  knowledgeStoreConfig: { files: KnowledgeFile[] } | null,
  tabsConfig: { tabs: Tab[]; customTabs: Tab[] } | null,
  file: string,
) => {
  if (!knowledgeStoreConfig || !knowledgeStoreConfig.files.length) {
    alert("No files in knowledge store to create document");
    return;
  }

  const projectPath = basicConfig?.projectPath || "";
  const fileName =
    knowledgeStoreConfig?.files.find((p) => p.filePath === file)?.fileName ||
    "Summary";
  const pdfName = `Doc_${fileName}`;
  const documentsPath = projectPath
    ? `${projectPath}\\documents\\${pdfName}`
    : "";

  try {
    if (!knowledgeStoreConfig.files.length) {
      throw new Error("No content provided");
    }

    if (!documentsPath) {
      throw new Error("Invalid documents path");
    }

    const allTabs = [
      ...(tabsConfig?.tabs ?? []),
      ...(tabsConfig?.customTabs ?? []),
    ].filter((tab) => tab.enabled);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 15;
    let isFirstPage = true;

    knowledgeStoreConfig.files.forEach((knowledgeFile) => {
      if (!isFirstPage) {
        pdf.addPage();
        yPosition = 15;
      }
      isFirstPage = false;

      // Title
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(knowledgeFile.fileName, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 12;

      allTabs.forEach((tab) => {
        const content = knowledgeFile.fileData?.[tab.id];

        if (tab.id === "arxiv") {
          const arxivList: string[] = (() => {
            try {
              const parsed = JSON.parse(content ?? "[]");
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();

          if (arxivList.length === 0) return;

          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.text(tab.label, 10, yPosition);
          yPosition += 8;
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          arxivList.forEach((arxiv) => {
            const arxivLines = pdf.splitTextToSize(`• ${arxiv}`, 185);
            pdf.text(arxivLines, 12, yPosition);
            yPosition += arxivLines.length * 5 + 2;
          });
        } else {
          if (!content || content === "N/A") return;

          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.text(tab.label, 10, yPosition);
          yPosition += 8;
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          const lines = pdf.splitTextToSize(content, 190);
          pdf.text(lines, 10, yPosition);
          yPosition += lines.length * 5 + 5;
        }
      });
    });

    // Get PDF as array buffer
    const pdfBytes = pdf.output("arraybuffer");
    const uint8Array = new Uint8Array(pdfBytes);
    const pdfData = Array.from(uint8Array);

    // Call Tauri command to save PDF file
    await invoke("save_pdf", {
      filePath: documentsPath,
      pdfData: pdfData,
    });

    info(`Generated PDF for ${knowledgeStoreConfig.files.length} files`);
    info(`PDF saved: ${documentsPath}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error(`Error generating PDF: ${errorMessage}`);
    throw err;
  }
};
