import { invoke } from "@tauri-apps/api/core";
import { BugType, Item, Project } from "./types";
import { Config } from "@/lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import { FileInfo } from "@/lib/types";

// Python API Configuration
const PYTHON_API_BASE = "http://localhost:8000";

//*********************** */
//* Python Server Management (via Rust)
//*********************** */

export const startPythonServer = async (): Promise<string> => {
  try {
    const result = await invoke<string>("start_python_server");
    console.log("Python server started:", result);

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify server is responding
    let retries = 5;
    while (retries > 0) {
      const isHealthy = await checkPythonServerHealth();
      if (isHealthy) {
        console.log("✅ Python server is healthy");
        return result;
      }
      console.log(`Health check failed, retries remaining: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries--;
    }

    // Server started but never became healthy
    const error = new Error(
      "Python server started but failed health checks after 5 attempts"
    );
    (error as any).code = "SERVER_HEALTH_CHECK_FAILED";
    throw error;
  } catch (error) {
    console.error("Failed to start Python server:", error);
    throw error;
  }
};

export const stopPythonServer = async (): Promise<string> => {
  try {
    const result = await invoke<string>("stop_python_server");
    console.log("Python server stopped:", result);
    return result;
  } catch (error) {
    console.error("Failed to stop Python server:", error);
    throw error;
  }
};

export const checkPythonServer = async (): Promise<boolean> => {
  try {
    return await invoke<boolean>("check_python_server");
  } catch (error) {
    console.error("Failed to check Python server:", error);
    return false;
  }
};

export const checkPythonServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Aliases for compatibility with old code
export const startServer = startPythonServer;
export const stopServer = stopPythonServer;
export const checkServer = checkPythonServer;

//*********************** */
//* Python API - Initialization
//*********************** */

export interface InitializeResponse {
  status: string;
  config_path: string;
  chats_path: string;
  vector_store_path: string;
  vector_store_loaded: boolean;
  components: any;
}

export const initializePythonBackend = async (
  configPath: string,
  chatsPath: string
): Promise<InitializeResponse> => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config_path: configPath,
        chats_path: chatsPath,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to initialize Python backend");
    }

    const data = await response.json();
    console.log("✅ Python backend initialized:", data);
    return data;
  } catch (error) {
    console.error("Failed to initialize Python backend:", error);
    throw error;
  }
};

export const getInitializationStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/initialize/status`);
    if (!response.ok) throw new Error("Failed to get initialization status");
    return await response.json();
  } catch (error) {
    console.error("Failed to get initialization status:", error);
    return { initialized: false };
  }
};

export const getPythonBackendStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/status`);
    if (!response.ok) throw new Error("Failed to get status");
    return await response.json();
  } catch (error) {
    console.error("Failed to get Python backend status:", error);
    throw error;
  }
};

//*********************** */
//* Python API - LLM Management
//*********************** */

export const switchLLM = async (modelName: string) => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/llm/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_name: modelName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to switch LLM");
    }

    const data = await response.json();
    console.log("✅ Switched LLM:", data);
    return data;
  } catch (error) {
    console.error("Failed to switch LLM:", error);
    throw error;
  }
};

export const getLLMStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/llm/status`);
    if (!response.ok) throw new Error("Failed to get LLM status");
    return await response.json();
  } catch (error) {
    console.error("Failed to get LLM status:", error);
    throw error;
  }
};

//*********************** */
//* Python API - Sessions
//*********************** */

export interface Session {
  name: string;
  history: any[];
  metadata: {
    created_at: string;
    last_updated: string;
    total_messages: number;
    tags: string[];
    context: string;
  };
}

export interface SessionCreateResponse {
  message: string;
  session_index: number;
  session: Session;
}

export const createSession = async (
  name: string,
  tags?: string[],
  context?: string
): Promise<SessionCreateResponse> => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tags: tags || [], context: context || "" }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create session");
    }

    const data = await response.json();
    console.log("✅ Session created:", data);
    return data;
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
};

export const getAllSessions = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions`);
    if (!response.ok) throw new Error("Failed to get sessions");
    return await response.json();
  } catch (error) {
    console.error("Failed to get sessions:", error);
    throw error;
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
  } catch (error) {
    console.error("Failed to get active session:", error);
    return null;
  }
};

export const getSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions/${sessionIndex}`);
    if (!response.ok) throw new Error("Failed to get session");
    return await response.json();
  } catch (error) {
    console.error("Failed to get session:", error);
    throw error;
  }
};

export const getSessionHistory = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}/history`
    );
    if (!response.ok) throw new Error("Failed to get session history");
    return await response.json();
  } catch (error) {
    console.error("Failed to get session history:", error);
    throw error;
  }
};

export const switchSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}/switch`,
      { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to switch session");
    const data = await response.json();
    console.log("✅ Switched to session:", sessionIndex);
    return data;
  } catch (error) {
    console.error("Failed to switch session:", error);
    throw error;
  }
};

export const deleteSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error("Failed to delete session");
    return await response.json();
  } catch (error) {
    console.error("Failed to delete session:", error);
    throw error;
  }
};

export const resetSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}/reset`,
      { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to reset session");
    const data = await response.json();
    console.log("✅ Session reset:", sessionIndex);
    return data;
  } catch (error) {
    console.error("Failed to reset session:", error);
    throw error;
  }
};

//*********************** */
//* Python API - Chat
//*********************** */

export interface ChatResponse {
  response: string;
  session_index: number;
  timestamp: string;
}

export const sendChatMessage = async (
  message: string,
  useRAG: boolean = false,
  sessionIndex?: number,
  k: number = 4
): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        use_rag: useRAG,
        session_index: sessionIndex,
        k,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to send message");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to send chat message:", error);
    throw error;
  }
};

//*********************** */
//* Python API - Vector Store & RAG
//*********************** */

export const setupVectorStore = async (
  documents: string[],
  metadatas?: Record<string, any>[]
) => {
  try {
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
    console.log("✅ Vector store setup:", data);
    return data;
  } catch (error) {
    console.error("Failed to setup vector store:", error);
    throw error;
  }
};

export const addDocumentsToVectorStore = async (
  documents: string[],
  metadatas?: Record<string, any>[]
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
    console.log("✅ Documents added:", data);
    return data;
  } catch (error) {
    console.error("Failed to add documents to vector store:", error);
    throw error;
  }
};

export const getVectorStoreStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/vectorstore/status`);
    if (!response.ok) throw new Error("Failed to get vector store status");
    return await response.json();
  } catch (error) {
    console.error("Failed to get vector store status:", error);
    throw error;
  }
};

//*********************** */
//* Python API - Tab Processing
//*********************** */

export const processWithTab = async (tabId: string, text: string) => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/process/tab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tab_id: tabId, text }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to process with tab");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to process with tab:", error);
    throw error;
  }
};

//*********************** */
//* Python API - Config
//*********************** */

export const getPythonConfig = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/config`);
    if (!response.ok) throw new Error("Failed to get config");
    return await response.json();
  } catch (error) {
    console.error("Failed to get Python config:", error);
    throw error;
  }
};

export const getAIConfig = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/config/ai`);
    if (!response.ok) throw new Error("Failed to get AI config");
    return await response.json();
  } catch (error) {
    console.error("Failed to get AI config:", error);
    throw error;
  }
};

export const getTabs = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/config/tabs`);
    if (!response.ok) throw new Error("Failed to get tabs");
    return await response.json();
  } catch (error) {
    console.error("Failed to get tabs:", error);
    throw error;
  }
};

//*********************** */
//* File System Functions (via Rust)
//*********************** */

export const readFile = async (filePath: string): Promise<string> => {
  try {
    const content = await invoke<string>("read_file", { filePath });
    return content;
  } catch (err) {
    console.error("Error reading file:", err);
    throw err;
  }
};

export const writeFile = async (
  filePath: string,
  content: string
): Promise<void> => {
  try {
    await invoke("write_file", { filePath, content });
  } catch (err) {
    console.error("Error writing file:", err);
    throw err;
  }
};

export const listDir = async (dirPath: string): Promise<string[]> => {
  try {
    const entries = await invoke<string[]>("list_dir", { dirPath });
    return entries;
  } catch (err) {
    console.error("Error listing directory:", err);
    throw err;
  }
};

export const createDir = async (dirPath: string): Promise<void> => {
  try {
    await invoke("create_dir", { dirPath });
  } catch (err) {
    console.error("Error creating directory:", err);
    throw err;
  }
};

export async function uploadFiles(projectRoot: string): Promise<FileInfo[]> {
  const selected = await open({
    multiple: true,
    filters: [
      {
        name: "Documents",
        extensions: ["pdf", "md", "txt", "docx", "xlsx", "excalidraw"],
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
      });
      fileInfos.push(fileInfo);
    } catch (error) {
      console.error(`Failed to upload ${filePath}:`, error);
    }
  }

  return fileInfos;
}

//*********************** */
//* Config Functions (via Rust)
//*********************** */

export const getConfig = async (configPath: string): Promise<Config | null> => {
  try {
    const config = await invoke<Config>("get_config", { configPath });
    return config;
  } catch (error) {
    console.error("Failed to load config:", error);
    return null;
  }
};

export const updateConfig = async (
  configPath: string,
  newConfig: Config
): Promise<void> => {
  try {
    await invoke("update_config", { configPath, newConfig });
  } catch (error) {
    console.error("Failed to save config:", error);
    throw error;
  }
};

export const getPreviousProjects = async (): Promise<Project[]> => {
  try {
    const previousProjects = await invoke("get_previous_projects");
    if (Array.isArray(previousProjects)) {
      return previousProjects as Project[];
    }
    return [];
  } catch (error) {
    console.log("Failed loading previous projects.", error);
    return [];
  }
};

export const createProject = async (
  project_name: string,
  project_path: string,
  resources_path: string
) => {
  try {
    const result = await invoke("create_new_project", {
      projectName: project_name,
      projectPath: project_path,
      resourcesPath: resources_path,
    });
    return result;
  } catch (error) {
    console.error("Error creating a project:", error);
    throw error;
  }
};

//*********************** */
//* Placeholder Functions
//*********************** */

export const deleteItem = (item: Item) => {
  console.log("deleteItem not implemented");
};

export const tabsSettings = () => {
  console.log("tabsSettings not implemented");
};

export const modelSettings = () => {
  console.log("modelSettings not implemented");
};

export const reportBug = (bugType: BugType) => {
  console.log("reportBug not implemented");
};

export const loadConfig = async (config: Config) => {
  try {
    // TODO: update project config based on config
    console.log("Config loaded successfully");
  } catch (error) {
    console.error("Failed to load config:", error);
    return null;
  }
};

export const getContent = (tab_id: String) => {
  // let content = "";
  // switch (tab_id) {
  //   case "summary":
  //     return "# h1 Heading 8-) ## h2 Heading \n ### h3 Heading \n #### h4 Heading \n ##### h5 Heading \n ###### h6 Heading \n This is normal text.";
  //     break;
  //   case "contributions":
  //     return "";
  //     break;
  //   case "analysis":
  //     return "";
  //     break;
  //   case "future-work":
  //     return "";
  //     break;
  // }
  return "# h1 Heading 8-) ## h2 Heading \n ### h3 Heading \n #### h4 Heading \n ##### h5 Heading \n ###### h6 Heading \n This is normal text.";
};
