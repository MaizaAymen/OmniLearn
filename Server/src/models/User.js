const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");
const { BCRYPT_ROUNDS } = require("../config");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstname: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    lastname: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // ── ÉTAPE 1 : rôle de l'utilisateur ────────────────────────────────────
    // "admin"             = super admin de la plateforme (voit TOUT le monde)
    // "institution_admin" = admin d'UNE institution (voit seulement ses membres)
    // "teacher"           = prof dans une institution
    // "student"           = élève (peut être solo ou dans une institution)
    role: {
      type: DataTypes.ENUM("admin", "institution_admin", "teacher", "student"),
      allowNull: false,
      defaultValue: "student",
    },
    // ── ÉTAPE 2 : plan de l'utilisateur ────────────────────────────────────
    // "free"        = inscription par défaut, 10 problèmes + messagerie seulement
    // "pro"         = tous les problèmes + IA + PDF (paiement individuel)
    // "institution" = compte institutionnel (école/université) avec classrooms
    plan: {
      type: DataTypes.ENUM("free", "pro", "institution"),
      allowNull: false,
      defaultValue: "free",
    },
    // Date à laquelle l'utilisateur a rejoint son plan actuel (utile pour
    // afficher "joined Pro on …" dans le dashboard admin).
    planJoinedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    // ── ÉTAPE 3 : lien vers l'institution (null si solo / super admin) ─────
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    bio: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    githubUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    linkedinUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // 2FA fields
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is2FAEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    //roadmap fields

careerGoal: {
  type: DataTypes.STRING(255),
  allowNull: true,
},

interests: {
  type: DataTypes.JSON,
  allowNull: true,
  defaultValue: [],
},

programmingLanguages: {
  type: DataTypes.JSON,
  allowNull: true,
  defaultValue: [],
},

problems: {
  type: DataTypes.JSON,
  allowNull: true,
  defaultValue: [],
},

roadmap: {
  type: DataTypes.JSON,
  allowNull: true,
  defaultValue: [],
},

roadmapProgress: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
},
    
  },
  {
    tableName: "users",
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
        }
      },
    },
  }
);

module.exports = User;
