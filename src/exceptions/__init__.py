import customtkinter as ctk

class CustomAppException(Exception):
    def __init__(self, message: str, parent_window=None):
        super().__init__(message)
        self.message = message
        self.show_error_popup(parent_window)

    def show_error_popup(self, parent_window):
        popup = ctk.CTkToplevel(parent_window)
        popup.geometry("400x200")
        popup.title("Error")
        popup.grab_set()
        error_label = ctk.CTkLabel(
            popup, text=self.message, wraplength=350, font=("Arial", 14)
        )
        error_label.pack(pady=20)
        close_button = ctk.CTkButton(
            popup, text="Close", command=popup.destroy
        )
        close_button.pack(pady=20)
