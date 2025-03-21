from tkinter import *
from tkinter import filedialog,font
import customtkinter

FONT = "Helvetica"
FONT_SIZE = 16
TEXT_AREA_WIDTH = 100
TEXT_AREA_HEIGHT = 100
SELECT_COLOR = 'blue'
SELECT_FOREGROUND = 'white'

class TextEditor:
    def __init__(self, parent):
        self.root = parent
        self.root.title("Text Editor")
        self.root.geometry("800x800")
        self.create_layout()
        
    def create_layout(self):
        # Main Frame
        self.main_frame = Frame(self.root)
        self.main_frame.pack(pady=5)
        
        # Scrollbar
        self.scrollbar = Scrollbar(self.main_frame)
        self.scrollbar.pack(side=RIGHT,fill=Y)
        
        # Title Text
        self.title_text = Text(self.main_frame, width=TEXT_AREA_WIDTH,height=1,
                                 font=(FONT, FONT_SIZE),selectbackground=SELECT_COLOR,selectforeground=SELECT_FOREGROUND)
        self.title_text.insert(1.0, "Title")
        self.title_text.pack(pady=5)
        
        # Text Widget
        self.main_text = Text(self.main_frame, width=TEXT_AREA_WIDTH,height=TEXT_AREA_HEIGHT,
                              font=(FONT, FONT_SIZE),selectbackground=SELECT_COLOR,selectforeground=SELECT_FOREGROUND,
                              undo=True,yscrollcommand=self.scrollbar.set)
        self.main_text.pack()

        self.scrollbar.config(command=self.main_text.yview)
        
        
if __name__ == "__main__":
    root = customtkinter.CTk()
    TextEditor(root)
    root.mainloop()