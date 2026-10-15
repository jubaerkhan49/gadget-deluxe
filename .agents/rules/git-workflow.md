# Git Workflow Rule

After completing any task, verification, or modification requested by the user:
1. Stage all changes (`git add -A`), ensuring credentials and sensitive files (like `*service-account*.json`) remain ignored.
2. Commit with a concise and descriptive message describing what was accomplished.
3. Push immediately to the remote branch (`git push origin <branch>`).
