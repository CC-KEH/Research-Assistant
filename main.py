from tkinter import *
from tkinter import filedialog
import customtkinter

from src import config
from src.components.chat import ChatUI
from src.utils.common import *
from src.config.themes import *
from src.components.treeview import LibraryApp

class App(customtkinter.CTk):
    def __init__(self,config):
        super().__init__()
        
        self.project_name = config["project_name"]
        self.project_path = config["project_path"]
        self.config = config["config"]
        self.project_config = config
        
        self.title("Research Assistant")
        self.geometry("1400x800")
        self.resizable(width=True, height=True)
        self.load_settings()
        self.create_layout()

    def load_settings(self):
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

        
        # Frame 3
        self.chat_ui = ChatUI(
            parent=self.frame3,
            model_name=self.model["model_name"],
            theme=self.theme,
        )
        
        LibraryApp(self.frame1, self.frame2, self.chat_ui, self.project_config)
        
    

if __name__ == "__main__":
    app = App()
    app.mainloop()