import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { open } from "@tauri-apps/plugin-dialog";

import { useEffect, useState } from "react";
import { Tabs } from "./ui/Tabs";
import { createProject, getPreviousProjects } from "@/lib/backend";
import { Project } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { error, info, warn } from "@/lib/logger";

const loadProjectSchema = z.object({
  projectpath: z.string().min(2, {
    message: "Project path is required.",
  }),
});

const createProjectSchema = z.object({
  projectname: z.string().min(2, {
    message: "Project Name must be at least 2 characters.",
  }),
  projectpath: z.string().min(2, {
    message: "Project path is required.",
  }),
  activellmprovider: z.string().min(2, {
    message: "LLM Provider is required.",
  }),
});

const llmProviders = [
  { label: "OpenAI", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google", value: "google" },
];

const tabs = [
  { id: "load-project", label: "Load Project" },
  { id: "create-project", label: "Create New Project" },
];

interface ProjectSetupProps {
  onProjectPathSet: (path: string) => void;
}

export function ProjectSetup({ onProjectPathSet }: ProjectSetupProps) {
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        info("🔍 Fetching projects...");
        const result = await getPreviousProjects();
        if (Array.isArray(result)) {
          info(`✅ Setting projects: ${result}`);
          setPreviousProjects(result as Project[]);
        } else {
          warn(`⚠️ Unexpected format for previous projects: ${result} `);
        }
      } catch (err) {
        error(`❌ Error fetching previous projects: ${err}`);
      }
    };

    fetchProjects();
  }, []);

  const [activeTab, setActiveTab] = useState("load-project");
  const [previousProjects, setPreviousProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  const loadForm = useForm<z.infer<typeof loadProjectSchema>>({
    resolver: zodResolver(loadProjectSchema),
    defaultValues: {
      projectpath: "",
    },
  });

  const createForm = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      projectname: "",
      projectpath: "",
      activellmprovider: "",
    },
  });

  const selectFolder = async (fieldName: "projectpath", form: any) => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: "$HOME",
      });

      if (selected && typeof selected === "string") {
        form.setValue(fieldName, selected);
      } else if (selected === null) {
        info("User cancelled the dialog");
      } else {
        error(`Unexpected dialog result: ${selected}`);
      }
    } catch (err) {
      error(`Error opening directory dialog: ${err}`);
    }
  };

  async function onLoadProjectSubmit(
    values: z.infer<typeof loadProjectSchema>,
  ) {
    try {
      onProjectPathSet(values.projectpath);
      setTimeout(() => navigate("/Workspace"), 500);
    } catch (err) {
      error(`Failed to load project: ${err}`);
      alert("Failed to load project: " + err);
    }
  }

  // In ProjectSetup.tsx
  async function onCreateProjectSubmit(
    values: z.infer<typeof createProjectSchema>,
  ) {
    try {
      await createProject(
        values.projectname,
        values.projectpath,
        values.activellmprovider,
      );
      info("✅ Project created");
      onProjectPathSet(values.projectpath);
      // setTimeout(() => navigate("/Workspace"));
      navigate("/Workspace");
    } catch (err) {
      error(`Failed to create project: ${err}`);
    }
  }

  return (
    <div className="flex flex-col justify-center items-center max-w-2xl mx-auto py-10">
      <Tabs
        tabs={tabs}
        onTabChange={(tabId: string) => setActiveTab(tabId)}
        className="mb-3 pb-10"
      />
      {activeTab === "load-project" && (
        <Form {...loadForm}>
          <form
            onSubmit={loadForm.handleSubmit(onLoadProjectSubmit)}
            className="flex flex-col gap-6 w-full "
          >
            <FormField
              control={loadForm.control}
              name="projectpath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Path</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <Button
                      type="button"
                      onClick={() => selectFolder("projectpath", loadForm)}
                    >
                      Browse
                    </Button>
                  </div>
                  <FormDescription>Select the project folder.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              Recent Projects
              <ul className="space-y-2 mt-3">
                {previousProjects.map((item, index) => (
                  <li
                    key={index}
                    onClick={() =>
                      loadForm.setValue("projectpath", item.projectPath)
                    }
                    className="cursor-pointer hover:bg-muted p-2 rounded transition border border-l-8 border-l-emerald-300"
                  >
                    <div className="font-semibold">{item.projectName}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.projectPath}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      )}

      {activeTab === "create-project" && (
        <Form {...createForm}>
          <form
            onSubmit={createForm.handleSubmit(onCreateProjectSubmit)}
            className="flex flex-col gap-6 w-full "
          >
            <FormField
              control={createForm.control}
              name="projectname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Project" {...field} />
                  </FormControl>
                  <FormDescription>Name your project.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={createForm.control}
              name="activellmprovider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LLM Provider</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select LLM Provider</option>
                      {llmProviders.map((provider) => (
                        <option key={provider.value} value={provider.value}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>
                    Select the LLM provider for this project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createForm.control}
              name="projectpath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Path</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <Button
                      type="button"
                      onClick={() => selectFolder("projectpath", createForm)}
                    >
                      Browse
                    </Button>
                  </div>
                  <FormDescription>
                    Select the main project folder.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Submit</Button>
          </form>
        </Form>
      )}
    </div>
  );
}
