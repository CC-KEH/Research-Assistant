import os
import shutil
from tkinter import *
from tkinter import ttk, simpledialog, filedialog
import customtkinter
from src.constants import PAPERS_DIR
# from src.rag.components.chat_model import ChatModel
from src.rag.components.process_files import VectorStorePipeline
from src.utils import logger
from src.utils.common_new import open_file, load_config
from settings import SettingsApp

BG_COLOR = "#1e1e1e"
FG_COLOR = "#f8f8f2"
FRAME_COLOR = "#151515"
BUTTON_COLOR = "#6C7BFE"
TEXT_COLOR = "#FFFFFF"
HEADING_SIZE = 24

class LibraryApp:
    def __init__(self, parent, frame2, chat_ui, project_config):
        self.root = parent
        self.frame2 = frame2
        self.chat_ui = chat_ui
        self.library = {"Papers": [], 
                        "Summaries": [],
                        "Notes": []
                        }

        self.project_name = project_config["project_name"]
        self.project_path = project_config["project_path"]
        self.config = project_config["config"]
        self.vector_store = VectorStorePipeline()
        self.load_settings()
        self.setup_layout()
        self.setup_styles()
        self.setup_treeview()
        self.setup_directories()
    
    def load_settings(self):
        logger.info("Loading Library Settings")
        self.theme, self.model_config = load_config(config=self.config)
        self.model_name = self.model_config["model_name"]
        self.theme["heading_size"] = HEADING_SIZE
        logger.info("Library Settings Loaded")
    
    def setup_layout(self):
        logger.info("Setting up Library Layout")
        label = Label(
            self.root,
            text="Library",
            bg=self.theme["colors"].FRAME_COLOR.value,
            fg=self.theme["colors"].HEADING_COLOR.value,
            font=("Helvetica", self.theme["heading_size"]),
        )
        label.pack(side=TOP, pady=20)
        
        button_frame = Frame(self.root, bg=self.theme["colors"].FRAME_COLOR.value,highlightthickness=0)
        button_frame.pack(pady=20)

        self.settings_button = customtkinter.CTkButton(
            master=button_frame,
            text="⚙️",
            command=self.change_settings,
            width=25,
            height=25,
            corner_radius=10,
            fg_color=self.theme["colors"].FRAME_COLOR.value,
            bg_color=self.theme["colors"].FRAME_COLOR.value,
            hover_color=self.theme["colors"].BUTTON_COLOR.value,
        )
        
        self.add_file_button = customtkinter.CTkButton(
            master=button_frame,
            text="📚",
            command=self.browse_files,
            width=25,
            height=25,
            corner_radius=10,
            fg_color=self.theme["colors"].FRAME_COLOR.value,
            bg_color=self.theme["colors"].FRAME_COLOR.value,
            hover_color=self.theme["colors"].BUTTON_COLOR.value,
            
        )

        self.delete_file_button = customtkinter.CTkButton(
            master=button_frame,
            text="🗑️",
            command=self.delete_selected_item,
            width=25,
            height=25,
            corner_radius=10,
            fg_color=self.theme["colors"].FRAME_COLOR.value,
            bg_color=self.theme["colors"].FRAME_COLOR.value,
            hover_color=self.theme["colors"].BUTTON_COLOR.value,
            
        )

        self.summarize_all_files_button = customtkinter.CTkButton(
            master=button_frame,
            text="📝",
            command=self.summarize_all_files,
            width=25,
            height=25,
            corner_radius=10,
            fg_color=self.theme["colors"].FRAME_COLOR.value,
            bg_color=self.theme["colors"].FRAME_COLOR.value,
            hover_color=self.theme["colors"].BUTTON_COLOR.value,
            
        )
        
        self.settings_button.pack(side=LEFT, padx=10)
        self.add_file_button.pack(side=LEFT, padx=10)
        # self.merge_files_button.pack(side=LEFT, padx=10)
        self.summarize_all_files_button.pack(side=LEFT, padx=10)
        self.delete_file_button.pack(side=LEFT, padx=10)
        logger.info("Library Layout Setup Complete")
        
        
    def setup_directories(self):
        logger.info("Setting up Library Directories")
        library_path = os.path.join(self.project_path, "Library")        
        os.makedirs(library_path, exist_ok=True)
        for folder, _ in self.library.items():
            if not os.path.exists(library_path + f"/{folder}"):
                os.makedirs(library_path + f"/{folder}", exist_ok=True)
                logger.info(f"Created folder: {folder}")
        
        os.makedirs(self.project_path+"/VectorStore", exist_ok=True)
        
        logger.info("VectorStore and Library Directories Created Successfully")
        
        
    def change_settings(self):
        logger.info("Opening Settings Window")
        # Create an instance of the Toplevel window
        self.settings_window = Toplevel(self)
        self.settings_window.title("Settings")
        self.settings_window.geometry("800x600")
    
        # Create an instance of SettingsApp inside the Toplevel window
        settings_app = SettingsApp(self.settings_window, self.project_name, self.theme, self.model)
        settings_app.pack(expand=True, fill=BOTH)
        logger.info("Settings Window Opened")
        
    # def setup_chat(self):
    #     model = ChatModel(model='gemini-pro', session_id='all')
    #     self.run_chat(model)
        
    def run_chat(self, model):
        logger.info("Running Chat")
        # Run in background
        self.chat_ui.insert_message("Welcome to the Library Chatbot! How can I help you today?", "Librarian")
        self.chat_ui.insert_message("Type 'exit' to close the chatbot.", "Librarian")
        while True:
            msg = self.chat_ui._on_send_button_click()
            response = model.chat(msg)
            self._insert_message(response, self.model_name)

        # TODO: Handle new chat, delete chat history, etc.
        
    def browse_files(self):
        logger.info("Browse Operation Initiated")
        file_paths = filedialog.askopenfilenames()
        
        if file_paths:
            # Loop through each selected file and add them to the library, and create a copy in the respective folder
            for file_path in file_paths:
                 file_name = os.path.basename(file_path)
                 # Copy the pdf file to the Papers folder runs in powershell
                 # shutil.copy(file_path, f"Library/Papers/{file_name}")
                 shutil.copy(file_path,self.project_path + f"/Library/Papers/{file_name}")          
                 # new_file_path = f"Library/Papers/{file_name}"
                 new_file_path = self.project_path + f"/Library/Papers/{file_name}"
                 self.library['Papers'].append(new_file_path)

            logger.info("Currently Library:",self.library)
            self.load_library_into_treeview()  # Update the Treeview with the new files

            # Save the selected files to VectorStore
            pdfs = self.vector_store.get_pdfs(self.project_path + "/Library/Papers/")
            text = self.vector_store.get_pdf_text(pdfs)
            chunks = self.vector_store.get_text_chunks(text)
            self.vector_store.get_vector_store(chunks, self.project_path + "/VectorStore/faiss_index")

        logger.info("Browse Operation Complete")

    def summarize_all_files(self):
        pass
    
    
    def setup_styles(self):
        logger.info("Setting up Library Styles")
        self.treestyle = ttk.Style()

        # Use the default theme
        self.treestyle.theme_use('default')

        # Configure Treeview background, foreground, and field background
        self.treestyle.configure("Treeview", 
            background=FRAME_COLOR, 
            foreground=TEXT_COLOR, 
            fieldbackground=FRAME_COLOR,
            borderwidth=0,
            rowheight=24,
            font=("Helvetica", 12)
        )

        # Highlight selected items with custom colors
        self.treestyle.map('Treeview', 
            background=[('selected', FRAME_COLOR)],  # Dark grey for selected item
            foreground=[('selected', BUTTON_COLOR)]  # Button color for selected text
        )

        # Modify the heading (column names) style
        self.treestyle.configure("Treeview.Heading", 
            background=FRAME_COLOR, 
            foreground=TEXT_COLOR, 
            font=("Helvetica", 16, 'bold')  # Bold, larger font for headings
        )
        logger.info("Library Styles Setup Complete")
    
    def setup_treeview(self):
        logger.info("Setting up Library Treeview")
        self.frame1 = Frame(self.root, bg=self.theme["colors"].FRAME_COLOR.value)
        self.frame1.pack(fill=BOTH, expand=True)  # Ensure the frame is packed into the root window
        self.treeview = ttk.Treeview(self.frame1, height=20, show="tree", selectmode="extended")
        self.treeview.grid(row=1, column=0, columnspan=3, padx=10, pady=10, sticky="nsew")
        self.frame1.grid_rowconfigure(1, weight=1)
        self.frame1.grid_columnconfigure(0, weight=1)
        self.treeview.insert('', '1', 'i1', text='Papers')
        self.treeview.insert('', '2', 'i2', text='Summaries')
        self.treeview.insert('', '3', 'i3', text='Notes')
        
        self.treeview.bind("<<TreeviewSelect>>", self.on_treeview_select)
        logger.info("Library Treeview Setup Complete")
        
        
    def on_treeview_select(self, event):
        selected_item = self.treeview.selection()  # Get selected item from Treeview
        if selected_item:
            item_text = self.treeview.item(selected_item[0], "text")  # Get the text (file path)

            # Ensure that a file (not folder) is selected
            if item_text and not self.treeview.get_children(selected_item[0]):  # Checks if it has no children, meaning it's a file
                folder_name = self.treeview.item(self.treeview.parent(selected_item[0]), "text")  # Get the parent folder name
                if folder_name in self.library:
                    filepath = item_text
                    # Now call open_file with the selected file, frame2, and theme
                    self.library = open_file(self.library,
                                             self.project_path,
                                             filepath,
                                             self.frame2,
                                             self.chat_ui,
                                             self.theme)


    def remove_from_library(self, item_name):
        logger.info(f"Removing {item_name} from Library")
        """Remove the item from the library (either file or folder)."""
        for folder in self.library.keys():
            if folder == item_name:
                del self.library[folder]
                break
            elif item_name in self.library[folder]:
                self.library[folder].remove(item_name)
                break

    def load_library_into_treeview(self):
        logger.info("Loading Library into Treeview")
        """Load the library dictionary into the Treeview."""
        self.treeview.delete(*self.treeview.get_children())  # Clear the treeview before loading new items

        for folder, files in self.library.items():
            folder_id = self.treeview.insert('', 'end', text=folder)
            for file in files:
                self.treeview.insert(folder_id, 'end', text=file)
    
    def delete_selected_item(self):
        logger.info("Deleting Selected Item")
        selected_items = self.treeview.selection()
        for item in selected_items:
            if item == "i1" or item == "i2" or item == "i3":
                continue
            item_text = self.treeview.item(item, "text")
            self.treeview.delete(item)
            self.remove_from_library(item_text)

    def get_selected_item(self):
        logger.info("Getting Selected Item")
        selected_items = self.treeview.selection()
        selected_files = []
        for item in selected_items:
            item_text = self.treeview.item(item, "text")
            selected_files.append(item_text)
            logger.info(f"Selected Item: {item_text}")
        return selected_files

    def create_folder(self):
        logger.info("Creating New Folder")
        folder_name = simpledialog.askstring("Input", "Enter new folder name:")

        if folder_name in self.library:
            simpledialog.askstring("Error", "Folder already exists!")

        elif folder_name:
            # Insert the new folder at the root level of the Treeview
            self.treeview.insert('', 'end', text=folder_name)
            self.library[folder_name] = []  # Add folder as a key in the dictionary
        logger.info(f"New folder created: {folder_name}")
            
    def create_file(self):
        logger.info("Creating New File")
        file_name = simpledialog.askstring("Input", "Enter new file name:")
        if file_name:
            selected_items = self.treeview.selection()
            if selected_items:
                for selected_item in selected_items:
                    folder_name = self.treeview.item(selected_item, "text")
                    if folder_name in self.library:
                        self.library[folder_name].append(file_name)
                        self.treeview.insert(selected_item, 'end', text=file_name)
            elif file_name.endswith(".pdf") or file_name.endswith(".PDF") or file_name.endswith(".docx") or file_name.endswith(".DOCX"):
                # Insert the new file at the root level (into Papers, Summaries, or Notes if nothing is selected)
                self.library["Papers"].append(file_name)
                self.treeview.insert('', 'end', text=file_name)
            elif file_name.endswith(".txt"):
                self.library["Notes"].append(file_name)
                self.treeview.insert('', 'end', text=file_name)
            elif file_name.endswith(".md"):
                self.library["Summaries"].append(file_name)
                self.treeview.insert('', 'end', text=file_name)
            else:
                simpledialog.askstring("Error", "Currently only supports .pdf, .docx, .txt, and .md files")                
                logger.info("invalid file type")
        logger.info(f"New file created: {file_name}")    
                
if __name__ == "__main__":
    root = customtkinter.CTk()
    app = LibraryApp(root)
    root.mainloop()