from venv import create
from customtkinter import *
from PIL import Image
import json
import os
from enum import Enum
from datetime import datetime
import threading

from src.constants import CHAT_HISTORY_DIR
from src.utils import logger

class DarkTheme(Enum):
    BG_COLOR = "#1e1e1e"
    FRAME_COLOR = "#151515"
    TEXT_COLOR = "#FFFFFF"
    HEADING_COLOR = "#6C7BFE"
    BUTTON_COLOR = "#6C7BFE"
    BUTTON_HOVER_COLOR = "#7F8DAD"


class ChatUI:
    def __init__(self, parent, project_path, model_name=None, chat_model=None, session_id=None, theme=None):
        self.parent = parent
        self.width = 400
        self.height = 800
        self.theme = theme
        
        self.FONT = CTkFont("Segoe UI", 12, weight="normal")
        self.HEADING_FONT = CTkFont("Helvetica", self.theme['heading_size'])

        self.model_name = model_name if model_name else "LLM"
        self.chat_model = chat_model
        
        self.session_id = session_id
        self.project_path = project_path
        
        self.history_file = f"{self.project_path} + {CHAT_HISTORY_DIR} + {self.session_id} + _chat_history.json"
        self.message_count = 0
        self._setup_main_window()
        self._load_chat_history()

    def chats_option(choice):
        print("option menu dropdown clicked:", choice)
    
    def create_new_session(self):
        self.reset_chat()
        self.chat_model.create_new_session()
        
    def reset_chat(self):
        self.text_widget.configure(state=NORMAL)
        self.text_widget.delete(1.0, END)
        self.text_widget.configure(state=DISABLED)
        self.message_count = 0
        
    def _setup_main_window(self):
        logger.info("Setting up chat window")
        self.parent.configure(width=self.width, height=self.height, fg_color=self.theme['colors'].FRAME_COLOR.value)
        # Head label
        head_label = CTkLabel(
            self.parent,
            text=str.upper(self.model_name),
            text_color=self.theme['colors'].HEADING_COLOR.value,
            font=self.HEADING_FONT,
            pady=20,
            padx=10
        )
        head_label.place(relwidth=1)
        
        create_new_session_button = CTkButton(
            self.parent,
            text="+",
            fg_color=self.theme['colors'].HEADING_COLOR.value,
            border_color=self.theme['colors'].HEADING_COLOR.value,
            font=self.FONT,
            width=20,
            command=self.create_new_session,
            hover_color=self.theme['colors'].BUTTON_COLOR.value,
        )
        
        # Text widget with scrollbar
        # , bg_color=self.theme['colors'].FRAME_COLOR.value
        text_frame = CTkFrame(self.parent)
        text_frame.place(relheight=0.825, relwidth=1, rely=0.05)

        self.text_widget = CTkTextbox(
            text_frame,
            width=self.width - 20,
            height=self.height // 10,
            bg_color=self.theme['colors'].FRAME_COLOR.value,
            fg_color=self.theme['colors'].FRAME_COLOR.value,
            font=self.FONT,
            padx=5,
            pady=5,
        )
        self.text_widget.grid(row=0, column=0, sticky="nsew")
        self.text_widget.configure(cursor="arrow", state=DISABLED)

        text_frame.grid_rowconfigure(0, weight=1)
        text_frame.grid_columnconfigure(0, weight=1)

        # Entry box
        self.msg_entry = CTkEntry(
            self.parent,
            bg_color=self.theme['colors'].BG_COLOR.value,
            font=self.FONT,
        )
        self.msg_entry.place(relwidth=0.77, rely=0.940, relheight=0.05, relx=0.011)

        # Send button
        send_button = CTkButton(
            self.parent,
            text=">",
            # image=send_img,
            fg_color=self.theme['colors'].HEADING_COLOR.value,
            font=self.HEADING_FONT,
            width=20,
            command=self._on_send_button_click,
            hover_color=self.theme['colors'].BUTTON_COLOR.value,
        )
        send_button.place(relx=0.80, rely=0.940, relheight=0.05, relwidth=0.1)
        create_new_session_button.place(relx=0.91, rely=0.940, relheight=0.05, relwidth=0.1)

    def _on_send_button_click(self):
        msg = self.msg_entry.get()
        if msg:
            self._insert_message(msg, "You")
            self.msg_entry.delete(0, END)  # Clear the entry box
            
            # Fetch response from ChatModel in a separate thread
            threading.Thread(target=self._get_model_response, args=(msg,), daemon=True).start()
    
    def _get_model_response(self, msg):
        if self.chat_model:
            response = self.chat_model.chat(msg)
            self._insert_message(response, self.model_name)
            
    def _insert_message(self, msg, sender):
        time = self._get_current_time()
        self.text_widget.configure(state=NORMAL)
        self.time_widget = CTkLabel(
            self.text_widget,
            text=f"{time}",
            font=self.FONT,
            fg_color=self.theme['colors'].HEADING_COLOR.value,
            bg_color=self.theme['colors'].FRAME_COLOR.value,
        )
        
        # TODO: Add the time widget to the text widget
        
        self.text_widget.insert(END, f"{str.upper(sender)} : {msg}\n\n")
        self.text_widget.configure(state=DISABLED)
        self.text_widget.yview(END)
        self.message_count += 1
        # Save to history after every 5 messages
        if self.message_count % 3 == 0:
            self.chat_model.save_messages_locally()


            
    def _load_chat_history(self):
        if os.path.exists(self.history_file):
            with open(self.history_file, "r") as file:
                chat_history = json.load(file)

            self.text_widget.configure(state=NORMAL)
            for entry in chat_history:
                self.text_widget.insert(END, f"{entry['sender']} [{entry['time']}]: {entry['message']}\n\n")
            self.text_widget.configure(state=DISABLED)
            self.text_widget.yview(END)
                
              
    def _get_current_time(self):
        return datetime.now().strftime("%A %I:%M %p")

if __name__ == "__main__":
    theme_config = {}
    theme_config['font_size'] = 12
    theme_config['heading_size'] = 24
    theme_config['font_family'] = "Arial"
    theme_config['theme'] = "Dark"
    theme_config['colors'] = DarkTheme
    root = CTk()
    chat_ui = ChatUI(root, theme=theme_config)
    root.mainloop()