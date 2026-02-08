# GitHub Issues Workflow Guide

## ✅ How to Mark Issues as Done

Based on what we just accomplished, here's your workflow:

### Example: We just solved these tasks
- ✅ Fixed dashboard hardcoded data → Dynamic API integration
- ✅ Fixed transaction count limit (409 vs 539 bug)  
- ✅ Added edit functionality for Transactions
- ✅ Added edit functionality for Budgets

---

## Method 1: Close with Commit Message (RECOMMENDED)

When you commit, reference the issue number:

```bash
# Close issues #2 and #3
git commit -m "Integrate real cost analysis data in dashboard

- Fetched data from API instead of hardcoded values
- Added loading states
- Display actual transaction totals

Closes #2
Closes #3"

git push origin develop  # Issues #2 and #3 auto-close!
```

**Magic Keywords that auto-close:**
- `Closes #issue-number`
- `Fixes #issue-number`
- `Resolves #issue-number`

---

## Method 2: Close via Command Line

```bash
# Close a single issue
gh issue close 2

# Close with explanation
gh issue close 3 --comment "✅ Fixed! Chart legend now shows dynamic values from balanceData. Commit: ede386d"

# Close multiple issues
gh issue close 2 3 11 12
```

---

## Method 3: Close in Pull Request

```bash
# When creating a PR
gh pr create --title "Add Edit Functionality" --body "Closes #11, Closes #12"

# When PR merges → issues auto-close
```

---

## 🎯 Your Current Workflow

### What we just completed:

**Issue #2**: ✅ Integrate Real Cost Analysis Data
```bash
gh issue close 2 --comment "✅ Completed in commits:
- ede386d: Fix dashboard hardcoded data
- a57b775: Fix transaction limit to show all expenses
Branch: fix/dashboard-transaction-limit"
```

**Issue #3**: ✅ Fix Balance Chart Legend
```bash
gh issue close 3 --comment "✅ Completed in commit ede386d
Chart legend now calculates totals dynamically from transactions"
```

**Issue #11**: ✅ Add Edit UI for Transactions
```bash
gh issue close 11 --comment "✅ Completed in commit 5e71767
Added Edit2 icon button and modal pre-fill functionality
Branch: feature/edit-transactions-budgets"
```

**Issue #12**: ✅ Add Edit UI for Budgets  
```bash
gh issue close 12 --comment "✅ Completed in commit 5e71767
Added edit button with disabled category field
Branch: feature/edit-transactions-budgets"
```

---

## 📋 Future Workflow Template

```bash
# 1. Start working on an issue
gh issue view 5  # Read the issue
git checkout -b feature/issue-5-goals-migration

# 2. Do your work, commit with reference
git add .
git commit -m "Create goals database table and migration

- Added migration file with all columns
- Tested migration up/down
- Foreign key to users table works

Closes #5"

# 3. Push and merge
git push -u origin feature/issue-5-goals-migration
git checkout develop
git merge feature/issue-5-goals-migration
git push origin develop

# → Issue #5 automatically closes! 🎉

# 4. Clean up branch (optional)
git branch -d feature/issue-5-goals-migration
```

---

## 🔍 Useful Commands

```bash
# View all your issues
gh issue list

# View only critical priority
gh issue list --label priority-critical

# View closed issues  
gh issue list --state closed

# View specific issue details
gh issue view 5

# Reopen an issue if needed
gh issue reopen 5

# Assign issue to yourself
gh issue edit 5 --add-assignee @me

# Add labels
gh issue edit 5 --add-label "in-progress"
```

---

## 🎨 Best Practices

1. ✅ **Always reference issues in commits**
   ```bash
   git commit -m "Your changes
   
   Closes #5, Fixes #7"
   ```

2. ✅ **Use feature branches**
   ```bash
   git checkout -b feature/issue-5-description
   ```

3. ✅ **Add closing comment with details**
   ```bash
   gh issue close 5 --comment "✅ Completed! See commit abc123 and PR #10"
   ```

4. ✅ **Keep commit messages descriptive**
   - What you changed
   - Why you changed it
   - Which issue it fixes

---

## Quick Reference Card

| Action | Command |
|--------|---------|
| Close single issue | `gh issue close 5` |
| Close with comment | `gh issue close 5 --comment "Done!"` |
| Close multiple | `gh issue close 5 6 7` |
| Auto-close via commit | `git commit -m "Fixes #5"` |
| View open issues | `gh issue list` |
| View issue details | `gh issue view 5` |
| Assign to yourself | `gh issue edit 5 --add-assignee @me` |
| Reopen issue | `gh issue reopen 5` |

---

## 💡 Pro Tips

- Use milestone filters: `gh issue list --milestone "Dashboard Fixes"`
- Use label filters: `gh issue list --label priority-critical`
- Link related PRs: Include "Related to #5" in PR descriptions
- Close issues from feature branch, they'll close when merged to develop
