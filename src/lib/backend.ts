import { jsPDF } from "jspdf";
import { BasicConfig, Config, KnowledgeFile } from "@/lib/types";
import { FileInfo } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { error, info } from "@/lib/logger";
import { BugType, Project, TreeNode } from "@/lib/types";

const PYTHON_API_BASE = "http://localhost:8000";

//*********************** */
//* Server Management
//*********************** */

export const startPythonServer = async (): Promise<string> => {
  try {
    const result = await invoke<string>("start_python_server");
    return result;
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
    throw err;
  }
};

export const checkPythonServer = async (): Promise<boolean> => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    let retries = 10;
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

export interface Session {
  name: string;
  history: Array<{
    index: string;
    timestamp: string;
    message: string;
    is_ai: boolean;
  }>;
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
        session_index: sessionIndex || null,
        k,
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

    const data = await response.json();
    info(`✅ [processWithTab] : Processed with tab ${tabId}`);
    return data;
  } catch (err) {
    error(`Failed to process with tab: ${err}`);
    throw err;
  }
};

//*********************** */
//* File System Functions (via Tauri/Rust)
//*********************** */

// Use Tauri command to get library data recursively
export async function getLibraryData(
  project_path: string,
): Promise<TreeNode[]> {
  try {
    const nodes = await invoke<TreeNode[]>("get_library_tree", {
      projectPath: project_path,
    });
    return nodes; // Already filtered by backend
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

export const saveContentToPDF = async (
  basicConfig: BasicConfig[] | null,
  knowledgeStoreConfig: { files: KnowledgeFile[] } | null,
  file: string,
) => {
  if (!knowledgeStoreConfig || !knowledgeStoreConfig.files.length) {
    alert("No files in knowledge store to create document");
    return;
  }

  const pdfContent = knowledgeStoreConfig.files.map((file) => ({
    fileName: file.fileName,
    summary:
      file.fileData?.summary ||
      "Minim nostrud do voluptate in adipisicing sit duis. Occaecat sint cillum proident exercitation aliquip. Non incididunt sit ipsum ut nisi pariatur aliquip do esse ad id. Non cillum eiusmod elit anim ut proident quis duis non. Nulla cupidatat cillum in velit pariatur.",
    criticalAnalysis:
      file.fileData?.criticalAnalysis ||
      "Reprehenderit ullamco cupidatat laboris dolore. Cillum dolor eiusmod eu mollit dolore veniam id. Aliqua consectetur pariatur qui irure consectetur ut incididunt aliqua aute. Officia elit amet enim veniam aliqua veniam Lorem occaecat officia dolor excepteur cillum tempor. Pariatur labore cillum nostrud esse dolor laborum eu enim fugiat labore pariatur quis exercitation nostrud. Sint elit labore dolor irure fugiat magna magna cupidatat minim consequat.",
    contributions:
      file.fileData?.contributions ||
      "Est quis sint minim ut do. Commodo adipisicing qui ipsum adipisicing consectetur enim ex nostrud sit. Enim excepteur excepteur reprehenderit laborum aliqua aliqua occaecat aute pariatur. Exercitation aliqua dolore pariatur anim non exercitation et enim esse. Nostrud aliqua minim ut commodo labore occaecat nisi tempor officia eiusmod eu.",
    futureWork:
      file.fileData?.futureWork ||
      "Aliqua ad consequat sint ea laborum aliqua est ut officia. Mollit mollit non non quis proident cupidatat. Exercitation qui ex sint pariatur ad voluptate esse cillum proident.",
    arxiv: file.fileData?.arxiv || [],
  }));

  const projectPath = basicConfig?.[0]?.projectPath || "";
  const fileName =
    knowledgeStoreConfig?.files.find((p) => p.filePath === file)?.fileName ||
    "Summary";
  const pdfName = `Doc_${fileName}`;
  const documentsPath = projectPath
    ? `${projectPath}\\documents\\${pdfName}`
    : "";

  try {
    if (!pdfContent || pdfContent.length === 0) {
      throw new Error("No content provided");
    }

    if (!documentsPath) {
      throw new Error("Invalid documents path");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 15;
    let isFirstPage = true;

    // Process each file in pdfContent
    pdfContent.forEach((fileData) => {
      // Add page break between files (not before first)
      if (!isFirstPage) {
        pdf.addPage();
        yPosition = 15;
      }
      isFirstPage = false;

      // Title
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(fileData.fileName, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 12;

      // Summary
      if (fileData.summary && fileData.summary !== "N/A") {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Summary", 10, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const summaryLines = pdf.splitTextToSize(fileData.summary, 190);
        pdf.text(summaryLines, 10, yPosition);
        yPosition += summaryLines.length * 5 + 5;
      }

      // Critical Analysis
      if (fileData.criticalAnalysis && fileData.criticalAnalysis !== "N/A") {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Critical Analysis", 10, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const analysisLines = pdf.splitTextToSize(
          fileData.criticalAnalysis,
          190,
        );
        pdf.text(analysisLines, 10, yPosition);
        yPosition += analysisLines.length * 5 + 5;
      }

      // Contributions
      if (fileData.contributions && fileData.contributions !== "N/A") {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Contributions", 10, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const contribLines = pdf.splitTextToSize(fileData.contributions, 190);
        pdf.text(contribLines, 10, yPosition);
        yPosition += contribLines.length * 5 + 5;
      }

      // Future Work
      if (fileData.futureWork && fileData.futureWork !== "N/A") {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Future Work", 10, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const futureLines = pdf.splitTextToSize(fileData.futureWork, 190);
        pdf.text(futureLines, 10, yPosition);
        yPosition += futureLines.length * 5 + 5;
      }

      // ArXiv References
      if (fileData.arxiv && fileData.arxiv.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("ArXiv References", 10, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        fileData.arxiv.forEach((arxiv) => {
          const arxivLines = pdf.splitTextToSize(`• ${arxiv}`, 185);
          pdf.text(arxivLines, 12, yPosition);
          yPosition += arxivLines.length * 5 + 2;
        });
      }
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

    info(`Generated PDF for ${pdfContent.length} files`);
    info(`PDF saved: ${documentsPath}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error(`Error generating PDF: ${errorMessage}`);
    throw err;
  }
};
