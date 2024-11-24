import os
from tkinter import *
from tkinter import filedialog
import customtkinter
import json
from main import App
from src.utils import logger
from src.rag.components.prompts import final_combine_template, chat_template


class Welcome(customtkinter.CTk):
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
                "model_name": "gemini-pro",
                "model_api": "",
                "model_secretkey": "",
                "model_temperature": 0.3,
                "response_template": "Default response template...",
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
        app = App(project_info=self.project_info, project_config=self.default_project_config)
        app.mainloop()

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
                logger.info(f"Project found: {project['project_name']}")
                self.project_list.insert(END, project["project_name"])
                valid_projects.append(project)
            else:
                logger.info(f"Project not found: {project['project_name']}")

        if len(valid_projects) != len(self.old_projects_info):
            self.old_projects_info = valid_projects
            self.save_projects_info()

        self.project_list.pack(side=LEFT, fill=BOTH, expand=1, padx=10)


if __name__ == "__main__":
    welcome = Welcome()
    welcome.mainloop()
