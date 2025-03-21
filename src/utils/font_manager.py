import os
import ctypes
import customtkinter as ctk

class FontManager:
    """A singleton class to load and manage custom fonts globally in CustomTkinter."""
    
    _instance = None  # Ensure only one instance exists
    fonts = {}  # Dictionary to store loaded fonts

    def __new__(cls):
        """Ensures the class is only initialized once."""
        if cls._instance is None:
            cls._instance = super(FontManager, cls).__new__(cls)
            cls._instance._load_fonts()  # Load fonts once
            cls._instance._enable_dpi_scaling()  # Enable DPI scaling for better font clarity
        return cls._instance

    def _load_fonts(self):
        """Loads custom fonts from files and registers them."""
        font_files = {
            "Gideon Roman": "assets/fonts/GideonRoman-Regular.ttf",
            "Nunito": "assets/fonts/Nunito-VariableFont_wght.ttf",
        }
        for name, file in font_files.items():
            abs_path = os.path.abspath(file)
            if os.path.exists(abs_path):
                ctypes.windll.gdi32.AddFontResourceW(abs_path)  # Windows-specific font registration
                self.fonts[name] = name  # Store the font name
            else:
                print(f"Warning: Font file '{file}' not found.")

    def _enable_dpi_scaling(self):
        """Enables high DPI scaling for better text rendering (Windows only)."""
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except AttributeError:
            pass  # Ignore if not on Windows

    @classmethod
    def get_font(cls, family, size=16, weight="normal"):
        """Returns a CTkFont object if the font is loaded, else falls back to default font."""
        instance = cls()  # Ensure the singleton instance is created
        if family in instance.fonts:
            return ctk.CTkFont(family=family, size=size, weight=weight)
        else:
            print(f"Warning: Font '{family}' not loaded. Using default font.")
            return ctk.CTkFont(size=size, weight=weight)  # Fallback to default


# from font_manager import FontManager
# custom_font = FontManager.get_font("Gideon Roman", size=20, weight="bold")
# label = ctk.CTkLabel(root, text="Hello!", font=custom_font)
