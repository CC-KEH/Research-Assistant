import os
import json
import customtkinter
from tkinter import filedialog, Listbox, SINGLE, END, StringVar

from numpy import pad
from src.constants import CHAT_LLMS
from src.rag.components.prompts import final_combine_template, chat_template
from src import utils
from src.utils.font_manager import FontManager
from src.config.themes import DarkTheme
from main import App
import ctypes

ctypes.windll.shcore.SetProcessDpiAwareness(1)

class Welcome(customtkinter.CTk):
    """
    Welcome screen for the Research Assistant application.

    - Users can load a previous project or create a new one.
    - On creating a new project, it prompts for configuration settings.
    """


    def __init__(self):
        super().__init__()
        self.project_path = None
        self.project_info = {
            "project_name": "xxxxxxxxxxxxxx",
            "project_path": os.getcwd(),
        }
        self.default_project_config = {
            "font_size": "12",
            "heading_size": "24",
            "font_family": "Arial",
            "theme": "Dark",
            "LLM": "Google",
            "model_name": CHAT_LLMS["Google"][0],
            "model_api": "",
            "embedding_model_api": "",
            "model_temperature": 0.3,
            "prompt_templates": {"default": chat_template},
            "summary_templates": {"default": final_combine_template},
        }

        self.old_projects_info = self.load_projects_info()
        self.setup_ui()
        self.title("Research Assistant")
        self.geometry("750x500")
        self.resizable(width=True, height=True)

    def load_projects_info(self):
        """Loads existing project configurations from `projects.json`."""
        if not os.path.exists("projects.json") or os.path.getsize("projects.json") == 0:
            with open("projects.json", "w") as f:
                json.dump([], f)
            return []
        with open("projects.json", "r") as f:
            return json.load(f)

    def save_projects_info(self):
        """Saves project configurations to `projects.json`, avoiding duplicates."""
        project_names = {project["project_name"] for project in self.old_projects_info}
        if self.project_info["project_name"] != "xxxxxxxxxxxxxx" and self.project_info["project_name"] not in project_names:
            self.old_projects_info.append(self.project_info)
        with open("projects.json", "w") as f:
            json.dump(self.old_projects_info, f, indent=4)

    def setup_ui(self):
        """Sets up the UI components."""
        # customtkinter.CTkLabel(self, text="Research Assistant", font=("Arial", 20)).pack(side="top", pady=20)
        gideon_font = FontManager.get_font("Gideon Roman", size=50, weight="bold")
        nunito_font = FontManager.get_font("Nunito", size=20, weight="bold")
        customtkinter.CTkLabel(self, text="Research Assistant", font=gideon_font, text_color=DarkTheme.HEADING_COLOR.value ).pack(side="top", pady=10)

        
        projects_frame = customtkinter.CTkFrame(self, fg_color=DarkTheme.FRAME_COLOR.value)
        projects_frame.pack(side="left", fill="both", expand=1, padx=20, pady=20)
        
        self.projects_label = customtkinter.CTkLabel(
            projects_frame, text="Previous Projects", font=("Arial", 20), 
            text_color=DarkTheme.HEADING_COLOR.value
        ).pack(side="top", pady=10)
        
        self.project_list = Listbox(
            projects_frame, width=50, height=15, font=("Helvetica", 10),
            fg=DarkTheme.TEXT_COLOR.value, borderwidth=0, activestyle="none",
            selectmode=SINGLE, highlightthickness=0, bg=DarkTheme.FRAME_COLOR.value,
            selectforeground=DarkTheme.BUTTON_HOVER_COLOR.value, selectbackground=DarkTheme.FRAME_COLOR.value
        )
        self.load_project_list()
        self.project_list.pack(side="left", fill="both", expand=1, padx=10)
        
        customtkinter.CTkLabel(self, text="Create a new project", font=("Arial", 20)).pack(side="top", pady=20)

        self.project_name_entry = customtkinter.CTkEntry(
            self, width=200, height=30, corner_radius=15,
            fg_color=DarkTheme.FRAME_COLOR.value, placeholder_text="New Project"
        )
        
        self.project_name_entry.pack(side="top", pady=10, padx=10)

        customtkinter.CTkButton(
            self, text="Create New Project", command=self.create_new_project,
            width=200, height=40, corner_radius=20,
            text_color=DarkTheme.FRAME_COLOR.value, fg_color=DarkTheme.BUTTON_COLOR.value, hover_color=DarkTheme.BUTTON_HOVER_COLOR.value
        ).pack(side="top", pady=20)

        customtkinter.CTkButton(
            self, text="Load Project", command=self.select_previous_project,
            width=200, height=40, corner_radius=20,
            text_color=DarkTheme.FRAME_COLOR.value, fg_color=DarkTheme.BUTTON_COLOR.value, hover_color=DarkTheme.BUTTON_HOVER_COLOR.value
        ).pack(side="top", pady=5)

    def load_project_list(self):
        """Loads projects into the listbox and removes invalid paths."""
        valid_projects = [p for p in self.old_projects_info if os.path.exists(p["project_path"])]
        for i, project in enumerate(valid_projects):
            # insert no. project name in the listbox
            self.project_list.insert(END, f"{i+1}. {project['project_name']}")
        if len(valid_projects) != len(self.old_projects_info):
            self.old_projects_info = valid_projects
            self.save_projects_info()

    def create_new_project(self):
        """Creates a new project and opens the configuration window."""
        project_dir = filedialog.askdirectory()
        project_name = self.project_name_entry.get().strip()

        if not project_name:
            utils.show_error(self,"Project name cannot be empty!")
            return

        project_name += "_ra"
        project_path = os.path.join(project_dir, project_name)

        os.makedirs(project_path, exist_ok=True)
        self.project_info.update({"project_name": project_name, "project_path": project_path})
        self.save_projects_info()
        self.destroy()
        ProjectConfigWindow(self.project_info, self.default_project_config).mainloop()

    def select_previous_project(self):
        """Loads the selected project and opens the main application."""
        try:
            project_name = self.project_list.get(self.project_list.curselection()).split(". ")[1]
            for project in self.old_projects_info:
                if project["project_name"] == project_name:
                    self.project_info = project
                    self.destroy()
                    App(self.project_info).mainloop()
                    return
        except:
            utils.show_error(self,"No project selected!")


class ProjectConfigWindow(customtkinter.CTk):
    """Configuration window for project settings."""

    def __init__(self, project_info, default_project_config):
        super().__init__()
        self.project_info = project_info
        self.project_config = default_project_config
        self.title("Project Configuration")
        self.geometry("500x550")
        self.resizable(width=True, height=True)

        self.setup_ui()

    def setup_ui(self):
        """Creates UI components for project settings."""
        # LLM Selection
        self.llm_var = StringVar(value="Google")
        self.create_dropdown("LLM", list(CHAT_LLMS.keys()), self.llm_var, self.update_model_name)

        # Model Name (This will update dynamically when LLM changes)
        self.model_name_entry = self.create_entry("Model Name", CHAT_LLMS[self.llm_var.get()][0])

        # Model API Key
        self.model_api_entry = self.create_entry("Model API", self.project_config["model_api"])

        # Embedding Model API Key
        self.embedding_api_entry = self.create_entry("Embedding Model API", self.project_config["embedding_model_api"])

        # Save Button
        customtkinter.CTkButton(
            self, text="Save Configuration", command=self.save_configuration,
            width=200, height=40, corner_radius=20,
            text_color=DarkTheme.FRAME_COLOR.value,fg_color=DarkTheme.BUTTON_COLOR.value, hover_color=DarkTheme.BUTTON_HOVER_COLOR.value
        ).pack(pady=20)

    def create_dropdown(self, label_text, options, variable, command=None):
        """Helper method to create dropdown menus with an optional event listener."""
        customtkinter.CTkLabel(self, text=label_text).pack(pady=5)
        dropdown = customtkinter.CTkOptionMenu(self, values=options, variable=variable, command=command)
        dropdown.pack(pady=10)

    def create_entry(self, label_text, default_value):
        """Helper method to create entry fields."""
        customtkinter.CTkLabel(self, text=label_text).pack(pady=5)
        entry = customtkinter.CTkEntry(self, width=200, height=30, corner_radius=15, fg_color=DarkTheme.FRAME_COLOR.value)
        entry.insert(0, default_value)
        entry.pack(pady=10)
        return entry

    def update_model_name(self, selected_llm):
        """Updates the model name field based on the selected LLM."""
        self.model_name_entry.delete(0, 'end')  # Clear current model name
        self.model_name_entry.insert(0, CHAT_LLMS[selected_llm][0])  # Insert new model name

    def save_configuration(self):
        """Saves the configuration and starts the main application."""
        self.project_config.update({
            "model_name": self.model_name_entry.get(),
            "model_api": self.model_api_entry.get(),
            "embedding_model_api": self.embedding_api_entry.get(),
        })
        self.destroy()
        App(self.project_info, self.project_config).mainloop()


if __name__ == "__main__":
    Welcome().mainloop()