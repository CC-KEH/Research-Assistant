import os
import json
import datetime
from typing import List, Optional

class ConfigManager:
    """Manages loading and accessing configuration from config.json"""

    def __init__(self, config_path: str = "config.json"):
        self.config_path = config_path
        self.config = self.load_config()

    def load_config(self) -> dict:
        """Load configuration from JSON file."""
        try:
            with open(self.config_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Config file not found at {self.config_path}")
            return {}

    def save(self):
        """Save configuration to JSON file."""
        with open(self.config_path, "w") as f:
            json.dump(self.config, f, indent=4)

    def get_llm_config(self, model_name: str) -> Optional[dict]:
        """Get LLM configuration by name."""
        return self.config.get("llmConfig", {}).get(model_name)

    def get_knowledge_store_files(self) -> List[dict]:
        """Get knowledge store files."""
        return self.config.get("knowledgeStoreConfig", {}).get("files", [])

    def add_knowledge_store_file(
        self, file_name: str, file_path: str, feed_llm: str = ""
    ):
        """Add file to knowledge store."""
        if "knowledgeStoreConfig" not in self.config:
            self.config["knowledgeStoreConfig"] = {"files": []}
        if "files" not in self.config["knowledgeStoreConfig"]:
            self.config["knowledgeStoreConfig"]["files"] = []

        self.config["knowledgeStoreConfig"]["files"].append(
            {"file_name": file_name, "file_path": file_path, "feed_llm": feed_llm}
        )
        self.save()

    def get_basic_config(self) -> List[dict]:
        """Get basic project configuration."""
        return self.config.get("basicConfig", {})

    def get_ai_config(self) -> dict:
        """Get AI configuration."""
        model_provider = self.get_basic_config().get("activeLlmProvider", "")
        llm_config =  self.config.get("llmConfig", {}).get(model_provider, {})
        
        ai_config = {
            "activeLlmProvider": model_provider,
            "model": llm_config.get("model", ""),
            "apiKey": llm_config.get("apiKey", ""),
            "temperature": llm_config.get("temperature", 0.7),
            "maxTokens": llm_config.get("maxTokens", 2048),
            "chatPrompt": llm_config.get("chatPrompt", ""),
        }
        
        return ai_config

    def update_ai_config(self, new_ai_config: dict):
        """Update AI configuration."""
        if "llmConfig" not in self.config:
            self.config["llmConfig"] = {}
        model_name = new_ai_config.get("activeLlmProvider")
        if not model_name:
            raise ValueError("activeLlmProvider is required in AI config")

        self.config["llmConfig"][model_name] = {
            "model": new_ai_config.get("model", ""),
            "apiKey": new_ai_config.get("apiKey", ""),
            "temperature": new_ai_config.get("temperature", 0.7),
            "maxTokens": new_ai_config.get("maxTokens", 2048),
            "chatPrompt": new_ai_config.get("chatPrompt", ""),
        }
        self.save()
    
    def get_tabs(self) -> List[dict]:
        """Get all tabs configuration."""
        tabs_config = self.config.get("tabsConfig", {})
        standard_tabs = tabs_config.get("tabs", [])
        custom_tabs = tabs_config.get("customTabs", [])
        return standard_tabs + custom_tabs

    def get_tab_by_id(self, tab_id: str) -> Optional[dict]:
        """Get a specific tab by its ID."""
        all_tabs = self.get_tabs()
        for tab in all_tabs:
            if tab.get("id") == tab_id:
                return tab
        return None

class SessionManager:
    def __init__(self, chats_file: str):
        self.chats_file = chats_file
        self.data = self.load_chats()
        self.active_session_index = None

    def load_chats(self) -> dict:
        """Load chats from JSON file. Handles empty and invalid JSON gracefully."""
        try:
            if not os.path.exists(self.chats_file):
                # File doesn't exist - create it with default structure
                with open(self.chats_file, "w") as f:
                    json.dump({"sessions": {"sessions": []}}, f)
                return {"sessions": {"sessions": []}}
            else:
                # File exists - try to read and parse
                with open(self.chats_file, "r") as f:
                    content = f.read().strip()
                    
                    # Check if file is empty
                    if not content:
                        print(f"Warning: {self.chats_file} is empty. Initializing with default structure.")
                        return {"sessions": {"sessions": []}}
                    
                    # Try to parse JSON
                    return json.loads(content)
        except json.JSONDecodeError as e:
            # File contains invalid JSON
            print(f"Warning: {self.chats_file} contains invalid JSON: {e}. Resetting file.")
            with open(self.chats_file, "w") as f:
                json.dump({"sessions": {"sessions": []}}, f)
            return {"sessions": {"sessions": []}}
        except FileNotFoundError:
            # Fallback for race condition
            return {"sessions": {"sessions": []}}
        except Exception as e:
            # Catch any other unexpected errors
            print(f"Error loading chats: {e}")
            return {"sessions": {"sessions": []}}

    def save_chats(self):
        """Save chats to JSON file."""
        with open(self.chats_file, "w") as f:
            json.dump(self.data, f, indent=4)

    def check(self) -> Optional[dict]:
        sessions = self.data.get("sessions", {}).get("sessions", [])
        active_session = None
        if (
            self.active_session_index is not None
            and 0 <= self.active_session_index < len(sessions)
        ):
            active_session = sessions[self.active_session_index]

        return {
            "status": self.active_session_index is not None,
            "session": active_session,
            "total_sessions": len(sessions),
        }

    def reset(self):
        """Reset all sessions."""
        self.data = {"sessions": {"sessions": []}}
        self.active_session_index = None
        self.save_chats()

    def create_session(
        self, name: str, tags: List[str] = None, context: str = ""
    ) -> int:
        """Create a new session with metadata."""
        if "sessions" not in self.data:
            self.data["sessions"] = {"sessions": []}
        if "sessions" not in self.data["sessions"]:
            self.data["sessions"]["sessions"] = []

        now = datetime.datetime.now().isoformat()

        new_session = {
            "name": name,
            "history": [],
            "metadata": {
                "created_at": now,
                "last_updated": now,
                "total_messages": 0,
                "tags": tags or [],
                "context": context,
            },
        }

        self.data["sessions"]["sessions"].append(new_session)
        self.active_session_index = len(self.data["sessions"]["sessions"]) - 1
        self.save_chats()

        return self.active_session_index

    def get_sessions(self) -> List[dict]:
        """Get all sessions."""
        return self.data.get("sessions", {}).get("sessions", [])

    def get_session_by_index(self, index: int) -> Optional[dict]:
        """Get session by index."""
        sessions = self.get_sessions()
        if 0 <= index < len(sessions):
            return sessions[index]
        return None

    def switch_session(self, session_index: int):
        """Switch to a different session by index."""
        sessions = self.get_sessions()
        if 0 <= session_index < len(sessions):
            self.active_session_index = session_index
        else:
            raise ValueError(f"Session index {session_index} does not exist")

    def delete_session(self, session_index: int):
        """Delete a session by index."""
        sessions = self.get_sessions()
        if 0 <= session_index < len(sessions):
            sessions.pop(session_index)
            self.save_chats()

            # Update active session index
            if self.active_session_index == session_index:
                self.active_session_index = None
            elif (
                self.active_session_index is not None
                and self.active_session_index > session_index
            ):
                self.active_session_index -= 1

    def reset_session(self, session_index: int):
        """Clear history for a session."""
        session = self.get_session_by_index(session_index)
        if session:
            session["history"] = []
            self.save_chats()

    def add_to_history(
        self, message: str, is_ai: bool, timestamp: datetime.datetime = None
    ):
        """Add a message to the active session's history."""
        if self.active_session_index is None:
            raise ValueError("No active session. Create or switch to a session first.")

        session = self.get_session_by_index(self.active_session_index)
        if not session:
            raise ValueError("Active session not found")

        if timestamp is None:
            timestamp = datetime.datetime.now()

        # Get next index
        current_history = session.get("history", [])
        next_index = len(current_history)

        # Format timestamp as ISO string
        timestamp_str = timestamp.isoformat()

        session["history"].append(
            {
                "index": str(next_index),
                "timestamp": timestamp_str,
                "message": message,
                "is_ai": is_ai,
            }
        )

        # Update metadata
        session["metadata"]["last_updated"] = timestamp_str
        session["metadata"]["total_messages"] = len(session["history"])

        self.save_chats()

    def format_timestamp(self, timestamp_str: str) -> str:
        """Format timestamp intelligently from ISO string."""
        try:
            timestamp = datetime.datetime.fromisoformat(timestamp_str)
        except (ValueError, AttributeError):
            return timestamp_str

        now = datetime.datetime.now()
        message_date = timestamp.date()
        today = now.date()

        if message_date == today:
            return timestamp.strftime("%I:%M %p")
        else:
            return timestamp.strftime("%b %d • %A • %I:%M %p")

    def get_formatted_history(self) -> list:
        """Get history with formatted timestamps."""
        if self.active_session_index is None:
            return []

        session = self.get_session_by_index(self.active_session_index)
        if not session:
            return []

        history = session.get("history", [])
        formatted_history = []

        for msg in history:
            formatted_message = {
                "index": msg.get("index", ""),
                "message": msg.get("message", ""),
                "is_ai": msg.get("is_ai", False),
                "timestamp": self.format_timestamp(msg.get("timestamp", "")),
                "timestamp_raw": msg.get("timestamp", ""),
            }
            formatted_history.append(formatted_message)

        return formatted_history

    def update_session_context(self, session_index: int, context: str):
        """Update context for a session."""
        session = self.get_session_by_index(session_index)
        if session and "metadata" in session:
            session["metadata"]["context"] = context
            session["metadata"]["last_updated"] = datetime.datetime.now().isoformat()
            self.save_chats()

    def add_session_tags(self, session_index: int, tags: List[str]):
        """Add tags to a session."""
        session = self.get_session_by_index(session_index)
        if session and "metadata" in session:
            existing_tags = session["metadata"].get("tags", [])
            # Add only unique tags
            for tag in tags:
                if tag not in existing_tags:
                    existing_tags.append(tag)
            session["metadata"]["tags"] = existing_tags
            session["metadata"]["last_updated"] = datetime.datetime.now().isoformat()
            self.save_chats()

    def remove_session_tags(self, session_index: int, tags: List[str]):
        """Remove tags from a session."""
        session = self.get_session_by_index(session_index)
        if session and "metadata" in session:
            existing_tags = session["metadata"].get("tags", [])
            session["metadata"]["tags"] = [t for t in existing_tags if t not in tags]
            session["metadata"]["last_updated"] = datetime.datetime.now().isoformat()
            self.save_chats()

    def get_session_metadata(self, session_index: int) -> Optional[dict]:
        """Get metadata for a session."""
        session = self.get_session_by_index(session_index)
        return session.get("metadata") if session else None

    def search_sessions_by_tag(self, tag: str) -> List[int]:
        """Search sessions by tag and return their indices."""
        sessions = self.get_sessions()
        matching_indices = []
        for i, session in enumerate(sessions):
            tags = session.get("metadata", {}).get("tags", [])
            if tag in tags:
                matching_indices.append(i)
        return matching_indices

    def get_session_stats(self, session_index: int) -> Optional[dict]:
        """Get statistics for a session."""
        session = self.get_session_by_index(session_index)
        if not session:
            return None

        history = session.get("history", [])
        user_messages = sum(1 for msg in history if not msg.get("is_ai", False))
        ai_messages = sum(1 for msg in history if msg.get("is_ai", False))

        metadata = session.get("metadata", {})

        return {
            "name": session.get("name", ""),
            "total_messages": len(history),
            "user_messages": user_messages,
            "ai_messages": ai_messages,
            "created_at": metadata.get("created_at", ""),
            "last_updated": metadata.get("last_updated", ""),
            "tags": metadata.get("tags", []),
            "context": metadata.get("context", ""),
        }

    def get_session_name(self, session_index: int) -> Optional[str]:
        """Get session name by index."""
        session = self.get_session_by_index(session_index)
        return session.get("name") if session else None

    def rename_session(self, session_index: int, new_name: str):
        """Rename a session."""
        session = self.get_session_by_index(session_index)
        if session:
            session["name"] = new_name
            self.save_chats()