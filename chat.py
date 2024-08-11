from customtkinter import *
from PIL import Image

# from src.utils.constants import *

BG_COLOR = "#1e1e1e"
HEADING_COLOR = "#6C7BFE"
FRAME_COLOR = "#151515"
BUTTON_SELECTION_COLOR = "#69aa96"

class ChatUI:
    def __init__(self):
        self.window = CTk()
        self.width = 400
        self.height = 800
        
        # Initialize fonts after the root window is created
        self.FONT = CTkFont(family="Helvetica", size=16)
        self.FONT_BOLD = CTkFont(family="Helvetica", size=24, weight="bold")
        
        self._setup_main_window()

    def _setup_main_window(self):
        self.window.title("Chat UI")
        self.window.resizable(width=True, height=False)
        self.window.configure(width=self.width, height=self.height, fg_color=FRAME_COLOR)
        # Head label
        head_label = CTkLabel(
            self.window,
            text="Model Name",
            text_color=HEADING_COLOR,
            font=self.FONT_BOLD,
            pady=10,
        )
        head_label.place(relwidth=1)

        # Text widget with scrollbar
        text_frame = CTkFrame(self.window, bg_color=BG_COLOR)
        text_frame.place(relheight=0.825, relwidth=1, rely=0.08)

        self.text_widget = CTkTextbox(
            text_frame,
            width=self.width - 20,
            height=self.height // 10,
            bg_color=BG_COLOR,
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
            self.window,
            bg_color=BG_COLOR,
            # fg_color=HEADING_COLOR,
            font=self.FONT
        )
        self.msg_entry.place(relwidth=0.74, rely=0.925, relheight=0.06, relx=0.011)

        # Send button
        send_img = CTkImage(Image.open("send.png"), size=(20, 20))
        send_button = CTkButton(
            self.window,
            text="",
            image=send_img,
            fg_color=HEADING_COLOR,
            font=self.FONT_BOLD,
            width=20,
            command=self._on_send_button_click,
            hover_color=BUTTON_SELECTION_COLOR
        )
        send_button.place(relx=0.77, rely=0.925, relheight=0.06, relwidth=0.22)

    def _on_send_button_click(self):
        msg = self.msg_entry.get()
        if msg:
            self._insert_message(msg, "You")
            # Process the message and get the response
            response = self._process_message(msg)
            self._insert_message(response, "Model")

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

    def run(self):
        self.window.mainloop()

if __name__ == "__main__":
    chatui = ChatUI()
    chatui.run()
