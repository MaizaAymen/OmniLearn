import axios from "axios";
import Cookies from "js-cookie";
import { SERVER_URL } from "../config";

const BASE = `${SERVER_URL}/api/roadmap`;

const auth = () => ({
  headers: { Authorization: `Bearer ${Cookies.get("token")}` },
});

export const roadmapApi = {
  me:           ()           => axios.get(`${BASE}/me`, auth()).then((r) => r.data),
  list:         ()           => axios.get(`${BASE}/list`, auth()).then((r) => r.data),
  saveProfile:  (payload)    => axios.put(`${BASE}/profile`, payload, auth()).then((r) => r.data),
  generate:     ()           => axios.post(`${BASE}/generate`, {}, auth()).then((r) => r.data),
  switchTo:     (id)         => axios.post(`${BASE}/switch/${id}`, {}, auth()).then((r) => r.data),
  deleteRoadmap:(id)         => axios.delete(`${BASE}/${id}`, auth()).then((r) => r.data),
  rename:       (id, title)  => axios.patch(`${BASE}/${id}/title`, { title }, auth()).then((r) => r.data),
  setStatus:    (nodeId, status) =>
    axios.post(`${BASE}/node/${nodeId}/status`, { status }, auth()).then((r) => r.data),
  quizSubmit:      (nodeId, score) =>
    axios.post(`${BASE}/node/${nodeId}/quiz-submit`, { score }, auth()).then((r) => r.data),
  issueCertificate: () =>
    axios.post(`${BASE}/certificate/issue`, {}, auth()).then((r) => r.data),
  resources:    (nodeId)     => axios.get(`${BASE}/node/${nodeId}/resources`, auth()).then((r) => r.data),

  // ── Classroom roadmap (teacher publishes, every student gets a copy) ────────
  classroom: {
    get:        (classId)               => axios.get(`${BASE}/classroom/${classId}`, auth()).then((r) => r.data),
    dashboard:  (classId)               => axios.get(`${BASE}/classroom/${classId}/dashboard`, auth()).then((r) => r.data),
    generate:   (classId, payload)      => axios.post(`${BASE}/classroom/${classId}/generate`, payload, auth()).then((r) => r.data),
    remove:     (classId)               => axios.delete(`${BASE}/classroom/${classId}`, auth()).then((r) => r.data),
    setStatus:  (classId, nodeId, status) =>
      axios.post(`${BASE}/classroom/${classId}/node/${nodeId}/status`, { status }, auth()).then((r) => r.data),
    quizSubmit: (classId, nodeId, score)  =>
      axios.post(`${BASE}/classroom/${classId}/node/${nodeId}/quiz-submit`, { score }, auth()).then((r) => r.data),
  },
};
