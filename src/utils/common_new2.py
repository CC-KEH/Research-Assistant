import os
import json
import shutil
from tkinter.ttk import Treeview
from tkinter import ttk, simpledialog, filedialog
import markdown
import customtkinter
from PyPDF2 import PdfMerger
from tkhtmlview import HTMLLabel
from src.utils import logger
from src.constants import *
from src.config.themes import *
from src.components.pdf_viewer import ShowPdf

class Treeview_utils:
    @staticmethod
    def sync_library(library, project_path):
        # Sync the library with the file system
        notes: list[str] = os.listdir(os.path.join(project_path, NOTES_DIR))
        summaries = os.listdir(os.path.join(project_path, SUMMARIES_DIR))
        
        # add notes from library to the file system
        for note in library['Notes']:
            if note not in notes:
                # Create a new file in the file system
                with open(os.path.join(project_path, NOTES_DIR, note), "w") as f:
                    f.write("")            
                logger.info(f"Added {note} to the file system")
                
        for summary in library['Summaries']:
            if summary not in summaries:
                shutil.copy(summary, os.path.join(project_path, SUMMARIES_DIR))

        for directory_name in library.keys():
            if directory_name not in ['Papers', 'Notes', 'Summaries']:
                for file in library[directory_name]:
                    os.makedirs(os.path.join(project_path, DIRECTORIES_PATH, directory_name), exist_ok=True)
                    
                    if file not in os.listdir(os.path.join(project_path, DIRECTORIES_PATH, directory_name)):
                        shutil.copy(file, os.path.join(project_path, DIRECTORIES_PATH, directory_name))
                        logger.info(f"Added {file} to the file system")
        
        
    @staticmethod            
    def load_filesystem_to_library(library, project_path):
        directories: list[str] = os.listdir(os.path.join(project_path,DIRECTORIES_PATH))
        
        for directory in directories:
            directory_name = os.path.basename(directory)
            if directory_name not in library:
                library[directory_name] = []
            files = os.listdir(os.path.join(project_path, DIRECTORIES_PATH, directory))
            for file in files:
                if file not in library[directory_name]:
                    library[directory_name].append(os.path.join(project_path, DIRECTORIES_PATH, directory, file))
                    logger.info(f"Added {file} to the library")

        return library
    
    
