# Cursor Rules & Agent Directives

This document outlines a set of rules and best practices for the AI agent, derived from debugging and development sessions. The goal is to improve accuracy, reduce errors, and build user trust by learning from past mistakes.

---

### Rule 1: The "First Principles" Checklist for Debugging
- **Trigger:** Any bug involving external services, environment, or configuration (e.g., authentication, APIs, databases, build tools).
- **Action:** Before modifying application logic, systematically verify the fundamentals. Do not assume the environment is correct.
  1.  **Environment (`.env`):** Confirm that environment variable files exist and are correctly loaded. Add temporary `console.log` checks for the presence and prefix of critical variables.
  2.  **Configuration & Connectivity:** Verify that API keys and URLs are correct. Ensure the service (e.g., Supabase) is reachable.
  3.  **Build System:** Ensure the file structure and naming conventions match the build tool's expectations (e.g., `.ts` for plain TypeScript, `.tsx` for files containing JSX). This was the cause of a major build failure.

---

### Rule 2: The "Three Strikes" Rule for Failing Tools
- **Trigger:** An automated tool (`edit_file`, `search_replace`, etc.) fails more than **once** on the same file for the same conceptual task.
- **Action:** Stop. Do not attempt a third time. The tool is unreliable for the given task. Immediately pivot to providing the user with the complete, final code for the file in a single, unambiguous markdown block for manual copy-pasting. Acknowledge the tool failure and state that manual application is now the most reliable method. This prevents frustrating the user with repeated failed attempts.

---

### Rule 3: Mandate "Single Source of Truth" for Global State
- **Trigger:** Any state that must be shared across multiple, non-parent/child components (e.g., user authentication, theme, shopping cart).
- **Action:** Immediately implement a React Context and Provider at the highest necessary level in the component tree (`App.tsx` or `main.tsx`). Do not allow individual components to manage their own separate instances of what should be global state. This was the root cause of the UI's failure to update.

---

### Rule 4: The "Loading Gate" Pattern for Async Providers
- **Trigger:** Implementing a context provider that fetches data asynchronously on its initial load (e.g., an `AuthProvider` checking a user's session).
- **Action:** The root component consuming the context **must** check an `isLoading` or `isInitialized` flag from that context. It must render a loading state (e.g., a full-page spinner) and prevent the rest of the app's UI from rendering until initialization is complete. This prevents all child components from rendering with incomplete, default, or "logged-out" state.

---

### Rule 5: Unambiguous Instructions for Manual Edits
- **Trigger:** When providing code for the user to apply manually (as a result of Rule 2).
- **Action:** Always provide the **entire file content** in a single, clean code block. Start with a clear instruction like: "Please replace the entire content of `path/to/file.tsx` with the following:". Avoid providing diffs, partial snippets, or multi-step instructions for a single file's content, as this can lead to confusion. 