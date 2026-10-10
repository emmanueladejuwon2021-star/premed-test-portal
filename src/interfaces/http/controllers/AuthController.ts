import { FastifyRequest, FastifyReply } from "fastify";
import { MongooseStudentRepository } from "../../../infrastructure/repositories/MongooseStudentRepository";
import { RetrieveStudentPhoneUseCase } from "../../../application/use-cases/auth/RetrieveStudentPhoneUseCase";
import { StudentAccessUseCase, StudentAccessDTO } from "../../../application/use-cases/auth/StudentAccessUseCase";
import { AdminNotification } from "../../../models";

const studentRepository = new MongooseStudentRepository();
const retrieveStudentPhoneUseCase = new RetrieveStudentPhoneUseCase(studentRepository);
const studentAccessUseCase = new StudentAccessUseCase(studentRepository);

const lastAccessMap = new Map<string, { count: number; blockedUntil: number; lastUpdated: number }>();
let lastPruned = Date.now();

function checkRateLimit(key: string): { limitReached: boolean; secondsLeft: number } {
  const now = Date.now();

  // Self-cleaning sliding window: prune inactive rate-limit records to prevent memory leaks under millions of users
  if (now - lastPruned > 60000) { // check pruning every 1 minute
    lastPruned = now;
    for (const [k, val] of lastAccessMap.entries()) {
      // Delete entries that are not locked and inactive for more than 5 minutes
      if (val.blockedUntil < now && (now - val.lastUpdated > 300000)) {
        lastAccessMap.delete(k);
      }
    }
  }

  const entry = lastAccessMap.get(key);
  if (entry && entry.blockedUntil > now) {
    entry.lastUpdated = now;
    return { limitReached: true, secondsLeft: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  if (!entry) {
    lastAccessMap.set(key, { count: 1, blockedUntil: 0, lastUpdated: now });
    return { limitReached: false, secondsLeft: 0 };
  }

  // Rolling counter window: if last request was > 10s ago, reset the count to prevent false lockout triggers
  if (now - entry.lastUpdated > 10000) {
    entry.count = 1;
  } else {
    entry.count++;
  }
  entry.lastUpdated = now;

  if (entry.count > 5) {
    entry.blockedUntil = now + 45000; // 45s lockout
    entry.count = 0;
    return { limitReached: true, secondsLeft: 45 };
  }
  return { limitReached: false, secondsLeft: 0 };
}

export class AuthController {
  static async forgotPhone(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body: any = request.body || {};
      const result = await retrieveStudentPhoneUseCase.execute(body.email);
      return reply.send(result);
    } catch (err: any) {
      const status = err.message === "Email is required to retrieve your phone number." ? 400 : 
                     err.message === "email not found" || err.message === "No phone number is registered with this email address yet." ? 404 : 500;
      return reply.status(status).send({ error: err.message });
    }
  }

  static async studentAccess(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body: any = request.body || {};
      const { matric_no } = body;
      if (!matric_no) {
        return reply.status(400).send({ error: "Matric number is required" });
      }

      const normalizedMatric = String(matric_no).toUpperCase().replace(/\s+/g, "");

      // Rate limit check
      const ipKey = (request.ip || "127.0.0.1") + ":" + normalizedMatric;
      const rateLimit = checkRateLimit(ipKey);
      if (rateLimit.limitReached) {
        // Log rate-limiting alert
        const bruteLog = new AdminNotification({
          title: "🔒 Security Alert: Brute Force Gate Engaged",
          message: `IP ${request.ip || 'Unknown'} was blacklisted for 45s after rapid sequence failures on credential terminal for matric ${normalizedMatric}.`,
          type: "warning",
          created_at: new Date()
        });
        await bruteLog.save();

        return reply.status(429).send({
          error: "Excessive authentication rapid requests. Automatic terminal lockout activated.",
          secondsLeft: rateLimit.secondsLeft,
          blockedUntil: Date.now() + (rateLimit.secondsLeft * 1000)
        });
      }

      const dto: StudentAccessDTO = {
        name: body.name,
        email: body.email,
        matric_no: body.matric_no,
        phone: body.phone,
        department: body.department,
        phone_challenge: body.phone_challenge,
        device_id: body.device_id,
        override_concurrency: body.override_concurrency,
        ip: request.ip
      };

      const result = await studentAccessUseCase.execute(dto);
      return reply.status(result.status).send(result.data);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  }
}
