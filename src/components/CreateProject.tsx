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

const formSchema = z.object({
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

export function CreateProject() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectname: "",
      projectpath: "",
      resourcespath: "",
    },
  });

  const selectFolder = async (fieldName: "projectpath" | "resourcespath") => {
    const selected = await open({
      directory: true,
      multiple: false,
    });

    if (selected && typeof selected === "string") {
      form.setValue(fieldName, selected);
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Submitted:", values);
    // TODO: Handle values in backend or Tauri command
  }

  return (
    <div className="flex flex-col justify-center items-center max-w-2xl mx-auto py-10">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6 w-full "
        >
          <h1 className="text-3xl font-semibold self-center">
            Create New Project
          </h1>

          <FormField
            control={form.control}
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
            control={form.control}
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
                    onClick={() => selectFolder("projectpath")}
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
            control={form.control}
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
                    onClick={() => selectFolder("resourcespath")}
                  >
                    Browse
                  </Button>
                </div>
                <FormDescription>Select the resources folder.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit">Submit</Button>
        </form>
      </Form>
    </div>
  );
}
