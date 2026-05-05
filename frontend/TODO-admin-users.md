# Admin User Management + Disable Signup ✅

## File Changes:
```
1. src/services/api.js → Add user APIs
2. src/pages/Users.jsx → NEW (Admin only user management)
3. src/pages/Signup.jsx → Disable + "Contact admin" message
4. src/App.jsx → /users route + protected signup
5. src/components/Navbar.jsx → Users navlink for ADMIN only
```

## Plan Details:
**api.js APIs:**
```
getAllUsers()
createUserByAdmin(data) → POST /api/users
[Future: promoteToManager, etc.]
```

**Users.jsx Features:**
```
ADMIN only → User table + Create modal
Fields: name, email, password, role dropdown (MANAGER/EMPLOYEE)
```

**Routing:**
```
Admin: /users → Users page
Non-admin: /users → "Access denied"
Signup: /signup → "Disabled - contact admin"
```

**Navbar:**
```
isAdmin ? Show Users link : Hide
```

**Steps:**
- [x] 1. Create TODO ✅
- [ ] 2. api.js user APIs
- [ ] 3. Users.jsx page
- [ ] 4. Signup disable 
- [ ] 5. App.jsx routes
- [ ] 6. Navbar update
- [ ] 7. Test

**Ready to implement**
