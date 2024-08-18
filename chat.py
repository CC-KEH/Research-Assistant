from customtkinter import *
from PIL import Image

BG_COLOR = "#1e1e1e"
HEADING_COLOR = "#6C7BFE"
FRAME_COLOR = "#151515"
BUTTON_SELECTION_COLOR = "#69aa96"
HEADING_SIZE = 24
class ChatUI:
    def __init__(self, parent, model_name ,model_state):
        self.parent = parent
        self.width = 400
        self.height = 800
        
        # Initialize fonts after the root window is created
        self.FONT = CTkFont("Helvetica", 16)
        self.FONT_BOLD = CTkFont("Helvetica", HEADING_SIZE)
        
        self.model_state = model_state
        
        self._setup_main_window()

    def _setup_main_window(self):
        self.parent.configure(width=self.width, height=self.height, fg_color=FRAME_COLOR)
        # Head label
        head_label = CTkLabel(
            self.parent,
            text=model_name,
            text_color=HEADING_COLOR,
            font=self.FONT_BOLD,
            pady=20,
        )
        head_label.place(relwidth=1)

        # Text widget with scrollbar
        text_frame = CTkFrame(self.parent, bg_color=BG_COLOR)
        text_frame.place(relheight=0.825, relwidth=1, rely=0.08)

        self.text_widget = CTkTextbox(
            text_frame,
            width=self.width - 20,
            height=self.height // 10,
            bg_color=FRAME_COLOR,
            fg_color=FRAME_COLOR,
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
            bg_color=BG_COLOR,
            font=self.FONT
        )
        self.msg_entry.place(relwidth=0.77, rely=0.940, relheight=0.05, relx=0.011)

        # Send button
        send_img = CTkImage(Image.open("send.png"), size=(20, 20))
        send_button = CTkButton(
            self.parent,
            text="",
            image=send_img,
            fg_color=HEADING_COLOR,
            font=self.FONT_BOLD,
            width=20,
            command=self._on_send_button_click,
            hover_color=BUTTON_SELECTION_COLOR
        )
        send_button.place(relx=0.80, rely=0.940, relheight=0.05, relwidth=0.185)

    def _on_send_button_click(self):
        msg = self.msg_entry.get()
        if msg:
            self._insert_message(msg, "You")
            # Process the message and get the response
            response = self._process_message(msg)
            self._insert_message(response, model_name)

    def _insert_message(self, msg, sender):
        self.text_widget.configure(state=NORMAL)
        self.text_widget.insert(END, f"{sender}: {msg}\n\n")
        self.text_widget.configure(state=DISABLED)
        self.text_widget.yview(END)
        self.msg_entry.delete(0, END)

    def _process_message(self, msg):
        # TODO: Implement the model request and response here
        # Send the message to model chain
        # Get the response from the model chain
        # Return the response
        
        processed_msg = msg.upper()
        return processed_msg