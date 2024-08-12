from PyPDF2 import PdfFileMerger
import os


def merge_pdfs():
    merger = PdfFileMerger()

    for items in os.listdir():
        if items.endswith(".pdf"):
            merger.append(items)

    merger.write("combined.pdf")
    merger.close()
