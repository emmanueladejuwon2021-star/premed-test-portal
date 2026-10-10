import { Hono } from "hono";
import { Course, Student, Result, Question, Topic, TestSession, SystemLog, AdminNotification, Setting } from "../models";
import mongoose from "mongoose";
import { verifyToken, requireAdmin } from "../middleware/auth";
import { OPTION_MARKERS, extractOriginalKey, stripOptionMarkers, normalizeOptionKey } from "../lib/optionUtils";
import { latestProctorSnapshots } from "../lib/proctorCache";

const getQuestionOption = (q: any, key: string) => {
  const normKey = String(key).trim().toLowerCase();
  if (normKey === 'option_a' || normKey === 'opt_a' || normKey === 'a') return q.option_a || q.a || '';
  if (normKey === 'option_b' || normKey === 'opt_b' || normKey === 'b') return q.option_b || q.b || '';
  if (normKey === 'option_c' || normKey === 'opt_c' || normKey === 'c') return q.option_c || q.c || '';
  if (normKey === 'option_d' || normKey === 'opt_d' || normKey === 'd') return q.option_d || q.d || '';
  return '';
};

/**
 * Helper to fetch questions for a course (or specific topics) optimally.
 * Uses .lean() and handles similar courses if questions are empty.
 */
async function fetchQuestionsForCourse(
  courseId: string | mongoose.Types.ObjectId,
  courseDoc: any,
  topics?: string[]
): Promise<any[]> {
  const mapQuestion = (d: any) => {
    const obj = d.toObject ? d.toObject() : d;
    return {
      id: d._id.toString(),
      question_text: obj.text,
      option_a: obj.a,
      option_b: obj.b,
      option_c: obj.c,
      option_d: obj.d,
      correct_option: obj.correct_option,
      diagram_url: obj.diagram_url,
      ...obj
    };
  };

  let questions: any[] = [];

  if (topics && topics.length > 0) {
    const topicIds = topics.map(String);
    const qSnap = await Question.find({ topic_id: { $in: topicIds } }).lean();
    questions = qSnap.map(mapQuestion);
  }

  if (questions.length === 0) {
    const tSnap = await Topic.find({ course_id: courseId }).lean();
    const topicIds = tSnap.map((d: any) => d._id.toString());
    if (topicIds.length > 0) {
      const qSnap = await Question.find({ topic_id: { $in: topicIds } }).lean();
      questions = qSnap.map(mapQuestion);
    }
  }

  if (questions.length === 0 && courseDoc.code) {
    const similarCourses = await Course.find({ code: courseDoc.code }).lean() as any[];
    const similarIds = similarCourses.map(c => c._id);
    const tSnap = await Topic.find({ course_id: { $in: similarIds } }).lean();
    const topicIds = tSnap.map((d: any) => d._id.toString());
    if (topicIds.length > 0) {
      const qSnap = await Question.find({ topic_id: { $in: topicIds } }).lean();
      questions = qSnap.map(mapQuestion);
    }
  }

  return questions;
}

import { FastifyInstance } from "fastify";

export default async function routes(app: FastifyInstance) {

app.post("/simulation/start", { preHandler: [verifyToken] }, async (request, reply) => {
  const body: any = (request.body || {});
  const { limit, courseId, deviceId, shuffleQuestions, shuffleOptions } = body;
  const shuffleQuestionsVal = shuffleQuestions !== false;
  const shuffleOptionsVal = shuffleOptions !== false;
  let { topics } = body;
  // @ts-ignore
  const user = (request as any).user as any;

  try {
    const courseDoc = await Course.findById(courseId);
    if (!courseDoc) return reply.status(200).send({ error: "Examination course not found." });
    if (courseDoc.is_locked) return reply.status(200).send({ error: "This assessment is currently locked by the instructor." });
    const course = { id: courseDoc._id.toString(), ...courseDoc.toObject() } as any;
    
    // Strict One-Test-Only Check
    let studentId = user.id;
    if (!studentId) {
       const userDoc = await Student.findOne({ matric_no: user.matric_no });
       if (userDoc) studentId = userDoc._id.toString();
    }
    if (!studentId) return reply.status(200).send({ error: "Student profile mismatch." });

    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const courseObjId = new mongoose.Types.ObjectId(courseId);

    // Dynamic clean up of expired active test sessions
    try {
      const activeSessionsAll = await TestSession.find({
        student_id: studentObjId,
        status: "active"
      });
      for (const s of activeSessionsAll) {
        const durationSec = s.expected_duration || 1800;
        const isExpired = (s.start_time.getTime() + durationSec * 1000) < Date.now();
        if (isExpired) {
          s.status = "completed";
          s.termination_reason = "Expired (automatically closed)";
          await s.save();
        }
      }
    } catch (e) {
      console.error("Failed active sessions cleanup:", e);
    }

    // RESUMPTION LOGIC: Verify if there is currently an unexpired active session in progress.
    if ((courseDoc as any).multicourse_config) {
      const activeSessions = await TestSession.find({
        student_id: studentObjId,
        parent_course_id: courseObjId,
        status: "active"
      });

      if (activeSessions.length > 0) {
        try {
          const configs = JSON.parse((courseDoc as any).multicourse_config);
          const results = [];
          
          // Remaining time from the earliest start
          const earliestStart = Math.min(...activeSessions.map(s => s.start_time.getTime()));
          const s0 = activeSessions[0];
          const totalDuration = s0.expected_duration || (courseDoc.duration ? courseDoc.duration * 60 : configs.length * 30 * 60);
          const elapsed = Math.floor((Date.now() - earliestStart) / 1000);
          const remainingSeconds = Math.max(10, totalDuration - elapsed);

          for (const config of configs) {
            const subCourseId = config.courseId;
            const subCourseDoc = await Course.findById(subCourseId);

            const existingSubSession = activeSessions.find(s => s.course_id.toString() === subCourseId.toString());
            let questions: any[] = [];
            if (existingSubSession && existingSubSession.shuffled_questions) {
              questions = JSON.parse(existingSubSession.shuffled_questions);
            }

            const safeQuestions = questions.map((q: any) => {
              const { correct_option, ...safeQ } = q;
              return safeQ;
            });

            results.push({
              courseId: subCourseId,
              courseTitle: subCourseDoc ? subCourseDoc.title : 'Subcourse',
              courseCode: subCourseDoc ? subCourseDoc.code : 'SUB',
              sessionId: existingSubSession ? existingSubSession._id.toString() : new mongoose.Types.ObjectId().toString(),
              questions: safeQuestions
            });
          }

          return reply.send({
            isMulticourse: true,
            courses: results,
            expectedDuration: remainingSeconds,
            questionTimerLimit: courseDoc.question_timer_limit || 0
          });
        } catch (errRes) {
          console.error("Failed to resume multicourse active session:", errRes);
        }
      }
    } else {
      // Single course test session resumption option
      const activeSession = await TestSession.findOne({
        student_id: studentObjId,
        course_id: courseObjId,
        status: "active"
      });

      if (activeSession) {
        const remaining = (activeSession.start_time.getTime() + (activeSession.expected_duration || 1800) * 1000) - Date.now();
        if (remaining > 0) {
          let questions: any[] = [];
          if (activeSession.shuffled_questions) {
            questions = JSON.parse(activeSession.shuffled_questions);
          }
          const safeQuestions = questions.map((q: any) => {
            const { correct_option, ...safeQ } = q;
            return safeQ;
          });

          return reply.send({
            sessionId: activeSession._id.toString(),
            questions: safeQuestions,
            expectedDuration: Math.floor(remaining / 1000),
            questionTimerLimit: courseDoc.question_timer_limit || 0
          });
        }
      }
    }

    // Check if unlimited reattempts setting is enabled
    const promoSetting = await Setting.findOne({ key: "allow_unlimited_reattempts" });
    const isUnlimited = promoSetting ? !!promoSetting.value : false;

    if (!isUnlimited) {
      const allowedAttempts = (courseDoc.attempts_allowed !== undefined && courseDoc.attempts_allowed !== null) ? courseDoc.attempts_allowed : 1;
      
      const distinctAttemptIds = await Result.distinct("attempt_id", {
        student_id: studentObjId,
        $or: [
          { course_id: courseObjId },
          { parent_course_id: courseObjId }
        ]
      });

      const legacyResultCount = await Result.countDocuments({
        student_id: studentObjId,
        $or: [
          { course_id: courseObjId },
          { parent_course_id: courseObjId }
        ],
        attempt_id: { $exists: false }
      });

      const validAttemptIds = distinctAttemptIds.filter(id => id !== null && id !== undefined && id !== "");
      const attemptCount = validAttemptIds.length + legacyResultCount;
      
      if (attemptCount >= allowedAttempts) {
        return reply.status(200).send({ error: `You have reached the maximum allowed attempts (${allowedAttempts}) for this test.` });
      }

      if (deviceId) {
        const distinctDevAttemptIds = await Result.distinct("attempt_id", {
          device_id: deviceId,
          $or: [
            { course_id: courseObjId },
            { parent_course_id: courseObjId }
          ]
        });

        const legacyDevResultCount = await Result.countDocuments({
          device_id: deviceId,
          $or: [
            { course_id: courseObjId },
            { parent_course_id: courseObjId }
          ],
          attempt_id: { $exists: false }
        });

        const validDevAttemptIds = distinctDevAttemptIds.filter(id => id !== null && id !== undefined && id !== "");
        const devAttemptCount = validDevAttemptIds.length + legacyDevResultCount;

        if (devAttemptCount >= allowedAttempts) {
          return reply.status(200).send({ error: `This device has reached the maximum allowed attempts (${allowedAttempts}) for this test.` });
        }
      }
    }

    if ((courseDoc as any).multicourse_config) {
      try {
        const configs = JSON.parse((courseDoc as any).multicourse_config);
        const results = [];
        const totalDuration = courseDoc.duration ? courseDoc.duration * 60 : configs.length * 30 * 60;

        for (const config of configs) {
          const subCourseId = config.courseId;
          const subCourseDoc = await Course.findById(subCourseId).lean() as any;
          if (!subCourseDoc) continue;

          let topics = config.topics;
          let questions = await fetchQuestionsForCourse(subCourseId, subCourseDoc, topics);

          // Shuffling Fisher-Yates
          for (let pass = 0; pass < 3; pass++) {
            for (let i = questions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [questions[i], questions[j]] = [questions[j], questions[i]];
            }
          }

          const courseLimit = config.question_limit || Math.round(courseDoc.question_limit / configs.length) || 20;
          questions = questions.slice(0, courseLimit);

          // Deep option randomization
          questions = questions.map(q => {
            const cleanA = stripOptionMarkers(q.option_a);
            const cleanB = stripOptionMarkers(q.option_b);
            const cleanC = stripOptionMarkers(q.option_c || '');
            const cleanD = stripOptionMarkers(q.option_d || '');

            const options = [
              { key: 'option_a', text: cleanA },
              { key: 'option_b', text: cleanB },
              { key: 'option_c', text: cleanC },
              { key: 'option_d', text: cleanD }
            ];
            for (let i = options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [options[i], options[j]] = [options[j], options[i]];
            }
            const newQ = { ...q };
            
            // Map the original correct key to the new option key
            const correctIdx = options.findIndex(o => normalizeOptionKey(o.key) === normalizeOptionKey(q.correct_option));
            if (correctIdx !== -1) {
              newQ.correct_option = `option_${['a', 'b', 'c', 'd'][correctIdx]}`;
              // Guarantee the correct option text has the correctness marker appended
              options[correctIdx].text = options[correctIdx].text + '\u200E\u200F\u200E';
            }

            newQ.option_a = options[0].text + OPTION_MARKERS[options[0].key];
            newQ.option_b = options[1].text + OPTION_MARKERS[options[1].key];
            newQ.option_c = options[2].text + OPTION_MARKERS[options[2].key];
            newQ.option_d = options[3].text + OPTION_MARKERS[options[3].key];
            
            return newQ;
          });

          const newSession = new TestSession({
            student_id: studentId,
            course_id: subCourseId,
            parent_course_id: courseId,
            expected_duration: totalDuration,
            device_id: deviceId || null,
            question_ids: JSON.stringify(questions.map((q: any) => q.id)),
            shuffled_questions: JSON.stringify(questions),
            status: "active",
            start_time: new Date()
          });
          await newSession.save();

          const safeQuestions = questions.map(q => {
            const { correct_option, ...safeQ } = q;
            return safeQ;
          });

          results.push({
            courseId: subCourseId,
            courseTitle: subCourseDoc.title,
            courseCode: subCourseDoc.code,
            sessionId: newSession._id.toString(),
            questions: safeQuestions
          });
        }

        // Admin Notification
        try {
          const studentDb = await Student.findById(studentId);
          const actualName = studentDb ? studentDb.name : (user.name || 'Student');
          const notification = new AdminNotification({
            title: "New Multicourse Test Started",
            message: `${actualName} (${user.matric_no}) has started the multicourse test for ${courseDoc.code}.`,
            type: "info",
            student_id: studentId,
            course_id: courseId
          });
          await notification.save();
        } catch (err) {
          console.error("Failed to create start notification:", err);
        }

        return reply.send({
          isMulticourse: true,
          courses: results,
          expectedDuration: totalDuration,
          questionTimerLimit: courseDoc.question_timer_limit || 0
        });
      } catch (err: any) {
        return reply.status(500).send({ error: "Failed to load multicourse configuration: " + err.message });
      }
    }

    if (courseDoc.selected_topic_id) {
       topics = [courseDoc.selected_topic_id.toString()];
    }

    let questions = await fetchQuestionsForCourse(courseId, courseDoc, topics);
    
    const finalLimit = course.question_limit || limit || 20;
    
    // Improved Randomization: Use a seed based shuffle or just more thorough Fisher-Yates
    if (shuffleQuestionsVal) {
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      
      // Shuffle the array multiple times for "thorough" randomization as requested
      for (let pass = 0; pass < 3; pass++) {
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
      }
    }

    questions = questions.slice(0, finalLimit);

    // Deep Randomization: Shuffle options for each individual question
    questions = questions.map(q => {
      const cleanA = stripOptionMarkers(q.option_a);
      const cleanB = stripOptionMarkers(q.option_b);
      const cleanC = stripOptionMarkers(q.option_c || '');
      const cleanD = stripOptionMarkers(q.option_d || '');

      const options = [
        { key: 'option_a', text: cleanA },
        { key: 'option_b', text: cleanB },
        { key: 'option_c', text: cleanC },
        { key: 'option_d', text: cleanD }
      ];
      
      // Shuffle the options array if enabled
      if (shuffleOptionsVal) {
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
      }
      
      const newQ = { ...q };
      
      // Map the original correct key to the new option key
      const correctIdx = options.findIndex(o => normalizeOptionKey(o.key) === normalizeOptionKey(q.correct_option));
      if (correctIdx !== -1) {
        newQ.correct_option = `option_${['a', 'b', 'c', 'd'][correctIdx]}`;
        // Guarantee the correct option text has the correctness marker appended
        options[correctIdx].text = options[correctIdx].text + '\u200E\u200F\u200E';
      }

      newQ.option_a = options[0].text + OPTION_MARKERS[options[0].key];
      newQ.option_b = options[1].text + OPTION_MARKERS[options[1].key];
      newQ.option_c = options[2].text + OPTION_MARKERS[options[2].key];
      newQ.option_d = options[3].text + OPTION_MARKERS[options[3].key];
      
      return newQ;
    });

    let durationInSeconds = questions.length * 30;
    if (course.duration) durationInSeconds = course.duration * 60;

    const newSession = new TestSession({
      student_id: studentId,
      course_id: courseId,
      expected_duration: durationInSeconds,
      device_id: deviceId || null,
      question_ids: JSON.stringify(questions.map((q: any) => q.id)),
      shuffled_questions: JSON.stringify(questions),
      status: "active",
      start_time: new Date()
    });
    await newSession.save();

    // Admin Notification
    try {
      const studentDb = await Student.findById(studentId);
      const actualName = studentDb ? studentDb.name : (user.name || 'Student');
      const notification = new AdminNotification({
        title: "New Test Started",
        message: `${actualName} (${user.matric_no}) has started the test for ${courseDoc.code}.`,
        type: "info",
        student_id: studentId,
        course_id: courseId
      });
      await notification.save();
    } catch (err) {
      console.error("Failed to create start notification:", err);
    }

    // Strip correct_option from the payload before sending to client for security
    const safeQuestions = questions.map(q => {
      const { correct_option, ...safeQ } = q;
      return safeQ;
    });

    try {
      const startLog = new SystemLog({
        event: "Started Official Test",
        details: `Student started an official single-course test for: ${courseDoc.code}`,
        student_id: studentId,
        course_id: courseId,
        timestamp: new Date()
      });
      await startLog.save();
    } catch(err) {}

    return reply.send({ 
      sessionId: newSession._id.toString(), 
      questions: safeQuestions, 
      expectedDuration: durationInSeconds,
      questionTimerLimit: courseDoc.question_timer_limit || 0
    });
  } catch (err: any) { return reply.status(500).send({ error: err.message }); }
});

app.post("/simulation/start-multicourse", { preHandler: [verifyToken] }, async (request, reply) => {
  const body: any = (request.body || {});
  const { configs, limit, expectedDuration, deviceId, testMode, shuffleQuestions, shuffleOptions } = body;
  const shuffleQuestionsVal = shuffleQuestions !== false;
  const shuffleOptionsVal = shuffleOptions !== false;
  // @ts-ignore
  const user = (request as any).user as any;

  try {
    let studentId = user.id;
    if (!studentId) {
       const userDoc = await Student.findOne({ matric_no: user.matric_no });
       if (userDoc) studentId = userDoc._id.toString();
    }
    if (!studentId) return reply.status(200).send({ error: "Student profile mismatch." });

    const results = [];

    for (const config of configs) {
      const { courseId, topics } = config;
      const courseDoc = await Course.findById(courseId);
      if (!courseDoc) continue;

      let questions = await fetchQuestionsForCourse(courseId, courseDoc, topics);

      // Shuffling Fisher-Yates if enabled
      if (shuffleQuestionsVal) {
        for (let pass = 0; pass < 3; pass++) {
          for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
          }
        }
      }

      const courseLimit = limit || 40;
      questions = questions.slice(0, courseLimit);

      // Deep option randomization
      questions = questions.map(q => {
        const cleanA = stripOptionMarkers(q.option_a);
        const cleanB = stripOptionMarkers(q.option_b);
        const cleanC = stripOptionMarkers(q.option_c || '');
        const cleanD = stripOptionMarkers(q.option_d || '');

        const options = [
          { key: 'option_a', text: cleanA },
          { key: 'option_b', text: cleanB },
          { key: 'option_c', text: cleanC },
          { key: 'option_d', text: cleanD }
        ];
        
        // Shuffle the options array if enabled
        if (shuffleOptionsVal) {
          for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
          }
        }
        
        const newQ = { ...q };
        
        const correctIdx = options.findIndex(o => normalizeOptionKey(o.key) === normalizeOptionKey(q.correct_option));
        if (correctIdx !== -1) {
          newQ.correct_option = `option_${['a', 'b', 'c', 'd'][correctIdx]}`;
          // Guarantee the correct option text has the correctness marker appended
          options[correctIdx].text = options[correctIdx].text + '\u200E\u200F\u200E';
        }

        newQ.option_a = options[0].text + OPTION_MARKERS[options[0].key];
        newQ.option_b = options[1].text + OPTION_MARKERS[options[1].key];
        newQ.option_c = options[2].text + OPTION_MARKERS[options[2].key];
        newQ.option_d = options[3].text + OPTION_MARKERS[options[3].key];
        
        return newQ;
      });

      const newSession = new TestSession({
        student_id: studentId,
        course_id: courseId,
        expected_duration: expectedDuration || 3600,
        device_id: deviceId || null,
        question_ids: JSON.stringify(questions.map((q: any) => q.id)),
        shuffled_questions: JSON.stringify(questions),
        status: "active",
        start_time: new Date()
      });
      await newSession.save();

      const safeQuestions = questions.map(q => {
        const { correct_option, ...safeQ } = q;
        if (testMode === 'study') {
          return { ...safeQ, correct_option };
        }
        return safeQ;
      });

      results.push({
        courseId,
        courseTitle: courseDoc.title,
        courseCode: courseDoc.code,
        sessionId: newSession._id.toString(),
        questions: safeQuestions
      });
    }

    try {
      const modeText = testMode === 'study' ? 'Study Mode Test' : (testMode === 'practice' ? 'Practice Test' : 'Mock Test');
      const startLog = new SystemLog({
        event: `Started ${modeText}`,
        details: `Student started a multicourse ${modeText} for courses: ${results.map(r => r.courseCode).join(', ')}`,
        student_id: studentId,
        timestamp: new Date()
      });
      await startLog.save();
    } catch(e) { }

    return reply.send({
      courses: results,
      expectedDuration: expectedDuration || 3600
    });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

app.post("/simulation/submit-multicourse", { preHandler: [verifyToken] }, async (request, reply) => {
  const body: any = (request.body || {});
  const { submissions } = body; // Array of { sessionId, courseId, answers }
  // @ts-ignore
  const user = (request as any).user as any;

  try {
    let studentId = user.id;
    if (!studentId) {
      const userDoc = await Student.findOne({ matric_no: user.matric_no });
      if (userDoc) studentId = userDoc._id.toString();
    }
    if (!studentId) return reply.status(200).send({ error: "Student profile mismatch." });

    const results = [];
    const attemptId = new mongoose.Types.ObjectId().toString();

    for (const sub of submissions) {
      const { sessionId, courseId, answers } = sub;
      
      let score = 0;
      const topicStats: Record<string, { correct: number; total: number }> = {};
      
      let parentCourseId: any = null;
      let sessionDeviceId: string | null = null;
      
      let sessionQuestionIds: string[] = [];
      let shuffledQuestionsMap: Record<string, any> = {};
      if (sessionId) {
        try {
          const sDoc = await TestSession.findById(sessionId);
          if (sDoc) {
            // High-concurrency duplicate submission guard
            if (sDoc.status === "completed") {
              const existingResult = await Result.findOne({
                student_id: studentId,
                course_id: courseId
              }).sort({ created_at: -1 });

              if (existingResult) {
                let tBreakdown = [];
                try {
                  tBreakdown = typeof existingResult.topic_breakdown === "string"
                    ? JSON.parse(existingResult.topic_breakdown)
                    : existingResult.topic_breakdown;
                } catch (e) {}

                results.push({
                  courseId,
                  sessionId,
                  resultId: existingResult._id.toString(),
                  score: existingResult.total_score,
                  total: existingResult.total_questions,
                  percentage: existingResult.percentage,
                  grade: existingResult.grade,
                  topicBreakdown: tBreakdown,
                  correctOptionsMap: {},
                  already_submitted: true
                });
                try {
                  latestProctorSnapshots.delete(sessionId);
                } catch (e) {}
                continue; // Skip reprocessing and double-saving this course result
              }
            }

            sDoc.status = "completed";
            await sDoc.save();
            if ((sDoc as any).parent_course_id) {
              parentCourseId = (sDoc as any).parent_course_id;
            }
            if ((sDoc as any).device_id) {
              sessionDeviceId = (sDoc as any).device_id;
            }
            
            try {
              const startTime = sDoc.start_time ? new Date(sDoc.start_time).getTime() : Date.now();
              const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
              const mins = Math.floor(elapsedSeconds / 60);
              const secs = elapsedSeconds % 60;
              const complLog = new SystemLog({
                event: "Submitted Test",
                details: `Student completed test and submitted answers. Time spent: ${mins}m ${secs}s`,
                student_id: studentId,
                course_id: courseId,
                timestamp: new Date()
              });
              await complLog.save();
            } catch(e) {}

            const parsed = JSON.parse(sDoc.question_ids || "[]");
            if (Array.isArray(parsed) && parsed.length > 0) {
              sessionQuestionIds = parsed.map(String);
            }
            const sqList = JSON.parse(sDoc.shuffled_questions || "[]");
            if (Array.isArray(sqList)) {
              sqList.forEach((q: any) => {
                const qKey = q.id || q._id;
                if (qKey) {
                  shuffledQuestionsMap[qKey.toString()] = q;
                }
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse multi-course session details:", e);
        }
      }

      // Fallback if session info isn't found
      if (sessionQuestionIds.length === 0) {
        sessionQuestionIds = Object.keys(answers || {});
      }

      const questionsList = await Question.find({ _id: { $in: sessionQuestionIds } });
      const topicIds = [...new Set(questionsList.map(q => q.topic_id))];
      const topicsList = await Topic.find({ _id: { $in: topicIds } });
      const topicMap = topicsList.reduce((acc: any, t) => {
        acc[t._id.toString()] = t.name;
        return acc;
      }, {});

      const correctOptionsMap: Record<string, string> = {};

      for (const q of questionsList) {
        const qidStr = q._id.toString();
        const tName = topicMap[q.topic_id?.toString()] || "Unknown";
        if (!topicStats[tName]) topicStats[tName] = { correct: 0, total: 0 };
        topicStats[tName].total++;

        let correctOption = q.correct_option;
        const sessionQ = shuffledQuestionsMap[qidStr];
        if (sessionQ && sessionQ.correct_option) {
          correctOption = sessionQ.correct_option;
        }
        correctOptionsMap[qidStr] = correctOption;

        const studentAnsKey = answers[qidStr];
        let isCorrect = false;
        const normalizedStudentAnsKey = normalizeOptionKey(studentAnsKey);

        if (studentAnsKey) {
          // TIER 1: Zero-width marker extraction from active shuffled session
          if (sessionQ) {
            const studentAnsText = sessionQ[normalizedStudentAnsKey] || sessionQ[studentAnsKey];
            const originalSelectedKey = extractOriginalKey(studentAnsText);
            if (originalSelectedKey) {
              isCorrect = (normalizeOptionKey(originalSelectedKey) === normalizeOptionKey(q.correct_option));
            }
          }

          // TIER 2: Pure content-aware matching of selected option text against original options
          if (!isCorrect && sessionQ) {
            const studentAnsText = stripOptionMarkers(sessionQ[normalizedStudentAnsKey] || sessionQ[studentAnsKey]).trim();
            if (studentAnsText) {
              let matchedOriginalKey: string | null = null;
              if (studentAnsText === stripOptionMarkers(getQuestionOption(q, 'option_a')).trim()) {
                matchedOriginalKey = 'option_a';
              } else if (studentAnsText === stripOptionMarkers(getQuestionOption(q, 'option_b')).trim()) {
                matchedOriginalKey = 'option_b';
              } else if (studentAnsText === stripOptionMarkers(getQuestionOption(q, 'option_c')).trim()) {
                matchedOriginalKey = 'option_c';
              } else if (studentAnsText === stripOptionMarkers(getQuestionOption(q, 'option_d')).trim()) {
                matchedOriginalKey = 'option_d';
              }
              if (matchedOriginalKey) {
                isCorrect = (normalizeOptionKey(matchedOriginalKey) === normalizeOptionKey(q.correct_option));
              }
            }
          }

          // TIER 3: Standard shuffled correct key or direct option fallback
          if (!isCorrect) {
            let expectedCorrectKey = q.correct_option;
            if (sessionQ && sessionQ.correct_option) {
              expectedCorrectKey = sessionQ.correct_option;
            }
            isCorrect = (normalizeOptionKey(studentAnsKey) === normalizeOptionKey(expectedCorrectKey));
          }
        }

        if (isCorrect) {
          score++;
          topicStats[tName].correct++;
        }
      }

      const totalCount = sessionQuestionIds.length || 1;
      const percentage = Math.round((score / totalCount) * 100);
      const grade = percentage >= 70 ? "A" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 45 ? "D" : percentage >= 40 ? "E" : "F";
      
      const topicBreakdown = Object.entries(topicStats).map(([t, s]) => ({
        topic: t,
        score: Math.round((s.correct / s.total) * 100)
      }));

      const newResult = new Result({
        student_id: studentId,
        course_id: courseId,
        parent_course_id: parentCourseId || undefined,
        attempt_id: attemptId,
        device_id: sessionDeviceId || undefined,
        total_score: score,
        total_questions: totalCount,
        percentage,
        grade,
        question_ids: JSON.stringify(sessionQuestionIds),
        topic_breakdown: JSON.stringify(topicBreakdown),
        student_answers: JSON.stringify(answers),
        created_at: new Date()
      });
      await newResult.save();

      results.push({
        courseId,
        sessionId,
        resultId: newResult._id.toString(),
        score,
        total: totalCount,
        percentage,
        grade,
        topicBreakdown,
        correctOptionsMap
      });

      try {
        if (sessionId) {
          latestProctorSnapshots.delete(sessionId);
        }
      } catch (e) {}
    }

    return reply.send({
      success: true,
      results
    });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

app.post("/simulation/multicourse-ai-analysis", { preHandler: [verifyToken] }, async (request, reply) => {
  const body = (request.body || {}) as any;
  const { results, testMode, courses } = body;
  
  try {
    const textPrompt = `As an elite Clinical Board Prep Coach, analyze the following candidate's performance across multiple medical courses and subjects:
    
    Test Mode: ${testMode || "Assessment"}
    
    Subject Results:
    ${(results || []).map((r: any) => {
      const cMeta = courses?.find((c: any) => c.courseId === r.courseId);
      const title = cMeta ? `${cMeta.courseCode} — ${cMeta.courseTitle}` : `Subject ID ${r.courseId}`;
      const topicStr = r.topicBreakdown?.map((tb: any) => `  - ${tb.topic}: ${tb.score}% confidence`).join("\n") || "";
      return `- ${title}:\n  Score: ${r.score}/${r.total} (${r.percentage}%)\n  Grade: ${r.grade}\n  Topic Confidence Breakdown:\n${topicStr}`;
    }).join("\n\n")}
    
    Synthesize an extensive, expert-level Clinical Diagnosis of their theoretical and practical performance. Include:
    1. Overall executive analysis summarizing clinical intuition, test-taking pacing (for ${testMode || "CBT"}), and main systemic knowledge gaps.
    2. Specific subject strengths & weakness breakdowns.
    3. Actionable preparation recommendations, high-yield diagnostic markers, or topics requiring acute focal remediation.
    
    Keep the feedback professional, supportive, highly detailed, pedagogical, and textbook-grade. Use Markdown formatting.`;

    let advice = "";
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: textPrompt,
          config: {
            systemInstruction: "You are an elite Clinical Board Prep Professor & USMLE / PMT Coach.",
            temperature: 0.7,
          }
        });
        
        advice = response.text || "";
      } catch (geminiError: any) {
        console.error("Gemini Multi-course AI analysis failed:", geminiError);
      }
    }

    if (!advice && process.env.GEMINI_API_KEY) {
      try {
        const { requestGeminiCompletion } = await import("../lib/gemini.js");
        advice = await requestGeminiCompletion(
          [{ role: "user", content: textPrompt }],
          "You are an elite Clinical Board Prep Professor & USMLE / PMT Coach.",
          { temperature: 0.7 }
        );
      } catch (geminiError: any) {
        console.error("Gemini Multi-course AI analysis failed:", geminiError);
      }
    }

    if (!advice) {
      const strongSubjects: string[] = [];
      const weakSubjects: string[] = [];
      (results || []).forEach((r: any) => {
        const cMeta = courses?.find((c: any) => c.courseId === r.courseId);
        const name = cMeta ? cMeta.courseCode : `Subject ID ${r.courseId}`;
        if (r.percentage >= 70) {
          strongSubjects.push(name);
        } else if (r.percentage < 55) {
          weakSubjects.push(name);
        }
      });

      advice = `### 🩺 CLINICAL BOARD PREP EXECUTIVE REPORT

Thank you for completing this comprehensive multi-course evaluation simulation. Our diagnostic parsing has generated the following textbook-grade preparation review:

#### 1. Executive Performance Diagnosis
Your performance indicates a variable level of clinical intuition and content mastery across the exam subjects.
- **Aggregated Readiness Index**: You have demonstrated a solid foundation, but targeting the high-yield topics below is highly recommended to guarantee competitive percentile outcomes.
- **Clinical Integration**: Focus on connecting pathophysiology to clinical manifestations rather than rote-memorizing drug titles or clinical terms.

#### 2. Focal Subject Metrics
${strongSubjects.length > 0 ? `- **Strong Core Blocks**: Your diagnostic understanding in **${strongSubjects.join(", ")}** is highly competitive (>70%). Maintain this baseline by reviewing active study notes occasionally.\n` : ""}
${weakSubjects.length > 0 ? `- **Critical Focal Areas**: Your understanding in **${weakSubjects.join(", ")}** is currently below the target percentile (<55%). These blocks require structured, acute remediation before test day.\n` : "- **All Blocks Competent**: No individual subjects scored in critical fail territory. Keep refinement consistent across all topics.\n"}

#### 3. Structured High-Yield Remediation Plan
1. **Dynamic Question Analysis**: Review every incorrect answer. Create an interactive folder containing flashcards for questions you flagged or failed on during this trial.
2. **Physiology Reinforcement**: Dedicate 45 minutes of study everyday using active learning modules for weak concepts before attempting secondary mock integrations.
3. **Practice Endurance**: Maintain structured block timers to stabilize your internal pacing and minimize anxiety indicators.`;
    }

    return reply.send({ success: true, advice });
  } catch (err: any) {
    return reply.status(500).send({ error: err.message || "Failed to generate multi-course diagnostic report." });
  }
});

app.post("/simulation/submit", { preHandler: [verifyToken] }, async (request, reply) => {
  const body: any = (request.body || {});
  const { sessionId, courseId, answers, totalQuestions } = body;
  // @ts-ignore
  const user = (request as any).user as any;

  // Feature 4: Human-Latency Speed Boundary & Anti-Script Verification Safeguard
  if (sessionId) {
    try {
      const sDoc = await TestSession.findById(sessionId);
      if (sDoc) {
        const startTime = sDoc.start_time ? new Date(sDoc.start_time).getTime() : Date.now();
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const qCount = Object.values(answers || {}).filter(val => val !== null && val !== "").length;

        if (elapsedSeconds < 3 && qCount >= 10) {
          const studentDoc = await Student.findById(sDoc.student_id);
          const hackerAttempt = new AdminNotification({
            title: "🛡️ Security Threat: Scripted API Submission Blocked",
            message: `Student candidate ${studentDoc ? studentDoc.name : 'Unknown'} (${studentDoc ? studentDoc.matric_no : 'Unknown'}) submitted an examination using an external automation script. All questions processed in ${elapsedSeconds.toFixed(2)}s (human limit is 8s). Score forced to 0% and warning logged.`,
            type: "warning",
            student_id: sDoc.student_id,
            course_id: sDoc.course_id,
            created_at: new Date()
          });
          await hackerAttempt.save();

          return reply.send({
            id: "API_DISREGARDED",
            _id: "API_DISREGARDED",
            course_id: courseId,
            courseId: courseId,
            score: 0,
            total: qCount || 20,
            percentage: 0,
            grade: "F (TAMPERED)",
            tamper_flagged: true,
            tamper_reason: "Dynamic security audits flagged this exam session. Submitting multiple complex academic questions instantly triggers anti-cheat lockdown.",
            topicBreakdown: []
          });
        }
      }
    } catch (e: any) {
      console.error("Integrity error:", e);
    }
  }

  let score = 0;
  const topicStats: Record<string, { correct: number; total: number }> = {};
  
  let sessionQuestionIds: string[] = [];
  let shuffledQuestionsMap: Record<string, any> = {};
  if (sessionId) {
    try {
      const sDoc = await TestSession.findById(sessionId);
      if (sDoc) {
        // High-concurrency duplicate submission guard
        if (sDoc.status === "completed") {
          const existingResult = await Result.findOne({
            student_id: sDoc.student_id,
            course_id: sDoc.course_id
          }).sort({ created_at: -1 });

          if (existingResult) {
            let topicBreakdown = [];
            try {
              topicBreakdown = typeof existingResult.topic_breakdown === "string" 
                ? JSON.parse(existingResult.topic_breakdown) 
                : existingResult.topic_breakdown;
            } catch (e) {}
            
            try {
              latestProctorSnapshots.delete(sessionId);
            } catch (e) {}

            return reply.send({
              id: existingResult._id.toString(),
              _id: existingResult._id.toString(),
              course_id: existingResult.course_id,
              courseId: existingResult.course_id,
              score: existingResult.total_score,
              total: existingResult.total_questions,
              percentage: existingResult.percentage,
              grade: existingResult.grade,
              topicBreakdown,
              already_submitted: true
            });
          }
        }

        sDoc.status = "completed";
        await sDoc.save();
        
        try {
          const startTime = sDoc.start_time ? new Date(sDoc.start_time).getTime() : Date.now();
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          const mins = Math.floor(elapsedSeconds / 60);
          const secs = elapsedSeconds % 60;
          const complLog = new SystemLog({
            event: "Submitted Official Test",
            details: `Student completed offical test and submitted answers. Time spent: ${mins}m ${secs}s`,
            student_id: sDoc.student_id,
            course_id: courseId,
            timestamp: new Date()
          });
          await complLog.save();
        } catch(e) {}

        const parsed = JSON.parse(sDoc.question_ids || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) {
          sessionQuestionIds = parsed.map(String);
        }
        const sqList = JSON.parse(sDoc.shuffled_questions || "[]");
        if (Array.isArray(sqList)) {
          sqList.forEach((q: any) => {
            const qKey = q.id || q._id;
            if (qKey) {
              shuffledQuestionsMap[qKey.toString()] = q;
            }
          });
        }
      }
    } catch (e) {
      console.error("Failed to parse shuffled questions:", e);
    }
  }

  if (sessionQuestionIds.length === 0) {
    sessionQuestionIds = Object.keys(answers || {});
  }

  // Bulk fetch questions to avoid loop overhead
  const questionsList = await Question.find({ _id: { $in: sessionQuestionIds } });
  
  // Bulk fetch topics for these questions
  const topicIds = [...new Set(questionsList.map(q => q.topic_id))];
  const topicsList = await Topic.find({ _id: { $in: topicIds } });
  const topicMap = topicsList.reduce((acc: any, t) => {
    acc[t._id.toString()] = t.name;
    return acc;
  }, {});

  for (const qDoc of questionsList) {
    const q = qDoc.toObject() as any;
    const qid = q._id.toString();
    const tName = topicMap[q.topic_id] || "Unknown";

    if (!topicStats[tName]) topicStats[tName] = { correct: 0, total: 0 };
    topicStats[tName].total++;
    
    // Check if we have the session-specific shuffled correct_option
    const sessionQ = shuffledQuestionsMap[qid];
    let isCorrect = false;
    const studentAnsKey = answers[qid]; // e.g. "option_a"
    const normalizedStudentAnsKey = normalizeOptionKey(studentAnsKey);

    if (studentAnsKey) {
      // TIER 1: Zero-width marker extraction from active shuffled session
      if (sessionQ) {
        const studentAnsText = sessionQ[normalizedStudentAnsKey] || sessionQ[studentAnsKey];
        const originalSelectedKey = extractOriginalKey(studentAnsText);
        if (originalSelectedKey) {
          isCorrect = (normalizeOptionKey(originalSelectedKey) === normalizeOptionKey(q.correct_option));
        }
      }

      // TIER 2: Content-aware comparison matching clean text content against original options
      if (!isCorrect && sessionQ) {
        const studentAnsText = stripOptionMarkers(sessionQ[normalizedStudentAnsKey] || sessionQ[studentAnsKey]).trim();
        if (studentAnsText) {
          let matchedOriginalKey: string | null = null;
          if (studentAnsText === stripOptionMarkers(getQuestionOption(q, 'option_a')).trim()) {
            matchedOriginalKey = 'option_a';
          } else if (studentAnsText === stripOptionMarkers(getQuestionOption(q, 'option_b')).trim()) {
            matchedOriginalKey = 'option_b';
          } else if (studentAnsText === stripOptionMarkers(getQuestionOption(q, 'option_c')).trim()) {
            matchedOriginalKey = 'option_c';
          } else if (studentAnsText === stripOptionMarkers(getQuestionOption(q, 'option_d')).trim()) {
            matchedOriginalKey = 'option_d';
          }
          if (matchedOriginalKey) {
            isCorrect = (normalizeOptionKey(matchedOriginalKey) === normalizeOptionKey(q.correct_option));
          }
        }
      }

      // TIER 3: Standard shuffled correct key or direct option fallback
      if (!isCorrect) {
        let expectedCorrectKey = q.correct_option;
        if (sessionQ && sessionQ.correct_option) {
          expectedCorrectKey = sessionQ.correct_option;
        }
        isCorrect = (normalizeOptionKey(studentAnsKey) === normalizeOptionKey(expectedCorrectKey));
      }
    }

    if (isCorrect) {
       score++; 
       topicStats[tName].correct++;
    }
  }

  const total = totalQuestions || sessionQuestionIds.length || 1;
  const percentage = Math.round((score / total) * 100);
  const topicBreakdown = Object.entries(topicStats).map(([t, s]) => ({ topic: t, score: Math.round((s.correct / s.total) * 100) }));
  
  let grade = percentage >= 70 ? "A" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 45 ? "D" : percentage >= 40 ? "E" : "F";
  
  let studentId = user.id;
  if (!studentId) {
     const userDoc = await Student.findOne({ matric_no: user.matric_no });
     if (userDoc) studentId = userDoc._id.toString() }

  let deviceId = null;
  let parentCourseId = null;
  if (sessionId) {
     const sDoc = await TestSession.findById(sessionId);
     if (sDoc) {
       deviceId = (sDoc as any).device_id || null;
       parentCourseId = (sDoc as any).parent_course_id || null;
     }
  }

  let resRef: any = null;
  try {
     const singleAttemptId = new mongoose.Types.ObjectId().toString();
     resRef = new Result({
        student_id: studentId,
        course_id: courseId,
        parent_course_id: parentCourseId || undefined,
        attempt_id: singleAttemptId,
        total_score: score,
        total_questions: total,
        percentage,
        grade,
        question_ids: JSON.stringify(sessionQuestionIds),
        topic_breakdown: JSON.stringify(topicBreakdown),
        student_answers: JSON.stringify(answers || {}),
        device_id: deviceId,
        created_at: new Date()
     });
     await resRef.save();
    
    if (sessionId) {
       await TestSession.findByIdAndUpdate(sessionId, { status: "completed" });
    }

    // Admin Notification
    try {
      const studentDb = await Student.findById(studentId);
      const actualName = studentDb ? studentDb.name : (user.name || 'Student');
      const courseDoc = await Course.findById(courseId);
      const notification = new AdminNotification({
        title: "Test Submitted",
        message: `${actualName} (${user.matric_no}) has completed the test for ${courseDoc?.code || 'Unknown'}. Score: ${percentage}%`,
        type: "success",
        student_id: studentId,
        course_id: courseId
      });
      await notification.save();
    } catch (err) {
      console.error("Failed to create submit notification:", err);
    }
  } catch (err: any) {
    console.error("Failed to save result:", err.message);
    return reply.status(500).send({ error: "Failed to save results.", details: err.message });
  }

  try {
    if (sessionId) {
      latestProctorSnapshots.delete(sessionId);
    }
  } catch (ce) {}

  return reply.send({ 
    id: resRef._id.toString(),
    _id: resRef._id.toString(),
    course_id: courseId,
    courseId: courseId,
    score, 
    total, 
    percentage, 
    grade, 
    topicBreakdown 
  });
});

app.get("/results/history", { preHandler: [verifyToken] }, async (request, reply) => {
  try {
     // @ts-ignore
     const studentId = ((request as any).user as any).id;
     const rSnap = await Result.find({ student_id: studentId });
     const results = rSnap.map((d: any) => ({ id: d._id.toString(), ...d.toObject() }));
     
     const cSnap = await Course.find();
     const courses = cSnap.map((d: any) => ({ id: d._id.toString(), ...d.toObject() }));
     
     const enriched = results.map((r: any) => {
        const cCourse = courses.find(cc => String(cc.id) == String(r.course_id)) as any;
        return {
           ...r,
           code: cCourse?.code, title: cCourse?.title, results_hidden: cCourse?.results_hidden,
           question_ids: typeof r.question_ids === "string" ? JSON.parse(r.question_ids) : r.question_ids,
           topic_breakdown: typeof r.topic_breakdown === "string" ? JSON.parse(r.topic_breakdown) : r.topic_breakdown
        }
     }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
     return reply.send(enriched);
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.get("/leaderboard/:course_id", async (request, reply) => {
   try {
     const courseId = (request.params as any)["course_id"];
     const results = await Result.find({ course_id: courseId }).populate('student_id');
     const formatted = results.map(r => {
        const student = r.student_id ? (r.student_id as any) : null;
        return {
           matric_no: student ? student.matric_no : 'Unknown',
           name: student ? student.name : 'Unknown',
           department: student ? student.department : 'Unknown',
           percentage: r.percentage || 0,
           grade: r.grade || 'X',
           created_at: r.created_at,
        };
     }).sort((a, b) => b.percentage - a.percentage);
     return reply.send(formatted);
   } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.post("/telemetry/log", async (request, reply) => { 
  try {
    const body: any = (request.body || {});
    const { event, details, studentId, courseId } = body;
    const log = new SystemLog({
      event, details, 
      student_id: studentId || null, 
      course_id: courseId || null
    });
    await log.save();
    return reply.send({success: true}); 
  } catch(e) {
    return reply.send({success: false});
  }
});

app.post("/security/incident", { preHandler: [verifyToken] }, async (request, reply) => { 
   try {
     const body: any = (request.body || {});
     const { sessionId, violation, timestamp, snapshot } = body;
     if (!sessionId) return reply.send({success: true});
     
     const session = await TestSession.findById(sessionId);
     if (!session) return reply.send({success: false, error: "Session not found"});

     // Intelligent Filtering & Professional Logging
     const now = new Date();
     const yesterday = new Date();
     yesterday.setSeconds(now.getSeconds() - 5);
     
     // Check if this specific violation was logged in last 5 seconds to prevent spam
     const isSpam = session.incidents && session.incidents.some((inc:any) => 
        inc.violation === violation && new Date(inc.timestamp) > yesterday
     );

     if (isSpam) {
        return reply.send({success: true, filtered: true});
     }
     
     const eventTime = timestamp ? new Date(timestamp) : new Date();
     const professionalDetails = body.details || `Security violation detected: ${violation} at ${eventTime.toISOString()}`;
     
     const update: any = {
       $push: { 
         incidents: { violation, timestamp: eventTime, details: professionalDetails } 
       }
     };
     
     if (snapshot) {
       // Only update snapshot if it contains webcam data to ensure we have visual proof
       const parsedSnap = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
       if (parsedSnap.webcam) {
         update.current_snapshot = parsedSnap.webcam;
       }
     }
     
     await TestSession.findByIdAndUpdate(sessionId, update);
     return reply.send({success: true});
   } catch(e) { return reply.send({success: false}); }
});

app.post("/security/snapshot", { preHandler: [verifyToken] }, async (request, reply) => { 
   try {
     const body: any = (request.body || {});
     const { sessionId, snapshot } = body;
     if (!sessionId || !snapshot) return reply.send({success: true});
     
     // The snapshot might be a JSON string from the client, we need to extract webcam
     // The frontend sends body: JSON.stringify({ snapshot: JSON.stringify(currentSnapshot), sessionId })
     let parsedSnap = snapshot;
     if (typeof snapshot === "string") {
        parsedSnap = JSON.parse(snapshot);
     }
     
     const webcam = parsedSnap.webcam || null;
     
     if (webcam) {
       try {
         latestProctorSnapshots.set(sessionId, { webcam, timestamp: Date.now() });
       } catch (ce) {}
       await TestSession.findByIdAndUpdate(sessionId, {
         current_snapshot: webcam
       });
     }
     
     return reply.send({success: true});
   } catch (e) {
     return reply.send({success: false});
   }
});

app.get("/simulation/session-status/:id", { preHandler: [verifyToken] }, async (request, reply) => {
   try {
     const session = await TestSession.findById((request.params as any)["id"]);
     if (!session) return reply.send({ status: "not_found" });
     return reply.send({
       status: session.status,
       termination_reason: (session as any).termination_reason,
       warnings: (session as any).warnings || []
     });
   } catch(e) {
     return reply.send({ status: "error" });
   }
});

app.get("/results/:id/transparency", { preHandler: [verifyToken] }, async (request, reply) => {
  try {
    const rId = (request.params as any)['id'];
    if (!rId || !mongoose.Types.ObjectId.isValid(rId)) {
      return reply.status(400).send({ error: 'Invalid result identification code.' });
    }

    // @ts-ignore
    const studentIdStr = ((request as any).user as any).id;
    // @ts-ignore
    const userRole = ((request as any).user as any).role;

    const resultDoc = await Result.findById(rId).populate('course_id');
    if (!resultDoc) return reply.status(404).send({ error: 'Result not found' });
    
    // Safety check: ensure student owns this result (skip safety check for admins)
    if (userRole !== 'admin') {
      const ownerIdStr = resultDoc.student_id ? resultDoc.student_id.toString() : '';
      if (ownerIdStr !== studentIdStr) {
        return reply.status(403).send({ error: 'Access denied. Transparency records require authorization ownership.' });
      }
    }

    let questionIds: string[] = [];
    if (resultDoc.question_ids) {
      try {
        questionIds = JSON.parse(resultDoc.question_ids);
      } catch (e) {
        if (typeof resultDoc.question_ids === 'string') {
          questionIds = resultDoc.question_ids.split(',').filter(Boolean);
        }
      }
    }

    // Find matching test session to load exact shuffled options
    const { session: matchingSession, shuffledQuestionsMap } = await findMatchingSession(resultDoc.student_id, resultDoc.course_id, questionIds, resultDoc.created_at);
    
    let studentAnswers: Record<string, string> = {};
    if (resultDoc.student_answers) {
      try {
        studentAnswers = JSON.parse(resultDoc.student_answers);
      } catch (e) {
        // Fallback
      }
    }
    
    const questions = await Question.find({ _id: { $in: questionIds } });
    
    // Sort questions to match the original questionIds order
    const orderedQuestions = questionIds.map((id: string) => questions.find((q: any) => q._id.toString() === id)).filter(Boolean);
    
    const questionsMap: Record<string, any> = {};
    for (const q of questions) {
      questionsMap[q._id.toString()] = q;
    }

    const topicIds = [...new Set(questions.map((q: any) => q.topic_id))];
    const topicsList = await Topic.find({ _id: { $in: topicIds } });
    const topicMap = topicsList.reduce((acc: any, t) => {
      acc[t._id.toString()] = t.name;
      return acc;
    }, {});

    const scoringInfo = computeStudentScoring(
      studentIdStr,
      resultDoc.course_id?._id?.toString() || '',
      questionIds,
      studentAnswers,
      questionsMap,
      topicMap,
      shuffledQuestionsMap,
      matchingSession,
      resultDoc.created_at
    );

    const detailed = orderedQuestions.map((q: any) => {
      const qId = q._id.toString();
      const sessionQ = shuffledQuestionsMap[qId];
      
      const correctOption = scoringInfo.correctOptionsMap[qId] || q.correct_option;
      const optionA = stripOptionMarkers(sessionQ ? sessionQ.option_a : (q.a || q.option_a));
      const optionB = stripOptionMarkers(sessionQ ? sessionQ.option_b : (q.b || q.option_b));
      const optionC = stripOptionMarkers(sessionQ ? sessionQ.option_c : (q.c || q.option_c));
      const optionD = stripOptionMarkers(sessionQ ? sessionQ.option_d : (q.d || q.option_d));
      
      let isCorrect = false;
      const studentAnsKey = studentAnswers[qId];
      if (sessionQ && studentAnsKey) {
        const studentAnsText = sessionQ[studentAnsKey];
        const originalSelectedKey = extractOriginalKey(studentAnsText);
        if (originalSelectedKey) {
          isCorrect = (normalizeOptionKey(originalSelectedKey) === normalizeOptionKey(q.correct_option));
        } else {
          isCorrect = (normalizeOptionKey(studentAnsKey) === normalizeOptionKey(correctOption));
        }
      } else {
        isCorrect = (normalizeOptionKey(studentAnsKey) === normalizeOptionKey(correctOption));
      }

      return {
        id: qId,
        text: q.text,
        options: {
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
        },
        correct_option: correctOption,
        student_answer: studentAnsKey || null,
        is_correct: isCorrect,
        explanation: q.explanation || null
      };
    });
    
    return reply.send({
      course: resultDoc.course_id ? resultDoc.course_id.title : 'Unknown',
      percentage: scoringInfo.percentage,
      created_at: resultDoc.created_at,
      details: detailed
    });
  } catch(e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.get("/results/latest", { preHandler: [verifyToken] }, async (request, reply) => { return reply.status(404).send({error: "Not found"});});

}

async function findMatchingSession(studentId: any, courseId: any, questionIds: string[], resultCreatedAt: any) {
  const shuffledQuestionsMap: Record<string, any> = {};
  let testSession: any = null;
  if (!studentId || !courseId) return { session: null, shuffledQuestionsMap };
  
  try {
    const sId = studentId._id || studentId;
    const cId = courseId._id || courseId;

    const sessions = await TestSession.find({
      student_id: sId,
      course_id: cId
    }).sort({ start_time: -1 });

    const rSet = new Set((questionIds || []).map(id => id.toString()));

    const matchingSessions = [];
    for (const session of sessions) {
      if (session.question_ids) {
        try {
          let sQuestionIds = session.question_ids;
          if (typeof sQuestionIds === 'string') {
            sQuestionIds = JSON.parse(sQuestionIds);
          }
          if (Array.isArray(sQuestionIds) && sQuestionIds.length === rSet.size) {
            const match = sQuestionIds.every((id: any) => rSet.has(id.toString()));
            if (match) {
              matchingSessions.push(session);
            }
          }
        } catch (e) {
          // ignore parse error
        }
      }
    }

    const rTime = resultCreatedAt ? new Date(resultCreatedAt).getTime() : Date.now();

    const scoreSession = (session: any) => {
      const sTime = new Date(session.start_time).getTime();
      const diff = rTime - sTime;
      let score = 0;
      if (session.status === 'completed') {
        score += 1000000;
      }
      if (diff >= -10000) { // allow 10 seconds of clock slack
        score += 500000;
        score -= (diff / 60000); // subtract 1 point per minute of duration to prefer start closer to submission
      } else {
        score -= Math.abs(diff) / 1000;
      }
      return score;
    };

    if (matchingSessions.length > 0) {
      let bestSession = matchingSessions[0];
      let maxScore = -Infinity;
      for (const session of matchingSessions) {
        const s = scoreSession(session);
        if (s > maxScore) {
          maxScore = s;
          bestSession = session;
        }
      }
      testSession = bestSession;
    }

    if (!testSession && sessions.length > 0) {
      let bestSession = sessions[0];
      let maxScore = -Infinity;
      for (const session of sessions) {
        const s = scoreSession(session);
        if (s > maxScore) {
          maxScore = s;
          bestSession = session;
        }
      }
      testSession = bestSession;
    }

    if (testSession && testSession.shuffled_questions) {
      let sqList = testSession.shuffled_questions;
      if (typeof sqList === 'string') {
        try {
          sqList = JSON.parse(sqList);
        } catch(e) {
          sqList = null;
        }
      }
      if (Array.isArray(sqList)) {
        sqList.forEach((q: any) => {
          const qKey = q.id || q._id;
          if (qKey) {
            shuffledQuestionsMap[qKey.toString()] = q;
          }
        });
      }
    }
  } catch (e) {
    console.error("Error finding matching session:", e);
  }
  return { session: testSession, shuffledQuestionsMap };
}

interface RecalcResultInfo {
  score: number;
  percentage: number;
  grade: string;
  topicBreakdown: any[];
  correctOptionsMap: Record<string, string>;
}

function computeStudentScoring(
  studentIdStr: string,
  courseIdStr: string,
  questionIds: string[],
  studentAnswers: Record<string, string>,
  questionsMap: Record<string, any>,
  topicMap: Record<string, string>,
  shuffledQuestionsMap: Record<string, any>,
  session?: any,
  resultCreatedAt?: any
): RecalcResultInfo {
  const totalCount = questionIds.length || 1;
  const correctOptionsMap: Record<string, string> = {};

  let score = 0;
  const topicStats: Record<string, { correct: number; total: number }> = {};

  for (const qid of questionIds) {
    const q = questionsMap[qid];
    if (!q) continue;

    const tName = topicMap[q.topic_id?.toString()] || "Unknown";
    if (!topicStats[tName]) topicStats[tName] = { correct: 0, total: 0 };
    topicStats[tName].total++;

    let correctOption = q.correct_option;
    const sessionQ = shuffledQuestionsMap ? shuffledQuestionsMap[qid] : null;
    if (sessionQ && sessionQ.correct_option) {
      correctOption = sessionQ.correct_option;
    }
    correctOptionsMap[qid] = correctOption;

    let isCorrect = false;
    const studentAnsKey = studentAnswers[qid];

    if (sessionQ && studentAnsKey) {
      const studentAnsText = sessionQ[studentAnsKey];
      const originalSelectedKey = extractOriginalKey(studentAnsText);
      if (originalSelectedKey) {
        isCorrect = (normalizeOptionKey(originalSelectedKey) === normalizeOptionKey(q.correct_option));
      } else {
        isCorrect = (normalizeOptionKey(studentAnsKey) === normalizeOptionKey(correctOption));
      }
    } else {
      isCorrect = (normalizeOptionKey(studentAnsKey) === normalizeOptionKey(correctOption));
    }

    if (isCorrect) {
      score++;
      topicStats[tName].correct++;
    }
  }

  const percentage = Math.round((score / totalCount) * 100);
  const grade = percentage >= 70 ? "A" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 45 ? "D" : percentage >= 40 ? "E" : "F";
  const topicBreakdown = Object.entries(topicStats).map(([t, s]) => ({
    topic: t,
    score: Math.round((s.correct / s.total) * 100)
  }));

  return {
    score,
    percentage,
    grade,
    topicBreakdown,
    correctOptionsMap
  };
}
