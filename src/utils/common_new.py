import os
import json
import markdown
import customtkinter
from PyPDF2 import PdfMerger
from tkhtmlview import HTMLLabel
from src.utils import logger
from src.constants import *
from src.config.themes import *
from src.components.pdf_viewer import ShowPdf

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

class PDFManager:
    @staticmethod
    def merge_pdfs(files):
        if not files or len(files) < 2:
            return
        logger.info(f"Merging {len(files)} files")
        merger = PdfMerger()
        for pdf in files:
            merger.append(pdf)
        merger.write("combined.pdf")
        merger.close()

    @staticmethod
    def open_pdf(library, project_path, filepath, frame2, chat_ui, theme):
        logger.info("Open File Operation Initiated")
        logger.info(f"Opening file: {filepath}")

        status, summary = SummaryManager.get_summary(library, project_path, filepath, theme)
        if not status:
            print("Summary does not exist for this Document.")
            GUIManager.create_summary_popup(library, project_path, filepath, theme)

        GUIManager.display_pdf_summary(filepath, summary, frame2, theme)
        return library


class SummaryManager:
    @staticmethod
    def get_summary(library, project_path, filepath, theme, chain_type='stuff'):
        summary_name = os.path.basename(filepath).split('.')[0]
        summary_exists = any(summary_name in file for file in library['Summaries'])
        placeholder_summary = SummaryManager._generate_placeholder_summary(summary_name, theme)
        if summary_exists:
            return True, open(library['Summaries'][0], "r").read()
        return False, placeholder_summary

    @staticmethod
    def create_summary(library, project_path, filepath, theme, summary_template, chain_type='stuff'):
        summary_name = os.path.basename(filepath).split('.')[0]
        summary = SummaryManager._generate_sample_summary()
        SummaryManager._save_summary(summary_name, summary)
        library['Summaries'].append(os.path.join(project_path, f"Summaries/{summary_name}_summary.md"))
        return library

    @staticmethod
    def _save_summary(file_name, summary):
        os.makedirs(SUMMARIES_DIR, exist_ok=True)
        file_path = os.path.join(SUMMARIES_DIR, f"{file_name}_summary.md")
        with open(file_path, "w") as f:
            f.write(summary)

    @staticmethod
    def _generate_placeholder_summary(summary_name, theme):
        return f"""
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

    @staticmethod
    def _generate_sample_summary():
        return """
<b style="color:{{theme['colors'].TEXT_COLOR.value}}">
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


class FileManager:
    @staticmethod
    def open_file(library, project_path, filepath, frame2, chat_ui, theme):
        if filepath.endswith(".pdf"):
            return PDFManager.open_pdf(library, project_path, filepath, frame2, chat_ui, theme)
        elif filepath.endswith(".md"):
            GUIManager.open_markdown(filepath, frame2, theme)
        elif filepath.endswith(".txt"):
            GUIManager.open_text_editor(filepath, frame2, theme)
        else:
            logger.error("Unsupported file format")
        return library


class GUIManager:
    @staticmethod
    def create_summary_popup(library, project_path, filepath, theme):
        popup = customtkinter.CTkToplevel()
        popup.title("Generate Summary")
        popup.geometry("700x500")
        instructions = customtkinter.CTkLabel(popup, text="No summary found for this PDF. Do you want to generate one?")
        instructions.pack(pady=10)
        # Display previous summary templates, select one and generate the summary using the selected template
        config = json.load(open(os.path.join(project_path, CONFIG_FILE), "r"))
        summary_templates = config["summary_templates"]
        summary_template_label = customtkinter.CTkLabel(popup, text="Select a summary template:")
        summary_template_label.pack(pady=10)
        summary_template = customtkinter.CTkComboBox(popup, values=summary_templates)
        summary_template.pack(pady=10)
        
        #TODO destroy the popup, when the user clicks on the generate button
        generate_button = customtkinter.CTkButton(popup, text="Generate Summary",
                                                  command=lambda: SummaryManager.create_summary(library, project_path, filepath, theme, summary_template.get()))
        generate_button.pack(pady=10)
        cancel_button = customtkinter.CTkButton(popup, text="Cancel", command=popup.destroy)
        cancel_button.pack(pady=10)

    @staticmethod
    def display_pdf_summary(filepath, summary, frame2, theme):
        html_text = markdown.markdown(summary)
        for widget in frame2.winfo_children():
            widget.destroy()

        notebook = customtkinter.CTkTabview(frame2, segmented_button_selected_color=theme['colors'].HEADING_COLOR.value,
                                            segmented_button_unselected_color=theme['colors'].BG_COLOR.value,
                                            segmented_button_fg_color=theme['colors'].BG_COLOR.value,
                                            fg_color=theme['colors'].BG_COLOR.value)
        notebook.pack(fill='both', expand=1)
        notebook.add("PDF Viewer")
        notebook.add("Summary")

        viewer_tab = notebook.tab("PDF Viewer")
        v1 = ShowPdf()
        v2 = v1.pdf_view(viewer_tab, pdf_location=filepath, width=600, height=600, bar=False)
        v2.pack()

        summary_tab = notebook.tab("Summary")
        summary_label = HTMLLabel(summary_tab, html=html_text, background=theme['colors'].BG_COLOR.value, foreground='white')
        summary_label.pack(fill="both", expand=True)
        summary_label.fit_height()

    @staticmethod
    def open_markdown(filepath, frame2, theme):
        with open(filepath, "r") as f:
            content = f.read()
        GUIManager._display_content(content, frame2, theme, filepath, "Markdown")

    @staticmethod
    def open_text_editor(filepath, frame2, theme):
        with open(filepath, "r") as f:
            content = f.read()
        GUIManager._display_content(content, frame2, theme, filepath, "Text Editor")

    @staticmethod
    def _display_content(content, frame2, theme, filepath, view_type):
        html_text = markdown.markdown(content) if view_type == "Markdown" else content
        for widget in frame2.winfo_children():
            widget.destroy()

        notebook = customtkinter.CTkTabview(frame2, segmented_button_selected_color=theme['colors'].HEADING_COLOR.value,
                                            segmented_button_unselected_color=theme['colors'].BG_COLOR.value,
                                            segmented_button_fg_color=theme['colors'].BG_COLOR.value,
                                            fg_color=theme['colors'].BG_COLOR.value)
        notebook.pack(fill='both', expand=1)
        notebook.add("Preview")
        notebook.add("Edit")

        preview_tab = notebook.tab("Preview")
        preview_label = HTMLLabel(preview_tab, html=html_text, background=theme['colors'].BG_COLOR.value, foreground='white')
        preview_label.pack(fill="both", expand=True)
        preview_label.fit_height()
