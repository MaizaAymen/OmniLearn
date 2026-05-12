import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button, Result, Spin } from "antd";

const API_BASE = "http://localhost:5000/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setErrorMsg("No verification token found in the link.");
      setStatus("error");
      return;
    }

    fetch(`${API_BASE}/auth/verify-email?token=${token}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus("success");
        } else {
          setErrorMsg(data.error || "Verification failed.");
          setStatus("error");
        }
      })
      .catch(() => {
        setErrorMsg("Network error. Please try again.");
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Spin size="large" tip="Verifying your email..." />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f2f5" }}>
        <Result
          status="success"
          title="Email Verified!"
          subTitle="Your email address has been successfully verified."
          extra={
            <Button type="primary" onClick={() => navigate("/profile")}>
              Go to Profile
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f2f5" }}>
      <Result
        status="error"
        title="Verification Failed"
        subTitle={errorMsg}
        extra={
          <Button type="primary" onClick={() => navigate("/profile")}>
            Back to Profile
          </Button>
        }
      />
    </div>
  );
}
