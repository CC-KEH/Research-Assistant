import customtkinter as ctk
import json
import os

CONFIG_FILE = "settings.json"
FONT_SIZES = ["10", "12", "14", "16", "18", "20"]
FONT_FAMILIES = ["Arial", "Helvetica", "Times", "Courier", "Verdana"]
THEMES = ["Light", "Dark", "System"]
MODELS = ["Gemini Pro", "ChatGPT", "Claude"]
bg_color = "#f0f0f0"
text_color = "#333333"
button_color = "#4CAF50"

# Save and load settings functions
def save_settings(settings):
    with open(CONFIG_FILE, "w") as f:
        json.dump(settings, f)

def load_settings():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    else:
        return {
            "font_size": "12",
            "font_family": "Arial",
            "theme": "Light",
            "model": "Model A",
            "model_api": "",
            "model_secretid": "",
            "response_template": "Default response template...",
            "prompt": "Default prompt...",
        }

class SettingsApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Settings")
        self.geometry("400x500")

        # Load settings
        self.settings = load_settings()

        # Main Frame for Label-Input pairs
        self.main_frame = ctk.CTkFrame(self, bg_color=bg_color)
        self.main_frame.pack(pady=20, padx=20, fill="both", expand=True)

        # UI Elements
        self.create_dropdowns()
        self.create_text_fields()
        self.create_buttons()

    def create_dropdowns(self):
        # Font Size
        self.add_label_and_dropdown("Font Size", FONT_SIZES, "font_size", self.settings["font_size"])

        # Font Family
        self.add_label_and_dropdown("Font Family", FONT_FAMILIES, "font_family", self.settings["font_family"])

        # Theme
        self.add_label_and_dropdown("Theme", THEMES, "theme", self.settings["theme"])

        # Model
        self.add_label_and_dropdown("Model", MODELS, "model", self.settings["model"])

    def add_label_and_dropdown(self, label_text, values, setting_key, current_value):
        # Create a frame for each label-dropdown pair
        frame = ctk.CTkFrame(self.main_frame, bg_color=bg_color)
        frame.pack(pady=5, fill="x")

        label = ctk.CTkLabel(frame, text=label_text)
        label.pack(side="left", padx=5)

        variable = ctk.StringVar(value=current_value)
        dropdown = ctk.CTkOptionMenu(frame, values=values, variable=variable)
        dropdown.set(current_value)
        dropdown.pack(side="right", padx=5, fill="x")

        # Save variable to the instance for access later
        setattr(self, f"{setting_key}_var", variable)

    def create_text_fields(self):
        # Model API Key
        self.add_label_and_entry("Model API Key", "model_api", self.settings["model_api"])

        # Model Secret ID
        self.add_label_and_entry("Model Secret ID", "model_secretid", self.settings["model_secretid"])

        # Response Template
        self.add_label_and_entry("Response Template", "response_template", self.settings["response_template"])

        # Prompt
        self.add_label_and_entry("Prompt", "prompt", self.settings["prompt"])

    def add_label_and_entry(self, label_text, setting_key, current_value):
        # Create a frame for each label-entry pair
        frame = ctk.CTkFrame(self.main_frame)
        frame.pack(pady=5, fill="x")

        label = ctk.CTkLabel(frame, text=label_text)
        label.pack(side="left", padx=5)

        entry = ctk.CTkEntry(frame, textvariable=ctk.StringVar(value=current_value))
        entry.pack(side="right", padx=5, fill="x")

        # Save entry widget to the instance for access later
        setattr(self, f"{setting_key}_entry", entry)

    def create_buttons(self):
        # Buttons Frame
        buttons_frame = ctk.CTkFrame(self)
        buttons_frame.pack(pady=20, fill="x")

        # Reset Button
        self.reset_button = ctk.CTkButton(buttons_frame, text="Reset", command=self.reset_settings, bg_color=button_color)
        self.reset_button.pack(pady=10, padx=20, side="left", expand=True)

        # Apply Button
        self.apply_button = ctk.CTkButton(buttons_frame, text="Apply", command=self.apply_settings, bg_color=button_color)
        self.apply_button.pack(pady=10, padx=20, side="right", expand=True)

    def apply_settings(self):
        # Update settings dictionary with the current values
        self.settings["font_size"] = self.font_size_var.get()
        self.settings["font_family"] = self.font_family_var.get()
        self.settings["theme"] = self.theme_var.get()
        self.settings["model"] = self.model_var.get()
        self.settings["model_api"] = self.model_api_entry.get()
        self.settings["model_secretid"] = self.model_secretid_entry.get()
        self.settings["response_template"] = self.response_template_entry.get()
        self.settings["prompt"] = self.prompt_entry.get()

        # Save the updated settings
        save_settings(self.settings)

    def reset_settings(self):
        # Reset settings to default
        self.settings = {
            "font_size": "12",
            "font_family": "Arial",
            "theme": "Light",
            "model": "Model A",
            "model_api": "",
            "model_secretid": "",
            "response_template": "Default response template...",
            "prompt": "Default prompt...",
        }
        self.apply_settings()
        self.update_ui()

    def update_ui(self):
        # Update UI elements to reflect the current settings
        self.font_size_var.set(self.settings["font_size"])
        self.font_family_var.set(self.settings["font_family"])
        self.theme_var.set(self.settings["theme"])
        self.model_var.set(self.settings["model"])
        self.model_api_entry.delete(0, ctk.END)
        self.model_api_entry.insert(0, self.settings["model_api"])
        self.model_secretid_entry.delete(0, ctk.END)
        self.model_secretid_entry.insert(0, self.settings["model_secretid"])
        self.response_template_entry.delete(0, ctk.END)
        self.response_template_entry.insert(0, self.settings["response_template"])
        self.prompt_entry.delete(0, ctk.END)
        self.prompt_entry.insert(0, self.settings["prompt"])

if __name__ == "__main__":
    app = SettingsApp()
    app.mainloop()
