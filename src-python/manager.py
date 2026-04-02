import datetime
import json
import logging
import os
import copy
import shutil
import tempfile
from typing import Dict, List, Optional
logger = logging.getLogger(__name__)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _now_utc() -> str:
    """Return current UTC time as an ISO 8601 string.

    FIX: centralised UTC timestamp helper — all previous call sites used
    datetime.datetime.now().isoformat() which produces naive local time.
    Naive timestamps stored in JSON are ambiguous across machines and
    timezones, making them incomparable. UTC everywhere eliminates this.
    """
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _atomic_write_json(path: str, data: dict) -> None:
    """Write JSON to a file atomically using a temp-file + rename pattern.

    FIX: the old save_chats() / save() opened the target file directly for
    writing. If the process was killed or the disk filled mid-write, the
    file would be left truncated to zero bytes — all data lost with no
    error reported. Writing to a sibling temp file and renaming is atomic
    on POSIX (and near-atomic on Windows), so the original file is only
    replaced once the new content is fully written and flushed.
    """
    dir_name = os.path.dirname(os.path.abspath(path))
    os.makedirs(dir_name, exist_ok=True)

    fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=4)
        shutil.move(tmp_path, path)
    except Exception:
        # Clean up the temp file if anything went wrong
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


_EMPTY_CHATS = {"sessions": {"sessions": []}}


# ─── ConfigManager ─────────────────────────────────────────────────────────────

class ConfigManager:
    """Manages loading and accessing configuration from config.json."""

    def __init__(self, config_path: str = "config.json"):
        self.config_path = config_path
        self.config = self._load_config()

    def _load_config(self) -> dict:
        """Load configuration from JSON file.

        FIX: raises instead of returning {} on FileNotFoundError. An empty
        config causes every downstream .get() to silently return None/defaults,
        running the app in a broken state. app.py already validates the path
        exists before constructing ConfigManager, so this should never be hit
        in production — but if it is, a clear error is better than silent
        misbehaviour.
        """
        with open(self.config_path, "r") as f:
            return json.load(f)

    def save(self) -> None:
        """Save configuration to JSON file atomically."""
        _atomic_write_json(self.config_path, self.config)

    # ── Getters ───────────────────────────────────────────────────────────────

    # FIX: corrected return type hint from List[dict] to dict
    def get_basic_config(self) -> dict:
        """Get basic project configuration."""
        return self.config.get("basicConfig", {})

    def get_llm_config(self, model_name: str) -> Optional[dict]:
        """Get LLM configuration by provider name."""
        return self.config.get("llmConfig", {}).get(model_name)

    def get_ai_config(self) -> dict:
        """Get the active provider's AI configuration as a flat dict."""
        model_provider = self.get_basic_config().get("activeLlmProvider", "")
        llm_config = self.config.get("llmConfig", {}).get(model_provider, {})
        return {
            "activeLlmProvider": model_provider,
            "model":             llm_config.get("model", ""),
            "apiKey":            llm_config.get("apiKey", ""),
            "temperature":       llm_config.get("temperature", 0.7),
            "maxTokens":         llm_config.get("maxTokens", 2048),
            "chatPrompt":        llm_config.get("chatPrompt", ""),
        }

    def get_knowledge_store_files(self) -> List[dict]:
        """Get knowledge store files."""
        return self.config.get("knowledgeStoreConfig", {}).get("files", [])

    def get_tabs(self) -> List[dict]:
        """Get all tabs (standard + custom)."""
        tabs_config = self.config.get("tabsConfig", {})
        return tabs_config.get("tabs", []) + tabs_config.get("customTabs", [])

    def get_tab_by_id(self, tab_id: str) -> Optional[dict]:
        """Get a specific tab by its ID."""
        return next((t for t in self.get_tabs() if t.get("id") == tab_id), None)

    # ── Setters / mutators ────────────────────────────────────────────────────

    def set_active_llm_provider(self, provider: str) -> None:
        if "basicConfig" not in self.config:
            self.config["basicConfig"] = {}
        self.config["basicConfig"]["activeLlmProvider"] = provider
        self.save()

    def update_ai_config(self, new_ai_config: dict) -> None:
        """Update AI configuration for a provider."""
        if "llmConfig" not in self.config:
            self.config["llmConfig"] = {}
        model_name = new_ai_config.get("activeLlmProvider")
        if not model_name:
            raise ValueError("activeLlmProvider is required in AI config")
        self.config["llmConfig"][model_name] = {
            "model":       new_ai_config.get("model", ""),
            "apiKey":      new_ai_config.get("apiKey", ""),
            "temperature": new_ai_config.get("temperature", 0.7),
            "maxTokens":   new_ai_config.get("maxTokens", 2048),
            "chatPrompt":  new_ai_config.get("chatPrompt", ""),
        }
        self.save()

    def add_knowledge_store_file(
        self, file_name: str, file_path: str, feed_llm: bool = False
    ) -> None:
        if "knowledgeStoreConfig" not in self.config:
            self.config["knowledgeStoreConfig"] = {"files": []}
        if "files" not in self.config["knowledgeStoreConfig"]:
            self.config["knowledgeStoreConfig"]["files"] = []

        self.config["knowledgeStoreConfig"]["files"].append({
            "fileName": file_name,
            "filePath": file_path,
            "feedLlm":  feed_llm,
            "isProcessed": False,
            "fileData":    {},
        })
        self.save()


# ─── SessionManager ────────────────────────────────────────────────────────────

class SessionManager:
    def __init__(self, chats_file: str):
        self.chats_file = chats_file
        self.data = self._load_chats()
        self.active_session_index: Optional[int] = None

    def _load_chats(self) -> dict:
        """Load chats from JSON file. Handles missing / empty / corrupt JSON."""
        if not os.path.exists(self.chats_file):
            _atomic_write_json(self.chats_file, _EMPTY_CHATS)
            return copy.deepcopy(_EMPTY_CHATS)

        try:
            with open(self.chats_file, "r") as f:
                content = f.read().strip()

            if not content:
                logger.warning(
                    f"{self.chats_file} is empty — initializing with default structure"
                )
                _atomic_write_json(self.chats_file, _EMPTY_CHATS)
                return copy.deepcopy(_EMPTY_CHATS)

            return json.loads(content)

        except json.JSONDecodeError as e:
            logger.warning(
                f"{self.chats_file} contains invalid JSON ({e}) — resetting"
            )
            _atomic_write_json(self.chats_file, _EMPTY_CHATS)
            return copy.deepcopy(_EMPTY_CHATS)
        except Exception as e:
            logger.error(f"Error loading chats: {e}")
            return copy.deepcopy(_EMPTY_CHATS)

    def save_chats(self) -> None:
        """Save chats to JSON file atomically."""
        _atomic_write_json(self.chats_file, self.data)

    def check(self) -> dict:
        sessions = self._get_sessions_list()
        active_session = None
        if (
            self.active_session_index is not None
            and 0 <= self.active_session_index < len(sessions)
        ):
            active_session = sessions[self.active_session_index]
        return {
            "status":         self.active_session_index is not None,
            "session":        active_session,
            "total_sessions": len(sessions),
        }

    def reset(self) -> None:
        """Reset all sessions."""
        self.data = {"sessions": {"sessions": []}}
        self.active_session_index = None
        self.save_chats()

    # ── Internal accessor ─────────────────────────────────────────────────────

    def _get_sessions_list(self) -> List[dict]:
        return self.data.setdefault(
            "sessions", {}
        ).setdefault("sessions", [])

    # ── Public session API ────────────────────────────────────────────────────

    def get_sessions(self) -> List[dict]:
        """Get all sessions."""
        return self._get_sessions_list()

    def get_session_by_index(self, index: int) -> Optional[dict]:
        """Get session by index."""
        sessions = self._get_sessions_list()
        if 0 <= index < len(sessions):
            return sessions[index]
        return None

    def create_session(
        self, name: str, tags: List[str] = None, context: str = ""
    ) -> int:
        """Create a new session and return its index."""
        now = _now_utc()
        new_session = {
            "name": name,
            "history": [],
            "metadata": {
                "created_at":     now,
                "last_updated":   now,
                "total_messages": 0,
                "tags":           tags or [],
                "context":        context,
            },
        }
        sessions = self._get_sessions_list()
        sessions.append(new_session)
        self.active_session_index = len(sessions) - 1
        self.save_chats()
        return self.active_session_index

    def switch_session(self, session_index: int) -> None:
        """Switch to a different session by index."""
        sessions = self._get_sessions_list()
        if 0 <= session_index < len(sessions):
            self.active_session_index = session_index
        else:
            raise ValueError(f"Session index {session_index} does not exist")

    def delete_session(self, session_index: int) -> None:
        """Delete a session by index and update the active index."""
        sessions = self._get_sessions_list()
        if not (0 <= session_index < len(sessions)):
            raise ValueError(f"Session index {session_index} does not exist")

        sessions.pop(session_index)
        self.save_chats()

        if self.active_session_index == session_index:
            self.active_session_index = None
        elif (
            self.active_session_index is not None
            and self.active_session_index > session_index
        ):
            self.active_session_index -= 1

    def reset_session(self, session_index: int) -> None:
        """Clear history for a session."""
        session = self.get_session_by_index(session_index)
        if session:
            session["history"] = []
            session.setdefault("metadata", {})["total_messages"] = 0
            self.save_chats()

    def rename_session(self, session_index: int, new_name: str) -> None:
        """Rename a session.

        FIX: the old method didn't update last_updated — every other mutation
        method does. Added for consistency.
        """
        session = self.get_session_by_index(session_index)
        if session:
            session["name"] = new_name
            session.setdefault("metadata", {})["last_updated"] = _now_utc()
            self.save_chats()

    def add_to_history(
        self,
        message: str,
        is_ai: bool,
        timestamp: Optional[datetime.datetime] = None,
    ) -> None:
        """Add a message to the active session's history."""
        if self.active_session_index is None:
            raise ValueError("No active session. Create or switch to a session first.")

        session = self.get_session_by_index(self.active_session_index)
        if not session:
            raise ValueError("Active session not found")

        # FIX: use UTC if no explicit timestamp is given
        if timestamp is None:
            ts = _now_utc()
        else:
            # Accept a datetime object but normalise to UTC ISO string
            if timestamp.tzinfo is None:
                logger.warning(
                    "add_to_history received a naive datetime — assuming UTC"
                )
            ts = timestamp.isoformat()

        current_history = session.get("history", [])
        next_index = len(current_history)

        session["history"].append({
            "index":     str(next_index),
            "timestamp": ts,
            "message":   message,
            "is_ai":     is_ai,
        })

        session.setdefault("metadata", {}).update({
            "last_updated":   ts,
            "total_messages": len(session["history"]),
        })

        self.save_chats()

    def get_formatted_history(
        self, session_index: Optional[int] = None
    ) -> List[dict]:
        idx = session_index if session_index is not None else self.active_session_index
        if idx is None:
            raise ValueError(
                "No active session and no session_index provided."
            )

        session = self.get_session_by_index(idx)
        if not session:
            raise ValueError(f"Session index {idx} does not exist")

        return [
            {
                "index":         msg.get("index", ""),
                "message":       msg.get("message", ""),
                "is_ai":         msg.get("is_ai", False),
                "timestamp":     self._format_timestamp(msg.get("timestamp", "")),
                "timestamp_raw": msg.get("timestamp", ""),
            }
            for msg in session.get("history", [])
        ]

    # ── Metadata helpers ──────────────────────────────────────────────────────

    def update_session_context(self, session_index: int, context: str) -> None:
        session = self.get_session_by_index(session_index)
        if session and "metadata" in session:
            session["metadata"]["context"]      = context
            session["metadata"]["last_updated"] = _now_utc()
            self.save_chats()

    def add_session_tags(self, session_index: int, tags: List[str]) -> None:
        session = self.get_session_by_index(session_index)
        if session and "metadata" in session:
            existing = session["metadata"].get("tags", [])
            # FIX: use dict.fromkeys to deduplicate in one pass while preserving
            # insertion order, instead of a loop with an `in` check (O(n²)).
            session["metadata"]["tags"]         = list(dict.fromkeys(existing + tags))
            session["metadata"]["last_updated"] = _now_utc()
            self.save_chats()

    def remove_session_tags(self, session_index: int, tags: List[str]) -> None:
        session = self.get_session_by_index(session_index)
        if session and "metadata" in session:
            remove_set = set(tags)
            session["metadata"]["tags"] = [
                t for t in session["metadata"].get("tags", []) if t not in remove_set
            ]
            session["metadata"]["last_updated"] = _now_utc()
            self.save_chats()

    def get_session_metadata(self, session_index: int) -> Optional[dict]:
        session = self.get_session_by_index(session_index)
        return session.get("metadata") if session else None

    def get_session_name(self, session_index: int) -> Optional[str]:
        session = self.get_session_by_index(session_index)
        return session.get("name") if session else None

    def get_session_stats(self, session_index: int) -> Optional[dict]:
        """Get statistics for a session."""
        session = self.get_session_by_index(session_index)
        if not session:
            return None

        history  = session.get("history", [])
        metadata = session.get("metadata", {})

        # FIX: single pass instead of two separate sum() calls
        ai_messages   = sum(1 for msg in history if msg.get("is_ai"))
        user_messages = len(history) - ai_messages

        return {
            "name":           session.get("name", ""),
            "total_messages": len(history),
            "user_messages":  user_messages,
            "ai_messages":    ai_messages,
            "created_at":     metadata.get("created_at", ""),
            "last_updated":   metadata.get("last_updated", ""),
            "tags":           metadata.get("tags", []),
            "context":        metadata.get("context", ""),
        }

    def search_sessions_by_tag(self, tag: str) -> List[int]:
        """Return indices of sessions that have the given tag."""
        return [
            i for i, s in enumerate(self._get_sessions_list())
            if tag in s.get("metadata", {}).get("tags", [])
        ]

    # ── Private helpers ───────────────────────────────────────────────────────

    def _format_timestamp(self, timestamp_str: str) -> str:
        if not timestamp_str:
            return ""
        try:
            timestamp = datetime.datetime.fromisoformat(timestamp_str)
            # Normalise to UTC-aware if stored value is naive (legacy data)
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=datetime.timezone.utc)

            now          = datetime.datetime.now(datetime.timezone.utc)
            message_date = timestamp.astimezone().date()
            today        = now.astimezone().date()

            if message_date == today:
                return timestamp.astimezone().strftime("%I:%M %p")
            return timestamp.astimezone().strftime("%b %d • %A • %I:%M %p")
        except (ValueError, AttributeError):
            return timestamp_str