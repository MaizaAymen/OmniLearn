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
export const createInstitution = (body) =>
  call(`/plan/institutions`, { method: "POST", body: JSON.stringify(body) });

// Institution admin
export const fetchInviteLinks = (id) => call(`/plan/institutions/${id}/invite-links`);
export const createInviteLink = (id, body) =>
  call(`/plan/institutions/${id}/invite-links`, { method: "POST", body: JSON.stringify(body) });
export const revokeInviteLink = (token) =>
  call(`/plan/invite-links/${token}`, { method: "DELETE" });
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
