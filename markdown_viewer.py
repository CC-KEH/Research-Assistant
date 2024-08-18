import customtkinter as ctk
import markdown
from tkhtmlview import HTMLLabel

# Sample markdown text
markdown_text = """
# Hello, CustomTkinter!

This is a **bold** text and this is *italic* text.

- List item 1
- List item 2

[OpenAI](https://openai.com)
"""

# Convert markdown to HTML
html_text = markdown.markdown(markdown_text)
print(html_text)
# Create a CustomTkinter window
class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        # window title and size
        self.title("Markdown Viewer in CustomTkinter")
        self.geometry("600x400")

        # background color
        custom_bg_color = "#2E2E2E"  
        text_bg_color = "#F5F5F5"
        
        # Configure the main window background color
        self.configure(bg=custom_bg_color)

        # Frame to hold the HTML widget with a custom background color
        self.frame = ctk.CTkFrame(self, width=580, height=380, fg_color=custom_bg_color)
        self.frame.pack(padx=10, pady=10, fill="both", expand=True)

        # HTMLLabel widget inside the frame
        self.html_view = HTMLLabel(self.frame, html=html_text, background=custom_bg_color)
        self.html_view.pack(fill="both", expand=True)

        # Allow text resizing and link handling
        self.html_view.fit_height()

if __name__ == "__main__":
    app = App()
    app.mainloop()
