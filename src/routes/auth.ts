import { Student, AdminNotification, TestSession, SystemLog } from "../models";
import jwt from "jsonwebtoken";
import { ADMIN_KEY, DEV_PASSWORD, verifyToken } from "../middleware/auth";
import crypto from 'crypto';
import { FastifyInstance } from "fastify";
import { AuthController } from "../interfaces/http/controllers/AuthController";

export default async function routes(app: FastifyInstance) {
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-first-class-freshers-vault";

app.post("/auth/forgot-phone", AuthController.forgotPhone);
app.post("/auth/student-access", AuthController.studentAccess);

app.post("/admin/login", async (request, reply) => {
  const body: any = (request.body || {});
  const { adminKey, matricNo } = body;
  const submittedMatric = (matricNo || "").toString().trim();
  const submittedKey = (adminKey || "").toString().trim();

  const normalizedSubmittedMatric = submittedMatric.toLowerCase();
  
  // Build a list of valid admin IDs (case-insensitive)
  const validAdminIds = [
    "default-admin-key-first-class",
    "emmanueladejuwon2021@gmail.com",
    "emmanuel",
    "manuel",
    "admin"
  ];
  
  if (typeof ADMIN_KEY === "string" && ADMIN_KEY) {
    validAdminIds.push(ADMIN_KEY.toLowerCase());
  }
  if (process.env.MANUEL_ADMIN_KEY) {
    validAdminIds.push(process.env.MANUEL_ADMIN_KEY.toLowerCase());
  }
  if (process.env.EMMANUEL_ADMIN_KEY) {
    validAdminIds.push(process.env.EMMANUEL_ADMIN_KEY.toLowerCase());
  }

  // Build a list of valid security keys
  const validSecurityKeys = [
    "20252026",
    "polymath-master-key"
  ];
  if (typeof DEV_PASSWORD === "string" && DEV_PASSWORD) {
    validSecurityKeys.push(DEV_PASSWORD);
    validSecurityKeys.push(DEV_PASSWORD.toLowerCase());
  }
  if (process.env.DEVELOPER_PASSWORD) {
    validSecurityKeys.push(process.env.DEVELOPER_PASSWORD);
    validSecurityKeys.push(process.env.DEVELOPER_PASSWORD.toLowerCase());
  }

  const isIdValid = validAdminIds.includes(normalizedSubmittedMatric);
  const isKeyValid = validSecurityKeys.includes(submittedKey) || validSecurityKeys.includes(submittedKey.toLowerCase());

  if (isIdValid && isKeyValid) {
    const token = jwt.sign({ matric_no: submittedMatric, role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
    return reply.send({ token, message: "Welcome Admin" });
  }
  return reply.status(401).send({ error: "Invalid admin ID or access key" });
});

app.post("/student/update", { preHandler: [verifyToken] }, async (request, reply) => {
  try {
    const user = (request as any).user;
    if (!user || user.role !== 'student') {
      return reply.status(403).send({ error: "Only students can update their profiles." });
    }
    const body: any = (request.body || {});
    const { name, department, phone, email, strength } = body;
    
    const studentDb = await Student.findById(user.id);
    if (!studentDb) {
      return reply.status(404).send({ error: "Student not found." });
    }
    
    if (name && name.toString().trim()) {
      studentDb.name = name.toString().trim();
    }
    if (department && department.toString().trim()) {
      studentDb.department = department.toString().trim();
    }
    if (phone !== undefined) {
      studentDb.phone = phone.toString().trim();
    }
    if (email !== undefined) {
      studentDb.email = email.toString().trim();
    }
    if (strength && strength.toString().trim()) {
      studentDb.strength = strength.toString().trim();
    }
    
    await studentDb.save();
    
    const studentObj = studentDb.toObject();
    delete studentObj.password;
    studentObj.id = studentObj._id;
    
    return reply.send({ success: true, message: "Profile updated successfully!", student: studentObj });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

}
