const API_BASE = 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('lms_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (profileData) => apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) }),

  // Dashboard
  getDashboardStats: () => apiRequest('/dashboard/stats'),

  // Books
  getBooks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/books${query ? `?${query}` : ''}`);
  },
  getCategories: () => apiRequest('/books/categories'),
  getBook: (id) => apiRequest(`/books/${id}`),
  addBook: (book) => apiRequest('/books', { method: 'POST', body: JSON.stringify(book) }),
  updateBook: (id, book) => apiRequest(`/books/${id}`, { method: 'PUT', body: JSON.stringify(book) }),
  deleteBook: (id) => apiRequest(`/books/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/students${query ? `?${query}` : ''}`);
  },
  getStudentDepartments: () => apiRequest('/students/departments'),
  getStudent: (id) => apiRequest(`/students/${id}`),
  addStudent: (student) => apiRequest('/students', { method: 'POST', body: JSON.stringify(student) }),
  updateStudent: (id, student) => apiRequest(`/students/${id}`, { method: 'PUT', body: JSON.stringify(student) }),
  deleteStudent: (id) => apiRequest(`/students/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/transactions${query ? `?${query}` : ''}`);
  },
  issueBook: (payload) => apiRequest('/transactions/issue', { method: 'POST', body: JSON.stringify(payload) }),
  returnBook: (id, payload = {}) => apiRequest(`/transactions/return/${id}`, { method: 'POST', body: JSON.stringify(payload) }),

  // Fines
  getFines: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/fines${query ? `?${query}` : ''}`);
  },
  payFine: (id, payload) => apiRequest(`/fines/pay/${id}`, { method: 'POST', body: JSON.stringify(payload) }),

  // Settings
  getSettings: () => apiRequest('/settings'),
  updateSettings: (settings) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(settings) })
};
