import os
from tkinter import *
from tkinter import filedialog
import customtkinter
import json
from main import App
class Welcome(customtkinter.CTk):
    def __init__(self):
        super().__init__()
        self.project_path = None
        self.project_config = [{"project_name": "New Project",
                                "project_path": os.getcwd(),
                                "config": {
                                            "font_size": "12",
                                            "heading_size": "24",
                                            "font_family": "Arial",
                                            "theme": "Dark",
                                            "model_name": "Model A",
                                            "model_api": "",
                                            "model_secretid": "",
                                            "response_template": "Default response template...",
                                            "prompt_template": "Default prompt...",
                                        }
                                }]
        self.old_project_configs = self.load_json_config()
        self.load_project()
        self.ask_to_load_project()
        self.title("Research Assistant")
        self.geometry("600x500")
        self.resizable(width=True, height=True)

    def create_json_config(self):
        with open("projects_config.json", "w") as f:
            json.dump(self.project_config, f, indent=4)
    
    def load_json_config(self):
        if not os.path.exists("projects_config.json"):
            with open("projects_config.json", "w") as f:
                json.dump(self.project_config, f, indent=4)
                
        with open("projects_config.json", "r") as f:
            self.old_project_configs = json.load(f)
        
        if self.old_project_configs == []:
            self.old_project_configs = self.project_config
        
        return self.old_project_configs
    
    def create_new_project(self):
        project_path = filedialog.askdirectory()
        project_name = self.project_name_entry.get()
        project_name+="_ra"
        project_path = os.path.join(project_path, project_name)
        os.makedirs(project_path, exist_ok=True)
        self.project_path = project_path
        self.project_config.append({"project_name": project_name,
                                    "project_path": project_path,
                                    "config": {
                                        "font_size": "12",
                                        "heading_size": "24",
                                        "font_family": "Arial",
                                        "theme": "Dark",
                                        "model_name": "Model A",
                                        "model_api": "",
                                        "model_secretid": "",
                                        "response_template": "Default response template...",
                                        "prompt_template": "Default prompt...",
                                    }
                                    })
        self.create_json_config()
        self.destroy()
        app = App(self.project_config)
        app.mainloop()

    def select_previous_project(self):
        project_name = self.project_list.get(self.project_list.curselection())
        for project in self.old_project_configs:
            if project["project_name"] == project_name:
                self.project_config = project
                self.destroy()
                app = App(self.project_config)
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
            height=100  # You can adjust this height to control the space
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
            placeholder_text="Enter project name"
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
        self.load_json_config()
        self.project_list = Listbox(self, width=50, height=15,
                                    font=("Helvetica", 12), fg="white", borderwidth=0, activestyle="none", selectmode=SINGLE, 
                                    highlightthickness=0, bg="#1e1e1e", selectforeground="white", selectbackground="#6C7BFE")
        for project in self.old_project_configs:
            self.project_list.insert(END, project["project_name"])
        self.project_list.pack(side=LEFT, fill=BOTH, expand=1, padx=10)

if __name__ == "__main__":
    welcome = Welcome()
    welcome.mainloop()
