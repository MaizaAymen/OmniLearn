import Cookies from "js-cookie";

const API_BASE = "http://localhost:5000/api/admin";
const PUBLIC_API_BASE = "http://localhost:5000/api";

const getAuthHeaders = (includeContentType = true) => {
  const token = Cookies.get("token");
  const headers = {};
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  return response.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRADES
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchGrades = async () => {
  const response = await fetch(`${API_BASE}/grades`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchUsers = async () => {
  const response = await fetch(`${PUBLIC_API_BASE}/getAllUsers`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchGrade = async (id) => {
  const response = await fetch(`${API_BASE}/grades/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createGrade = async (data) => {
  const response = await fetch(`${API_BASE}/grades`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateGrade = async (id, data) => {
  const response = await fetch(`${API_BASE}/grades/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteGrade = async (id) => {
  const response = await fetch(`${API_BASE}/grades/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALITIES
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchSpecialities = async (gradeId = null) => {
  const url = gradeId
    ? `${API_BASE}/specialities?gradeId=${gradeId}`
    : `${API_BASE}/specialities`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchSpecialitiesByGrade = async (gradeId) => {
  const response = await fetch(`${API_BASE}/grades/${gradeId}/specialities`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchSpeciality = async (id) => {
  const response = await fetch(`${API_BASE}/specialities/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createSpeciality = async (data) => {
  const response = await fetch(`${API_BASE}/specialities`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateSpeciality = async (id, data) => {
  const response = await fetch(`${API_BASE}/specialities/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteSpeciality = async (id) => {
  const response = await fetch(`${API_BASE}/specialities/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchLevels = async (specialityId = null) => {
  const url = specialityId
    ? `${API_BASE}/levels?specialityId=${specialityId}`
    : `${API_BASE}/levels`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchLevelsBySpeciality = async (specialityId) => {
  const response = await fetch(`${API_BASE}/specialities/${specialityId}/levels`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchLevel = async (id) => {
  const response = await fetch(`${API_BASE}/levels/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createLevel = async (data) => {
  const response = await fetch(`${API_BASE}/levels`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateLevel = async (id, data) => {
  const response = await fetch(`${API_BASE}/levels/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteLevel = async (id) => {
  const response = await fetch(`${API_BASE}/levels/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchCourses = async (levelId = null) => {
  const url = levelId
    ? `${API_BASE}/courses?levelId=${levelId}`
    : `${API_BASE}/courses`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchCoursesByLevel = async (levelId) => {
  const response = await fetch(`${API_BASE}/levels/${levelId}/courses`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchCourse = async (id) => {
  const response = await fetch(`${API_BASE}/courses/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createCourse = async (data) => {
  const response = await fetch(`${API_BASE}/courses`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateCourse = async (id, data) => {
  const response = await fetch(`${API_BASE}/courses/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteCourse = async (id) => {
  const response = await fetch(`${API_BASE}/courses/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULES
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchModules = async (courseId = null) => {
  const url = courseId
    ? `${API_BASE}/modules?courseId=${courseId}`
    : `${API_BASE}/modules`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchModulesByCourse = async (courseId) => {
  const response = await fetch(`${API_BASE}/courses/${courseId}/modules`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchModule = async (id) => {
  const response = await fetch(`${API_BASE}/modules/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createModule = async (data) => {
  const response = await fetch(`${API_BASE}/modules`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateModule = async (id, data) => {
  const response = await fetch(`${API_BASE}/modules/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteModule = async (id) => {
  const response = await fetch(`${API_BASE}/modules/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// LESSONS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchLessons = async (moduleId = null) => {
  const url = moduleId
    ? `${API_BASE}/lessons?moduleId=${moduleId}`
    : `${API_BASE}/lessons`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchLessonsByModule = async (moduleId) => {
  const response = await fetch(`${API_BASE}/modules/${moduleId}/lessons`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchLesson = async (id) => {
  const response = await fetch(`${API_BASE}/lessons/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createLesson = async (data) => {
  const response = await fetch(`${API_BASE}/lessons`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateLesson = async (id, data) => {
  const response = await fetch(`${API_BASE}/lessons/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteLesson = async (id) => {
  const response = await fetch(`${API_BASE}/lessons/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const uploadLessonFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/lessons/upload`, {
    method: "POST",
    headers: getAuthHeaders(false),
    body: formData,
  });
  return handleResponse(response);
};

export const uploadLessonPdf = async (file) => {
  const formData = new FormData();
  formData.append("pdf", file);
  const response = await fetch(`${PUBLIC_API_BASE}/pdf/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSROOMS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchClassrooms = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.gradeId) params.append("gradeId", filters.gradeId);
  if (filters.specialityId) params.append("specialityId", filters.specialityId);
  if (filters.levelId) params.append("levelId", filters.levelId);

  const url = params.toString()
    ? `${API_BASE}/classrooms?${params.toString()}`
    : `${API_BASE}/classrooms`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchClassroomModules = async (classroomId) => {
  const response = await fetch(`${API_BASE}/classrooms/${classroomId}/modules`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const addClassroomModule = async (classroomId, moduleId) => {
  const response = await fetch(`${API_BASE}/classrooms/${classroomId}/modules`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ moduleId }),
  });
  return handleResponse(response);
};

export const removeClassroomModule = async (classroomId, moduleId) => {
  const response = await fetch(`${API_BASE}/classrooms/${classroomId}/modules/${moduleId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchClassroom = async (id) => {
  const response = await fetch(`${API_BASE}/classrooms/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const fetchClassroomCourses = async (id) => {
  const response = await fetch(`${API_BASE}/classrooms/${id}/courses`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createClassroom = async (data) => {
  const response = await fetch(`${API_BASE}/classrooms`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const updateClassroom = async (id, data) => {
  const response = await fetch(`${API_BASE}/classrooms/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteClassroom = async (id) => {
  const response = await fetch(`${API_BASE}/classrooms/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT ENROLLMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchAvailableStudents = async (classroomId = null) => {
  const url = classroomId
    ? `${API_BASE}/students/available?classroomId=${classroomId}`
    : `${API_BASE}/students/available`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const assignStudentsToClassroom = async (classroomId, studentIds) => {
  const response = await fetch(`${API_BASE}/classrooms/${classroomId}/students`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ studentIds }),
  });
  return handleResponse(response);
};

export const removeStudentFromClassroom = async (classroomId, studentId) => {
  const response = await fetch(
    `${API_BASE}/classrooms/${classroomId}/students/${studentId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchAdminStats = async () => {
  const response = await fetch(`${API_BASE}/stats`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};
