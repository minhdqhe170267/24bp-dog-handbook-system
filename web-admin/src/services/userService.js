import api from './api';

const buildQuery = (page = 0, size = 20, search = '') => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('size', String(size));
  params.append('sort', 'updatedAt,desc');
  params.append('sort', 'createdAt,desc');
  if (search?.trim()) params.append('search', search.trim());
  return params.toString();
};

const normalizeRole = (role) => String(role || '').toUpperCase();

const fetchAllUsers = async (search = '', size = 200) => {
  const rows = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const response = await api.get(`/users?${buildQuery(page, size, search)}`);
    const pageData = response?.data || {};
    const content = Array.isArray(pageData.content) ? pageData.content : [];
    rows.push(...content);
    totalPages = Number.isFinite(pageData.totalPages) ? pageData.totalPages : 1;
    page += 1;
  }

  return rows;
};

export const userService = {
  getAll: (page = 0, size = 20, search = '') => api.get(`/users?${buildQuery(page, size, search)}`),
  getAllByRole: async (role, search = '') => {
    const allUsers = await fetchAllUsers(search);
    const targetRole = normalizeRole(role);
    if (!targetRole) return allUsers;
    return allUsers.filter((item) => normalizeRole(item?.role) === targetRole);
  },
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleLock: (id) => api.put(`/users/${id}/toggle-lock`),
};
