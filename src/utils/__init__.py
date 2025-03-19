import logging
import os
import sys
import customtkinter

logging_str = ('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

log_dir = 'logs'
log_filepath = os.path.join(log_dir, 'running_logs.log')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format=logging_str,
    handlers=[
        logging.FileHandler(log_filepath),  # Stores logs in the Filepath
        logging.StreamHandler(sys.stdout)  # Prints logs in the Terminal
    ]
)

logger = logging.getLogger('src_logger')

def show_error(parent, message):
    """Displays an error message in a pop-up window."""
    error_window = customtkinter.CTkToplevel(parent)
    error_window.title("Error")
    error_window.geometry("300x150")
    customtkinter.CTkLabel(error_window, text=message, fg_color="#1e1e1e").pack(pady=20)
    customtkinter.CTkButton(error_window, text="OK", command=error_window.destroy).pack()