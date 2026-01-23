import { Config } from "@/lib/types";
import { FileInfo } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { BugType, Project, TreeNode } from "./types";
import { error, info } from "@/lib/logger";

// Python API Configuration
const PYTHON_API_BASE = "http://localhost:8000";

//*********************** */
//* Server Management
//*********************** */

export const startPythonServer = async (): Promise<string> => {
  try {
    const result = await invoke<string>("start_python_server");

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify server is responding
    let retries = 5;
    while (retries > 0) {
      const isHealthy = await checkPythonServerHealth();
      if (isHealthy) {
        info("✅ Python server is healthy");
        return result;
      }
      info(`Health check failed, retries remaining: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries--;
    }

    // Server started but never became healthy
    const error = new Error(
      "Python server started but failed health checks after 5 attempts",
    );
    (error as any).code = "SERVER_HEALTH_CHECK_FAILED";
    throw error;
  } catch (err) {
    error(`Failed to start Python server: ${err}`);
    throw err;
  }
};

export const stopPythonServer = async (): Promise<string> => {
  try {
    const result = await invoke<string>("stop_python_server");
    return result;
  } catch (err) {
    error(`Failed to stop Python server: ${err}`);
    throw error;
  }
};

export const checkPythonServer = async (): Promise<boolean> => {
  try {
    return await invoke<boolean>("check_python_server");
  } catch (err) {
    error(`Failed to check Python server: ${err}`);
    return false;
  }
};

export const checkPythonServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch (err) {
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
  chatsPath: string,
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
    info("✅ Python backend initialized:", data);
    return data;
  } catch (err) {
    error(`Failed to initialize Python backend: ${err}`);
    throw error;
  }
};

export const getInitializationStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/initialize/status`);
    if (!response.ok) throw new Error("Failed to get initialization status");
    return await response.json();
  } catch (err) {
    error(`Failed to get initialization status: ${err}`);
    return { initialized: false };
  }
};

export const getPythonBackendStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/status`);
    if (!response.ok) throw new Error("Failed to get status");
    return await response.json();
  } catch (err) {
    error(`Failed to get Python backend status: ${err}`);
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
    info(`✅ [switchLLM] : Switched LLM : ${data}`);
    return data;
  } catch (err) {
    error(`Failed to switch LLM: ${err}`);
    throw error;
  }
};

export const getLLMStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/llm/status`);
    if (!response.ok) throw new Error("Failed to get LLM status");
    return await response.json();
  } catch (err) {
    error(`Failed to get LLM status: ${err}`);
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
  context?: string,
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
    info(`✅ [createSession] : Session created : ${data}`);
    return data;
  } catch (err) {
    error(`Failed to create session: ${err}`);
    throw error;
  }
};

export const getAllSessions = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions`);
    if (!response.ok) throw new Error("Failed to get sessions");
    return await response.json();
  } catch (err) {
    error(`Failed to get sessions: ${err}`);
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
  } catch (err) {
    error(`Failed to get active session: ${err}`);
    return null;
  }
};

export const getSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/sessions/${sessionIndex}`);
    if (!response.ok) throw new Error("Failed to get session");
    return await response.json();
  } catch (err) {
    error(`Failed to get session: ${err}`);
    throw error;
  }
};

export const getSessionHistory = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}/history`,
    );
    if (!response.ok) throw new Error("Failed to get session history");
    return await response.json();
  } catch (err) {
    error(`Failed to get session history: ${err}`);
    throw error;
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
    info(`✅ [switchSession] : Switched to session : ${sessionIndex}`);
    return data;
  } catch (err) {
    error(`Failed to switch session: ${err}`);
    throw error;
  }
};

export const deleteSession = async (sessionIndex: number) => {
  try {
    const response = await fetch(
      `${PYTHON_API_BASE}/sessions/${sessionIndex}`,
      { method: "DELETE" },
    );
    if (!response.ok) throw new Error("Failed to delete session");
    return await response.json();
  } catch (err) {
    error(`Failed to delete session: ${err}`);
    throw error;
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
    info(`✅ [resetSession] : Session reset : ${sessionIndex}`);
    return data;
  } catch (err) {
    error(`Failed to reset session: ${err}`);
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
  k: number = 4,
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
  } catch (err) {
    error(`Failed to send chat message: ${err}`);
    throw error;
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
    info(`✅ [setupVectorStore] : Vector store setup: ${data}`);
    return data;
  } catch (err) {
    error(`Failed to setup vector store: ${err}`);
    throw error;
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
    info(`✅ [addDocumentsToVectorStore] : Documents added: ${data}`);
    return data;
  } catch (err) {
    error(`Failed to add documents to vector store: ${err}`);
    throw error;
  }
};

export const getVectorStoreStatus = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/vectorstore/status`);
    if (!response.ok) throw new Error("Failed to get vector store status");
    return await response.json();
  } catch (err) {
    error(`Failed to get vector store status: ${err}`);
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
  } catch (err) {
    error(`Failed to process with tab: ${err}`);
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
  } catch (err) {
    error(`Failed to get Python config: ${err}`);
    throw error;
  }
};

export const getAIConfig = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/config/ai`);
    if (!response.ok) throw new Error("Failed to get AI config");
    return await response.json();
  } catch (err) {
    error(`Failed to get AI config: ${err}`);
    throw error;
  }
};

export const getTabs = async () => {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/config/tabs`);
    if (!response.ok) throw new Error("Failed to get tabs");
    return await response.json();
  } catch (err) {
    error(`Failed to get tabs: ${err}`);
    throw error;
  }
};

//*********************** */
//* File System Functions (via Tauri/Rust)
//*********************** */

// Use Tauri command to get library data recursively
export async function getLibraryData(projectPath: string): Promise<TreeNode[]> {
  try {
    const nodes = await invoke<TreeNode[]>("get_library_tree", {
      projectPath,
    });
    return nodes; // Already filtered by backend
  } catch (err) {
    error(`Failed to read directory ${projectPath}: ${err}`);
    return [];
  }
}

export const readFile = async (filePath: string): Promise<string> => {
  try {
    const content = await invoke<string>("read_file", { path: filePath });
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

export async function uploadFiles(projectRoot: string): Promise<FileInfo[]> {
  const selected = await open({
    multiple: true,
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

export const getConfig = async (configPath: string): Promise<Config | null> => {
  try {
    const config = await invoke<Config>("get_config", {
      configPath: configPath,
    });
    return config;
  } catch (err) {
    error(`Failed to load config: ${err}`);
    return null;
  }
};

export const updateConfig = async (
  configPath: string,
  newConfig: Config,
): Promise<void> => {
  try {
    await invoke("update_config", { configPath, newConfig });
  } catch (err) {
    error(`Failed to save config: ${err}`);
    throw error;
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
) => {
  try {
    const result = await invoke("create_new_project", {
      project: {
        projectName: project_name,
        projectPath: project_path,
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

export const tabsSettings = () => {
  info("tabsSettings not implemented");
};

export const modelSettings = () => {
  info("modelSettings not implemented");
};

export const reportBug = (bugType: BugType) => {
  info("reportBug not implemented");
};

export const loadConfig = async (config: Config) => {
  try {
    // TODO: update project config based on config
    info("Config loaded successfully");
  } catch (err) {
    error(`Failed to load config: ${err}`);
    return null;
  }
};

export const getContent = (tab_id: string) => {
  switch (tab_id) {
    case "summary":
      return `# Summary
## Overview
This project delivers a comprehensive solution for data analysis and visualization. It provides insights into complex datasets through intuitive interfaces and powerful computational tools.

## Key Features
- Real-time data processing and analysis
- Interactive visualization dashboards
- Automated report generation
- Scalable architecture supporting millions of records

## Technology Stack
Built with TypeScript, React, and modern web technologies to ensure reliability and performance.

## Results
The solution has improved data processing efficiency by 40% and reduced analysis time significantly.`;

    case "contributions":
      return `# Contributions
## Team Members
This project was developed through collaborative efforts of dedicated team members across multiple disciplines.

## Major Contributions
- **Architecture & Design**: Planned scalable system architecture and component design patterns
- **Backend Development**: Implemented API endpoints and database optimization
- **Frontend Development**: Created responsive UI components and interactive dashboards
- **Testing & QA**: Comprehensive test coverage and performance optimization
- **Documentation**: Detailed technical and user documentation

## Recognition
Special thanks to all contributors who helped bring this project to completion through their expertise and commitment.`;

    case "critical-analysis":
      return `# Technical Analysis
## Performance Metrics
- Response Time: <100ms for average queries
- System Uptime: 99.9% availability
- Data Processing: Handles 10,000+ requests per second
- Memory Efficiency: 30% reduction compared to previous version

## Code Quality
- Test Coverage: 87% of codebase
- Maintainability Index: 78/100
- Technical Debt: Minimal, well-documented
- Code Review Process: Implemented for all changes

## Security Assessment
- All data encrypted in transit and at rest
- Regular security audits conducted
- Compliance with industry standards (ISO 27001, GDPR)
- Vulnerability scanning in CI/CD pipeline

## Scalability Analysis
The architecture supports horizontal scaling across multiple server instances with load balancing.`;

    case "future-work":
      return `# Future Work & Roadmap
## Short Term (Next 3 Months)
- Implement advanced filtering capabilities
- Add machine learning model integration
- Develop mobile application
- Enhance real-time collaboration features

## Medium Term (3-6 Months)
- Multi-language support expansion
- Advanced analytics engine
- Custom report builder
- API v2 release with additional endpoints

## Long Term Vision (6+ Months)
- AI-powered insights and predictions
- Blockchain integration for data integrity
- Global CDN deployment for reduced latency
- Enterprise white-label solution

## Community Initiatives
- Open-source contribution program
- Developer API documentation enhancement
- Community plugin ecosystem
- Regular webinars and training sessions`;

    default:
      return "No content available for this tab.";
  }
};
