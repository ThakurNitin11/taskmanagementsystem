import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || `${import.meta.env.VITE_API_URL}/api/auth/login`;
console.log('API base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', response.config.url);
    return response;
  },
  (error) => {
    const isAuthRequest = error.config?.url?.includes('/auth/');
    
    if (!error.response && (error.code === 'ERR_NETWORK' || error.message.includes('Network Error'))) {
      console.error('🚫 Backend offline:', BASE_URL);
      error.backendOffline = true;
      error.message = 'Backend server not running. Start Spring Boot on port 8080.';
    }

    if (!isAuthRequest && error.response?.status === 401) {
      console.log('🔓 Token expired - logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (!isAuthRequest && error.response?.status === 403) {
      console.error('🚫 403 Forbidden:', error.config?.url, error.response?.data);
      error.message = 'You do not have permission to access this resource.';
    }

    console.error('❌ API Error:', error.config?.url, error.message);
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data);
export const signup = (data) => api.post('/auth/signup', data);

// ─── Dashboard ─────────────────────────────────────────
export const getDashboard = () => api.get('/dashboard');

// ─── Suggestions ───────────────────────────────────────
export const getSuggestions = () => api.get('/suggestions');

// ─── Employees / Users ─────────────────────────────────
export const getUsers = () => api.get('/users');
export const getAllUsers = () => api.get('/users');
export const getMembers = () => api.get('/users/members');
export const getAllMembers = () => api.get('/users/members');

export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

  // ─── Manager-Employee Assignments ────────────────────────
  export const getManagers = () => api.get('/users/managers');
  export const getMyTeam = () => api.get('/users/my-team');
  export const assignManager = (employeeId, managerId) =>
    api.put(`/users/${employeeId}/assign-manager/${managerId}`);
  export const removeManager = (employeeId) =>
    api.put(`/users/${employeeId}/remove-manager`);

// ─── Projects ──────────────────────────────────────────
export const getProjects = () => api.get('/projects');
export const getProjectById = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// ─── Project Members ──────────────────────────────────
export const getProjectMembers = (projectId) =>
  api.get(`/projects/${projectId}/members`);

export const updateProjectMembers = (projectId, data) =>
  api.put(`/projects/${projectId}/members`, data);

// ─── Tasks ─────────────────────────────────────────────
export const getAllTasks = () => api.get('/tasks');
export const getMyTasks = () => api.get('/tasks/my');
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

export const updateTaskStatus = (id, status) =>
  api.put(`/tasks/${id}/status`, { status });

// ─── Task Attachments ─────────────────────────────────
export const getTaskAttachments = (taskId) => api.get(`/tasks/${taskId}/attachments`);
export const uploadTaskAttachment = (taskId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteAttachment = (attachmentId) => api.delete(`/tasks/attachments/${attachmentId}`);

export default api;
