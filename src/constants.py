from pathlib import Path
import os
import customtkinter
from PIL import Image

PROJECT_CONFIG = "project_config.json"
SUMMARIES_DIR = "Library/Summaries"
PAPERS_DIR = "Library/Papers"
NOTES_DIR = "Library/Notes"
DIRECTORIES_PATH = "Library/"
VECTOR_STORE_PATH = "/VectorStore/faiss_index"
CHAT_HISTORY_DIR = "ChatHistory"
CONFIG_FILE = Path("project_config.json")

settings_image_path = os.path.abspath("assets/icons/settings-white.png")
file_image_path = os.path.abspath("assets/icons/file-white.png")
upload_image_path = os.path.abspath("assets/icons/upload-white.png")
folder_image_path = os.path.abspath("assets/icons/folder-white.png")
delete_image_path = os.path.abspath("assets/icons/delete-white.png")

settings_icon = customtkinter.CTkImage(light_image=Image.open(settings_image_path), size=(15, 15))
file_icon = customtkinter.CTkImage(light_image=Image.open(file_image_path), size=(15, 15))
upload_icon = customtkinter.CTkImage(light_image=Image.open(upload_image_path), size=(15, 15))
folder_icon = customtkinter.CTkImage(light_image=Image.open(folder_image_path), size=(15, 15))
delete_icon = customtkinter.CTkImage(light_image=Image.open(delete_image_path), size=(15, 15))


CHAT_LLMS = {
    "Google": ["gemini-1.5-pro-latest", "gemini-1.5-turbo"],
    "OpenAI": ["gpt3", "gpt4"],
    "Anthropic": ["Claude", "Claude"],
    "Grok": ["grok-1.0", "grok-1.0"]
}
EMBEDDING_MODELS = {
    "Google": ["models/text-embedding-004"],
    "OpenAI": ["text-embedding-3-large"],
}