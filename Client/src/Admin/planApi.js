import Cookies from "js-cookie";

// Toutes les requêtes liées aux plans et aux institutions.
const BASE = "http://localhost:5000/api";

const headers = () => {
  const token = Cookies.get("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const call = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, { headers: headers(), ...opts });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
};

// User
export const fetchMyPlan = () => call(`/plan/me/plan`);
export const upgradeToPro = () => call(`/plan/upgrade/pro`, { method: "POST" });
export const upgradeToInstitution = () => call(`/plan/upgrade/institution`, { method: "POST" });

// Stripe
export const createCheckoutSession = (plan) =>
  call(`/stripe/create-checkout-session`, {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
export const verifyStripeSession = (sessionId) =>
  call(`/stripe/verify/${sessionId}`);

// Super admin
export const fetchUsersByPlan = (plan) =>
  call(`/plan/super-admin/users-by-plan${plan ? `?plan=${plan}` : ""}`);
// Vue riche : détails complets de chaque user + stats globales pour les charts.
export const fetchUsersOverview = () =>
  call(`/plan/super-admin/users-overview`);
export const createInstitution = (body) =>
  call(`/plan/institutions`, { method: "POST", body: JSON.stringify(body) });

// Onboarding : créer sa propre institution après paiement
export const selfCreateInstitution = (body) =>
  call(`/plan/institutions/self-create`, { method: "POST", body: JSON.stringify(body) });

// Institution admin : profil + édition
export const fetchInstitution = (id) => call(`/plan/institutions/${id}`);
export const updateInstitution = (id, body) =>
  call(`/plan/institutions/${id}`, { method: "PATCH", body: JSON.stringify(body) });

// Institution admin
export const fetchInviteLinks = (id) => call(`/plan/institutions/${id}/invite-links`);
export const createInviteLink = (id, body) =>
  call(`/plan/institutions/${id}/invite-links`, { method: "POST", body: JSON.stringify(body) });
export const revokeInviteLink = (token) =>
  call(`/plan/invite-links/${token}`, { method: "DELETE" });
export const inviteUserByEmail = (id, body) =>
  call(`/plan/institutions/${id}/invite-user`, { method: "POST", body: JSON.stringify(body) });
export const searchUsers = (q) => call(`/plan/users/search?q=${encodeURIComponent(q)}`);
export const fetchInstitutionMembers = (id) => call(`/plan/institutions/${id}/members`);

// Invite (public preview / accept)
export const fetchInvitePreview = (token) =>
  fetch(`${BASE}/plan/invite/${token}`).then((r) => r.json());
export const acceptInvite = (token) => call(`/plan/invite/${token}/accept`, { method: "POST" });

// Problèmes (free-tier / pro-tier toggles)
export const fetchAllProblems = () => call(`/ai/ai/getallproblems?status=all`);
export const setProblemFreeTier = (id, isFreeTier) =>
  call(`/ai/ai/problems/${id}`, { method: "PATCH", body: JSON.stringify({ isFreeTier }) });
export const setProblemProTier = (id, isProTier) =>
  call(`/ai/ai/problems/${id}`, { method: "PATCH", body: JSON.stringify({ isProTier }) });

// Command center / Stats / Classrooms / Members / Announcements / Analytics
export const fetchInstitutionStats = (id) => call(`/plan/institutions/${id}/stats`);
export const fetchInstitutionClassrooms = (id, filters = {}) => {
  const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  return call(`/plan/institutions/${id}/classrooms${q ? `?${q}` : ""}`);
};
export const fetchClassroomAudit = (id, classId) =>
  call(`/plan/institutions/${id}/classrooms/${classId}/audit`);
export const setClassroomActive = (id, classId, isActive) =>
  call(`/plan/institutions/${id}/classrooms/${classId}`, {
    method: "PATCH", body: JSON.stringify({ isActive }),
  });
export const removeMember = (id, userId) =>
  call(`/plan/institutions/${id}/members/${userId}`, { method: "DELETE" });
export const fetchAnnouncements = (id) => call(`/plan/institutions/${id}/announcements`);
export const createAnnouncement = (id, body) =>
  call(`/plan/institutions/${id}/announcements`, { method: "POST", body: JSON.stringify(body) });
export const deleteAnnouncement = (id, annId) =>
  call(`/plan/institutions/${id}/announcements/${annId}`, { method: "DELETE" });
export const fetchAnalytics = (id) => call(`/plan/institutions/${id}/analytics`);

// ─── Curriculum propre à l'institution (Grades / Specialities / Levels) ─────
const CURR = (id) => `/institution-curriculum/${id}`;

export const fetchInstitutionGrades = (id) => call(`${CURR(id)}/grades`);
export const createInstitutionGrade = (id, body) =>
  call(`${CURR(id)}/grades`, { method: "POST", body: JSON.stringify(body) });
export const updateInstitutionGrade = (id, gradeId, body) =>
  call(`${CURR(id)}/grades/${gradeId}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteInstitutionGrade = (id, gradeId) =>
  call(`${CURR(id)}/grades/${gradeId}`, { method: "DELETE" });

export const fetchInstitutionSpecialities = (id, gradeId) =>
  call(`${CURR(id)}/specialities${gradeId ? `?gradeId=${gradeId}` : ""}`);
export const createInstitutionSpeciality = (id, body) =>
  call(`${CURR(id)}/specialities`, { method: "POST", body: JSON.stringify(body) });
export const updateInstitutionSpeciality = (id, specId, body) =>
  call(`${CURR(id)}/specialities/${specId}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteInstitutionSpeciality = (id, specId) =>
  call(`${CURR(id)}/specialities/${specId}`, { method: "DELETE" });

export const fetchInstitutionLevels = (id, specialityId) =>
  call(`${CURR(id)}/levels${specialityId ? `?specialityId=${specialityId}` : ""}`);
export const createInstitutionLevel = (id, body) =>
  call(`${CURR(id)}/levels`, { method: "POST", body: JSON.stringify(body) });
export const updateInstitutionLevel = (id, levelId, body) =>
  call(`${CURR(id)}/levels/${levelId}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteInstitutionLevel = (id, levelId) =>
  call(`${CURR(id)}/levels/${levelId}`, { method: "DELETE" });

export const seedInstitutionCurriculum = (id) =>
  call(`${CURR(id)}/seed-from-defaults`, { method: "POST" });

// Banque de problèmes propres à l'institution
export const fetchInstitutionProblems = () =>
  call(`/ai/ai/getallproblems?status=all&scope=institution`);
export const createInstitutionProblem = (body) =>
  call(`/ai/ai/problems`, {
    method: "POST",
    body: JSON.stringify({ ...body, scope: "institution" }),
  });
export const deleteInstitutionProblem = (id) =>
  call(`/ai/ai/deletepromblem/${id}`, { method: "DELETE" });
