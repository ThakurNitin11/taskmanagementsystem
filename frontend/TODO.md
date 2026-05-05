# TaskManager Frontend: Manager-Employee Assignment System

## Approved Plan Steps (Breakdown)

### Step 1: Update API (src/services/api.js)
- Add 4 new exports: getManagers, getMyTeam, assignManager, removeManager
- Status: [x] Complete

### Step 2: Update Employees Page (src/pages/Employees.jsx)
- Add role-based logic (Admin/Manager/Member)
- Admin: Manager dropdown in form (ROLE_MEMBER only), Manager columns (name/email), Assign/Remove actions/modal
- Manager: "My Team" view with getMyTeam(), hide form, read-only table
- Member: Denied access
- Status: [x] Complete

### Step 3: Update Tasks Page (src/pages/Tasks.jsx)
- Role-based members: Admin=getMembers (all), Manager=getMyTeam (team only)
- Update assignee filter/table/modal to use filtered members
- Hide create for Member (already partial)
- Status: [x] Complete

### Step 4: Test & Verify
- Admin: Full employees mgmt + assign, tasks all assignees
- Manager: My Team read-only, tasks team assignees only
- Member: Employees denied, tasks view-only
- `npm run dev` + manual tests
- Status: [ ] Pending

### Step 5: Complete
- attempt_completion

**Progress: 3/5**  
*Current Step: 4/5*

