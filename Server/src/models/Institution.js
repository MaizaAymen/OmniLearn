const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ─────────────────────────────────────────────────────────────────────────────
// MODÈLE INSTITUTION
// Représente une école / université / centre de formation.
// Le "institution_admin" est le propriétaire (le directeur).
// Les "teacher" et "student" sont liés via users.institutionId.
// ─────────────────────────────────────────────────────────────────────────────
const Institution = sequelize.define(
  "Institution",
  {
    // ÉTAPE 1 : identifiant unique de l'institution
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // ÉTAPE 2 : nom affiché (ex: "Lycée Voltaire")
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // ÉTAPE 3 : utilisateur qui possède l'institution (rôle institution_admin)
    adminUserId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // ÉTAPE 4 : nombre de places autorisées (0 = illimité)
    seatLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // ÉTAPE 5 : on peut désactiver une institution sans la supprimer
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // ── PROFIL INSTITUTION ────────────────────────────────────────────────
    // Métadonnées affichées sur la page profil et utiles pour l'onboarding.
    type: {
      type: DataTypes.ENUM("school", "university", "training_center", "company"),
      allowNull: false,
      defaultValue: "school",
    },
    logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "institutions",
    timestamps: true,
  }
);

module.exports = Institution;
