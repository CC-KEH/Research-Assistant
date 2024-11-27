import os
from tkinter import *
from tkinter import filedialog
import customtkinter
import json
from main import App
from src.utils import logger
from src.rag.components.prompts import final_combine_template, chat_template


class Welcome(customtkinter.CTk):
    """Welcome screen for the Research Assistant application.

    Description:
        - The welcome screen allows users to either load a previous project or create a new project.
        - If the user chooses to load a previous project, the application will load the selected project.
        - If the user chooses to create a new project, the application will ask for the project name and create a new project directory.
        - The user will then be asked to configure the project settings such as model name, model API, etc.
    """
    def __init__(self):
        super().__init__()
        self.project_path = None

        self.project_info = {
            "project_name": "xxxxxxxxxxxxxx",
            "project_path": os.getcwd(),
        }
        self.default_project_config =  {
                "font_size": "12",
                "heading_size": "24",
                "font_family": "Arial",
                "theme": "Dark",
                "model_name": "gemini-1.5-pro-latest",
                "model_api": "",
                "embedding_model_api": "",
                "model_temperature": 0.3,
                "prompt_templates": {"default": chat_template},
                "summary_templates": {"default": final_combine_template},
            }
        

        self.old_projects_info = self.load_projects_info()
        self.load_project()
        self.ask_to_load_project()
        self.title("Research Assistant")
        self.geometry("600x500")
        self.resizable(width=True, height=True)

    def save_projects_info(self):
        # Avoid duplicate entries for the same project
        project_names = {project["project_name"] for project in self.old_projects_info}

        # Add the current project only if it's not already in the config
        if (
            self.project_info["project_name"] != "xxxxxxxxxxxxxx"
            and self.project_info["project_name"] not in project_names
        ):
            self.old_projects_info.append(self.project_info)

        # Write all valid configurations to the file
        with open("projects.json", "w") as f:
            json.dump(self.old_projects_info, f, indent=4)

    def load_projects_info(self):
        if not os.path.exists("projects.json") or os.path.getsize("projects.json") == 0:
            with open("projects.json", "w") as f:
                json.dump([], f)
            return []

        with open("projects.json", "r") as f:
            # self.old_projects_info = [json.load(f)]
            self.old_projects_info = json.load(f)

        return self.old_projects_info

    def create_new_project(self):
        project_path = filedialog.askdirectory()
        project_name = self.project_name_entry.get()
        project_name += "_ra"
        project_path = os.path.join(project_path, project_name)
        os.makedirs(project_path, exist_ok=True)
        self.project_path = project_path
        self.project_info.update(
            {
                "project_name": project_name,
                "project_path": project_path,
            }
        )
        logger.info(f"New project created: {project_name}")
        self.save_projects_info()
        self.destroy()
        config_window = ProjectConfigWindow(self, self.project_info, self.default_project_config)
        config_window.mainloop()
        
        # self.destroy()
        # app = App(project_info=self.project_info, project_config=self.default_project_config)
        # app.mainloop()

    def select_previous_project(self):
        logger.info("Loading previous project")
        project_name = self.project_list.get(self.project_list.curselection())
        for project in self.old_projects_info:
            if project["project_name"] == project_name:
                self.project_info = project
                self.destroy()
                app = App(self.project_info)
                app.mainloop()

    def ask_to_load_project(self):
        # Welcome text
        self.welcome_text = customtkinter.CTkLabel(
            master=self,
            text="Research Assistant",
            font=("Arial", 20),
        )
        self.welcome_text.pack(side=TOP, pady=20)

        # Load project button
        self.load_project_button = customtkinter.CTkButton(
            master=self,
            text="Load Project",
            command=self.select_previous_project,
            width=200,
            height=40,
            corner_radius=20,
            fg_color="#6C7BFE",
            hover_color="#7F8DAD",
        )
        self.load_project_button.pack(side=TOP, pady=20)

        # Adding extra spacing between "Load Project" and "Create New Project"
        self.empty_space = customtkinter.CTkLabel(
            master=self,
            text="",
            height=100,  # You can adjust this height to control the space
        )
        self.empty_space.pack()

        # Create new project text and input field
        self.menu_text = customtkinter.CTkLabel(
            master=self,
            text="Create a new project",
            font=("Arial", 20),
        )
        self.menu_text.pack(side=TOP, pady=20)

        self.project_name_entry = customtkinter.CTkEntry(
            master=self,
            width=200,
            height=30,
            corner_radius=15,
            fg_color="black",
            placeholder_text="Enter project name",
        )
        self.project_name_entry.pack(side=TOP, pady=10, padx=10)

        # Create new project button
        self.create_new_project_button = customtkinter.CTkButton(
            master=self,
            text="Create New Project",
            command=self.create_new_project,
            width=200,
            height=40,
            corner_radius=20,
            fg_color="#6C7BFE",
            hover_color="#7F8DAD",
        )
        self.create_new_project_button.pack(side=TOP, pady=20)

    def load_project(self):
        valid_projects = []
        self.project_list = Listbox(
            self,
            width=50,
            height=15,
            font=("Helvetica", 12),
            fg="white",
            borderwidth=0,
            activestyle="none",
            selectmode=SINGLE,
            highlightthickness=0,
            bg="#1e1e1e",
            selectforeground="white",
            selectbackground="#6C7BFE",
        )

        for project in self.old_projects_info:
            if os.path.exists(project["project_path"]):
                self.project_list.insert(END, project["project_name"])
                valid_projects.append(project)
            else:
                logger.info(f"Project not found: {project['project_name']}")

        if len(valid_projects) != len(self.old_projects_info):
            self.old_projects_info = valid_projects
            self.save_projects_info()

        self.project_list.pack(side=LEFT, fill=BOTH, expand=1, padx=10)


class ProjectConfigWindow(customtkinter.CTk):
    def __init__(self, parent, project_info, default_project_config):
        super().__init__()
        # self.parent = parent
        self.project_info = project_info
        self.project_config = default_project_config
        self.title("Project Configuration")
        self.geometry("500x600")
        self.resizable(width=True, height=True)

        # Create input fields for project configuration
        self.create_config_widgets()

    def create_config_widgets(self):
        # Theme selection
        # self.theme_label = customtkinter.CTkLabel(master=self, text="Theme")
        # self.theme_label.pack(pady=5)
        # self.theme_var = StringVar(value=self.project_config["theme"])
        # self.theme_dropdown = customtkinter.CTkOptionMenu(
            # master=self,
            # values=["Light", "Dark"],
            # variable=self.theme_var
        # )
        # self.theme_dropdown.pack(pady=10)

        # Model name input
        self.model_name_label = customtkinter.CTkLabel(master=self, text="Model Name")
        self.model_name_label.pack(pady=5)
        self.model_name_entry = customtkinter.CTkEntry(
            master=self,
            width=200,
            height=30,
            corner_radius=15,
            fg_color="black",
            placeholder_text="Enter model name",
        )
        self.model_name_entry.insert(0, self.project_config["model_name"])
        self.model_name_entry.pack(pady=10)

        # Model API input
        self.model_api_label = customtkinter.CTkLabel(master=self, text="Model API")
        self.model_api_label.pack(pady=5)
        self.model_api_entry = customtkinter.CTkEntry(
            master=self,
            width=200,
            height=30,
            corner_radius=15,
            fg_color="black",
            placeholder_text="Enter model API",
        )
        self.model_api_entry.insert(0, self.project_config["model_api"])
        self.model_api_entry.pack(pady=10)

        # Embedding model API input
        self.embedding_model_api_label = customtkinter.CTkLabel(master=self, text="Embedding Model API")
        self.embedding_model_api_label.pack(pady=5)
        self.embedding_api_key = customtkinter.CTkEntry(
            master=self,
            width=200,
            height=30,
            corner_radius=15,
            fg_color="black",
            placeholder_text="Enter embedding model API",
        )
        self.embedding_api_key.insert(0, self.project_config["embedding_model_api"])
        self.embedding_api_key.pack(pady=10)

        # Save button
        self.save_button = customtkinter.CTkButton(
            master=self,
            text="Save Configuration",
            command=self.save_configuration,
            width=200,
            height=40,
            corner_radius=20,
            fg_color="#6C7BFE",
            hover_color="#7F8DAD",
        )
        self.save_button.pack(pady=20)

    def save_configuration(self):
        # Update the project configuration with user inputs
        # self.project_config["theme"] = self.theme_var.get()
        self.project_config["model_name"] = self.model_name_entry.get()
        self.project_config["model_api"] = self.model_api_entry.get()
        self.project_config["embedding_model_api"] = self.embedding_api_key.get()

        # Save updated project configuration back to the parent window
        logger.info(f"Configuration saved for project: {self.project_info['project_name']}")
        # self.parent.destroy()
        self.destroy()
        app = App(project_info=self.project_info, project_config=self.project_config)
        app.mainloop()

if __name__ == "__main__":
    welcome = Welcome()
    welcome.mainloop()