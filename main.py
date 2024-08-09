from tkinter import *
from tkinter import filedialog
import customtkinter
from src.utils.common import *
from pdf_viewer import ShowPdf
# from tkPDFViewer import tkPDFViewer as pdf

# Themes and colors
customtkinter.set_appearance_mode('system')
customtkinter.set_default_color_theme("dark-blue")

bg_color = "#1e1e1e"
frame_color = "#151515"
button_selection_color = "#6C7BFE"
frame_border = 0
heading_size = 24
heading_color = "#6C7BFE"
# Layout
root = customtkinter.CTk()
root.title('Research Assistant')
root.geometry('1400x800')
root.resizable(width=True, height=True)
v1 = ShowPdf()

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
        if isinstance(widget, customtkinter.CTkButton) and widget not in [add_file_button, delete_file_button, add_folder_button]:
            widget.destroy()
    for file in library:
        file_button = customtkinter.CTkButton(frame1, text=file.split('/')[-1], corner_radius=5, fg_color=bg_color, text_color='white',border_color=frame_color, border_width=1, width=200, height=20)
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


def open_file(filepath):
    for widget in frame2.winfo_children():
        widget.destroy()
    v2 = v1.pdf_view(frame2, pdf_location=filepath, width=600, height=600, bar=False)
    v2.pack()

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

def browse_folder():
    folder_path = filedialog.askdirectory()
    if folder_path:
        # Add all files in the folder to the local library
        import os
        for file_name in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file_name)
            if os.path.isfile(file_path):
                library.append(file_path)
        update_file_list()


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

add_folder_button = customtkinter.CTkButton(master=button_frame,
                                            text="📁",
                                            command=browse_folder,  # Updated to call browse_folder function
                                            width=25, height=25,
                                            corner_radius=10,
                                            fg_color=frame_color,
                                            bg_color=frame_color)

# Pack buttons horizontally
add_file_button.pack(side=LEFT, padx=10)
add_folder_button.pack(side=LEFT, padx=10)
delete_file_button.pack(side=LEFT, padx=10)

update_file_list()

root.mainloop()