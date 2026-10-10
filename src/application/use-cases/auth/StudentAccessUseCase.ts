import { IStudentRepository } from "../../../core/domain/repositories/IStudentRepository";
import { Student, AdminNotification, TestSession, SystemLog } from "../../../models";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-first-class-freshers-vault";

export interface StudentAccessDTO {
  name?: string;
  email?: string;
  matric_no: string;
  phone?: string;
  department?: string;
  phone_challenge?: string;
  device_id?: string;
  override_concurrency?: boolean | string;
  ip?: string;
}

export class StudentAccessUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  async execute(dto: StudentAccessDTO): Promise<any> {
    const { name, email, matric_no, phone, department, phone_challenge, device_id, override_concurrency, ip } = dto;
    if (!matric_no) {
      return { status: 400, data: { error: "Matric number is required" } };
    }

    const normalizedMatric = String(matric_no).toUpperCase().replace(/\s+/g, "");
    const existing = await Student.findOne({ matric_no: normalizedMatric });

    if (existing) {
      const dbPhone = existing.phone || "";
      const cleanedDbPhone = dbPhone.replace(/[^0-9]/g, "");

      // If student does not have a phone enrolled yet
      if (cleanedDbPhone.length < 6) {
        if (phone) {
          const rawEnrolledPhone = String(phone).trim();
          const normalizedEnrolledPhone = rawEnrolledPhone.replace(/[^0-9]/g, "");
          if (normalizedEnrolledPhone.length < 6) {
            return { status: 400, data: { error: "Invalid phone format. Please enter a valid phone number containing at least 6 digits." } };
          }

          existing.phone = rawEnrolledPhone;
          await existing.save();

          // Log database enrichment
          const enrollLog = new AdminNotification({
            title: "📱 Security Audit: MFA Phone Enrolled",
            message: `Student candidate ${existing.name || 'Unknown'} (${existing.matric_no}) enrolled phone number: "${existing.phone}" to activate Two-Factor protection template.`,
            type: "info",
            student_id: existing._id,
            created_at: new Date()
          });
          await enrollLog.save();

          // Check device session concurrency
          const activeSession = await TestSession.findOne({ student_id: existing._id, status: "active" });
          if (activeSession && activeSession.device_id && device_id && activeSession.device_id !== device_id) {
            if (override_concurrency === true || override_concurrency === 'true') {
              const oldDev = activeSession.device_id;
              activeSession.device_id = device_id;
              await activeSession.save();

              const overrideLog = new AdminNotification({
                title: "🔄 Terminal Transfer: Device Overridden",
                message: `Student candidate ${existing.name || 'Unknown'} (${existing.matric_no}) transferred active session from old device [${oldDev}] to new device [${device_id}].`,
                type: "info",
                student_id: existing._id,
                created_at: new Date()
              });
              await overrideLog.save();
            } else {
              return {
                status: 200,
                data: {
                  error: "CONCURRENT_EXAM_ACTIVE",
                  message: `Security Enforcement Lock: Simultaneous logins are prohibited. Current test session active on Device [${activeSession.device_id}].`
                }
              };
            }
          }

          const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
          existing.session_token_id = sessionId;
          await existing.save();

          const token = jwt.sign({ id: existing._id, matric_no: normalizedMatric, role: "student", session_token_id: sessionId }, JWT_SECRET, { expiresIn: "30d" });
          const studentObj: any = existing.toObject();
          studentObj.id = studentObj._id;
          return { status: 200, data: { student_id: existing._id, token, student: studentObj, phone_enrolled_now: true } };
        } else {
          return {
            status: 200,
            data: {
              phone_enrollment_required: true,
              student_id: existing._id.toString()
            }
          };
        }
      }

      // If phone is provided in the direct request, verify it immediately
      let isVerified = false;
      const submittedPhone = phone || phone_challenge;

      if (submittedPhone) {
        const cleanedInputPhone = String(submittedPhone).replace(/[^0-9]/g, "");
        if (cleanedInputPhone.length >= 4) {
          if (cleanedDbPhone.endsWith(cleanedInputPhone) || 
              cleanedInputPhone.endsWith(cleanedDbPhone) || 
              cleanedDbPhone.includes(cleanedInputPhone)) {
            isVerified = true;
          } else {
            // Handle typos to make logging in easier
            if (cleanedDbPhone.length >= 10 && cleanedInputPhone.length >= 10) {
              let diffs = 0;
              const len = Math.min(cleanedDbPhone.length, cleanedInputPhone.length);
              for (let i = 1; i <= len; i++) {
                if (cleanedDbPhone[cleanedDbPhone.length - i] !== cleanedInputPhone[cleanedInputPhone.length - i]) {
                  diffs++;
                }
              }
              diffs += Math.abs(cleanedDbPhone.length - cleanedInputPhone.length);
              if (diffs <= 2) {
                isVerified = true;
              }
            }
          }
        }
      } else {
        const lastFour = cleanedDbPhone.slice(-4) || "XXXX";
        return {
          status: 200,
          data: {
            challenge_required: true,
            masked_phone: `******${lastFour}`,
            student_id: existing._id.toString()
          }
        };
      }

      if (!isVerified) {
        const invalidLog = new AdminNotification({
          title: "🔑 Intrusion Warning: Failed 2FA Security Challenge",
          message: `Credential hijack blocked. Verification attempts for Matric ${normalizedMatric} passed invalid Phone value: "${submittedPhone}".`,
          type: "warning",
          student_id: existing._id,
          created_at: new Date()
        });
        await invalidLog.save();

        return { status: 400, data: { error: "The provided phone number does not match our records." } };
      }

      // Check concurrency
      const activeSession = await TestSession.findOne({ student_id: existing._id, status: "active" });
      if (activeSession && activeSession.device_id && device_id && activeSession.device_id !== device_id) {
        if (override_concurrency === true || override_concurrency === 'true') {
          const oldDev = activeSession.device_id;
          activeSession.device_id = device_id;
          await activeSession.save();

          const overrideLog = new AdminNotification({
            title: "🔄 Terminal Transfer: Device Overridden",
            message: `Student candidate ${existing.name || 'Unknown'} (${existing.matric_no}) transferred active session from old device [${oldDev}] to new device [${device_id}].`,
            type: "info",
            student_id: existing._id,
            created_at: new Date()
          });
          await overrideLog.save();
        } else {
          const concurrentLog = new AdminNotification({
            title: "🚨 Alert: Simultaneous Concurrent Candidate Terminals Blocked",
            message: `Student login blocked. Target exam session is already actively running on device [${activeSession.device_id}]. Unauthorized candidate login was initiated from different terminal [${device_id}].`,
            type: "warning",
            student_id: existing._id,
            created_at: new Date()
          });
          await concurrentLog.save();

          return {
            status: 200,
            data: {
              error: "CONCURRENT_EXAM_ACTIVE",
              message: `Security Enforcement Lock: Simultaneous logins are prohibited while an active terminal is open elsewhere. Current test session active on Device [${activeSession.device_id}].`
            }
          };
        }
      }

      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      existing.session_token_id = sessionId;
      await existing.save();

      const token = jwt.sign({ id: existing._id, matric_no: normalizedMatric, role: "student", session_token_id: sessionId }, JWT_SECRET, { expiresIn: "30d" });
      const studentObj: any = existing.toObject();
      studentObj.id = studentObj._id;

      const loginLog = new SystemLog({
        event: "Student Login",
        details: `Successful device authentication. matric: ${normalizedMatric}`,
        student_id: existing._id,
        timestamp: new Date()
      });
      await loginLog.save();

      return { status: 200, data: { student_id: existing._id, token, student: studentObj } };
    } else {
      if (!name || !department || !phone) {
        return { status: 400, data: { error: "Name, Department, and Phone number are required for new registration" } };
      }

      const newStudent = new Student({
        name,
        email: email || null,
        matric_no: normalizedMatric,
        phone,
        password: 'autogenerated',
        department,
        strength: 'THEORY'
      });
      await newStudent.save();

      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      newStudent.session_token_id = sessionId;
      await newStudent.save();

      const token = jwt.sign({ id: newStudent._id, matric_no: normalizedMatric, role: "student", session_token_id: sessionId }, JWT_SECRET, { expiresIn: "30d" });
      const studentObj: any = newStudent.toObject();
      studentObj.id = studentObj._id;

      const signupLog = new SystemLog({
        event: "Student Registered & Logged In",
        details: `New student registration: ${newStudent.name} (${normalizedMatric})`,
        student_id: newStudent._id,
        timestamp: new Date()
      });
      await signupLog.save();

      return { status: 200, data: { student_id: newStudent._id, token, student: studentObj } };
    }
  }
}
