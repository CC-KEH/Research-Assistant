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
  resourcespath: z.string().min(2, {
    message: "Resources path is required.",
  }),
});

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
        console.log("🔍 Fetching projects...");
        const result = await getPreviousProjects();

        console.log("📦 Raw result:", result);
        console.log("📦 Result type:", typeof result);
        console.log("📦 Is array?", Array.isArray(result));

        if (Array.isArray(result)) {
          console.log("✅ Setting projects:", result);
          setPreviousProjects(result as Project[]);
        } else {
          console.warn("⚠️ Unexpected format for previous projects:", result);
        }
      } catch (error) {
        console.error("❌ Error fetching previous projects:", error);
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
      resourcespath: "",
    },
  });

  const selectFolder = async (
    fieldName: "projectpath" | "resourcespath",
    form: any
  ) => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: "$HOME",
      });

      console.log("Selected path:", selected);

      if (selected && typeof selected === "string") {
        form.setValue(fieldName, selected);
      } else if (selected === null) {
        console.log("User cancelled the dialog");
      } else {
        console.error("Unexpected dialog result:", selected);
      }
    } catch (error) {
      console.error("Error opening directory dialog:", error);
    }
  };

  async function onLoadProjectSubmit(
    values: z.infer<typeof loadProjectSchema>
  ) {
    console.log("Loading project:", values);
    try {
      onProjectPathSet(values.projectpath);
      navigate("/Workspace");
    } catch (error) {
      console.error("Failed to load project:", error);
      alert("Failed to load project: " + error);
    }
  }

  async function onCreateProjectSubmit(
    values: z.infer<typeof createProjectSchema>
  ) {
    console.log("Creating project:", values);
    try {
      await createProject(
        values.projectname,
        values.projectpath,
        values.resourcespath
      );
      console.log("✅ Project created");
      onProjectPathSet(values.projectpath);
      navigate("/Workspace");
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project: " + error);
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
                    className="cursor-pointer hover:bg-muted p-2 rounded transition"
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

            <FormField
              control={createForm.control}
              name="resourcespath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resources Path</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <Button
                      type="button"
                      onClick={() => selectFolder("resourcespath", createForm)}
                    >
                      Browse
                    </Button>
                  </div>
                  <FormDescription>
                    Select the folder that contains your resources.
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
