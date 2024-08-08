from tkinter import *
import customtkinter
from src.utils.common import *


# Themes and colors
customtkinter.set_appearance_mode('system')
customtkinter.set_default_color_theme("dark-blue")

bg_color = "#1e1e1e"
frame_color = "#151515"
frame_border = 0

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

library = []

# Create a frame for the buttons
button_frame = Frame(frame1, bg=frame_color)
button_frame.pack(pady=20)

# Buttons
add_file_button = customtkinter.CTkButton(master=button_frame,
                                          text="📚",
                                          command=browse_files(library, frame2),
                                          width=25, height=25,
                                          corner_radius=10,
                                          fg_color=frame_color,
                                          bg_color=frame_color)

delete_file_button = customtkinter.CTkButton(master=button_frame,
                                             text="🗑️",
                                             command=delete_file,
                                             width=25, height=25,
                                             corner_radius=10,
                                             fg_color=frame_color,
                                             bg_color=frame_color)

add_folder_button = customtkinter.CTkButton(master=button_frame,
                                            text="📁",
                                            command=add_folder,
                                            width=25, height=25,
                                            corner_radius=10,
                                            fg_color=frame_color,
                                            bg_color=frame_color)

# Pack buttons horizontally
add_file_button.pack(side=LEFT, padx=10)
add_folder_button.pack(side=LEFT, padx=10)
delete_file_button.pack(side=LEFT, padx=10)

root.mainloop()