#!/bin/bash

# TrackFinance - Automated GitHub Issues Creation Script
# This script creates all 18 issues automatically using GitHub CLI (gh)
#
# Prerequisites:
# 1. Install GitHub CLI: https://cli.github.com/
# 2. Authenticate: gh auth login
# 3. Make this script executable: chmod +x create_issues.sh
# 4. Run: ./create_issues.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   TrackFinance Issue Creation Script      ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo -e "${YELLOW}Install it from: https://cli.github.com/${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${BLUE}Repository: ${REPO}${NC}"
echo ""

# Confirm before proceeding
read -p "This will create 18 issues. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Creating milestones...${NC}"

# Create Milestones
gh api repos/${REPO}/milestones -f title="Dashboard Fixes" -f description="Fix critical dashboard mock data issues" -f state="open" 2>/dev/null || echo "Milestone 'Dashboard Fixes' may already exist"
gh api repos/${REPO}/milestones -f title="Goals System" -f description="Complete goals CRUD functionality" -f state="open" 2>/dev/null || echo "Milestone 'Goals System' may already exist"
gh api repos/${REPO}/milestones -f title="Edit Functionality" -f description="Add edit capability for transactions and budgets" -f state="open" 2>/dev/null || echo "Milestone 'Edit Functionality' may already exist"
gh api repos/${REPO}/milestones -f title="Enhanced UX" -f description="Filters, search, pagination, token handling" -f state="open" 2>/dev/null || echo "Milestone 'Enhanced UX' may already exist"
gh api repos/${REPO}/milestones -f title="Settings & Profile" -f description="User profile management" -f state="open" 2>/dev/null || echo "Milestone 'Settings & Profile' may already exist"

echo -e "${GREEN}✅ Milestones created${NC}"
echo ""
echo -e "${BLUE}Creating labels...${NC}"

# Create Labels (if they don't exist)
gh label create "priority-critical" --color "d73a4a" --description "Critical priority" --force 2>/dev/null || true
gh label create "priority-high" --color "d93f0b" --description "High priority" --force 2>/dev/null || true
gh label create "priority-medium" --color "fbca04" --description "Medium priority" --force 2>/dev/null || true
gh label create "backend" --color "5319e7" --description "Backend related" --force 2>/dev/null || true
gh label create "frontend" --color "1d76db" --description "Frontend related" --force 2>/dev/null || true
gh label create "database" --color "a2eeef" --description "Database related" --force 2>/dev/null || true
gh label create "enhancement" --color "0075ca" --description "New feature" --force 2>/dev/null || true
gh label create "bug" --color "d73a4a" --description "Bug fix" --force 2>/dev/null || true
gh label create "ui" --color "bfdadc" --description "UI/UX related" --force 2>/dev/null || true
gh label create "api" --color "0e8a16" --description "API related" --force 2>/dev/null || true
gh label create "security" --color "ee0701" --description "Security related" --force 2>/dev/null || true

echo -e "${GREEN}✅ Labels created${NC}"
echo ""
echo -e "${BLUE}Creating issues...${NC}"
echo ""

# Counter
ISSUE_COUNT=0

# Issue #1
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Cost Analysis Endpoint...${NC}"
gh issue create \
  --title "Implement Cost Analysis by Category Endpoint" \
  --milestone "Dashboard Fixes" \
  --label "backend,enhancement,priority-critical,api" \
  --body "**Priority:** P0-Critical
**Estimate:** 1-2 hours

## Description
Create an analytics endpoint that aggregates transactions by category to replace hardcoded cost analysis data on the dashboard.

## Acceptance Criteria
- [ ] GET /api/v1/transactions/analytics/by-category endpoint exists
- [ ] Returns array of {category, amount, percentage}
- [ ] Calculates percentage based on total expenses
- [ ] Supports optional date range filters (start_date, end_date)
- [ ] Only returns data for authenticated user

## Implementation Hints
**Backend (app/api/routes/transactions.py):**
1. Create new endpoint with date range parameters
2. Query user's transactions (filter by user_id)
3. Apply date filters if provided
4. Group by category using SQLAlchemy \`group_by()\`
5. Calculate sum for each category using \`func.sum()\`
6. Calculate total expenses
7. Calculate percentage for each category
8. Return formatted response

**Schema:**
1. Create CategoryAnalyticsResponse schema with:
   - category: str
   - amount: Decimal
   - percentage: float
   - transaction_count: int

## Testing Checklist
- [ ] Endpoint returns 401 without authentication
- [ ] Returns empty array for user with no transactions
- [ ] Percentages sum to 100%
- [ ] Date filters work correctly
- [ ] Handles multiple categories correctly

## Resources
- SQLAlchemy aggregation: https://docs.sqlalchemy.org/en/20/tutorial/data_select.html#aggregates
- FastAPI query parameters: https://fastapi.tiangulo.com/tutorial/query-params/"

# Issue #2
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Dashboard Integration...${NC}"
gh issue create \
  --title "Integrate Real Cost Analysis Data in Dashboard" \
  --milestone "Dashboard Fixes" \
  --label "frontend,enhancement,priority-critical,ui" \
  --body "**Priority:** P0-Critical
**Estimate:** 1 hour

## Description
Replace hardcoded cost analysis data with real API data from the analytics endpoint.

## Acceptance Criteria
- [ ] Removes hardcoded costData array (Dashboard.tsx lines 74-81)
- [ ] Fetches data from /api/v1/transactions/analytics/by-category
- [ ] Displays loading state while fetching
- [ ] Shows error message if fetch fails
- [ ] Updates chart when data changes

## Implementation Hints
**API Integration (src/api/index.ts):**
1. Add \`getTransactionsByCategory()\` function
2. Accept optional date range parameters

**Dashboard Component (src/pages/Dashboard.tsx):**
1. Create state: costData, loading, error
2. Add useEffect to fetch on mount
3. Update chart component with real data
4. Add loading skeleton
5. Add error boundary/fallback

## Testing Checklist
- [ ] Chart displays correctly with real data
- [ ] Loading state shows while fetching
- [ ] Error message shows on API failure
- [ ] Chart updates when transactions change
- [ ] Empty state shows when no data

## Dependencies
Depends on: #1 (Backend endpoint must be complete first)"

# Issue #3
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Balance Chart Legend Fix...${NC}"
gh issue create \
  --title "Fix Balance Chart Legend with Calculated Values" \
  --milestone "Dashboard Fixes" \
  --label "frontend,bug,priority-critical,ui" \
  --body "**Priority:** P0-Critical
**Estimate:** 30 minutes

## Description
Replace hardcoded MAD values (350, 700, 400) in balance chart legend with values calculated from actual balanceData.

## Acceptance Criteria
- [ ] Legend shows actual total income from data
- [ ] Legend shows actual total expenses from data
- [ ] Legend shows actual total savings (income - expenses)
- [ ] Values update when data changes
- [ ] Formatting shows MAD currency properly

## Implementation Hints
**Dashboard Component (src/pages/Dashboard.tsx):**
1. Create helper function \`calculateTotals(balanceData)\`
2. Use \`reduce()\` to sum income transactions
3. Use \`reduce()\` to sum expense transactions
4. Calculate \`savings = income - expenses\`
5. Replace hardcoded values in legend (lines 168-183)
6. Format values with \`toFixed(2)\` for currency

## Testing Checklist
- [ ] Legend shows correct totals
- [ ] Values match chart data
- [ ] Updates when balanceData changes
- [ ] Currency formatting is correct (MAD)"

# Issue #4
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Dynamic Progress Colors...${NC}"
gh issue create \
  --title "Add Dynamic Color to Monthly Spending Progress" \
  --milestone "Dashboard Fixes" \
  --label "frontend,enhancement,priority-high,ui" \
  --body "**Priority:** P1-High
**Estimate:** 30 minutes

## Description
Monthly spending progress bar should change color based on percentage spent (green → blue → orange → red).

## Acceptance Criteria
- [ ] Progress bar is emerald-600 when < 60% spent
- [ ] Progress bar is blue-600 when 60-80% spent
- [ ] Progress bar is orange-600 when 80-100% spent
- [ ] Progress bar is red-600 when > 100% spent
- [ ] Matches budget card color scheme

## Implementation Hints
Create helper function in Dashboard.tsx:
\`\`\`typescript
function getProgressColor(percentage: number): string {
  if (percentage < 60) return 'bg-emerald-600'
  if (percentage < 80) return 'bg-blue-600'
  if (percentage < 100) return 'bg-orange-600'
  return 'bg-red-600'
}
\`\`\`

Apply to progress bar at line 237 based on \`(totalExpenses / monthlyLimit) * 100\`

## Testing Checklist
- [ ] Color changes at correct thresholds
- [ ] Matches budget page color scheme
- [ ] Works with 0% and 100%+ values"

# Issue #5
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Goals Database Migration...${NC}"
gh issue create \
  --title "Create Goals Database Table and Migration" \
  --milestone "Goals System" \
  --label "backend,database,enhancement,priority-high" \
  --body "**Priority:** P1-High
**Estimate:** 30 minutes

## Description
Create the goals table in PostgreSQL to store user financial goals.

## Acceptance Criteria
- [ ] Migration file created
- [ ] Goals table exists with all required columns
- [ ] Foreign key to users table works
- [ ] Migration runs successfully
- [ ] Can rollback migration

## Implementation Hints
1. Run: \`alembic revision -m \"create goals table\"\`
2. Add columns: id, user_id (FK), name, icon, target_amount, current_amount, deadline, category, timestamps
3. Add downgrade() to drop table
4. Run: \`alembic upgrade head\`
5. Verify in database

## Testing Checklist
- [ ] Migration runs without errors
- [ ] Table exists in database
- [ ] Foreign key constraint works
- [ ] Can rollback: \`alembic downgrade -1\`
- [ ] Timestamps auto-populate

## Resources
- Alembic docs: https://alembic.sqlalchemy.org/en/latest/tutorial.html"

# Issue #6
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Goal Model & Schemas...${NC}"
gh issue create \
  --title "Create Goal Model and Schemas" \
  --milestone "Goals System" \
  --label "backend,enhancement,priority-high" \
  --body "**Priority:** P1-High
**Estimate:** 1 hour

## Description
Create SQLAlchemy model for goals and Pydantic schemas for request/response validation.

## Acceptance Criteria
- [ ] Goal model exists in app/models/goal.py
- [ ] GoalCreate schema for POST requests
- [ ] GoalUpdate schema for PATCH requests
- [ ] GoalResponse schema with calculated fields
- [ ] Model relationship to User works
- [ ] Progress percentage calculates correctly

## Implementation Hints
**Model (app/models/goal.py):**
- Create Goal class inheriting from Base
- Define all columns matching migration
- Add relationship: \`user = relationship(\"User\", back_populates=\"goals\")\`

**Update User model:**
- Add: \`goals = relationship(\"Goal\", back_populates=\"user\")\`

**Schemas (app/schemas/goal.py):**
- GoalBase with common fields
- GoalCreate(GoalBase) - for POST (no id, timestamps)
- GoalUpdate(BaseModel) - all Optional fields
- GoalResponse(GoalBase) - includes id, timestamps, progress_percentage

Use Pydantic validator to calculate progress_percentage automatically.

## Testing Checklist
- [ ] Can import Goal model
- [ ] Can create goal instance
- [ ] Schemas validate correctly
- [ ] Progress percentage calculates accurately
- [ ] Rejects invalid data (negative amounts, etc.)

## Dependencies
Depends on: #5 (Migration must be complete first)"

# Issue #7
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Goals CRUD API...${NC}"
gh issue create \
  --title "Implement Goals CRUD API Endpoints" \
  --milestone "Goals System" \
  --label "backend,enhancement,api,priority-high" \
  --body "**Priority:** P1-High
**Estimate:** 2 hours

## Description
Create RESTful API endpoints for goal management (Create, Read, Update, Delete).

## Acceptance Criteria
- [ ] GET /api/v1/goals/ - List user's goals
- [ ] POST /api/v1/goals/ - Create new goal
- [ ] GET /api/v1/goals/{id} - Get specific goal
- [ ] PATCH /api/v1/goals/{id} - Update goal
- [ ] DELETE /api/v1/goals/{id} - Delete goal
- [ ] POST /api/v1/goals/{id}/contribute - Add to current_amount
- [ ] All endpoints require authentication
- [ ] Users can only access their own goals

## Implementation Hints
Create \`app/api/routes/goals.py\` with all CRUD endpoints.

**Key validations:**
- target_amount > 0
- deadline in future (for new goals)
- verify ownership before update/delete
- return 201 for create, 204 for delete

**Contribute endpoint:**
- Accept amount parameter
- Validate amount > 0
- Add to current_amount
- Check if goal reached (current >= target)
- Award XP if goal completed

Register routes in \`app/main.py\`

## Testing Checklist
- [ ] Can create goal
- [ ] Can list goals
- [ ] Can get single goal
- [ ] Can update goal
- [ ] Can delete goal
- [ ] Can contribute to goal
- [ ] Returns 401 without auth
- [ ] Returns 404 for non-existent goal
- [ ] Returns 403 for other user's goal
- [ ] Validates input correctly

## API Documentation
Test at http://localhost:8000/docs after implementation

## Dependencies
Depends on: #6 (Model and schemas must exist)"

# Issue #8
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Goals Frontend UI...${NC}"
gh issue create \
  --title "Build Goals Frontend UI" \
  --milestone "Goals System" \
  --label "frontend,enhancement,ui,priority-high" \
  --body "**Priority:** P1-High
**Estimate:** 2-3 hours

## Description
Create complete frontend UI for goals management including list view, create/edit modals, and dashboard integration.

## Acceptance Criteria
- [ ] Goals page exists at /goals route
- [ ] Displays all user goals in cards
- [ ] Create goal modal works
- [ ] Edit goal modal works
- [ ] Delete goal works with confirmation
- [ ] Progress bars show correct percentages
- [ ] Dashboard shows top 3 active goals
- [ ] Contribute to goal functionality works

## Implementation Hints

**1. API Functions (src/api/index.ts):**
Add functions for all CRUD operations + contribute

**2. Goals Page (src/pages/Goals.tsx):**
- Grid layout of goal cards
- Each card shows: icon, name, progress bar, current/target amounts, days remaining, edit/delete buttons
- \"Create Goal\" button in header
- Empty state when no goals

**3. Goal Modal Component:**
- Reusable for create and edit
- Form fields: name, icon, target amount, deadline, category
- Validation: required fields, positive amounts, future dates

**4. Update Dashboard:**
- Replace hardcoded goals section
- Fetch top 3 active goals
- Show progress bars
- Add \"View All\" link to /goals

**5. Contribute Feature:**
- \"Add Money\" button on goal cards
- Modal with amount input
- Updates current_amount

## Testing Checklist
- [ ] Can create goal with all fields
- [ ] Can edit existing goal
- [ ] Can delete goal (shows confirmation)
- [ ] Progress bar shows correct percentage
- [ ] Deadline calculates days remaining correctly
- [ ] Dashboard shows real goals
- [ ] Can contribute money to goal
- [ ] Form validation works
- [ ] Loading states show appropriately
- [ ] Empty states display correctly

## Design Notes
Use purple theme for goals (matches achievements)
Progress bar colors: Green (0-50%), Blue (50-80%), Purple (80-99%), Emerald (100%)

## Dependencies
Depends on: #7 (Backend API must be complete)"

# Issue #9
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Transaction Update Endpoint...${NC}"
gh issue create \
  --title "Add Update Endpoint for Transactions" \
  --milestone "Edit Functionality" \
  --label "backend,enhancement,api,priority-high" \
  --body "**Priority:** P1-High
**Estimate:** 1-2 hours

## Description
Implement PATCH endpoint to allow updating existing transactions, with proper budget recalculation.

## Acceptance Criteria
- [ ] PATCH /api/v1/transactions/{id} endpoint exists
- [ ] Verifies transaction ownership
- [ ] Updates budget when amount changes
- [ ] Updates budgets when category changes
- [ ] Returns updated transaction
- [ ] Uses database transaction for atomicity

## Implementation Hints

**Create TransactionUpdate schema:**
All fields optional (amount, category, type, description)
Validate amount > 0 if provided

**Endpoint logic:**
1. Get transaction, verify ownership
2. Store old values (amount, category, type) for budget adjustment
3. Update transaction fields
4. If amount/category/type changed:
   - Reverse old budget impact
   - Apply new budget impact
5. Commit with database transaction
6. Return updated transaction

**Budget adjustment logic:**
- If old transaction was expense: subtract old amount from old category budget
- If new transaction is expense: add new amount to new category budget
- Handle transactions moved to categories with no budget

## Testing Checklist
- [ ] Can update transaction amount
- [ ] Can update transaction category
- [ ] Can update transaction type
- [ ] Budget updates correctly when amount changes
- [ ] Budget updates when category changes
- [ ] Returns 404 for non-existent transaction
- [ ] Returns 403 for other user's transaction
- [ ] Validates positive amounts
- [ ] Database transaction rolls back on error

## Edge Cases
- Transaction moved to category with no budget
- Amount increased beyond budget limit
- Concurrent updates to same transaction"

# Issue #10
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Budget Update Endpoint...${NC}"
gh issue create \
  --title "Add Update Endpoint for Budgets" \
  --milestone "Edit Functionality" \
  --label "backend,enhancement,api,priority-high" \
  --body "**Priority:** P1-High
**Estimate:** 1 hour

## Description
Implement PATCH endpoint to allow updating existing budgets, primarily the monthly limit.

## Acceptance Criteria
- [ ] PATCH /api/v1/budgets/{id} endpoint exists
- [ ] Can update monthly_limit
- [ ] Verifies budget ownership
- [ ] Returns updated budget
- [ ] Validates limit > 0

## Implementation Hints

**Create BudgetUpdate schema:**
- monthly_limit: Optional[Decimal]
- Validate limit > 0 if provided

**Endpoint:**
- Get budget, verify ownership
- Update monthly_limit if provided
- current_spent remains unchanged
- Return updated budget

## Testing Checklist
- [ ] Can update monthly limit
- [ ] Returns 404 for non-existent budget
- [ ] Returns 403 for other user's budget
- [ ] Validates positive limit
- [ ] current_spent remains unchanged"

# Issue #11
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Transaction Edit UI...${NC}"
gh issue create \
  --title "Add Edit UI for Transactions" \
  --milestone "Edit Functionality" \
  --label "frontend,enhancement,ui,priority-high" \
  --body "**Priority:** P1-High
**Estimate:** 1-2 hours

## Description
Add edit functionality to transaction cards, allowing users to modify existing transactions.

## Acceptance Criteria
- [ ] Edit button visible on each transaction
- [ ] Edit modal opens with pre-filled data
- [ ] Can modify amount, category, type, description
- [ ] Saves changes to backend
- [ ] Updates UI without page refresh
- [ ] Shows loading state during save
- [ ] Displays success/error messages

## Implementation Hints

**1. Update API (src/api/index.ts):**
Add \`updateTransaction(id, data)\` function

**2. Transactions Page:**
- Add edit icon button to each transaction card
- Add state for \`editingTransaction\` and \`isEditMode\`
- Reuse create transaction modal component
- When edit clicked: set editingTransaction, open modal with pre-filled values
- On submit: call updateTransaction if edit mode, else createTransaction
- Refresh transaction list after save

**3. Modal Pre-fill Logic:**
Use useEffect to populate form when editingTransaction changes

## Testing Checklist
- [ ] Edit button appears on transactions
- [ ] Modal opens with correct data
- [ ] Can change all fields
- [ ] Updates save to backend
- [ ] Transaction list refreshes
- [ ] Loading state shows during save
- [ ] Success message displays
- [ ] Can cancel edit
- [ ] Form resets when switching create/edit

## UI Notes
- Edit icon: PencilIcon from heroicons
- Modal title: \"Edit Transaction\" vs \"Create Transaction\"
- Submit button: \"Update\" vs \"Create\"

## Dependencies
Depends on: #9 (Backend endpoint must exist)"

# Issue #12
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Budget Edit UI...${NC}"
gh issue create \
  --title "Add Edit UI for Budgets" \
  --milestone "Edit Functionality" \
  --label "frontend,enhancement,ui,priority-high" \
  --body "**Priority:** P1-High
**Estimate:** 1 hour

## Description
Add edit functionality to budget cards, allowing users to modify monthly limits.

## Acceptance Criteria
- [ ] Edit button visible on each budget card
- [ ] Edit modal opens with pre-filled data
- [ ] Can modify monthly limit
- [ ] Saves changes to backend
- [ ] Updates UI without page refresh
- [ ] Shows current spent amount (read-only)

## Implementation Hints

Similar pattern to transactions:
1. Add \`updateBudget\` to API functions
2. Add edit icon to budget cards
3. Reuse budget modal component
4. Pre-fill with existing data
5. Update on submit if edit mode
6. Refresh budget list

**Important:**
- Category should be read-only (can't change category)
- current_spent is display-only
- Only monthly_limit is editable

## Testing Checklist
- [ ] Edit button appears
- [ ] Modal pre-fills correctly
- [ ] Category is read-only
- [ ] Can update monthly limit
- [ ] Updates save successfully
- [ ] Budget list refreshes

## Dependencies
Depends on: #10 (Backend endpoint must exist)"

# Issue #13
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Transaction Filtering Backend...${NC}"
gh issue create \
  --title "Add Transaction Filtering Backend" \
  --milestone "Enhanced UX" \
  --label "backend,enhancement,api,priority-medium" \
  --body "**Priority:** P2-Medium
**Estimate:** 1-2 hours

## Description
Enhance GET /transactions/ endpoint to support filtering by category, type, date range, and search.

## Acceptance Criteria
- [ ] Accepts query parameters: category, type, start_date, end_date, search
- [ ] Filters results based on provided parameters
- [ ] Returns total count for pagination
- [ ] Maintains backward compatibility (filters optional)

## Implementation Hints

Update GET /transactions/ to return:
\`\`\`json
{
  \"total\": 156,
  \"transactions\": [...],
  \"skip\": 0,
  \"limit\": 20
}
\`\`\`

**Filter implementation:**
- category: exact match
- type: exact match (income/expense)
- start_date: created_at >= start_date
- end_date: created_at < end_date + 1 day
- search: ilike on description (case-insensitive)

**Combine filters with AND logic**

## Testing Checklist
- [ ] No filters returns all transactions
- [ ] Category filter works
- [ ] Type filter works
- [ ] Date range filter works
- [ ] Search filter works (case-insensitive)
- [ ] Multiple filters work together
- [ ] Total count is accurate
- [ ] Pagination works with filters"

# Issue #14
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Transaction Filter UI...${NC}"
gh issue create \
  --title "Add Transaction Filter UI" \
  --milestone "Enhanced UX" \
  --label "frontend,enhancement,ui,priority-medium" \
  --body "**Priority:** P2-Medium
**Estimate:** 2-3 hours

## Description
Add filter controls to transactions page for category, type, date range, and search.

## Acceptance Criteria
- [ ] Filter panel above transaction list
- [ ] Search input with debouncing
- [ ] Category dropdown
- [ ] Type filter (All/Income/Expense)
- [ ] Date range picker (start and end)
- [ ] Clear filters button
- [ ] Filters persist during session
- [ ] URL parameters reflect active filters

## Implementation Hints

**1. Filter State:**
Create state object with search, category, type, startDate, endDate

**2. Debounced Search:**
Use custom debounce hook (wait 300ms after user stops typing)

**3. Filter UI:**
Grid layout with all filter inputs
Update state onChange for each filter
Call API when any filter changes

**4. Clear Filters:**
Reset all filters to empty/default values

## Testing Checklist
- [ ] Search filters transactions
- [ ] Category filter works
- [ ] Type filter works
- [ ] Date range works
- [ ] Multiple filters work together
- [ ] Clear filters resets all
- [ ] Filters don't interfere with pagination
- [ ] Debouncing prevents excessive API calls

## Design Notes
- Compact filter layout on desktop
- Stack vertically on mobile
- Show active filter count badge
- Highlight active filters

## Dependencies
Depends on: #13 (Backend filtering must be implemented)"

# Issue #15
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Token Expiry Handling...${NC}"
gh issue create \
  --title "Implement Token Expiry Handling" \
  --milestone "Enhanced UX" \
  --label "frontend,security,enhancement,priority-medium" \
  --body "**Priority:** P2-Medium
**Estimate:** 30 minutes - 1 hour

## Description
Add Axios interceptor to handle JWT token expiry, automatically redirecting users to login when token expires.

## Acceptance Criteria
- [ ] 401 responses trigger automatic logout
- [ ] User redirected to /login
- [ ] Token removed from localStorage
- [ ] No console errors on 401
- [ ] Works across all API calls

## Implementation Hints

**Update API client (src/api/index.ts):**

Add response interceptor:
\`\`\`typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
\`\`\`

Also add request interceptor to automatically include token in all requests.

## Testing Checklist
- [ ] Expired token redirects to login
- [ ] Invalid token redirects to login
- [ ] Token removed from localStorage
- [ ] User can login again after redirect
- [ ] Other errors don't trigger logout (403, 404, 500)

## Optional Enhancements
- Show \"Session expired\" message
- Remember redirect path to return after login
- Implement refresh token flow"

# Issue #16
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Pagination...${NC}"
gh issue create \
  --title "Add Pagination to Transactions" \
  --milestone "Enhanced UX" \
  --label "frontend,enhancement,ui,priority-medium" \
  --body "**Priority:** P2-Medium
**Estimate:** 2 hours

## Description
Add pagination controls to transactions page with page numbers and page size selector.

## Acceptance Criteria
- [ ] Pagination controls below transaction list
- [ ] Shows current page and total pages
- [ ] Previous/Next buttons
- [ ] Page number buttons (show 5 at a time)
- [ ] Page size selector (10, 20, 50, 100)
- [ ] Maintains filters when changing pages
- [ ] Disables Previous on first page
- [ ] Disables Next on last page

## Implementation Hints

**Pagination State:**
- currentPage (default 1)
- pageSize (default 20)
- totalCount (from API response)
- totalPages = Math.ceil(totalCount / pageSize)

**Update Fetch:**
Pass skip = (currentPage - 1) * pageSize and limit = pageSize

**Pagination Component:**
- Page size selector dropdown
- Previous button (disabled when currentPage === 1)
- Page numbers (show 5 at a time, highlight current)
- Next button (disabled when currentPage === totalPages)
- Info text: \"Showing X to Y of Z\"

## Testing Checklist
- [ ] Pagination shows correct page numbers
- [ ] Can navigate between pages
- [ ] Can change page size
- [ ] Previous disabled on page 1
- [ ] Next disabled on last page
- [ ] Page count updates when filters change
- [ ] Shows correct \"showing X to Y of Z\"

## Design Notes
- Purple theme for active page
- Gray for disabled buttons
- Mobile: stack controls vertically

## Dependencies
Depends on: #13 (Backend must return total count)"

# Issue #17
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: User Profile Update Endpoint...${NC}"
gh issue create \
  --title "Add User Profile Update Endpoint" \
  --milestone "Settings & Profile" \
  --label "backend,enhancement,api,priority-medium" \
  --body "**Priority:** P2-Medium
**Estimate:** 1-2 hours

## Description
Allow users to update their email, username, and password through PATCH /api/v1/users/me endpoint.

## Acceptance Criteria
- [ ] Can update email
- [ ] Can update username
- [ ] Can change password (requires current password)
- [ ] Validates password strength
- [ ] Hashes new password
- [ ] Returns updated user (without password)

## Implementation Hints

**Create UserUpdate schema:**
- email: Optional[EmailStr]
- username: Optional[str]
- current_password: Optional[str]
- new_password: Optional[str]

**Validations:**
- Username min 3 characters
- New password requires current password
- New password min 8 characters
- Check email not already registered (by another user)

**Endpoint logic:**
1. Check email uniqueness if changing
2. Update email/username if provided
3. If changing password:
   - Verify current password
   - Hash new password
   - Update hashed_password

## Testing Checklist
- [ ] Can update email
- [ ] Can update username
- [ ] Can change password
- [ ] Rejects duplicate email
- [ ] Rejects short username
- [ ] Rejects weak password
- [ ] Requires current password for password change
- [ ] Verifies current password is correct
- [ ] New password is hashed
- [ ] Response doesn't include password

## Security Notes
- Consider rate limiting (max 10 requests/hour)
- Log password changes for audit
- Optional: email verification for email changes"

# Issue #18
((ISSUE_COUNT++))
echo -e "${YELLOW}[$ISSUE_COUNT/18] Creating: Settings Page...${NC}"
gh issue create \
  --title "Create Settings Page" \
  --milestone "Settings & Profile" \
  --label "frontend,enhancement,ui,priority-medium" \
  --body "**Priority:** P2-Medium
**Estimate:** 2-3 hours

## Description
Create settings page where users can manage their profile information, change password, and configure preferences.

## Acceptance Criteria
- [ ] Settings page accessible from sidebar
- [ ] Profile information section (email, username)
- [ ] Password change section
- [ ] Preferences section (notifications, display)
- [ ] Form validation
- [ ] Success/error messages
- [ ] Changes save to backend

## Implementation Hints

**Create Settings Page (src/pages/Settings.tsx):**

**Sections:**
1. Profile Information
   - Display/edit email and username
   - Save button

2. Security
   - Current password
   - New password
   - Confirm new password
   - Validate passwords match

3. Preferences
   - Email notifications (checkbox)
   - Budget warnings (checkbox)
   - Achievement alerts (checkbox)
   - Save to localStorage

**Load current user data on mount**
**Update localStorage after profile changes**

**Add to Navigation:**
Update Sidebar.tsx with Settings link and Cog6ToothIcon

## Testing Checklist
- [ ] Can access settings page
- [ ] Profile form pre-fills with user data
- [ ] Can update email
- [ ] Can update username
- [ ] Can change password
- [ ] Password confirmation works
- [ ] Success messages show
- [ ] Error messages show for validation failures
- [ ] Preferences save to localStorage
- [ ] Preferences persist across sessions

## Design Notes
- Consistent card layout
- Purple accent for buttons
- Clear section separation
- Mobile responsive

## Dependencies
Depends on: #17 (Backend endpoint must exist)"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Successfully created 18 issues!       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. View issues: ${YELLOW}gh issue list${NC}"
echo -e "2. Start with Priority 0 (Critical): ${YELLOW}gh issue list --label priority-critical${NC}"
echo -e "3. Assign yourself: ${YELLOW}gh issue edit <issue-number> --add-assignee @me${NC}"
echo -e "4. Create feature branch: ${YELLOW}git checkout -b feature/issue-1-cost-analysis${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
