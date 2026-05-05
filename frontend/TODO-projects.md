# Project Assignment Flow Update

## Steps

### Step 1: Update CreateProjectModal (Projects.jsx)
- Remove members checkbox
- Manager dropdown: getManagers() for admin
- Payload: {name, description, managerId: Number(form.managerId)}
- Status: [x] Complete

### Step 2: Update main Projects page role logic
- isAdmin/isManager from localStorage
- Manager: Title "My Projects", filter projects where project.managerId === user.id
- Project card: Manager name, members count
- Manager btn "Manage Members" -> modal with getMyTeam()
- Status: [x] Complete

### Step 3: Update ManageMembersModal
 - Manager: team = getMyTeam(), projectMembers = getProjectMembers(projectId)
 - Checklist team only, checked if in projectMembers
 - Save: updateProjectMembers(projectId, { memberIds })
 - Status: [x] Complete

### Step 4: Test
- Admin: Create project manager only, card shows manager
- Manager: My Projects assigned, Manage Members from team
- `npm run dev`
- Status: [ ] 

**Progress: 0/4 Current: 1/4**

