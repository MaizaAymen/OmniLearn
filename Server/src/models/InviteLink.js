const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ─────────────────────────────────────────────────────────────────────────────
// MODÈLE INVITE LINK
// Lien d'invitation que l'institution_admin (ou un teacher) génère pour
// inviter un teacher OU un student à rejoindre l'institution.
//
// Exemple d'URL côté frontend :
//   https://omnilearn.app/join/<token>
// ─────────────────────────────────────────────────────────────────────────────
const InviteLink = sequelize.define(
  "InviteLink",
  {
    // ÉTAPE 1 : token aléatoire qu'on met dans l'URL
    token: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    // ÉTAPE 2 : à quelle institution appartient ce lien
    institutionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // ÉTAPE 3 : qui a créé ce lien (admin ou prof)
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // ÉTAPE 4 : rôle attribué à la personne qui clique sur le lien
    role: {
      type: DataTypes.ENUM("teacher", "student"),
      allowNull: false,
    },
    // ÉTAPE 5 : compteur d'utilisations
    usedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // ÉTAPE 6 : nombre maximum d'utilisations (0 = illimité)
    maxUses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // ÉTAPE 7 : date d'expiration (null = jamais)
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ÉTAPE 8 : permet à l'admin de désactiver un lien sans le supprimer
    revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // ÉTAPE 9 : si non null → invitation personnelle (un seul utilisateur ciblé).
    // L'utilisateur reçoit aussi une notification in-app avec ce lien.
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "invite_links",
    timestamps: true,
  }
);

module.exports = InviteLink;
