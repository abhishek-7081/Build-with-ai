import { API_URL } from "../constants/config";

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, options);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// Authentication Services
export async function signupUser({ name, phone, password }) {
  return request("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, password })
  });
}

export async function loginUser({ phone, password }) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  });
}

export async function loginDepartmentApi({ department, password }) {
  return request("/auth/department-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ department, password })
  });
}

// Complaints Services
export async function fetchComplaints() {
  return request("/complaints");
}

export async function fetchMyComplaints(token) {
  return request("/citizen/my-complaints", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function fetchComplaintReports(complaintId) {
  return request(`/complaints/${complaintId}/reports`);
}

export async function submitComplaint(formData, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return request("/complaints", {
    method: "POST",
    headers,
    body: formData
  });
}

export async function updateComplaintStatus(complaintId, status, note, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return request(`/complaints/${complaintId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status, note })
  });
}

export async function supportComplaint(complaintId, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return request(`/complaints/${complaintId}/support`, {
    method: "POST",
    headers
  });
}

export async function fetchComments(complaintId) {
  return request(`/complaints/${complaintId}/comments`);
}

export async function postComment(complaintId, commentText, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return request(`/complaints/${complaintId}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ commentText })
  });
}

export async function fetchNearbyComplaints(lat, lng, radius = 1.5) {
  return request(`/complaints/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
}

export async function fetchAnalytics() {
  return request("/analytics");
}

export async function analyzeDescriptionTest(description) {
  return request("/analyze-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description })
  });
}
