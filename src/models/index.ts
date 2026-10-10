import mongoose, { Schema } from "mongoose";

const studentSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String },
  matric_no: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  password: { type: String, required: true },
  department: { type: String, required: true, index: true },
  strength: { type: String, required: true },
  session_token_id: { type: String }, // For preventing simultaneous logins
  created_at: { type: Date, default: Date.now, index: true }
});

export const Student: mongoose.Model<any> = mongoose.models.Student || mongoose.model("Student", studentSchema);

const courseSchema = new Schema({
  code: { type: String, required: true },
  title: { type: String, required: true },
  icon: { type: String, default: "Book" },
  scheduled_date: { type: String },
  end_date: { type: String },
  is_mock: { type: Boolean, default: true },
  results_hidden: { type: Boolean, default: false },
  force_start: { type: Boolean, default: false },
  duration: { type: Number, default: 30 },
  question_limit: { type: Number, default: 20 },
  attempts_allowed: { type: Number, default: 1 },
  question_timer_limit: { type: Number, default: 0 },
  
  // New Test Settings
  is_locked: { type: Boolean, default: true }, // Default locked
  results_locked: { type: Boolean, default: true },
  selected_topic_id: { type: Schema.Types.ObjectId, ref: "Topic" },
  is_master: { type: Boolean, default: false },
  multicourse_config: { type: String }
});

export const Course: mongoose.Model<any> = mongoose.models.Course || mongoose.model("Course", courseSchema);

const topicSchema = new Schema({
  course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  name: { type: String, required: true },
  question_count: { type: Number, default: 0 },
  notes: { type: String, default: "" }
});

export const Topic: mongoose.Model<any> = mongoose.models.Topic || mongoose.model("Topic", topicSchema);

const questionSchema = new Schema({
  topic_id: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
  text: { type: String, required: true },
  a: { type: String, required: true },
  b: { type: String, required: true },
  c: { type: String },
  d: { type: String },
  correct_option: { type: String, required: true },
  diagram_url: { type: String },
  explanation: { type: String },
  is_refined: { type: Boolean, default: false, index: true }
});

export const Question: mongoose.Model<any> = mongoose.models.Question || mongoose.model("Question", questionSchema);

const resultSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  parent_course_id: { type: Schema.Types.ObjectId, ref: "Course", index: true },
  attempt_id: { type: String, index: true },
  device_id: { type: String },
  total_score: { type: Number, required: true },
  total_questions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, required: true },
  question_ids: { type: String },
  topic_breakdown: { type: String },
  student_answers: { type: String }, // JSON string of exact answers
  created_at: { type: Date, default: Date.now, index: true }
});

export const Result: mongoose.Model<any> = mongoose.models.Result || mongoose.model("Result", resultSchema);

const testSessionSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  parent_course_id: { type: Schema.Types.ObjectId, ref: "Course", index: true },
  device_id: { type: String },
  expected_duration: { type: Number },
  question_ids: { type: String },
  shuffled_questions: { type: String },
  status: { type: String, default: "active" },
  start_time: { type: Date, default: Date.now },
  current_snapshot: { type: String },
  incidents: [{
    violation: String,
    timestamp: Date
  }],
  warnings: [String],
  termination_reason: String
});

export const TestSession: mongoose.Model<any> = mongoose.models.TestSession || mongoose.model("TestSession", testSessionSchema);

const systemLogSchema = new Schema({
  event: { type: String, required: true },
  details: { type: String },
  student_id: { type: Schema.Types.ObjectId, ref: "Student" },
  course_id: { type: Schema.Types.ObjectId, ref: "Course" },
  timestamp: { type: Date, default: Date.now }
});

export const SystemLog: mongoose.Model<any> = mongoose.models.SystemLog || mongoose.model("SystemLog", systemLogSchema);

const announcementSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: "info" }, // info, warning, success
  created_at: { type: Date, default: Date.now }
});

export const Announcement: mongoose.Model<any> = mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);

const adminNotificationSchema = new Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "info" }, // info, warning, success
  is_read: { type: Boolean, default: false },
  student_id: { type: Schema.Types.ObjectId, ref: "Student" },
  course_id: { type: Schema.Types.ObjectId, ref: "Course" },
  created_at: { type: Date, default: Date.now }
});

export const AdminNotification: mongoose.Model<any> = mongoose.models.AdminNotification || mongoose.model("AdminNotification", adminNotificationSchema);

const settingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true }
});

export const Setting: mongoose.Model<any> = mongoose.models.Setting || mongoose.model("Setting", settingSchema);

const chatMessageSchema = new Schema({
  sender_id: { type: String, required: true, index: true }, // Student ID or "admin"
  sender_name: { type: String, required: true },
  receiver_id: { type: String, required: true, index: true }, // Student ID or "admin"
  receiver_name: { type: String, required: true },
  text: { type: String, default: "" },
  image_url: { type: String, default: "" }, // Base64 image
  is_read: { type: Boolean, default: false, index: true },
  created_at: { type: Date, default: Date.now, index: true }
});

// Compound indexes for thread messages fetch optimization
chatMessageSchema.index({ sender_id: 1, receiver_id: 1, created_at: -1 });
chatMessageSchema.index({ receiver_id: 1, is_read: 1 });
chatMessageSchema.index({ sender_id: 1, receiver_id: 1, is_read: 1 });

export const ChatMessage: mongoose.Model<any> = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);

const notesExtractionSchema = new Schema({
  title: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now },
  expanded_note: { type: String, default: "" },
  questions: [{
    text: { type: String, required: true },
    a: { type: String, required: true },
    b: { type: String, required: true },
    c: { type: String },
    d: { type: String },
    correct_option: { type: String, required: true },
    explanation: { type: String }
  }]
});

export const NotesExtraction: mongoose.Model<any> = mongoose.models.NotesExtraction || mongoose.model("NotesExtraction", notesExtractionSchema);


