from logging import PlaceHolder
import os
import json

import markdown
from tkinter import *
import customtkinter
from PyPDF2 import PdfMerger
from numpy import place
from requests import session
from tkhtmlview import HTMLLabel

from src.utils import logger
from src.constants import *
from src.config.themes import *
from src.components.chat import ChatUI
from src.components.pdf_viewer import ShowPdf
# from src.rag.components.chat_model import ChatModel
# from src.rag.components.summarizer_model import Summarizer_Model
# from src.rag.components.process_files import VectorStorePipeline

def merge_pdfs(files):
    if not files or len(files) < 2:
        return
    logger.info(f"Merging {len(files)} files")
    
    merger = PdfMerger()
    for pdf in files:
        merger.append(pdf)

    merger.write("combined.pdf")
    merger.close()

def load_config(config):
    theme_config = {}
    model_config = {}
        
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
    model_config['prompt_templates'] = config["prompt_templates"]
    model_config['summary_templates'] = config["summary_templates"]
    
    return theme_config, model_config

def save_summary(file_name, summary):
    os.makedirs(SUMMARIES_DIR, exist_ok=True)
    file_path = os.path.join(SUMMARIES_DIR, f"{file_name}_summary.md")
    with open(file_path, "w") as f:
        f.write(summary)


def open_file(library, project_path, filepath, frame2, chat_ui, theme):
    if filepath.endswith(".pdf"):
        library = open_pdf(library,project_path,filepath,frame2,chat_ui,theme)
    elif filepath.endswith(".md"):
        open_markdown(filepath,frame2,theme)
    elif filepath.endswith(".txt"):
        open_text_editor(filepath,frame2,theme)
    else:
        logger.error("Unsupported file format")
    return library



def get_summary(library, project_path, filepath, theme, chain_type='stuff'):
    summary_name = filepath.split('/')[-1].split('.')[0]  # Example summary name generation
    summary_exists = any(summary_name in file for file in library['Summaries'])
    placeholder_summary = f"""
<b style="color:{theme['colors'].TEXT_COLOR.value}">
# Topic
Summary of {summary_name}

# Prerequisites
Pre-requisite knowledge of the topic.

# Introduction
Introduction to the topic.

# Summary
Summary of the topic.

# Conclusion
Conclusion of the topic.
</b>
"""
    if summary_exists:
        return True, open(library['Summaries'][0], "r").read()
    else:
        return False, placeholder_summary

def create_summary(library, project_path, filepath, theme, chain_type='stuff'):
    # model = Summarizer_Model(model='gemini-pro',chain_type=chain_type)
    # summary = model.summarize_single_chain(file_path=filepath)
    summary = f"""
<b style="color:{theme['colors'].TEXT_COLOR.value}">
# Topic
Tidy Data

# Prerequisites
Basic understanding of data structures and data analysis concepts.

# Introduction
The "Tidy Data" paper by Hadley Wickham introduces a structured approach to organizing data for analysis, emphasizing the importance of maintaining a clear and consistent format.

# Summary
In this paper, Wickham defines tidy data as a format where each variable is a column, each observation is a row, and each type of observational unit forms a table. This organization streamlines data manipulation and visualization, making it easier for data scientists to work with datasets. The paper outlines the benefits of tidy data, including improved reproducibility and efficiency, and provides practical guidelines for transforming messy data into tidy formats.

# Conclusion
Wickham advocates for a standardized approach to data organization in order to enhance the effectiveness of data analysis workflows, ultimately suggesting that adopting tidy data principles can lead to better insights and more robust analyses.
</b>
"""
    summary_name = filepath.split('/')[-1].split('.')[0]  # Example summary name generation
    save_summary(file_name=summary_name, summary=summary)
    library['Summaries'].append(project_path+f"/Summaries/{summary_name}_summary.md")
    return library


def open_pdf(library, project_path, filepath, frame2, chat_ui, theme):
    logger.info("Open File Operation Initiated")
    logger.info(f"Opening file: {filepath}")

    status, summary = get_summary(library,project_path,filepath,theme,'stuff')
    
    if status is False:
        print("Summary does not exist for this Document.")
        create_summary_popup(library, project_path, filepath, theme)
    
    html_text = markdown.markdown(summary)
    
    for widget in frame2.winfo_children():
        widget.destroy()
    
    # Create a customtkinterTabview widget
    notebook = customtkinter.customtkinterTabview(frame2,segmented_button_selected_color=theme['colors'].HEADING_COLOR.value,segmented_button_unselected_color=theme['colors'].BG_COLOR.value,segmented_button_fg_color=theme['colors'].BG_COLOR.value,fg_color=theme['colors'].BG_COLOR.value)
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
    return library


def open_markdown(filepath,frame2,theme):
    with open(filepath, "r") as f:
        content = f.read()
        
    html_text = markdown.markdown(content)
    
    for widget in frame2.winfo_children():
        widget.destroy()
        
    # Create a customtkinterTabview widget
    notebook = customtkinter.customtkinterTabview(frame2,segmented_button_selected_color=theme['colors'].HEADING_COLOR.value,segmented_button_unselected_color=theme['colors'].BG_COLOR.value,segmented_button_fg_color=theme['colors'].BG_COLOR.value,fg_color=theme['colors'].BG_COLOR.value)
    notebook.pack(fill=BOTH, expand=1)
    
    # Add tabs to the notebook
    notebook.add("Preview")
    notebook.add("Edit")
    
    viewer_tab = notebook.tab("Preview")
    v1 = ShowPdf()
    v2 = v1.pdf_view(viewer_tab, pdf_location=filepath, width=600, height=600, bar=False)
    v2.pack()
    
    # Summary in "Summary" tab
    edit_tab = notebook.tab("Edit")
    edit_label = HTMLLabel(edit_tab, html=html_text, background=theme['colors'].BG_COLOR.value,foreground='white')
    edit_label.pack(fill="both", expand=True)
    edit_label.fit_height()

def open_text_editor(filepath,frame2,theme):
    with open(filepath, "r") as f:
        content = f.read()
        
    for widget in frame2.winfo_children():
        widget.destroy()
        
    # Create a customtkinterTabview widget
    notebook = customtkinter.customtkinterTabview(frame2,segmented_button_selected_color=theme['colors'].HEADING_COLOR.value,segmented_button_unselected_color=theme['colors'].BG_COLOR.value,segmented_button_fg_color=theme['colors'].BG_COLOR.value,fg_color=theme['colors'].BG_COLOR.value)
    notebook.pack(fill=BOTH, expand=1)
    
    # Add tabs to the notebook
    notebook.add("Preview")
    notebook.add("Edit")
    
    viewer_tab = notebook.tab("Preview")
    v1 = ShowPdf()
    v2 = v1.pdf_view(viewer_tab, pdf_location=filepath, width=600, height=600, bar=False)
    v2.pack()
    
    # Summary in "Summary" tab
    edit_tab = notebook.tab("Edit")
    edit_label = HTMLLabel(edit_tab, html=content, background=theme['colors'].BG_COLOR.value,foreground='white')
    edit_label.pack(fill="both", expand=True)
    edit_label.fit_height()


def create_summary_popup(library, project_path, filepath, theme):
    """Create a popup to ask user if they want to generate the summary."""
    popup = customtkinter.CTkToplevel()
    popup.title("Generate Summary")
    popup.geometry("400x200")
    
    instructions = customtkinter.CTkLabel(popup, text="No summary found for this PDF. Do you want to generate one?")
    instructions.pack(pady=10)
    
    # Show Prompt Template
    template = library['Model_Config']['prompt_template']
    
    generate_button = customtkinter.CTkButton(popup, text="Generate Summary", command=lambda: create_summary(library, project_path, filepath, theme, popup))
    generate_button.pack(pady=10)
    
    cancel_button = customtkinter.CTkButton(popup, text="Cancel", command=popup.destroy)
    cancel_button.pack(pady=10)