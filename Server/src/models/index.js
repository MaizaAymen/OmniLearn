/**
 * models/index.js
 * Registers all Sequelize models and defines their associations.
 * Import this file once at application startup (already done in server.js).
 */

const User = require("./User");
const Class = require("./Class");
const Enrollment = require("./Enrollment");
const Course = require("./Course");
const Module = require("./Module");
const Notification = require("./Notification");
const CodeSubmission = require("./CodeSubmission");
const Problem = require("./Problem");
const Grade = require("./Grade");
const Speciality = require("./Speciality");
const Level = require("./Level");
const Lesson = require("./Lesson");
const UmlDiagram = require("./UmlDiagram");
const StudentProblemSet = require("./StudentProblemSet");
const ClassAssignment = require("./ClassAssignment");
const ExamSubmission = require("./ExamSubmission");
const Announcement = require("./Announcement");
const Conversation = require("./Conversation");
const Message = require("./Message");
// ─── Plans / Institutions ────────────────────────────────────────────────────
const Institution = require("./Institution");
const InviteLink = require("./InviteLink");
// ─── Roadmaps ─────────────────────────────────────────────────────────────────
const SavedRoadmap = require("./SavedRoadmap");
User.hasMany(SavedRoadmap, { foreignKey: "userId", as: "savedRoadmaps" });
SavedRoadmap.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─── Grade ↔ Speciality (1:N) ─────────────────────────────────────────────────
Grade.hasMany(Speciality, { foreignKey: "gradeId", as: "specialities" });
Speciality.belongsTo(Grade, { foreignKey: "gradeId", as: "grade" });

// ─── Speciality ↔ Level (1:N) ─────────────────────────────────────────────────
Speciality.hasMany(Level, { foreignKey: "specialityId", as: "levels" });
Level.belongsTo(Speciality, { foreignKey: "specialityId", as: "speciality" });

// ─── Level ↔ Course (1:N) ─────────────────────────────────────────────────────
Level.hasMany(Course, { foreignKey: "levelId", as: "courses" });
Course.belongsTo(Level, { foreignKey: "levelId", as: "level" });

// ─── Module ↔ Lesson (1:N) ────────────────────────────────────────────────────
Module.hasMany(Lesson, { foreignKey: "moduleId", as: "lessons" });
Lesson.belongsTo(Module, { foreignKey: "moduleId", as: "module" });

// ─── Course ↔ Lesson direct (1:N, optional — lessons without a module) ────────
Course.hasMany(Lesson, { foreignKey: "courseId", as: "directLessons" });
Lesson.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── Class (Classroom) ↔ Grade/Speciality/Level ───────────────────────────────
Grade.hasMany(Class, { foreignKey: "gradeId", as: "classrooms" });
Class.belongsTo(Grade, { foreignKey: "gradeId", as: "grade" });

Speciality.hasMany(Class, { foreignKey: "specialityId", as: "classrooms" });
Class.belongsTo(Speciality, { foreignKey: "specialityId", as: "speciality" });

Level.hasMany(Class, { foreignKey: "levelId", as: "classroomsAtLevel" });
Class.belongsTo(Level, { foreignKey: "levelId", as: "level" });

// ─── Teacher ↔ Classes (1:N) ─────────────────────────────────────────────────
User.hasMany(Class, { foreignKey: "teacherId", as: "taughtClasses" });
Class.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

// ─── Student ↔ Classes (N:M via Enrollment) ──────────────────────────────────
User.hasMany(Enrollment, { foreignKey: "studentId", as: "enrollments" });
Enrollment.belongsTo(User, { foreignKey: "studentId", as: "student" });

Class.hasMany(Enrollment, { foreignKey: "classId", as: "enrollments" });
Enrollment.belongsTo(Class, { foreignKey: "classId", as: "class" });

// ─── Teacher ↔ Courses (1:N) ─────────────────────────────────────────────────
User.hasMany(Course, { foreignKey: "teacherId", as: "courses" });
Course.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

// ─── Class ↔ Courses (1:N) ───────────────────────────────────────────────────
Class.hasMany(Course, { foreignKey: "classId", as: "courses" });
Course.belongsTo(Class, { foreignKey: "classId", as: "class" });

// ─── Course ↔ Modules (1:N) ──────────────────────────────────────────────────
Course.hasMany(Module, { foreignKey: "courseId", as: "modules" });
Module.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── User ↔ Notifications (1:N) ──────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─── User ↔ StudentProblemSets (1:N) ─────────────────────────────────────────
User.hasMany(StudentProblemSet, { foreignKey: "studentId", as: "problemSets" });
StudentProblemSet.belongsTo(User, { foreignKey: "studentId", as: "student" });

// ─── Module ↔ ClassAssignments (1:N) ─────────────────────────────────────────
Module.hasMany(ClassAssignment, { foreignKey: "moduleId", as: "assignments" });
ClassAssignment.belongsTo(Module, { foreignKey: "moduleId", as: "module" });

// ─── Class ↔ ClassAssignments (1:N) ──────────────────────────────────────────
Class.hasMany(ClassAssignment, { foreignKey: "classId", as: "classAssignments" });
ClassAssignment.belongsTo(Class, { foreignKey: "classId", as: "class" });

// ─── User ↔ CodeSubmissions (1:N) ────────────────────────────────────────────
User.hasMany(CodeSubmission, { foreignKey: "userId", as: "codeSubmissions" });
CodeSubmission.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─── Course ↔ CodeSubmissions (1:N) ──────────────────────────────────────────
Course.hasMany(CodeSubmission, { foreignKey: "courseId", as: "codeSubmissions" });
CodeSubmission.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── Module ↔ CodeSubmissions (1:N) ──────────────────────────────────────────
Module.hasMany(CodeSubmission, { foreignKey: "moduleId", as: "codeSubmissions" });
CodeSubmission.belongsTo(Module, { foreignKey: "moduleId", as: "module" });

// ─── User ↔ ExamSubmissions (1:N, optional) ──────────────────────────────────
User.hasMany(ExamSubmission, { foreignKey: "userId", as: "examSubmissions" });
ExamSubmission.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─── Class ↔ Announcements (1:N) ─────────────────────────────────────────────
Class.hasMany(Announcement, { foreignKey: "classId", as: "announcements" });
Announcement.belongsTo(Class, { foreignKey: "classId", as: "class" });

// ─── User ↔ Announcements (1:N) ──────────────────────────────────────────────
User.hasMany(Announcement, { foreignKey: "authorId", as: "announcements" });
Announcement.belongsTo(User, { foreignKey: "authorId", as: "author" });

// ─── Conversation ↔ Messages (1:N) ───────────────────────────────────────────
Conversation.hasMany(Message, { foreignKey: "conversationId", as: "messages" });
Message.belongsTo(Conversation, { foreignKey: "conversationId", as: "conversation" });

// ─── User ↔ Messages (1:N, sender) ───────────────────────────────────────────
User.hasMany(Message, { foreignKey: "senderId", as: "sentMessages" });
Message.belongsTo(User, { foreignKey: "senderId", as: "sender" });

// ─── Institution ↔ Users (1:N) ───────────────────────────────────────────────
// constraints: false → on garde le lien logique côté Sequelize, mais on n'ajoute
// PAS de contrainte FK Postgres (sinon `sequelize.sync({alter:true})` génère un
// ALTER TABLE invalide quand il essaie d'ajouter la colonne institutionId).
Institution.hasMany(User, { foreignKey: "institutionId", as: "members", constraints: false });
User.belongsTo(Institution, { foreignKey: "institutionId", as: "institution", constraints: false });

// ─── Institution ↔ InviteLinks (1:N) ─────────────────────────────────────────
Institution.hasMany(InviteLink, { foreignKey: "institutionId", as: "inviteLinks", constraints: false });
InviteLink.belongsTo(Institution, { foreignKey: "institutionId", as: "institution", constraints: false });

// ─── Institution ↔ Curriculum (1:N each) ─────────────────────────────────────
// Per-institution Grades / Specialities / Levels. institutionId is nullable on
// the curriculum tables — null rows are global templates owned by the super admin.
Institution.hasMany(Grade, { foreignKey: "institutionId", as: "grades", constraints: false });
Grade.belongsTo(Institution, { foreignKey: "institutionId", as: "institution", constraints: false });

Institution.hasMany(Speciality, { foreignKey: "institutionId", as: "specialities", constraints: false });
Speciality.belongsTo(Institution, { foreignKey: "institutionId", as: "institution", constraints: false });

Institution.hasMany(Level, { foreignKey: "institutionId", as: "levels", constraints: false });
Level.belongsTo(Institution, { foreignKey: "institutionId", as: "institution", constraints: false });

module.exports = {
  User,
  Class,
  Enrollment,
  Course,
  Module,
  Notification,
  CodeSubmission,
  StudentProblemSet,
  Problem,
  Grade,
  Speciality,
  Level,
  Lesson,
  UmlDiagram,
  ClassAssignment,
  ExamSubmission,
  Announcement,
  Conversation,
  Message,
  Institution,
  InviteLink,
  SavedRoadmap,
};
