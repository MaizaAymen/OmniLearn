/**
 * models/index.js
 * Registers all Sequelize models and defines their associations.
 * Import this file once at application startup (already done in server.js).
 */

const User = require("./User");
const Profile = require("./Profile");
const Class = require("./Class");
const Enrollment = require("./Enrollment");
const Course = require("./Course");
const Module = require("./Module");
const ClassModule = require("./ClassModule");
const Resource = require("./Resource");
const Quiz = require("./Quiz");
const Question = require("./Question");
const QuizAttempt = require("./QuizAttempt");
const Answer = require("./Answer");
const CodeSession = require("./CodeSession");
const ActivityLog = require("./ActivityLog");
const Progress = require("./Progress");
const ChatMessage = require("./ChatMessage");
const Notification = require("./Notification");
const CodeSubmission = require("./CodeSubmission");
const Problem = require("./Problem");
const Grade = require("./Grade");
const Speciality = require("./Speciality");
const Level = require("./Level");
const Lesson = require("./Lesson");
const UmlDiagram = require("./UmlDiagram");

// ─── User ↔ Profile (1:1) ────────────────────────────────────────────────────
User.hasOne(Profile, { foreignKey: "userId", as: "profile" });
Profile.belongsTo(User, { foreignKey: "userId", as: "user" });

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

// ─── Class ↔ Modules (N:M via ClassModule) ───────────────────────────────────
Class.belongsToMany(Module, {
  through: ClassModule,
  foreignKey: "classId",
  otherKey: "moduleId",
  as: "modules",
});
Module.belongsToMany(Class, {
  through: ClassModule,
  foreignKey: "moduleId",
  otherKey: "classId",
  as: "classrooms",
});

// ─── Module ↔ Resources (1:N) ────────────────────────────────────────────────
Module.hasMany(Resource, { foreignKey: "moduleId", as: "resources" });
Resource.belongsTo(Module, { foreignKey: "moduleId", as: "module" });

// ─── Course ↔ Quizzes (1:N) ──────────────────────────────────────────────────
Course.hasMany(Quiz, { foreignKey: "courseId", as: "quizzes" });
Quiz.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── Module ↔ Quizzes (1:N, optional) ────────────────────────────────────────
Module.hasMany(Quiz, { foreignKey: "moduleId", as: "quizzes" });
Quiz.belongsTo(Module, { foreignKey: "moduleId", as: "module" });

// ─── Quiz ↔ Questions (1:N) ──────────────────────────────────────────────────
Quiz.hasMany(Question, { foreignKey: "quizId", as: "questions" });
Question.belongsTo(Quiz, { foreignKey: "quizId", as: "quiz" });

// ─── Student ↔ QuizAttempts (1:N) ────────────────────────────────────────────
User.hasMany(QuizAttempt, { foreignKey: "studentId", as: "quizAttempts" });
QuizAttempt.belongsTo(User, { foreignKey: "studentId", as: "student" });

Quiz.hasMany(QuizAttempt, { foreignKey: "quizId", as: "attempts" });
QuizAttempt.belongsTo(Quiz, { foreignKey: "quizId", as: "quiz" });

// ─── QuizAttempt ↔ Answers (1:N) ─────────────────────────────────────────────
QuizAttempt.hasMany(Answer, { foreignKey: "attemptId", as: "answers" });
Answer.belongsTo(QuizAttempt, { foreignKey: "attemptId", as: "attempt" });

Question.hasMany(Answer, { foreignKey: "questionId", as: "answers" });
Answer.belongsTo(Question, { foreignKey: "questionId", as: "question" });

// ─── Student ↔ CodeSessions (1:N) ────────────────────────────────────────────
User.hasMany(CodeSession, { foreignKey: "studentId", as: "codeSessions" });
CodeSession.belongsTo(User, { foreignKey: "studentId", as: "student" });

Course.hasMany(CodeSession, { foreignKey: "courseId", as: "codeSessions" });
CodeSession.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── User ↔ ActivityLogs (1:N) ───────────────────────────────────────────────
User.hasMany(ActivityLog, { foreignKey: "userId", as: "activityLogs" });
ActivityLog.belongsTo(User, { foreignKey: "userId", as: "user" });

Course.hasMany(ActivityLog, { foreignKey: "courseId", as: "activityLogs" });
ActivityLog.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── Student ↔ Progress (1:N per course) ─────────────────────────────────────
User.hasMany(Progress, { foreignKey: "studentId", as: "progressRecords" });
Progress.belongsTo(User, { foreignKey: "studentId", as: "student" });

Course.hasMany(Progress, { foreignKey: "courseId", as: "progressRecords" });
Progress.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── User ↔ ChatMessages (1:N) ───────────────────────────────────────────────
User.hasMany(ChatMessage, { foreignKey: "userId", as: "chatMessages" });
ChatMessage.belongsTo(User, { foreignKey: "userId", as: "user" });

Course.hasMany(ChatMessage, { foreignKey: "courseId", as: "chatMessages" });
ChatMessage.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── User ↔ Notifications (1:N) ──────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─── User ↔ CodeSubmissions (1:N) ────────────────────────────────────────────
User.hasMany(CodeSubmission, { foreignKey: "userId", as: "codeSubmissions" });
CodeSubmission.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─── Course ↔ CodeSubmissions (1:N) ──────────────────────────────────────────
Course.hasMany(CodeSubmission, { foreignKey: "courseId", as: "codeSubmissions" });
CodeSubmission.belongsTo(Course, { foreignKey: "courseId", as: "course" });

// ─── Module ↔ CodeSubmissions (1:N) ──────────────────────────────────────────
Module.hasMany(CodeSubmission, { foreignKey: "moduleId", as: "codeSubmissions" });
CodeSubmission.belongsTo(Module, { foreignKey: "moduleId", as: "module" });

module.exports = {
  User,
  Profile,
  Class,
  Enrollment,
  Course,
  Module,
  ClassModule,
  Resource,
  Quiz,
  Question,
  QuizAttempt,
  Answer,
  CodeSession,
  ActivityLog,
  Progress,
  ChatMessage,
  Notification,
  CodeSubmission,
  Grade,
  Speciality,
  Level,
  Lesson,
  UmlDiagram,
};

