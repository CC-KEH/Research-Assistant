from math import sin
import os
import json

import markdown
from tkinter import *
import customtkinter
from PyPDF2 import PdfMerger
from requests import session
from tkhtmlview import HTMLLabel

import chat
from src.utils import logger
from src.constants import *
from src.config.themes import *
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

def save_summary(file_name, summary):
    os.makedirs(SUMMARIES_DIR, exist_ok=True)
    file_path = os.path.join(SUMMARIES_DIR, f"{file_name}_summary.md")
    with open(file_path, "w") as f:
        f.write(summary)

def open_file(library, filepath,frame2,theme):
    if filepath.endswith(".pdf"):
        library = open_pdf(library,filepath,frame2,theme)
    elif filepath.endswith(".md"):
        open_markdown(filepath,frame2,theme)
    elif filepath.endswith(".txt"):
        open_text_editor(filepath,frame2,theme)
    else:
        logger.error("Unsupported file format")
    return library

def setup_single_chat(pdf_path):
    brain = ChatModel(session_id='single',is_single=True)
    vs = VectorStorePipeline()
    text = vs.get_pdf_text(pdf_path,single=True)
    chunks = vs.get_text_chunks(text)
    vs.get_vector_store(chunks)
    brain.initiate_chat_model()

def setup_all_chat(pdfs_path):
    brain = ChatModel()
    vs = VectorStorePipeline()
    pdfs = vs.get_pdfs(pdfs_path)
    text = vs.get_pdf_text(pdfs)
    chunks = vs.get_text_chunks(text)
    vs.get_vector_store(chunks)
    brain.initiate_chat_model()

def load_models(filepath):
    file_name = filepath.split('/')[-1].split('.')[0]
    vs = VectorStorePipeline()
    
    # Keep the chat model running in the background
    
    
    chat_model = ChatModel(model='gemini-pro', session_id=file_name, single=True)
    pdfs = vs.get_pdfs(filepath)
    text = vs.get_pdf_text(pdfs)
    chunks = vs.get_text_chunks(text)
    vs.get_vector_store(chunks)
    chat_model.chat()
        
    # Load Summarizer Model
    summarizer = Summarizer_Model(model='gemini-pro',chain_type='stuff')
    summary = summarizer.summarize_single_chain(file_path=filepath,content=text)
    return summary

def open_pdf(library,filepath, frame2, theme):
    logger.info("Open File Operation Initiated")
    logger.info(f"Opening file: {filepath}")
    # load_chat_model()
    
    # load_models(filepath)
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

    summary_name = filepath.split('/')[-1].split('.')[0]
    save_summary(file_name=summary_name, summary=summary)
    library['Summaries'].append(f"summaries/{summary_name}_summary.md")
        
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
    return library


def open_markdown(filepath,frame2,theme):
    with open(filepath, "r") as f:
        content = f.read()
        
    html_text = markdown.markdown(content)
    
    for widget in frame2.winfo_children():
        widget.destroy()
        
    # Create a CTkTabview widget
    notebook = customtkinter.CTkTabview(frame2,segmented_button_selected_color=theme['colors'].HEADING_COLOR.value,segmented_button_unselected_color=theme['colors'].BG_COLOR.value,segmented_button_fg_color=theme['colors'].BG_COLOR.value,fg_color=theme['colors'].BG_COLOR.value)
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
        
    # Create a CTkTabview widget
    notebook = customtkinter.CTkTabview(frame2,segmented_button_selected_color=theme['colors'].HEADING_COLOR.value,segmented_button_unselected_color=theme['colors'].BG_COLOR.value,segmented_button_fg_color=theme['colors'].BG_COLOR.value,fg_color=theme['colors'].BG_COLOR.value)
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
    
#* Model functions
#* For specific paper
# def get_specific_summary(filepath, chain_type='stuff'):
#     summarizer = Summarizer_Model()
#     summary = summarizer.initiate_summarization(file_path=filepath)
#     return summary

# def get_specific_chat_model(filepath=None,pdfs_path=None):
#     chat_model = ChatModel(single=True)
#     vs = VectorStorePipeline()
#     pdfs = vs.get_pdfs(pdfs_path)
#     text = vs.get_pdf_text(pdfs)
#     chunks = vs.get_text_chunks(text)
#     vs.get_vector_store(chunks)
#     chat_model.initiate_chat_model()    

# #* For all papers
# def get_all_summary(filepath, chain_type='stuff'):
#     summarizer = Summarizer_Model(single=False)
#     summary = summarizer.initiate_summarization()
#     return summary

# def get_all_chat_model(filepath=None,pdfs_path=None):
#     chat_model = ChatModel(single=False)
#     vs = VectorStorePipeline()
#     pdfs = vs.get_pdfs(pdfs_path)
#     text = vs.get_pdf_text(pdfs)
#     chunks = vs.get_text_chunks(text)
#     vs.get_vector_store(chunks)
#     chat_model.initiate_chat_model()