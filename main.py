from tkinter import *
from tkinter import filedialog
import customtkinter
from src.utils.common import *
from pdf_viewer import ShowPdf
from chat import ChatUI
import markdown
from tkhtmlview import HTMLLabel

# Themes and colors
customtkinter.set_appearance_mode('system')
customtkinter.set_default_color_theme("dark-blue")

bg_color = "#1e1e1e"
frame_color = "#151515"
button_selection_color = "#6C7BFE"
frame_border = 0
heading_size = 24
heading_color = "#6C7BFE"
text_color = "#FFFFFF"
# Layout
root = customtkinter.CTk()
root.title('Research Assistant')
root.geometry('1400x800')
root.resizable(width=True, height=True)

# Create a PanedWindow with vertical orientation
paned_window = PanedWindow(root, orient=HORIZONTAL, bg=bg_color)
paned_window.pack(fill=BOTH, expand=1)

# Create frames
frame1 = customtkinter.CTkFrame(master=paned_window, width=350, height=800, border_width=frame_border, corner_radius=0, fg_color=frame_color)
frame2 = customtkinter.CTkFrame(master=paned_window, width=700, height=800, border_width=frame_border, corner_radius=0, fg_color=bg_color)
frame3 = customtkinter.CTkFrame(master=paned_window, width=350, height=800, border_width=frame_border, corner_radius=0, fg_color=frame_color)

# Add frames to the PanedWindow with minsize to maintain proportions
paned_window.add(frame1, minsize=350)
paned_window.add(frame2, minsize=700)
paned_window.add(frame3, minsize=350)

# Add titles to the frames
label1 = Label(frame1, text="Library", bg=frame_color, fg=heading_color, font=("Helvetica", heading_size))
label1.pack(side=TOP, pady=20)

label3 = Label(frame3, text="Gemini Pro", bg=frame_color, fg=heading_color, font=("Helvetica", heading_size))
label3.pack(side=TOP, pady=20)

library = []
selected_files = []

# Create a frame for the buttons
button_frame = Frame(frame1, bg=frame_color)
button_frame.pack(pady=20)

def update_file_list():
    for widget in frame1.winfo_children():
        if isinstance(widget, customtkinter.CTkButton) and widget not in [add_file_button, delete_file_button, merge_files_button]:
            widget.destroy()
    for file in library:
        file_button = customtkinter.CTkButton(frame1, text=file.split('/')[-1], corner_radius=5, fg_color=bg_color, text_color='white',border_color=frame_color, border_width=1, width=200, height=25)
        file_button.pack(fill='x', padx=10)
        file_button.bind('<Button-1>', lambda event, f=file: on_file_click(event, f))
    
def on_file_click(event, filepath):
    global selected_files
    if event.state & 0x0001:  # Check if Shift key is pressed
        # Handle shift-click selection
        if selected_files:
            start_index = library.index(selected_files[-1])
            end_index = library.index(filepath)
            if start_index > end_index:
                start_index, end_index = end_index, start_index
            selected_files = library[start_index:end_index + 1]
        else:
            selected_files.append(filepath)
    else:
        selected_files = [filepath]
        open_file(filepath)  # Open the file in frame2 when a single file is clicked
    update_selection_ui()

def update_selection_ui():
    for widget in frame1.winfo_children():
        if isinstance(widget, customtkinter.CTkButton):
            if widget.cget("text") in [file.split('/')[-1] for file in selected_files]:
                widget.configure(border_color=button_selection_color)  # Highlight selected files
            else:
                widget.configure(border_color=frame_color)  # Reset border color for non-selected files

def update_frame2_ui():
    for widget in frame2.winfo_children():
        widget.destroy()
    if selected_files:
        open_file(selected_files[-1])

def open_file(filepath):
    summary = f"""<b style="color:{text_color}">
    # Hello, CustomTkinter!

    This is a **bold** text and this is *italic* text.

    - List item 1
    - List item 2

    [OpenAI](https://openai.com)</b>
    """
    html_text = markdown.markdown(summary)
    
    for widget in frame2.winfo_children():
        widget.destroy()
    
    # Create a CTkTabview widget
    notebook = customtkinter.CTkTabview(frame2,segmented_button_selected_color=heading_color,segmented_button_unselected_color=bg_color,segmented_button_fg_color=bg_color,fg_color=bg_color)
    notebook.pack(fill=BOTH, expand=1)
    
    # Add tabs to the notebook
    notebook.add("PDF Viewer")
    notebook.add("Summary")
    
    # PDF Viewer in "PDF Viewer" tab
    viewer_tab = notebook.tab("PDF Viewer")
    v1 = ShowPdf()
    v2 = v1.pdf_view(viewer_tab, pdf_location=filepath, width=600, height=600, bar=False)
    v2.pack()
    
    # Summary in "Summary" tab
    summary_tab = notebook.tab("Summary")
    summary_label = HTMLLabel(summary_tab, html=html_text, background=bg_color,foreground='white')
    summary_label.pack(fill="both", expand=True)
    summary_label.fit_height()


def delete_selected_files():
    global selected_files
    for file in selected_files:
        library.remove(file)
    selected_files = []
    update_file_list()
    # Clear frame2
    for widget in frame2.winfo_children():
        widget.destroy()

# Functions to add files and folders
def browse_files():
    file_paths = filedialog.askopenfilenames()
    if file_paths:
        library.extend(file_paths)
        update_file_list()

def merge_files():
    global selected_files
    print(selected_files)
    merge_pdfs(selected_files)
    selected_files = []
    update_file_list()
    # Clear frame2
    for widget in frame2.winfo_children():
        widget.destroy()

def summarize_all_files():
    # Send all the files to the model for summarization
    # Receive the summarized text in a single file
    # Save the file in the library, as complete_summary.md
    # Open the file in frame2
    pass

# Buttons
add_file_button = customtkinter.CTkButton(master=button_frame,
                                          text="📚",
                                          command=browse_files,
                                          width=25, height=25,
                                          corner_radius=10,
                                          fg_color=frame_color,
                                          bg_color=frame_color)

delete_file_button = customtkinter.CTkButton(master=button_frame,
                                             text="🗑️",
                                             command=delete_selected_files,  # Placeholder for delete function
                                             width=25, height=25,
                                             corner_radius=10,
                                             fg_color=frame_color,
                                             bg_color=frame_color)

merge_files_button = customtkinter.CTkButton(master=button_frame,
                                            text="🔗",
                                            command=merge_files,  # Updated to call browse_folder function
                                            width=25, height=25,
                                            corner_radius=10,
                                            fg_color=frame_color,
                                            bg_color=frame_color)

summarize_all_files_button = customtkinter.CTkButton(master=button_frame,
                                            text="📝",
                                            command=summarize_all_files,
                                            width=25, height=25,
                                            corner_radius=10,
                                            fg_color=frame_color,
                                            bg_color=frame_color)

# Pack buttons horizontally
add_file_button.pack(side=LEFT, padx=10)
merge_files_button.pack(side=LEFT, padx=10)
summarize_all_files_button.pack(side=LEFT, padx=10)
delete_file_button.pack(side=LEFT, padx=10)

update_file_list()

# Instantiate ChatUI in frame3
chat_ui = ChatUI(frame3)

root.mainloop()