from customtkinter import *
from PIL import Image

BUTTON_SELECTION_COLOR = "#69aa96"

class ChatUI:
    def __init__(self, parent, model_name ,model_state, theme):
        self.parent = parent
        self.width = 400
        self.height = 800
        self.theme = theme
        
        # Initialize fonts after the root window is created
        self.FONT = CTkFont("Helvetica", 16)
        self.HEADING_FONT = CTkFont("Helvetica", self.theme['heading_size'])

        self.model_name = model_name
        self.model_state = model_state
        
        self._setup_main_window()

    def _setup_main_window(self):
        self.parent.configure(width=self.width, height=self.height, fg_color=self.theme['colors'].FRAME_COLOR.value)
        # Head label
        head_label = CTkLabel(
            self.parent,
            text=self.model_name,
            text_color=self.theme['colors'].HEADING_COLOR.value,
            font=self.HEADING_FONT,
            pady=20,
        )
        head_label.place(relwidth=1)

        # Text widget with scrollbar
        text_frame = CTkFrame(self.parent, bg_color=self.theme['colors'].BG_COLOR.value)
        text_frame.place(relheight=0.825, relwidth=1, rely=0.08)

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
            font=self.FONT
        )
        self.msg_entry.place(relwidth=0.77, rely=0.940, relheight=0.05, relx=0.011)

        # Send button
        send_img = CTkImage(Image.open("src/assets/send.png"), size=(20, 20))
        send_button = CTkButton(
            self.parent,
            text="",
            image=send_img,
            fg_color=self.theme['colors'].HEADING_COLOR.value,
            font=self.HEADING_FONT,
            width=20,
            command=self._on_send_button_click,
            hover_color=self.theme['colors'].BUTTON_COLOR.value,
        )
        send_button.place(relx=0.80, rely=0.940, relheight=0.05, relwidth=0.185)

    def _on_send_button_click(self):
        msg = self.msg_entry.get()
        if msg:
            self._insert_message(msg, "You")
            # Process the message and get the response
            response = self._process_message(msg)
            self._insert_message(response, self.model_name)

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