from tkinter import *
import customtkinter

from chat import ChatUI
from settings import SettingsApp
from src.utils.common import *
from src.config.themes import *
from src.utils.treeview import LibraryApp


class App(customtkinter.CTk):
    def __init__(self):
        super().__init__()
        self.title("Research Assistant")
        self.geometry("1400x800")
        self.resizable(width=True, height=True)
        self.load_settings()
        self.create_layout()
        self.library = []
        self.selected_files = []

    def load_settings(self):
        self.theme, self.model = load_config()
    
    def change_settings(self):
        # Create an instance of the Toplevel window
        self.settings_window = Toplevel(self)
        self.settings_window.title("Settings")
        self.settings_window.geometry("800x600")
    
        # Create an instance of SettingsApp inside the Toplevel window
        settings_app = SettingsApp(self.settings_window, self.theme, self.model)
        settings_app.pack(expand=True, fill=BOTH)
        
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
            border_width=1,
            corner_radius=0,
            fg_color=self.theme["colors"].FRAME_COLOR.value,
        )
        self.frame2 = customtkinter.CTkFrame(
            master=paned_window,
            width=700,
            height=800,
            border_width=1,
            corner_radius=0,
            fg_color=self.theme["colors"].BG_COLOR.value,
        )
        self.frame3 = customtkinter.CTkFrame(
            master=paned_window,
            width=300,
            height=800,
            border_width=1,
            corner_radius=0,
            fg_color=self.theme["colors"].FRAME_COLOR.value,
        )

        paned_window.add(self.frame1, minsize=400)
        paned_window.add(self.frame2, minsize=700)
        paned_window.add(self.frame3, minsize=300)

        # LibraryApp(self.frame1, self.theme)
        
        # Frame 3
        # label3 = Label(
        #     self.frame3,
        #     text=self.model["model_name"],
        #     bg=self.theme["colors"].FRAME_COLOR.value,
        #     fg=self.theme["colors"].HEADING_COLOR.value,
        #     font=("Helvetica", 12),
        # )
        # label3.pack(side=TOP, pady=20)
        
        ChatUI(
            parent=self.frame3,
            model_name=self.model["model_name"],
            model_state="active",
            theme=self.theme,
        )
    
    def browse_files(self):
        logger.info("Browse Operation Initiated")
        file_paths = filedialog.askopenfilenames()
        if file_paths:
            self.library.extend(file_paths)
            update_file_list(
                frame1=self.frame1,
                frame2=self.frame2,
                library=self.library,
                selected_files=self.selected_files,
                theme=self.theme,
                add_file_button=self.add_file_button,
                delete_file_button=self.delete_file_button,
                merge_files_button=self.merge_files_button,
                summarize_all_files_button=self.summarize_all_files_button,
            )
        return self.library

    def delete_selected_files(self):
        logger.info("Delete Operation Initiated")
        logger.info("Selected these files for deletion", self.selected_files)
        print(self.selected_files)
        for file in self.selected_files:
            self.library.remove(file)
            print(self.library)
        self.selected_files = []
        update_file_list(
            frame1=self.frame1,
            frame2=self.frame2,
            library=self.library,
            selected_files=self.selected_files,
            theme=self.theme,
            add_file_button=self.add_file_button,
            delete_file_button=self.delete_file_button,
            merge_files_button=self.merge_files_button,
            summarize_all_files_button=self.summarize_all_files_button,
        )
        # Clear frame2
        for widget in self.frame2.winfo_children():
            widget.destroy()
        return self.library, self.selected_files

    def merge_files(self):
        logger.info("Merge Operation Initiated")
        logger.info("Selected these files for merge operation", self.selected_files)
        merge_pdfs(self.selected_files)
        self.selected_files = []
        update_file_list(
            frame1=self.frame1,
            frame2=self.frame2,
            library=self.library,
            theme=self.theme,
            add_file_button=self.add_file_button,
            delete_file_button=self.delete_file_button,
            merge_files_button=self.merge_files_button,
            summarize_all_files_button=self.summarize_all_files_button,
            selected_files=self.selected_files,
        )

        # Clear frame2
        for widget in self.frame2.winfo_children():
            widget.destroy()
        return self.selected_files

    def summarize_all_files(self):
        pass

if __name__ == "__main__":
    app = App()
    app.mainloop()


# # * Frame 1
        # label1 = Label(
        #     self.frame1,
        #     text="Library",
        #     bg=self.theme["colors"].FRAME_COLOR.value,
        #     fg=self.theme["colors"].HEADING_COLOR.value,
        #     font=("Helvetica", self.theme["heading_size"]),
        # )
        # label1.pack(side=TOP, pady=20)

        # # Create a frame for the buttons
        # button_frame = Frame(self.frame1, bg=self.theme["colors"].FRAME_COLOR.value)
        # button_frame.pack(pady=20)

        # self.settings_button = customtkinter.CTkButton(
        #     master=button_frame,
        #     text="⚙️",
        #     command=self.change_settings,
        #     width=25,
        #     height=25,
        #     corner_radius=10,
        #     fg_color=self.theme["colors"].FRAME_COLOR.value,
        #     bg_color=self.theme["colors"].FRAME_COLOR.value,
        #     hover_color=self.theme["colors"].BUTTON_COLOR.value,
        # )
        
        # self.add_file_button = customtkinter.CTkButton(
        #     master=button_frame,
        #     text="📚",
        #     command=self.browse_files,
        #     width=25,
        #     height=25,
        #     corner_radius=10,
        #     fg_color=self.theme["colors"].FRAME_COLOR.value,
        #     bg_color=self.theme["colors"].FRAME_COLOR.value,
        #     hover_color=self.theme["colors"].BUTTON_COLOR.value,
            
        # )

        # self.delete_file_button = customtkinter.CTkButton(
        #     master=button_frame,
        #     text="🗑️",
        #     command=self.delete_selected_files,
        #     width=25,
        #     height=25,
        #     corner_radius=10,
        #     fg_color=self.theme["colors"].FRAME_COLOR.value,
        #     bg_color=self.theme["colors"].FRAME_COLOR.value,
        #     hover_color=self.theme["colors"].BUTTON_COLOR.value,
            
        # )

        # self.merge_files_button = customtkinter.CTkButton(
        #     master=button_frame,
        #     text="🔗",
        #     command=self.merge_files,
        #     width=25,
        #     height=25,
        #     corner_radius=10,
        #     fg_color=self.theme["colors"].FRAME_COLOR.value,
        #     bg_color=self.theme["colors"].FRAME_COLOR.value,
        #     hover_color=self.theme["colors"].BUTTON_COLOR.value,
            
        # )

        # self.summarize_all_files_button = customtkinter.CTkButton(
        #     master=button_frame,
        #     text="📝",
        #     command=self.summarize_all_files,
        #     width=25,
        #     height=25,
        #     corner_radius=10,
        #     fg_color=self.theme["colors"].FRAME_COLOR.value,
        #     bg_color=self.theme["colors"].FRAME_COLOR.value,
        #     hover_color=self.theme["colors"].BUTTON_COLOR.value,
            
        # )
        

        # self.settings_button.pack(side=LEFT, padx=10)
        # self.add_file_button.pack(side=LEFT, padx=10)
        # self.merge_files_button.pack(side=LEFT, padx=10)
        # self.summarize_all_files_button.pack(side=LEFT, padx=10)
        # self.delete_file_button.pack(side=LEFT, padx=10)
