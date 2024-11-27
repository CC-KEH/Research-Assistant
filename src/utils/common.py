import os
import json
import shutil
from tkinter import Scrollbar, ttk, simpledialog, filedialog, Text
import markdown
import customtkinter
from PyPDF2 import PdfMerger
from tenacity import retry
from tkhtmlview import HTMLLabel
from src.exceptions import CustomAppException
from src.utils import logger
from src.constants import *
from src.config.themes import *
from src.components.pdf_viewer import ShowPdf
from src.rag.components.summarizer_model import Summarizer_Model

def load_config(config):
    theme_config = {}
    model_config = {}
    theme_config["font_size"] = int(config["font_size"])
    theme_config["heading_size"] = int(config["heading_size"])
    theme_config["font_family"] = config["font_family"]
    theme_config["theme"] = config["theme"]
    if config["theme"] == "Dark":
        theme_config["colors"] = DarkTheme
    elif config["theme"] == "Light":
        theme_config["colors"] = LightTheme
    else:
        theme_config["colors"] = TokyoCityDarkerTheme
    model_config["model_name"] = config["model_name"]
    model_config["model_api"] = config["model_api"]
    model_config["embedding_model_api"] = config["embedding_model_api"]
    model_config["model_temperature"] = config["model_temperature"]
    model_config["prompt_templates"] = config["prompt_templates"]
    model_config["summary_templates"] = config["summary_templates"]
    return theme_config, model_config
    

def get_project_config(project_path):
    try:
        config = json.load(open(os.path.join(project_path, CONFIG_FILE), "r"))
        return config
    except CustomAppException as e:
        logger.error(f"Error loading project config: {e}")
        

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
    def open_pdf(library, treeview, project_path, filepath, frame2, theme, is_api_key_valid):
        logger.info(f"Opening file: {filepath}")
        status, summary = SummaryManager.get_summary(
            library, project_path, filepath, theme
        )
        if not status and is_api_key_valid:
            logger.info("Summary does not exist for this Document.")
            GUIManager.create_summary_popup(
                library, treeview, project_path, filepath, theme
            )
            
        elif not is_api_key_valid:
            summary = SummaryManager._generate_placeholder_summary()
            
        GUIManager.display_pdf_summary(filepath, summary, frame2, theme)
        return library


class SummaryManager:
    @staticmethod
    def get_summary(library, project_path, filepath, theme, chain_type="stuff"):
        summary_name = os.path.basename(filepath).split(".")[0]
        summary_exists = any(summary_name in file for file in library["Summaries"])
        placeholder_summary = SummaryManager._generate_placeholder_summary()
        if summary_exists:
            return (
                True,
                open(
                    os.path.join(project_path, SUMMARIES_DIR, library["Summaries"][0]),
                    "r",
                ).read(),
            )
        return False, placeholder_summary

    @staticmethod
    def create_summary(
        library,treeview,project_path,filepath,theme,
        summary_template,chain_type="stuff",is_single=True,
    ):
        summary_name = os.path.basename(filepath).split(".")[0]
        summary = SummaryManager._generate_summary(project_path,filepath,summary_template,chain_type,is_single=is_single)
        
        SummaryManager._save_summary(summary_name, project_path, summary)
        library["Summaries"].append(f"{summary_name}_summary.md")
        Treeview_utils.load_library_into_treeview(library, treeview)
        return library

    @staticmethod
    def _save_summary(file_name, project_path, summary):
        os.makedirs(os.path.join(project_path, SUMMARIES_DIR), exist_ok=True)
        file_path = os.path.join(
            project_path, f"{SUMMARIES_DIR}/{file_name}_summary.md"
        )
        with open(file_path, "w") as f:
            f.write(summary)

    @staticmethod
    def _generate_placeholder_summary():
        return f"""
# Summary Not Found

Please check your API key and try again.
"""

    @staticmethod
    def _generate_summary(project_path, filepath, summary_template, chain_type, is_single):
        with open(os.path.join(project_path, "project_config.json"), "r") as f:
            store = json.load(f)
            llm_api_key = store["config"]["model_api"]
            embedding_api_key = store["config"]["embedding_model_api"]
            model_name = store["config"]["model_name"]
            temperature = store["config"]["model_temperature"]
        
        if llm_api_key == "" or embedding_api_key == "":
            summary = SummaryManager._generate_placeholder_summary()  
            return summary
        
        summarizer = Summarizer_Model(model=model_name, llm_api_key=llm_api_key, embedding_api_key=embedding_api_key,
                                      temperature=temperature, template=summary_template, chain_type=chain_type)
        # Summarize single file
        if is_single:
            summary = summarizer.summarize_single_chain(file_path=filepath)
        else:
            summary = summarizer.summarize_all_chain(file_path=filepath)
        return summary['output_text']
            
        # Summarize multiple files
        # summary = summarizer.summarize_all_chain(pdfs)
        
    
class FileManager:
    @staticmethod
    def open_file(library, treeview, project_path, filepath, frame2, theme, is_api_key_valid):
        if filepath.endswith(".pdf"):
            return PDFManager.open_pdf(
                library, treeview, project_path, filepath, frame2, theme, is_api_key_valid
            )
        elif filepath.endswith(".md"):
            GUIManager.open_markdown(filepath, frame2, theme)
        elif filepath.endswith(".txt"):
            GUIManager.open_text_editor(filepath, frame2, theme)
        else:
            logger.error("Unsupported file format")
        return library


class GUIManager:
    @staticmethod
    def create_summary_popup(library, treeview, project_path, filepath, theme):
        popup = customtkinter.CTkToplevel()
        popup.title("Generate Summary")
        popup.geometry("500x400")

        instructions = customtkinter.CTkLabel(
            popup, text="No summary found for this PDF. Do you want to generate one?"
        )
        instructions.pack(pady=10)

        # Display previous summary templates, select one and generate the summary using the selected template
        config = json.load(open(os.path.join(project_path, CONFIG_FILE), "r"))["config"]
        summary_templates = config["summary_templates"].keys()
        summary_templates = list(summary_templates)

        summary_template_label = customtkinter.CTkLabel(
            popup, text="Select a summary template:"
        )
        summary_template_label.pack(pady=10)

        summary_template = customtkinter.CTkComboBox(popup, values=summary_templates)
        summary_template.pack(pady=10)

        def generate_and_close():
            selected_template = summary_template.get()
            logger.info(f"Selected Template: {selected_template}")
            if selected_template:  # Ensure a template is selected
                SummaryManager.create_summary(
                    library,
                    treeview,
                    project_path,
                    filepath,
                    theme,
                    config["summary_templates"][selected_template],
                )
            popup.destroy()  # Close the popup

        generate_button = customtkinter.CTkButton(
            popup, text="Generate Summary", command=generate_and_close
        )
        generate_button.pack(pady=10)

        cancel_button = customtkinter.CTkButton(
            popup, text="Cancel", command=popup.destroy
        )
        cancel_button.pack(pady=10)

    @staticmethod
    def display_pdf_summary(filepath, summary, frame2, theme):
        html_text = Parser.markdown_to_html(summary, theme)
        cover = (
            f'<b style="color:{theme["colors"].TEXT_COLOR.value}; user-select: text;">'
        )
        html_text = cover + html_text + "</b>"
        
        for widget in frame2.winfo_children():
            widget.destroy()

        notebook = customtkinter.CTkTabview(
            frame2,
            segmented_button_selected_color=theme["colors"].HEADING_COLOR.value,
            segmented_button_unselected_color=theme["colors"].BG_COLOR.value,
            segmented_button_fg_color=theme["colors"].BG_COLOR.value,
            fg_color=theme["colors"].BG_COLOR.value,
        )
        
        notebook.pack(fill="both", expand=1)
        notebook.add("PDF Viewer")
        notebook.add("Summary")

        viewer_tab = notebook.tab("PDF Viewer")
        v1 = ShowPdf()
        v2 = v1.pdf_view(
            viewer_tab, pdf_location=filepath, width=600, height=600, bar=False
        )
        v2.pack()

        summary_tab = notebook.tab("Summary")
        summary_label = HTMLLabel(
            summary_tab,
            html=html_text,
            background=theme["colors"].BG_COLOR.value,
            foreground="white",
        )
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

        # Create a tabbed view
        notebook = customtkinter.CTkTabview(
            frame2,
            segmented_button_selected_color=theme["colors"].HEADING_COLOR.value,
            segmented_button_unselected_color=theme["colors"].BG_COLOR.value,
            segmented_button_fg_color=theme["colors"].BG_COLOR.value,
            fg_color=theme["colors"].BG_COLOR.value,
        )
        notebook.pack(fill="both", expand=1)
        notebook.add("Preview")
        notebook.add("Edit")

        # Preview Tab
        preview_tab = notebook.tab("Preview")
        preview_label = HTMLLabel(
            preview_tab,
            html=html_text,
            background=theme["colors"].BG_COLOR.value,
            foreground="white",
        )
        preview_label.pack(fill="both", expand=True)
        preview_label.fit_height()

        # Edit Tab
        edit_tab = notebook.tab("Edit")
        text_editor = Text(
            edit_tab,
            wrap="word",
            bg=theme["colors"].BG_COLOR.value,
            fg="white",
            insertbackground="white",
        )
        text_editor.pack(fill="both", expand=True)
        text_editor.insert("1.0", content)  # Insert file content into text editor

        # Save File Functionality
        def save_file(event=None):
            with open(filepath, "w") as f:
                f.write(
                    text_editor.get("1.0", "end-1c")
                )  # Save the content of the text widget
            logger.info("File saved:", filepath)  # Optional feedback for debugging

        text_editor.bind("<Control-s>", save_file)
        cover = (
            f'<b style="color:{theme["colors"].TEXT_COLOR.value}; user-select: text;">'
        )

        # Refresh Preview Tab
        def refresh_preview():
            if view_type == "Markdown":
                with open(filepath, "r") as f:
                    updated_content = f.read()
                    updated_content = Parser.markdown_to_html(updated_content, theme)
                    updated_content = cover + updated_content + "</b>"
                    # updated_content = updated_content.replace("\n", "<br>")

                updated_html = markdown.markdown(updated_content)
                preview_label.set_html(updated_html)
                preview_label.fit_height()

            elif view_type == "Text Editor":
                with open(filepath, "r") as f:
                    updated_content = f.read()
                    updated_content = cover + updated_content + "</b>"
                    updated_content = updated_content.replace("\n", "<br>")

                preview_label.set_html(updated_content)

        # Listen for tab changes
        def monitor_tab_change():
            current_tab = notebook.get()
            if current_tab == "Preview":
                refresh_preview()
            frame2.after(100, monitor_tab_change)

        monitor_tab_change()


class Treeview_utils:
    @staticmethod
    def sync_library(library, project_path):
        # Sync the library with the file system
        notes: list[str] = os.listdir(os.path.join(project_path, NOTES_DIR))
        summaries = os.listdir(os.path.join(project_path, SUMMARIES_DIR))

        # add notes from library to the file system
        for note in library["Notes"]:
            if note not in notes:
                # Create a new file in the file system
                with open(os.path.join(project_path, NOTES_DIR, note), "w") as f:
                    f.write("")
                logger.info(f"Added {note} to the file system")

        for summary in library["Summaries"]:
            if summary not in summaries:
                shutil.copy(summary, os.path.join(project_path, SUMMARIES_DIR))

        for directory_name in library.keys():
            if directory_name not in ["Papers", "Notes", "Summaries"]:
                for file in library[directory_name]:
                    os.makedirs(
                        os.path.join(project_path, DIRECTORIES_PATH, directory_name),
                        exist_ok=True,
                    )

                    if file not in os.listdir(
                        os.path.join(project_path, DIRECTORIES_PATH, directory_name)
                    ):
                        open(
                            os.path.join(
                                project_path,
                                DIRECTORIES_PATH,
                                directory_name,
                                os.path.basename(file),
                            ),
                            "w",
                        ).close()
                        logger.info(f"Added {file} to the file system")
                    else:
                        logger.info(f"{file} already exists in the file system")
                        # check if the file has been modified
                        # if modified, update the file in the file system
                        # if not, do nothing

    @staticmethod
    def load_filesystem_to_library(library, project_path):
        directories: list[str] = os.listdir(
            os.path.join(project_path, DIRECTORIES_PATH)
        )

        for directory in directories:
            directory_name = os.path.basename(directory)
            if directory_name not in library:
                library[directory_name] = []
            files = os.listdir(os.path.join(project_path, DIRECTORIES_PATH, directory))
            for file in files:
                if file not in library[directory_name]:
                    library[directory_name].append(file)
                    logger.info(f"Added {file} to the library")

        return library

    @staticmethod
    def load_library_into_treeview(library, treeview):
        logger.info("Loading Library into Treeview")
        """Load the library dictionary into the Treeview."""
        treeview.delete(
            *treeview.get_children()
        )  # Clear the treeview before loading new items

        for folder, files in library.items():
            folder_id = treeview.insert("", "end", text=folder)
            for file in files:
                treeview.insert(folder_id, "end", text=file)


class Parser:

    @staticmethod
    def markdown_to_html(markdown_text, theme):
        html_content = markdown.markdown(markdown_text)

        # Define the mappings for markdown headings with custom styles
        markdown_to_html = {
            "#": f'<h1 style="color:{theme["colors"].HEADING_COLOR.value}">',
            "##": f'<h2 style="color:{theme["colors"].HEADING_COLOR.value}">',
            "###": f'<h3 style="color:{theme["colors"].HEADING_COLOR.value}">',
            "####": f'<h4 style="color:{theme["colors"].HEADING_COLOR.value}">',
            "#####": f'<h5 style="color:{theme["colors"].HEADING_COLOR.value}">',
            "######": f'<h6 style="color:{theme["colors"].HEADING_COLOR.value}">',
            "**": f'<b style="color:{theme["colors"].TEXT_COLOR.value}">',
            "*": f'<i style="color:{theme["colors"].TEXT_COLOR.value}">',
            "`": f'<code style="color:{theme["colors"].TEXT_COLOR.value}">',
            "```": f'<code style="color:{theme["colors"].TEXT_COLOR.value}">',
        }

        for markdown_tag, html_tag in markdown_to_html.items():
            opening_tag = html_tag
            closing_tag = html_tag.replace("<", "</")  # Create the closing tag
            html_content = html_content.replace(f"<{markdown_tag}>", opening_tag)
            html_content = html_content.replace(f"</{markdown_tag}>", closing_tag)

        return html_content


class ChatHistoryUtils:
    @staticmethod
    def get_session_id(project_path):
        chat_history_path = os.path.join(project_path, CHAT_HISTORY_DIR)
        
        # Ensure the directory exists
        if not os.path.exists(chat_history_path):
            os.makedirs(chat_history_path)
        
        # Get list of previous sessions
        prev_chat_sessions = os.listdir(chat_history_path)
        session_id = len(prev_chat_sessions)
        return f"session_{session_id}"