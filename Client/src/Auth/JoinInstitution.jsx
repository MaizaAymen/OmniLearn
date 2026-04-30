import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, Result, Spin, Tag, Typography, message } from "antd";
import Cookies from "js-cookie";
import { acceptInvite, fetchInvitePreview } from "../Admin/planApi";

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// PAGE : /join-institution/:token
// L'utilisateur arrive ici en cliquant sur un lien d'invitation envoyé par
// l'institution_admin. On lui montre :
//   - le nom de l'institution
//   - le rôle qu'il aura (teacher / student)
//   - un bouton "Accepter" (ou redirection vers /auth s'il n'est pas connecté).
// ─────────────────────────────────────────────────────────────────────────────
const JoinInstitution = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // ÉTAPE 1 : on récupère les infos publiques du lien (nom + rôle).
  useEffect(() => {
    fetchInvitePreview(token)
      .then((data) => {
        if (data.error) setError(data.error);
        else setPreview(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // ÉTAPE 2 : accepter le lien.
  const onAccept = async () => {
    // Si pas connecté → on envoie sur /auth en stockant le token pour revenir ici.
    if (!Cookies.get("token")) {
      Cookies.set("pendingInvite", token);
      return navigate("/auth");
    }
    try {
      const res = await acceptInvite(token);
      message.success("Welcome to your new institution!");
      // ÉTAPE 3 : on met à jour le cookie user pour refléter le nouveau plan/role.
      const user = JSON.parse(Cookies.get("user") || "{}");
      Cookies.set("user", JSON.stringify({
        ...user,
        plan: "institution",
        role: res.role,
        institutionId: res.institutionId,
      }));
      setDone(true);
      setTimeout(() => navigate("/my-classrooms"), 1500);
    } catch (err) {
      message.error(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;

  if (error || !preview) {
    return (
      <Result status="error" title="Invalid invitation"
        subTitle={error || "This invite link is no longer valid."}
        extra={<Button type="primary" onClick={() => navigate("/")}>Go home</Button>} />
    );
  }

  if (done) {
    return <Result status="success" title="You're in!" subTitle="Redirecting…" />;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <Card style={{ maxWidth: 480, width: "100%" }}>
        <Title level={3}>You've been invited</Title>
        <Text>
          You've been invited to join <b>{preview.institutionName}</b> as a{" "}
          <Tag color={preview.role === "teacher" ? "blue" : "green"}>{preview.role}</Tag>.
        </Text>
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <Button type="primary" size="large" onClick={onAccept}>Accept invitation</Button>
          <Button size="large" onClick={() => navigate("/")}>Maybe later</Button>
        </div>
      </Card>
    </div>
  );
};

export default JoinInstitution;
