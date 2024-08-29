# import tkinter
from tkinter import ttk
import customtkinter

BG_COLOR = "#1e1e1e"
FG_COLOR = "#f8f8f2"
FRAME_COLOR = "#151515"
BUTTON_COLOR = "#6C7BFE"
TEXT_COLOR = "#FFFFFF"
HEADING_SIZE = 24

class LibraryApp:
    def __init__(self, root, theme='Dark'):
        self.root = root
        self.root.geometry("400x600")
        self.root.title("Library")
        
        customtkinter.set_appearance_mode("Dark")
        customtkinter.set_default_color_theme("blue")
        
        self.setup_frame()
        self.setup_label()
        self.setup_styles()
        self.setup_treeview()
        
        
    def setup_frame(self):
        self.frame_1 = customtkinter.CTkFrame(master=self.root,bg_color=FRAME_COLOR, fg_color=FRAME_COLOR)
        self.frame_1.pack(fill="both", expand=True)
        
    def setup_label(self):
        self.label = customtkinter.CTkLabel(master=self.frame_1, text="Library",font=("Helvetica", HEADING_SIZE), text_color=BUTTON_COLOR)
        self.label.grid(pady=10)
        
    def setup_styles(self):
        self.treestyle = ttk.Style()
        self.treestyle.theme_use('default')
        self.treestyle.configure("Treeview", background=FRAME_COLOR, foreground=TEXT_COLOR, fieldbackground=FRAME_COLOR, borderwidth=0)
        self.treestyle.map('Treeview', background=[('selected', FRAME_COLOR)], foreground=[('selected', BUTTON_COLOR)])
        self.root.bind("<<TreeviewSelect>>", lambda event: self.root.focus_set())
        
    def setup_treeview(self):
        self.treeview = ttk.Treeview(self.frame_1, height=600, show="tree")
        self.treeview.grid(padx=10)
        self.treeview.insert('', '1', 'i1', text='Papers')
        self.treeview.insert('', '2', 'i2', text='Summaries')
        self.treeview.insert('', '3', 'i3', text='Notes')

    def get_selected_item(self):
        # TODO
        pass 
    
    def update_treeview(self, new_data):
        # self.treeview.delete(*self.treeview.get_children())
        for i, item in new_data.items():
            if i=="Papers":
                for j in item:
                    self.treeview.insert("i1", "end", text=j)
            elif i=="Summaries":
                for j in item:
                    self.treeview.insert("i2", "end", text=j)
            else:
                for j in item:
                    self.treeview.insert("i3", "end", text=j)
                    
                   
if __name__ == "__main__":
    root = customtkinter.CTk()
    app = LibraryApp(root)
    new_data = {
        "Papers": ["P1","P2","P3"],
        "Summaries": ["S1","S2","S3"],
        "Notes": ["N1","N2","N3"]
    }
    app.update_treeview(new_data)
    root.mainloop()
    