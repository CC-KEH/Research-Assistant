from src.utils import logger
from PyPDF2 import PdfMerger
import os


def merge_pdfs(files):
    if not files or len(files) < 2:
        return
    logger.info(f"Merging {len(files)} files")
    
    merger = PdfMerger()
    for pdf in files:
        merger.append(pdf)

    merger.write("combined.pdf")
    merger.close()
