import os
from tkinter import filedialog
from tkPDFViewer import tkPDFViewer as pdf

# Functions
def browse_files(library,frame2):
    file_path = filedialog.askopenfilename(initialdir='/',
                                           title='Select a pdf file',
                                           filetypes=(('PDF File', '.pdf'),
                                                      ('PDF File', '.PDF'),
                                                      ('All file', '.txt')))
    if file_path:
        library.append(file_path)
        pdf_view = pdf.ShowPdf()
        pdf_view.pdf_view(master=frame2, pdf_location=open(file_path, 'r'), width=650, height=800)
        pdf_view.pack()

def delete_file(library):
    # Implement the logic to delete a file from the local library
    file_path = filedialog.askopenfilename(initialdir='/',
                                           title='Select a file to delete',
                                           filetypes=(('All Files', '*.*'),))
    if file_path in library:
        library.remove(file_path)
        os.remove(file_path)
        print(f"Deleted file: {file_path}")
    else:
        print("File not found in local library.")

def add_folder(library):
    # Implement the logic to add a folder to the local library
    folder_path = filedialog.askdirectory(initialdir='/',
                                          title='Select a folder')
    if folder_path:
        for root_dir, _, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root_dir, file)
                library.append(file_path)
        print(f"Added folder to local library: {folder_path}")
