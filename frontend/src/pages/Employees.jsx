import { useEffect, useMemo, useState } from "react";
import {
    getUsers,
    getMyTeam,
    getManagers,
    assignManager,
    removeManager,
    createUser,
    updateUser,
    deleteUser,
} from "../services/api";

const emptyForm = {
    name: "",
    email: "",
    mobile: "",
    role: "ROLE_MEMBER",
    department: "Development",
    status: "ACTIVE",
    managerId: "",
    password: "123456",
};

export default function Employees() {
    const [employees, setEmployees] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [managers, setManagers] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedEmpForAssign, setSelectedEmpForAssign] = useState(null);

    // Safe user role check
    const rawUser = localStorage.getItem("user");
    let user = { role: "ROLE_MEMBER" };
    try {
        if (rawUser) user = JSON.parse(rawUser);
    } catch (_) {}
    const isAdmin = user.role === "ROLE_ADMIN";
    const isManager = user.role === "ROLE_MANAGER";
    const isMember = user.role === "ROLE_MEMBER";

    const fetchEmployees = async () => {
        setLoading(true);
        setError("");

        if (isManager) {
            try {
                const res = await getMyTeam();
                setEmployees(res.data || []);
            } catch (err) {
                console.error("My team load error:", err);
                setError(err.message || "Failed to load your team");
                setEmployees([]);
            }
        } else if (isAdmin) {
            try {
                const res = await getUsers();
                setEmployees(res.data || []);
            } catch (err) {
                console.error("Employees load error:", err);
                const msg = err.backendOffline ? "Backend not running" : err.message || "Failed to load";
                setError(msg);
                setEmployees([]);
            }
        } else {
            setError("Permission denied");
            setLoading(false);
            return;
        }
        setLoading(false);
    };

    const fetchManagers = async () => {
        if (!isAdmin) return;
        try {
            const res = await getManagers();
            setManagers(res.data || []);
        } catch (err) {
            console.error("Managers load error:", err);
        }
    };

    useEffect(() => {
        fetchEmployees();
        if (isAdmin) fetchManagers();
    }, []);

    const filteredEmployees = useMemo(() => {
        const q = search.toLowerCase();

        return employees.filter((emp) => {
            const text = `${emp.name || ""} ${emp.email || ""} ${emp.mobile || ""} ${emp.role || ""
                } ${emp.department || ""}`.toLowerCase();

            return text.includes(q);
        });
    }, [employees, search]);

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(
        (e) => e.status === "ACTIVE" || !e.status
    ).length;
    const pendingEmployees = employees.filter((e) => e.status === "PENDING").length;

    const handleChange = (e) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const validate = () => {
        if (!form.name.trim()) return "Employee name is required.";
        if (!form.email.trim()) return "Email is required.";
        if (!form.mobile.trim()) return "Mobile number is required.";
        if (!form.role) return "Role is required.";
        if (!form.department) return "Department is required.";
        if (!editingId && !form.password.trim()) return "Password is required.";
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAdmin) {
            setError("You do not have permission to manage employees.");
            return;
        }

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            mobile: form.mobile.trim(),
            role: form.role,
            department: form.department,
            status: form.status || "ACTIVE",
        };

        // Manager ID logic
        if (form.role === "ROLE_MEMBER" && form.managerId) {
            payload.managerId = Number(form.managerId);
        } else {
            payload.managerId = null;
        }

        // Password logic for update
        if (editingId && !form.password.trim()) {
            delete payload.password;
        } else {
            payload.password = form.password.trim() || "123456";
        }

        console.log("Save employee payload:", payload, editingId ? "UPDATE" : "CREATE");

        setSaving(true);
        setError("");

        try {
            if (editingId) {
                const res = await updateUser(editingId, payload);
                setEmployees((prev) =>
                    prev.map((emp) => (emp.id === editingId ? res.data : emp))
                );
            } else {
                const res = await createUser(payload);
                setEmployees((prev) => [res.data, ...prev]);
            }

            setForm(emptyForm);
            setEditingId(null);
        } catch (err) {
            console.error("Employee save error:", err.response?.data || err);
            let errorMsg = err.message || "Failed to save employee.";
            if (err.response?.status === 404) {
                errorMsg = "Update API not found. Please add PUT /api/users/{id} in backend.";
            }
            setError(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (emp) => {
        if (!isAdmin) return;
        setEditingId(emp.id);

        setForm({
            name: emp.name || "",
            email: emp.email || "",
            mobile: emp.mobile || "",
            role: emp.role || "ROLE_MEMBER",
            department: emp.department || "Development",
            status: emp.status || "ACTIVE",
            managerId: emp.managerId || "",
            password: "",
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
    };

    const handleDelete = async (id) => {
        if (!isAdmin) return;
        const ok = window.confirm("Are you sure you want to delete this employee?");
        if (!ok) return;

        try {
            await deleteUser(id);
            setEmployees((prev) => prev.filter((emp) => emp.id !== id));
        } catch (err) {
            console.error("Delete error:", err);
            alert(err.message || "Failed to delete employee.");
        }
    };

    const handleAssignManager = async (empId, managerId) => {
        try {
            await assignManager(empId, managerId);
            fetchEmployees();
            setShowAssignModal(false);
        } catch (err) {
            alert(err.message || "Failed to assign manager");
        }
    };

    if (isMember) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <h1 style={{ fontSize: '24px', marginBottom: 16 }}>Team</h1>
                <p style={{ fontSize: '16px', marginBottom: 24 }}>Contact your manager for team management.</p>
            </div>
        );
    }

    const pageTitle = isManager ? "My Team" : "Employee Management";
    const pageSubtitle = isManager ? "Employees assigned to you by admin" : "Manage employees, roles and team members.";

    return (
        <div className="employee-page">
            <div className="employee-header">
                <div>
                    <h1>{pageTitle}</h1>
                    <p>{pageSubtitle}</p>
                </div>

                <div className="employee-stats">
                    <div className="stat-box">
                        <span>Total</span>
                        <strong>{totalEmployees}</strong>
                    </div>

                    <div className="stat-box">
                        <span>Active</span>
                        <strong className="green">{activeEmployees}</strong>
                    </div>

                    <div className="stat-box">
                        <span>Pending</span>
                        <strong className="orange">{pendingEmployees}</strong>
                    </div>
                </div>
            </div>

            {!isManager && (
                <div className="employee-card">
                    <h3>
                        <span className="card-icon">👤</span>
                        {editingId ? "Edit Employee" : "Add New Employee"}
                    </h3>

                    {error && <div className="employee-error">⚠ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="employee-form-grid">
                            <div className="field">
                                <label>Full Name *</label>
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div className="field">
                                <label>Email Address *</label>
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="employee@email.com"
                                />
                            </div>
                            <div className="field">
                                <label>Mobile Number *</label>
                                <input
                                    name="mobile"
                                    value={form.mobile}
                                    onChange={handleChange}
                                    placeholder="+91 XXXXX XXXXX"
                                />
                            </div>
                            <div className="field">
                                <label>Role *</label>
                                <select name="role" value={form.role} onChange={handleChange}>
                                    <option value="ROLE_MEMBER">Member</option>
                                    <option value="ROLE_MANAGER">Manager</option>
                                    <option value="ROLE_ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Department *</label>
                                <select
                                    name="department"
                                    value={form.department}
                                    onChange={handleChange}
                                >
                                    <option value="Development">Development</option>
                                    <option value="Design">Design</option>
                                    <option value="Testing">Testing</option>
                                    <option value="HR">HR</option>
                                    <option value="Management">Management</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Status</label>
                                <select name="status" value={form.status} onChange={handleChange}>
                                    <option value="ACTIVE">Active</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>

                            {isAdmin && form.role === "ROLE_MEMBER" && (
                                <div className="field">
                                    <label>Assign Manager</label>
                                    <select name="managerId" value={form.managerId || ""} onChange={handleChange}>
                                        <option value="">— Unassigned —</option>
                                        {managers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {!editingId && (
                                <div className="field">
                                    <label>Password *</label>
                                    <input
                                        name="password"
                                        type="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="Default password"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="employee-actions">
                            <button type="submit" className="primary-btn" disabled={saving}>
                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Employee"
                                        : "Create Employee"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div className="employee-table-card">
                <div className="table-top">
                    <h3>Employees ({filteredEmployees.length})</h3>

                    <div className="search-box">
                        <span>🔍</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search employee..."
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="empty-box">Loading employees...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="empty-box">
                        {search ? "No matching employees found" : "No employees available"}
                    </div>
                ) : (
                    <div className="table-scroll">
                        <table className="employee-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Mobile</th>
                                    <th>Role</th>
                                    <th>Department</th>
                                    <th>Manager</th>
                                    <th>Manager Email</th>
                                    <th>Status</th>
                                    <th className="right">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredEmployees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td>
                                            <div className="employee-name">{emp.name}</div>
                                            <div className="employee-email">{emp.email}</div>
                                        </td>

                                        <td>{emp.mobile || "—"}</td>

                                        <td>
                                            <span className="role-badge">
                                                {(emp.role || "ROLE_MEMBER").replace("ROLE_", "")}
                                            </span>
                                        </td>

                                        <td>{emp.department || "—"}</td>

                                        <td>
                                            <span className="role-badge" style={{backgroundColor: 'var(--purple-light)', color: 'var(--purple)'}}>
                                                {emp.manager ? emp.manager.name : "Unassigned"}
                                            </span>
                                        </td>
                                        <td>{emp.manager ? emp.manager.email : "—"}</td>
                                        <td>
                                            <span
                                                className={`status-badge ${emp.status === "INACTIVE"
                                                        ? "inactive"
                                                        : emp.status === "PENDING"
                                                            ? "pending"
                                                            : "active"
                                                    }`}
                                            >
                                                {emp.status || "ACTIVE"}
                                            </span>
                                        </td>

                                        <td className="right">
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => {
                                                            setSelectedEmpForAssign(emp);
                                                            setShowAssignModal(true);
                                                        }}
                                                    >
                                                        Assign
                                                    </button>
                                                    {emp.manager && (
                                                        <button
                                                            className="icon-btn"
                                                            onClick={async () => {
                                                                if (confirm("Remove manager?")) {
                                                                    await removeManager(emp.id);
                                                                    fetchEmployees();
                                                                }
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <button
                                                className="icon-btn edit"
                                                onClick={() => handleEdit(emp)}
                                                disabled={isManager}
                                            >
                                                Edit
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    className="icon-btn delete"
                                                    onClick={() => handleDelete(emp.id)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
