from tkinter import *
import customtkinter

from src.utils.common import *
from src.config.themes import *
from src.components.treeview import LibraryApp

class App(customtkinter.CTk):
    def __init__(self,project_info,project_config=None):
        super().__init__()
        self.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.project_name = project_info["project_name"]
        self.project_path = project_info["project_path"]
        
        # New Project Created
        if project_config is not None:
            self.project_config = project_config
            self.complete_project_config = {
                "project_name": self.project_name,
                "project_path": self.project_path,
                "config": self.project_config,
            }
        else:
            self.complete_project_config = get_project_config(self.project_path)
            
        self.config = self.complete_project_config["config"]
        
        self.title("Research Assistant")
        self.geometry("1400x800")
        self.resizable(width=True, height=True)
        self.load_settings()
        self.create_layout()

    def load_settings(self):
        logger.info("Loading settings...")
        self.theme, self.model = load_config(config=self.config)
    
    def create_layout(self):
        paned_window = PanedWindow(
            self, orient=HORIZONTAL, bg=self.theme["colors"].BG_COLOR.value
        )
        paned_window.pack(fill=BOTH, expand=1)

        # Create frames
        self.frame1 = customtkinter.CTkFrame(
            master=paned_window,
            width=400,
            height=800,
            border_width=0,
            corner_radius=0,
            fg_color=self.theme["colors"].FRAME_COLOR.value,
        )
        self.frame2 = customtkinter.CTkFrame(
            master=paned_window,
            width=700,
            height=800,
            border_width=0,
            corner_radius=0,
            fg_color=self.theme["colors"].BG_COLOR.value,
        )
        self.frame3 = customtkinter.CTkFrame(
            master=paned_window,
            width=300,
            height=800,
            border_width=0,
            corner_radius=0,
            fg_color=self.theme["colors"].FRAME_COLOR.value,
        )

        paned_window.add(self.frame1, minsize=400)
        paned_window.add(self.frame2, minsize=700)
        paned_window.add(self.frame3, minsize=300)

        
        LibraryApp(self.frame1, self.frame2, self.frame3, self.complete_project_config)
        
    def on_closing(self):
        self.destroy()
    
if __name__ == "__main__":
    app = App()
    app.mainloop()