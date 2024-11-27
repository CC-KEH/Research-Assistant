from tkinter import BOTH
import customtkinter as ctk
import json
import os

from src.logger import logger
from src.constants import PROJECT_CONFIG
from src.rag.components.prompts import final_combine_template, chat_template

FONT_SIZES = ["10", "12", "14", "16", "18", "20"]
FONT_FAMILIES = ["Arial", "Helvetica", "Times", "Courier", "Verdana"]
THEMES = ["Light", "Dark", "System"]
MODELS = ["gemini-1.5-pro-latest", "openai"]


class SettingsApp(ctk.CTk):
    def __init__(self, project_name="", project_path=None, theme_config=None, model_config=None):
        """Settings Screen.
        
        Args:
            project_name (str, optional): Name of the project. Defaults to "".
            project_path (str, optional): Path to the project directory. Defaults to None.
            theme_config (dict, optional): Theme configuration. Defaults to None.
            model_config (dict, optional): Model configuration. Defaults to None.
        
        Description:
            The settings screen allows the user to configure the project settings.
            The user can change the font size, font family, theme (in future), model, model API key, model secret key, model temperature, and response template.
            The user can also create and manage prompt and summary templates.
        """
        super().__init__()
        self.title("Settings")
        self.geometry("600x600")
        self.project_name = project_name
        self.theme_config = theme_config
        self.model_config = model_config
        self.project_path = project_path
        self.configure(
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
        )  # Set the background color

        # Main Frame for Label-Input pairs
        self.main_frame = ctk.CTkFrame(
            self,
            bg_color=self.theme_config["colors"].FRAME_COLOR.value,
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
        )
        self.main_frame.pack(pady=20, padx=20, fill="both", expand=True)

        # UI Elements
        self.create_dropdowns()
        self.create_buttons()

    def save_config(self, new_config):
        config_path = os.path.join(self.project_path, PROJECT_CONFIG)

        # Read the existing configuration
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                try:
                    configs = json.load(f)
                    if not isinstance(configs, dict):
                        raise ValueError("Configuration file should contain a JSON object.")
                except json.JSONDecodeError:
                    raise ValueError("Invalid JSON format in configuration file.")
        else:
            # Initialize a new configuration if the file doesn't exist
            configs = {"project_name": self.project_name, "project_path": self.project_path, "config": {}}

        # Update the config
        for key, value in new_config.items():
            if key in configs:
                if key in ["prompt_templates", "summary_templates"]:
                    for k, v in value.items():
                        logger.info(f"Updating {key} with {k}: {v}")
                        configs[key][k] = v
                else:
                    configs[key] = value
            else:
                configs["config"][key] = value
                
        logger.info(f"Saving new configuration: {new_config}")
        # Write back the updated configuration
        with open(config_path, "w") as f:
            json.dump(configs, f, indent=4)


    def create_dropdowns(self):
        # Font Size
        self.add_label_and_dropdown(
            "Font Size", FONT_SIZES, "font_size", self.theme_config["font_size"]
        )

        # Font Family
        self.add_label_and_dropdown(
            "Font Family",
            FONT_FAMILIES,
            "font_family",
            self.theme_config["font_family"],
        )

        # Theme
        # self.add_label_and_dropdown(
        #     "Theme", THEMES, "theme", self.theme_config["theme"]
        # )

        # Model
        self.add_label_and_dropdown(
            "Model", MODELS, "model", self.model_config["model_name"]
        )

        # Model API Key
        self.add_label_and_entry(
            "Model API Key", "model_api", self.model_config["model_api"]
        )

        # Model Secret ID
        self.add_label_and_entry(
            "Embedding Model API", "embedding_model_api", self.model_config["embedding_model_api"]
        )

        # Model Temperature
        self.add_label_and_entry(
            "Model Temperature",
            "model_temperature",
            self.model_config["model_temperature"],
        )

        
        self.add_template_section(
            "Summary Templates",
            "summary_templates",
            self.model_config["summary_templates"],
        )

        # Add buttons and dropdown for Prompt Templates
        self.add_template_section(
            "Prompt Templates",
            "prompt_templates",
            self.model_config["prompt_templates"],
        )

    def add_label_and_dropdown(self, label_text, values, setting_key, current_value):
        # Create a frame for each label-dropdown pair
        frame = ctk.CTkFrame(
            self.main_frame,
            bg_color=self.theme_config["colors"].FRAME_COLOR.value,
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
        )
        frame.pack(pady=5, fill="x")

        label = ctk.CTkLabel(frame, text=label_text)
        label.pack(side="left", padx=5)

        variable = ctk.StringVar(value=current_value)
        dropdown = ctk.CTkOptionMenu(
            frame,
            values=values,
            variable=variable,
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
            bg_color=self.theme_config["colors"].FRAME_COLOR.value,
            button_color=self.theme_config["colors"].BUTTON_COLOR.value,
            button_hover_color=self.theme_config["colors"].BUTTON_HOVER_COLOR.value,
            dropdown_fg_color=self.theme_config["colors"].FRAME_COLOR.value,
        )
        dropdown.set(current_value)
        dropdown.pack(side="right", padx=5, fill="x")

        # Save variable to the instance for access later
        setattr(self, f"{setting_key}_var", variable)

    def add_label_and_entry(self, label_text, setting_key, current_value):
        # Create a frame for each label-entry pair
        frame = ctk.CTkFrame(
            self.main_frame,
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
            bg_color=self.theme_config["colors"].FRAME_COLOR.value,
        )
        frame.pack(pady=5, fill="x")

        label = ctk.CTkLabel(frame, text=label_text)
        label.pack(side="left", padx=5)

        entry = ctk.CTkEntry(
            frame,
            textvariable=ctk.StringVar(value=current_value),
            bg_color=self.theme_config["colors"].FRAME_COLOR.value,
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
        )
        entry.pack(side="right", padx=5, fill="x")

        # Save entry widget to the instance for access later
        setattr(self, f"{setting_key}_entry", entry)

    def create_buttons(self):
        # Buttons Frame
        buttons_frame = ctk.CTkFrame(
            self,
            bg_color=self.theme_config["colors"].FRAME_COLOR.value,
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
        )

        buttons_frame.pack(pady=20, padx=20, fill="x")

        # Reset Button
        self.reset_button = ctk.CTkButton(
            master=buttons_frame,
            corner_radius=15,
            hover_color=self.theme_config["colors"].BUTTON_HOVER_COLOR.value,
            text="Reset",
            command=self.reset_settings,
            fg_color=self.theme_config["colors"].BUTTON_COLOR.value,
            text_color="white",  # Set text color for better visibility
        )

        # Apply Button
        self.save_button = ctk.CTkButton(
            master=buttons_frame,
            corner_radius=15,
            hover_color=self.theme_config["colors"].BUTTON_HOVER_COLOR.value,
            text="Save",
            command=self.save_settings,
            fg_color=self.theme_config["colors"].BUTTON_COLOR.value,
            text_color="white",  # Set text color for better visibility
        )

        self.reset_button.pack(pady=10, padx=10, side="left", fill="x", expand=True)
        self.save_button.pack(pady=10, padx=10, side="right", fill="x", expand=True)

    def save_settings(self):
        # Update settings dictionary with the current values
        self.settings = {}
        self.settings["font_size"] = self.font_size_var.get()
        self.settings["heading_size"] = str(int(self.font_size_var.get()) + 12)
        self.settings["font_family"] = self.font_family_var.get()
        # self.settings["theme"] = self.theme_var.get()
        self.settings["model_name"] = self.model_var.get()
        self.settings["model_temperature"] = self.model_temperature_entry.get()
        
        if not self.model_api_entry.get() == "":
            self.settings["model_api"] = self.model_api_entry.get()
        
        if not self.embedding_model_api_entry.get() == "":
            self.settings["embedding_model_api"] = self.embedding_model_api_entry.get()
        
        if self.model_config['prompt_templates']:
            self.settings["prompt_templates"] = self.model_config['prompt_templates'] 
        
        if self.model_config['summary_templates']:
            self.settings["summary_templates"] = self.model_config['summary_templates']
            
        # Save the updated settings
        logger.info(f"Saving settings: {self.settings}")
        self.save_config(self.settings)

    def reset_settings(self):
        # Reset settings to default
        self.settings = {
                "font_size": "12",
                "heading_size": "24",
                "font_family": "Arial",
                "theme": "Dark",
                "model_name": "gemini-1.5-pro-latest",
                "model_api": "",
                "embedding_model_api": "",
                "model_temperature": 0.3,
                "prompt_templates": {"default": chat_template},
                "summary_templates": {"default": final_combine_template},
            }
        self.save_config(self.settings)
        self.update_ui()

    def update_ui(self):
        logger.info("In Update UI")
        logger.info(self.model_config)
        # Update UI elements to reflect the current settings
        self.font_size_var.set(self.theme_config["font_size"])
        self.font_family_var.set(self.theme_config["font_family"])
        # self.theme_var.set(self.theme_config["theme"])
        self.model_var.set(self.model_config["model_name"])
        self.model_api_entry.delete(0, ctk.END)
        self.model_api_entry.insert(0, self.model_config["model_api"])
        self.embedding_model_api_entry.delete(0, ctk.END)
        self.embedding_model_api_entry.insert(0, self.model_config["embedding_model_api"])
        self.prompt_templates_var.delete(0, ctk.END)
        self.prompt_templates_var.insert(0, self.model_config["prompt_templates"])
        self.summary_templates_var.delete(0, ctk.END)
        self.summary_templates_var.insert(0, self.model_config["summary_templates"])

    def add_template_section(self, label_text, setting_key, current_templates):
        # Create a frame for template management
        frame = ctk.CTkFrame(
            self.main_frame,
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
            bg_color=self.theme_config["colors"].FRAME_COLOR.value,
        )
        frame.pack(pady=10, fill="x")

        label = ctk.CTkLabel(frame, text=label_text)
        label.pack(side="left", padx=5)

        # Dropdown for selecting templates
        values = list(current_templates.keys())
        variable = ctk.StringVar(value=values[0] if values else "")
        dropdown = ctk.CTkOptionMenu(
            frame,
            values=values,
            variable=variable,
            fg_color=self.theme_config["colors"].FRAME_COLOR.value,
            bg_color=self.theme_config["colors"].FRAME_COLOR.value,
            button_color=self.theme_config["colors"].BUTTON_COLOR.value,
            button_hover_color=self.theme_config["colors"].BUTTON_HOVER_COLOR.value,
        )
        dropdown.pack(side="left", padx=5, fill="x", expand=True)

        # Add New Template Button
        create_button = ctk.CTkButton(
            frame,
            text="Create New",
            command=lambda: self.open_template_editor(setting_key),
            fg_color=self.theme_config["colors"].BUTTON_COLOR.value,
            text_color="white",
        )
        create_button.pack(side="right", padx=5)

        # Save the dropdown variable for later access
        setattr(self, f"{setting_key}_var", variable)
        setattr(self, f"{setting_key}_dropdown", dropdown)

    def open_template_editor(self, setting_key):
        # Open a new window to create a template
        editor = ctk.CTkToplevel(self)
        editor.title("Create New Template")
        editor.geometry("500x400")
        editor.configure(bg_color=self.theme_config["colors"].FRAME_COLOR.value)

        # Input for template name (key)
        key_label = ctk.CTkLabel(editor, text="Template Name")
        key_label.pack(pady=10)
        key_entry = ctk.CTkEntry(editor)
        key_entry.pack(pady=5, fill="x", padx=10)

        # Text box for template content (value)
        value_label = ctk.CTkLabel(editor, text="Template Content")
        value_label.pack(pady=10)
        value_textbox = ctk.CTkTextbox(editor, height=15)
        value_textbox.pack(pady=5, fill="both", padx=10, expand=True)

        # Save Button
        save_button = ctk.CTkButton(
            editor,
            text="Save",
            command=lambda: self.save_new_template(setting_key, key_entry, value_textbox, editor),
            fg_color=self.theme_config["colors"].BUTTON_COLOR.value,
            text_color="white",
        )
        save_button.pack(pady=10)

    def save_new_template(self, setting_key, key_entry, value_textbox, editor):
        key = key_entry.get().strip()
        value = value_textbox.get("1.0", "end").strip()

        if not key or not value:
            self.show_error_popup("Error", "Template name and content cannot be empty.")
            return

        current_templates = self.model_config.get(setting_key, {})

        if not isinstance(current_templates, dict):
            current_templates = {}

        current_templates[key] = value

        self.model_config[setting_key] = current_templates

        self.save_config(self.model_config)

        dropdown = getattr(self, f"{setting_key}_dropdown")
        dropdown.configure(values=list(current_templates.keys()))

        editor.destroy()

    

    def show_error_popup(self, title, message):
        error_popup = ctk.CTkToplevel(self)
        error_popup.title(title)
        error_popup.geometry("300x200")
        error_label = ctk.CTkLabel(error_popup, text=message, text_color="red")
        error_label.pack(pady=20)
        close_button = ctk.CTkButton(
            error_popup, text="Close", command=error_popup.destroy
        )
        close_button.pack(pady=10)
    
    

if __name__ == "__main__":
    app = SettingsApp()
    app.mainloop()