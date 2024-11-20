from tkinter import BOTH
import customtkinter as ctk
import json
import os
from src.constants import PROJECTS_CONFIG
import numpy as np

FONT_SIZES = ["10", "12", "14", "16", "18", "20"]
FONT_FAMILIES = ["Arial", "Helvetica", "Times", "Courier", "Verdana"]
THEMES = ["Light", "Dark", "System"]
MODELS = ["Gemini Pro", "ChatGPT", "Claude"]



class SettingsApp(ctk.CTkFrame):
    def __init__(self, parent=None, project_name="", theme_config=None, model_config=None):
        super().__init__(parent)
        # self.title("Settings")
        # self.geometry("400x500")
        self.project_name = project_name
        self.theme_config = theme_config
        self.model_config = model_config
        self.configure(fg_color=self.theme_config["colors"].FRAME_COLOR.value)  # Set the background color
        
        self.pack(expand=True, fill=BOTH)

        # Main Frame for Label-Input pairs
        self.main_frame = ctk.CTkFrame(self, bg_color=self.theme_config["colors"].FRAME_COLOR.value,
                                       fg_color=self.theme_config["colors"].FRAME_COLOR.value)
        self.main_frame.pack(pady=20, padx=20, fill="both", expand=True)

        # UI Elements
        self.create_dropdowns()
        self.create_text_fields()
        self.create_buttons()

        # Save and load settings functions
    def save_settings(self,new_config):
        with open(PROJECTS_CONFIG, "w") as f:
            configs_list = json.load(f)
            project_config = np.where(configs_list["project_name"] == self.project_name)
            project_config['config'] = new_config
            json.dump(configs_list, f, indent=4)
    
    def create_dropdowns(self):
        # Font Size
        self.add_label_and_dropdown("Font Size", FONT_SIZES, "font_size", self.theme_config["font_size"])

        # Font Family
        self.add_label_and_dropdown("Font Family", FONT_FAMILIES, "font_family", self.theme_config["font_family"])

        # Theme
        self.add_label_and_dropdown("Theme", THEMES, "theme", self.theme_config["theme"])

        # Model
        self.add_label_and_dropdown("Model", MODELS, "model", self.model_config["model_name"])
        
        # Model API Key
        self.add_label_and_entry("Model API Key", "model_api", self.model_config["model_api"])
        
        # Model Secret ID
        self.add_label_and_entry("Model Secret ID", "model_secretid", self.model_config["model_secretid"])
        
        # Model Temperature
        self.add_label_and_entry("Model Temperature", "model_temperature", self.model_config["model_temperature"])
        
        # Response Template
        self.add_label_and_entry("Response Template", "response_template", self.model_config["response_template"])
        
        
        

    def add_label_and_dropdown(self, label_text, values, setting_key, current_value):
        # Create a frame for each label-dropdown pair
        frame = ctk.CTkFrame(self.main_frame, bg_color=self.theme_config["colors"].FRAME_COLOR.value,fg_color=self.theme_config["colors"].FRAME_COLOR.value)
        frame.pack(pady=5, fill="x")

        label = ctk.CTkLabel(frame, text=label_text)
        label.pack(side="left", padx=5)

        variable = ctk.StringVar(value=current_value)
        dropdown = ctk.CTkOptionMenu(frame, values=values, variable=variable, 
                                     fg_color=self.theme_config["colors"].FRAME_COLOR.value,
                                     bg_color=self.theme_config["colors"].FRAME_COLOR.value,
                                     button_color=self.theme_config["colors"].BUTTON_COLOR.value,
                                     button_hover_color=self.theme_config["colors"].BUTTON_HOVER_COLOR.value,
                                     dropdown_fg_color=self.theme_config["colors"].FRAME_COLOR.value,)
        dropdown.set(current_value)
        dropdown.pack(side="right", padx=5, fill="x")

        # Save variable to the instance for access later
        setattr(self, f"{setting_key}_var", variable)

    def create_text_fields(self):
        # Model API Key
        self.add_label_and_entry("Model API Key", "model_api", self.model_config["model_api"])

        # Model Secret ID
        self.add_label_and_entry("Model Secret ID", "model_secretid", self.model_config["model_secretid"])

        # Response Template
        self.add_label_and_entry("Response Template", "response_template", self.model_config["response_template"])

        # Prompt
        self.add_label_and_entry("Prompt", "prompt", self.model_config["prompt_template"])

    def add_label_and_entry(self, label_text, setting_key, current_value):
        # Create a frame for each label-entry pair
        frame = ctk.CTkFrame(self.main_frame,fg_color=self.theme_config["colors"].FRAME_COLOR.value,
                             bg_color=self.theme_config["colors"].FRAME_COLOR.value)
        frame.pack(pady=5, fill="x")

        label = ctk.CTkLabel(frame, text=label_text)
        label.pack(side="left", padx=5)

        entry = ctk.CTkEntry(frame, textvariable=ctk.StringVar(value=current_value),bg_color=self.theme_config["colors"].FRAME_COLOR.value,
                             fg_color=self.theme_config["colors"].FRAME_COLOR.value)
        entry.pack(side="right", padx=5, fill="x")

        # Save entry widget to the instance for access later
        setattr(self, f"{setting_key}_entry", entry)

    def create_buttons(self):
        # Buttons Frame
        buttons_frame = ctk.CTkFrame(self, bg_color=self.theme_config["colors"].FRAME_COLOR.value,
                                     fg_color=self.theme_config["colors"].FRAME_COLOR.value)
        buttons_frame.pack(pady=20, fill="x")

        # Reset Button
        self.reset_button = ctk.CTkButton(master=buttons_frame,corner_radius=15,hover_color=self.theme_config['colors'].BUTTON_HOVER_COLOR.value, text="Reset", command=self.reset_settings, fg_color=self.theme_config["colors"].BUTTON_COLOR.value)
        self.reset_button.pack(pady=10, padx=20, side="left", expand=True)

        # Apply Button
        self.apply_button = ctk.CTkButton(master=buttons_frame,corner_radius=15,
                                          hover_color=self.theme_config['colors'].BUTTON_HOVER_COLOR.value, 
                                          text="Apply", command=self.apply_settings, 
                                          fg_color=self.theme_config["colors"].BUTTON_COLOR.value)
        self.apply_button.pack(pady=10, padx=20, side="right", expand=True)

    def apply_settings(self):
        # Update settings dictionary with the current values
        self.settings = {}
        self.settings["font_size"] = self.font_size_var.get()
        self.settings["heading_size"] = str(int(self.font_size_var.get()) + 12)
        self.settings["font_family"] = self.font_family_var.get()
        self.settings["theme"] = self.theme_var.get()
        self.settings["model_name"] = self.model_var.get()
        self.settings["model_api"] = self.model_api_entry.get()
        self.settings["model_secretid"] = self.model_secretid_entry.get()
        self.settings["response_template"] = self.response_template_entry.get()
        self.settings["prompt_template"] = self.prompt_entry.get()

        # Save the updated settings
        self.save_settings(self.settings)

    def reset_settings(self):
        # Reset settings to default
        self.settings = {
            "font_size": "12",
            "heading_size": "24",
            "font_family": "Arial",
            "theme": "Dark",
            "model_name": "Model A",
            "model_api": "",
            "model_secretid": "",
            "response_template": "Default response template...",
            "prompt_template": "Default prompt...",
        }
        self.apply_settings()
        self.update_ui()

    def update_ui(self):
        # Update UI elements to reflect the current settings
        self.font_size_var.set(self.theme_config["font_size"])
        self.font_family_var.set(self.theme_config["font_family"])
        self.theme_var.set(self.theme_config["theme"])
        self.model_var.set(self.model_config["model_name"])
        self.model_api_entry.delete(0, ctk.END)
        self.model_api_entry.insert(0, self.model_config["model_api"])
        self.model_secretid_entry.delete(0, ctk.END)
        self.model_secretid_entry.insert(0, self.model_config["model_secretid"])
        self.response_template_entry.delete(0, ctk.END)
        self.response_template_entry.insert(0, self.model_config["response_template"])
        self.prompt_entry.delete(0, ctk.END)
        self.prompt_entry.insert(0, self.model_config["prompt"])

if __name__ == "__main__":
    app = SettingsApp()
    app.mainloop()