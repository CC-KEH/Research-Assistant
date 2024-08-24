import os
import json
from typing import Type

import markdown
from tkinter import *
import customtkinter
from PyPDF2 import PdfMerger
from tkhtmlview import HTMLLabel
from tkinter import filedialog

from src.utils import logger
from src.constants import *
from src.config.themes import *
from src.components.pdf_viewer import ShowPdf

from src.rag.components.chat_model import ChatModel
from src.rag.components.summarizer_model import Summarizer_Model
from src.rag.components.process_files import VectorStorePipeline


def merge_pdfs(files):
    if not files or len(files) < 2:
        return
    logger.info(f"Merging {len(files)} files")
    
    merger = PdfMerger()
    for pdf in files:
        merger.append(pdf)

    merger.write("combined.pdf")
    merger.close()

def load_config():
    theme_config = {}
    model_config = {}
    
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
    else:
        config = {
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
        
    theme_config['font_size'] = int(config["font_size"])
    theme_config['heading_size'] = int(config["heading_size"])
    theme_config['font_family'] = config["font_family"]
    theme_config['theme'] = config["theme"]
    
    if config["theme"] == "Dark":
        theme_config["colors"] = DarkTheme 
        
    elif config["theme"] == "Light":
        theme_config["colors"] = LightTheme
    
    else:
        theme_config["colors"] = TokyoCityDarkerTheme
    
    model_config['model_name'] = config["model_name"]
    model_config['model_api'] = config["model_api"]
    model_config['model_secretid'] = config["model_secretid"]
    model_config['response_template'] = config["response_template"]
    model_config['prompt_template'] = config["prompt_template"]
    
    return theme_config, model_config


def load_settings():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    else:
        return {
            "font_size": "12",
            "font_family": "Arial",
            "theme": "Light",
            "model": "Model A",
            "model_api": "",
            "model_secretid": "",
            "response_template": "Default response template...",
            "prompt_template": "Default prompt...",
        }


# TODO: Fix these functions

def update_file_list(frame1, frame2, library, selected_files, theme, add_file_button, delete_file_button, merge_files_button, summarize_all_files_button):
    for widget in frame1.winfo_children():
        if isinstance(widget, customtkinter.CTkButton) and widget not in [add_file_button, delete_file_button, merge_files_button, summarize_all_files_button]:
            widget.destroy()
    for file in library:
        file_button = customtkinter.CTkButton(frame1, text=file.split('/')[-1], corner_radius=5, fg_color=theme['colors'].BG_COLOR.value, text_color='white',border_color=theme['colors'].FRAME_COLOR.value, border_width=1, width=200, height=25)
        file_button.pack(fill='x', padx=10)
        file_button.bind('<Button-1>', lambda event, f=file: on_file_click(event, f, library, selected_files, frame1, frame2, theme))


def on_file_click(event, filepath, library, selected_files, frame1, frame2, theme):
    if event.state & 0x0001:  # Check if Shift key is pressed
        # Handle shift-click selection
        if selected_files:
            start_index = library.index(selected_files[-1])
            end_index = library.index(filepath)
            if start_index > end_index:
                start_index, end_index = end_index, start_index
            selected_files = library[start_index:end_index + 1]
        else:
            selected_files.append(filepath)
    else:
        selected_files = [filepath]
        open_file(filepath,frame2,theme)  # Open the file in frame2 when a single file is clicked
    update_selection_ui(frame1, selected_files, theme)
    return selected_files
    
def update_selection_ui(frame1, selected_files, theme):
    logger.info("Updating selection UI")
    for widget in frame1.winfo_children():
        if isinstance(widget, customtkinter.CTkButton):
            if widget.cget("text") in [file.split('/')[-1] for file in selected_files]:
                widget.configure(border_color=theme['colors'].BUTTON_COLOR.value)  # Highlight selected files
            else:
                widget.configure(border_color=theme['colors'].FRAME_COLOR.value)  # Reset border color for non-selected files
    
# Library functions

def save_summary(file_name, summary):
    os.makedirs(SUMMARIES_DIR, exist_ok=True)
    file_path = os.path.join(SUMMARIES_DIR, f"{file_name}_summary.md")
    with open(file_path, "w") as f:
        f.write(summary)

def merge_summaries():
    summaries = [os.path.join(SUMMARIES_DIR, file) for file in os.listdir(SUMMARIES_DIR) if file.endswith(".md")]
    for file in summaries:
        with open(file, "r") as f:
            summary = f.read()
        with open("combined_summary.md", "a") as f:
            f.write(summary)
            f.write("\n\n")

def open_file(filepath, frame2, theme):
    logger.info("Open File Operation Initiated")
    logger.info(f"Opening file: {filepath}")
    # load_chat_model()
    # summarizer = load_summary_model()
    # summary = summarizer.summarize(filepath)
    
    summary = f"""<b style="color:{theme['colors'].TEXT_COLOR.value}">
    # Hello, CustomTkinter!

    This is a **bold** text and this is *italic* text.

    - List item 1
    - List item 2

    [OpenAI](https://openai.com)</b>
    """
    save_summary(file_name=filepath.split('/')[-1].split('.')[0], summary=summary)
    
    html_text = markdown.markdown(summary)
    for widget in frame2.winfo_children():
        widget.destroy()
    
    # Create a CTkTabview widget
    notebook = customtkinter.CTkTabview(frame2,segmented_button_selected_color=theme['colors'].HEADING_COLOR.value,segmented_button_unselected_color=theme['colors'].BG_COLOR.value,segmented_button_fg_color=theme['colors'].BG_COLOR.value,fg_color=theme['colors'].BG_COLOR.value)
    notebook.pack(fill=BOTH, expand=1)
    
    # Add tabs to the notebook
    notebook.add("PDF Viewer")
    notebook.add("Summary")
    
    # PDF Viewer in "PDF Viewer" tab
    viewer_tab = notebook.tab("PDF Viewer")
    v1 = ShowPdf()
    v2 = v1.pdf_view(viewer_tab, pdf_location=filepath, width=600, height=600, bar=False)
    v2.pack()
    
    # Summary in "Summary" tab
    summary_tab = notebook.tab("Summary")
    summary_label = HTMLLabel(summary_tab, html=html_text, background=theme['colors'].BG_COLOR.value,foreground='white')
    summary_label.pack(fill="both", expand=True)
    summary_label.fit_height()


#* Model functions
#* For specific paper
def get_specific_summary(filepath, chain_type='stuff'):
    summarizer = Summarizer_Model()
    summary = summarizer.initiate_summarization(file_path=filepath)
    return summary

def get_specific_chat_model(filepath=None,pdfs_path=None):
    chat_model = ChatModel(single=True)
    vs = VectorStorePipeline()
    pdfs = vs.get_pdfs(pdfs_path)
    text = vs.get_pdf_text(pdfs)
    chunks = vs.get_text_chunks(text)
    vs.get_vector_store(chunks)
    chat_model.initiate_chat_model()    

#* For all papers
def get_all_summary(filepath, chain_type='stuff'):
    summarizer = Summarizer_Model(single=False)
    summary = summarizer.initiate_summarization()
    return summary

def get_all_chat_model(filepath=None,pdfs_path=None):
    chat_model = ChatModel(single=False)
    vs = VectorStorePipeline()
    pdfs = vs.get_pdfs(pdfs_path)
    text = vs.get_pdf_text(pdfs)
    chunks = vs.get_text_chunks(text)
    vs.get_vector_store(chunks)
    chat_model.initiate_chat_model()