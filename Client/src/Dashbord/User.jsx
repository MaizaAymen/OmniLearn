import React from "react";
import { Tabs } from "antd";

// Onglets centralisés sur la page /users :
//   • Users by Plan → vue détaillée (charts + table + édition)
//   • Free Tier → choix des problèmes visibles aux users free
//   • Pro Tier → choix des problèmes visibles aux users pro
import FreeTierTab from "../Admin/FreeTierTab";
import ProTierTab from "../Admin/ProTierTab";
import UsersByPlanOverview from "./UsersByPlanOverview";

// ─────────────────────────────────────────────────────────────────────────────
// /users — DASHBOARD UTILISATEURS (admin)
// On a remplacé l'ancien "Overview" par la vue "Users by Plan" qui couvre
// désormais à la fois les charts et la liste des utilisateurs.
// ─────────────────────────────────────────────────────────────────────────────
const User = () => {
    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
                    User Management
                </h1>
                <p style={{ fontSize: 16, color: "#6b7280" }}>
                    Manage and monitor all registered users, plan tiers and access rights.
                </p>
            </div>

            <Tabs
                defaultActiveKey="by-plan"
                items={[
                    {
                        key: "by-plan",
                        label: "Users by Plan",
                        children: <UsersByPlanOverview />,
                    },
                    {
                        key: "free-tier",
                        label: "Free Tier",
                        children: <FreeTierTab />,
                    },
                    {
                        key: "pro-tier",
                        label: "Pro Tier",
                        children: <ProTierTab />,
                    },
                ]}
            />
        </div>
    );
};

export default User;
