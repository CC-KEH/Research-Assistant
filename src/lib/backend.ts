import { invoke } from "@tauri-apps/api/core";
import { BugType, Item, Project } from "./types";
import { Config } from "@/lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import { FileInfo } from "@/lib/types";

//*********************** */
//* File System Functions
//*********************** */
export const readFile = async (filePath: string) => {
  try {
    const content = await invoke<string>("read_file", { filePath });
    console.log("File content:", content);
  } catch (err) {
    console.error("Error reading file:", err);
  }
};

export const writeFile = async (filePath: string, content: string) => {
  try {
    await invoke("write_file", { filePath, content });
    console.log("File written successfully");
  } catch (err) {
    console.error("Error writing file:", err);
  }
};

export const listDir = async (dirPath: string) => {
  try {
    const entries = await invoke<string[]>("list_dir", { dirPath });
    console.log("Directory entries:", entries);
  } catch (err) {
    console.error("Error listing directory:", err);
  }
};

export const createDir = async (dirPath: string) => {
  try {
    await invoke("create_dir", { dirPath });
    console.log("Directory created successfully:", dirPath);
  } catch (err) {
    console.error("Error creating directory:", err);
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

  // Upload each file through the Rust backend
  for (const filePath of files) {
    try {
      const fileInfo = await invoke<FileInfo>("upload_to_knowledge_store", {
        sourcePath: filePath,
        projectRoot: projectRoot,
      });
      fileInfos.push(fileInfo);
    } catch (error) {
      console.error(`Failed to upload ${filePath}:`, error);
      // Optionally continue with other files or throw
    }
  }

  return fileInfos;
}

function mapExtensionToType(ext: string): string {
  switch (ext) {
    case "pdf":
      return "pdf";
    case "md":
      return "markdown";
    case "txt":
      return "text";
    case "xlsx":
      return "spreadsheet";
    case "excalidraw":
      return "drawing";
    default:
      return "unknown";
  }
}

//*********************** */
//* Config Functions
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

export const loadConfig = async (config: Config) => {
  try {
    // TODO: update project config based on config
    console.log("Config loaded successfully");
  } catch (error) {
    console.error("Failed to load config:", error);
    return null;
  }
};

export const updateConfig = async (configPath: string, newConfig: Config) => {
  try {
    await invoke("update_config", { configPath, newConfig });
    console.log("Config saved successfully");
  } catch (error) {
    console.error("Failed to save config:", error);
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
    console.log("🚀 Calling create_new_project with:", {
      projectName: project_name,
      projectPath: project_path,
      resourcesPath: resources_path,
    });

    const result = await invoke("create_new_project", {
      projectName: project_name, // ← Changed from project_name
      projectPath: project_path, // ← Changed from project_path
      resourcesPath: resources_path, // ← Changed from resources_path
    });

    console.log("✅ Project created successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Error creating a project:", error);
    throw error; // Re-throw so the caller knows it failed
  }
};

//*********************** */
//* Context Menu Functions [ File Manager | File Viewer | Assistant ]
//*********************** */

export const deleteItem = (item: Item) => {};

export const tabsSettings = () => {};

export const modelSettings = () => {};
export const resetSession = (sessionID: string) => {};
export const createSession = (currentSessionID: string) => {};

export const reportBug = (bugType: BugType) => {};
