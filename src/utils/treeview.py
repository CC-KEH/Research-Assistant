# import tkinter
from tkinter import ttk, simpledialog
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
        self.setup_buttons()
        
    def setup_frame(self):
        self.frame_1 = customtkinter.CTkFrame(master=self.root, bg_color=FRAME_COLOR, fg_color=FRAME_COLOR)
        self.frame_1.pack(fill="both", expand=True)
        
    def setup_label(self):
        self.label = customtkinter.CTkLabel(master=self.frame_1, text="Library", font=("Helvetica", HEADING_SIZE), text_color=BUTTON_COLOR)
        self.label.grid(pady=10, row=0, column=0, columnspan=3)
        
    def setup_styles(self):
        self.treestyle = ttk.Style()
        self.treestyle.theme_use('default')
        self.treestyle.configure("Treeview", background=FRAME_COLOR, foreground=TEXT_COLOR, fieldbackground=FRAME_COLOR, borderwidth=0)
        self.treestyle.map('Treeview', background=[('selected', FRAME_COLOR)], foreground=[('selected', BUTTON_COLOR)])
        
    def setup_treeview(self):
        self.treeview = ttk.Treeview(self.frame_1, height=20, show="tree", selectmode="extended")
        self.treeview.grid(row=1, column=0, columnspan=3, padx=10, pady=10, sticky="nsew")
        self.frame_1.grid_rowconfigure(1, weight=1)
        self.frame_1.grid_columnconfigure(0, weight=1)
        self.treeview.insert('', '1', 'i1', text='Papers')
        self.treeview.insert('', '2', 'i2', text='Summaries')
        self.treeview.insert('', '3', 'i3', text='Notes')

    def setup_buttons(self):
        self.delete_button = customtkinter.CTkButton(
            master=self.frame_1,
            text="Delete Selected",
            command=self.delete_selected_item,
            fg_color=BUTTON_COLOR,
            text_color=TEXT_COLOR
        )
        self.delete_button.grid(row=2, column=0, padx=10, pady=10, sticky="ew")

        self.get_selected_button = customtkinter.CTkButton(
            master=self.frame_1,
            text="Get Selected",
            command=self.get_selected_item,
            fg_color=BUTTON_COLOR,
            text_color=TEXT_COLOR
        )
        self.get_selected_button.grid(row=2, column=1, padx=10, pady=10, sticky="ew")

        self.create_folder_button = customtkinter.CTkButton(
            master=self.frame_1,
            text="Create Folder",
            command=self.create_folder,
            fg_color=BUTTON_COLOR,
            text_color=TEXT_COLOR
        )
        self.create_folder_button.grid(row=2, column=2, padx=10, pady=10, sticky="ew")
        
        self.create_file_button = customtkinter.CTkButton(
            master=self.frame_1,
            text="Create File",
            command=self.create_file,
            fg_color=BUTTON_COLOR,
            text_color=TEXT_COLOR
        )
        self.create_file_button.grid(row=3, column=0, columnspan=3, padx=10, pady=10, sticky="ew")

    def delete_selected_item(self):
        selected_items = self.treeview.selection()
        for item in selected_items:
            self.treeview.delete(item)

    def get_selected_item(self):
        selected_items = self.treeview.selection()
        selected_files = []
        for item in selected_items:
            item_text = self.treeview.item(item, "text")
            selected_files.append(item_text)
            print(f"Selected Item: {item_text}")
        return selected_files

    def create_folder(self):
        # Prompt user to input a folder name
        folder_name = simpledialog.askstring("Input", "Enter new folder name:")
        if folder_name:
            # Insert the new folder at the root level of the Treeview
            self.treeview.insert('', 'end', text=folder_name)

    def create_file(self):
        # Prompt user to input a file name
        file_name = simpledialog.askstring("Input", "Enter new file name:")
        if file_name:
            selected_items = self.treeview.selection()
            if selected_items:
                for selected_item in selected_items:
                    # Insert the new file under each selected folder
                    self.treeview.insert(selected_item, 'end', text=file_name)
            else:
                # Insert the new file at the root level if no folder is selected
                self.treeview.insert('', 'end', text=file_name)
    
    def update_treeview(self, new_data):
        for i, item in new_data.items():
            if i == "Papers":
                for j in item:
                    self.treeview.insert("i1", "end", text=j)
            elif i == "Summaries":
                for j in item:
                    self.treeview.insert("i2", "end", text=j)
            else:
                for j in item:
                    self.treeview.insert("i3", "end", text=j)
                    
if __name__ == "__main__":
    root = customtkinter.CTk()
    app = LibraryApp(root)
    new_data = {
        "Papers": ["P1", "P2", "P3"],
        "Summaries": ["S1", "S2", "S3"],
        "Notes": ["N1", "N2", "N3"]
    }
    app.update_treeview(new_data)
    root.mainloop()