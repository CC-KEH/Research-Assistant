# Todos

- [ ] Hover Effect like, Viewer Tabs, on all buttons and options.

---

# Project Structure
```
/Root
├── Library/                    # Global knowledge base
│   ├── Papers/                 # Raw research papers (PDFs, etc.)
│   ├── Notes/                  # General-purpose notes
│   ├── Summaries/              # Summaries of Library Papers
│   ├── Highlights/             # Annotated excerpts, quotes
│   ├── Tags.json               # Optional: central tag list for organization
│   └── Metadata.json           # Metadata for library-wide content
│
├── Projects/                   # Focused research projects
│   └── ProjectName/
│       ├── Papers/
│       ├── Notes/
│       ├── Summaries/
│       ├── Board/              # Mindmaps, kanban boards, ideas
│       ├── Todos.json          # Local project todos
│       ├── Metadata.json       # Tags, LLM config, goals, etc.
│       └── Highlights/         # Project-specific highlights or quotes
│
├── Bookmarks/                  # Bookmarked notes, quotes, or insights
├── Queries/                    # Saved chat prompts or semantic questions
├── Datasets/                   # CSVs, JSON, external data used in analysis
├── Experiments/                # Logs, prompt tests, LLM configs, Codes
├── Todos/                      # Global research todos
├── Trash/                      # Soft delete storage
└── Config/                     # App-wide config (user prefs, themes, LLM creds)

```