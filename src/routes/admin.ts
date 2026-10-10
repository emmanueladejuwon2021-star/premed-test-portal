import mongoose from 'mongoose';
import { Course, Student, Result, Question, Topic, TestSession, SystemLog, Announcement, AdminNotification, Setting } from '../models';
import { verifyToken, requireAdmin, DEV_PASSWORD } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import { OPTION_MARKERS, extractOriginalKey, stripOptionMarkers, normalizeOptionKey } from '../lib/optionUtils';
import { latestProctorSnapshots } from '../lib/proctorCache';

import { FastifyInstance } from "fastify";

export default async function routes(app: FastifyInstance) {

app.get('/maintenance-status', async (request, reply) => {
  try {
    let setting = await Setting.findOne({ key: "maintenance_mode" });
    return reply.send({ maintenance: setting ? !!setting.value : false });
  } catch (e: any) {
    return reply.send({ maintenance: false });
  }
});

app.post('/admin/maintenance', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = request.body || {};
    const { maintenance } = body;
    let setting = await Setting.findOne({ key: "maintenance_mode" });
    if (!setting) {
      setting = new Setting({ key: "maintenance_mode", value: !!maintenance });
    } else {
      setting.value = !!maintenance;
    }
    await setting.save();
    return reply.send({ success: true, maintenance: !!setting.value });
  } catch (e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.get('/admin/settings', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    let setting = await Setting.findOne({ key: "allow_unlimited_reattempts" });
    if (!setting) {
      setting = new Setting({ key: "allow_unlimited_reattempts", value: false });
      await setting.save();
    }
    return reply.send({ allow_unlimited_reattempts: !!setting.value });
  } catch (e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.post('/admin/settings', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = request.body || {};
    const { allow_unlimited_reattempts } = body;
    
    let setting = await Setting.findOne({ key: "allow_unlimited_reattempts" });
    if (!setting) {
      setting = new Setting({ key: "allow_unlimited_reattempts", value: !!allow_unlimited_reattempts });
    } else {
      setting.value = !!allow_unlimited_reattempts;
    }
    await setting.save();
    
    return reply.send({ success: true, allow_unlimited_reattempts: !!setting.value });
  } catch (e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.get('/admin/overview', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const [sCount, cCount, qCount] = await Promise.all([
      Student.countDocuments(),
      Course.countDocuments(),
      Question.countDocuments()
    ]);

    const stats = await Result.aggregate([
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          avgScore: { $avg: "$percentage" }
        }
      }
    ]);

    const results = await Result.find().sort({ created_at: -1 }).limit(20);
    const tCount = stats[0]?.totalTests || 0;
    const avg = Math.round((stats[0]?.avgScore || 0) * 10) / 10;

    const chartData = results.reverse().map((r: any, i: number) => {
       const date = new Date(r.created_at || Date.now());
       return {
         name: `Test ${i + 1}`,
         score: r.percentage || 0,
         date: date.toLocaleDateString()
       }
    });

    return reply.send({
      totalStudents: sCount, totalCourses: cCount,
      totalQuestions: qCount, totalTests: tCount,
      platformAverage: avg,
      chartData: chartData.length > 0 ? chartData : [
        {name: 'Jan', score: 0}, {name: 'Feb', score: 0}, {name: 'Mar', score: 0}
      ]
    });
  } catch(e:any) {
    return reply.status(500).send({error:e.message});
  }
});

app.get('/admin/results/all', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const results = await Result.find()
      .populate('student_id', 'name matric_no department')
      .populate('course_id', 'code title')
      .sort({ created_at: -1 });
    return reply.send(results);
  } catch (error: any) {
    console.error('[Admin Results All]', error);
    return reply.status(500).send({ error: error.message });
  }
});

app.post('/admin/users', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const { name, matric_no, department, phone, email } = request.body as any;
    if (!name || !matric_no || !department) {
      return reply.status(400).send({ error: "Name, Matric Number, and Department are required." });
    }

    const normalizedMatric = String(matric_no).toUpperCase().replace(/\s+/g, "");
    const existing = await Student.findOne({ matric_no: normalizedMatric });
    if (existing) {
      return reply.status(400).send({ error: `Student with matric number ${normalizedMatric} already exists.` });
    }

    const student = new Student({
      name,
      matric_no: normalizedMatric,
      department,
      phone: phone || '',
      email: email || '',
      password: 'manually-enrolled',
      strength: 'THEORY'
    });

    await student.save();
    return reply.send({ success: true, student });
  } catch(e:any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.get('/admin/users', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const students = await Student.find().lean();
    if (!students) return reply.send([]);

    const allResults = await Result.find().lean();
    
    const studentCourseAttempts: Record<string, Record<string, any[]>> = {};
    allResults.forEach((r: any) => {
      if (!r.student_id || !r.course_id) return;
      const sId = r.student_id.toString();
      const cId = r.course_id.toString();
      if (!studentCourseAttempts[sId]) {
        studentCourseAttempts[sId] = {};
      }
      if (!studentCourseAttempts[sId][cId]) {
        studentCourseAttempts[sId][cId] = [];
      }
      studentCourseAttempts[sId][cId].push(r);
    });

    const statsMap = new Map();
    for (const [sId, coursesMap] of Object.entries(studentCourseAttempts)) {
      let totalCourseScore = 0;
      let distinctCoursesCount = 0;
      let totalAttemptsMade = 0;
      
      for (const [cId, attempts] of Object.entries(coursesMap)) {
        attempts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestAttempt = attempts[0];
        
        totalCourseScore += latestAttempt.percentage || 0;
        distinctCoursesCount++;
        totalAttemptsMade += attempts.length;
      }
      
      statsMap.set(sId, {
        tests_taken: distinctCoursesCount,
        total_attempts: totalAttemptsMade,
        avg_score: distinctCoursesCount > 0 ? (totalCourseScore / distinctCoursesCount) : 0
      });
    }

    const studentsWithStats = students.map(studentDoc => {
      if (!studentDoc || !studentDoc._id) return null;
      const s = statsMap.get(studentDoc._id.toString()) || { tests_taken: 0, avg_score: 0 };
      return { 
        ...studentDoc, 
        id: studentDoc._id.toString(), 
        _id: studentDoc._id.toString(),
        ...s 
      };
    }).filter(Boolean);

    return reply.send(studentsWithStats);
  } catch(e:any){ 
    console.error("CRITICAL REGISTRY ERROR:", e);
    return reply.status(500).send({error: e.message}); 
  }
});

app.post('/admin/clear-topic/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const topicId = (request.params as any)['id'];
    await Question.deleteMany({ topic_id: topicId });
    await Topic.findByIdAndUpdate(topicId, { question_count: 0 });
    return reply.send({ success: true, message: 'Registry partition purged.' });
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.post('/admin/clear-course/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const courseId = (request.params as any)['id'];
    const topics = await Topic.find({ course_id: courseId });
    const topicIds = topics.map(t => t._id);
    await Question.deleteMany({ topic_id: { $in: topicIds } });
    await Topic.updateMany({ course_id: courseId }, { question_count: 0 });
    return reply.send({ success: true, message: 'Full module registry purged.' });
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.put('/admin/users/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = (request.body || {});
    await Student.findByIdAndUpdate((request.params as any)['id'], body);
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.delete('/admin/users/purge-irregular', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const students = await Student.find().lean();
    const toDelete: mongoose.Types.ObjectId[] = [];

    for (const student of students) {
      if (!student) continue;
      const normalizedName = student.name ? String(student.name).trim() : '';
      const hasNoName = !normalizedName;

      const normalizedMatric = student.matric_no ? String(student.matric_no).trim() : '';
      const numericDigitsCount = normalizedMatric.replace(/[^0-9]/g, '').length;
      const isIrregularMatric = !normalizedMatric || (numericDigitsCount < 9);

      const normalizedDept = student.department ? String(student.department).trim().toUpperCase() : '';
      const isNursingNacon = normalizedDept === 'NURSING NACON';

      if (hasNoName || (isIrregularMatric && !isNursingNacon)) {
        toDelete.push(new mongoose.Types.ObjectId(student._id.toString()));
      }
    }

    if (toDelete.length > 0) {
      await Result.deleteMany({ student_id: { $in: toDelete } });
      await TestSession.deleteMany({ student_id: { $in: toDelete } });
      await Student.deleteMany({ _id: { $in: toDelete } });
    }

    return reply.send({ success: true, count: toDelete.length });
  } catch (e: any) {
    console.error("Error purging irregular students:", e);
    return reply.status(500).send({ error: e.message });
  }
});

app.delete('/admin/users/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const id = (request.params as any)['id'];
    
    if (id === 'purge-irregular') {
      const students = await Student.find().lean();
      const toDelete: mongoose.Types.ObjectId[] = [];

      for (const student of students) {
        if (!student) continue;
        const normalizedName = student.name ? String(student.name).trim() : '';
        const hasNoName = !normalizedName;

        const normalizedMatric = student.matric_no ? String(student.matric_no).trim() : '';
        const numericDigitsCount = normalizedMatric.replace(/[^0-9]/g, '').length;
        const isIrregularMatric = !normalizedMatric || (numericDigitsCount < 9);

        const normalizedDept = student.department ? String(student.department).trim().toUpperCase() : '';
        const isNursingNacon = normalizedDept === 'NURSING NACON';

        if (hasNoName || (isIrregularMatric && !isNursingNacon)) {
          toDelete.push(new mongoose.Types.ObjectId(student._id.toString()));
        }
      }

      if (toDelete.length > 0) {
        await Result.deleteMany({ student_id: { $in: toDelete } });
        await TestSession.deleteMany({ student_id: { $in: toDelete } });
        await Student.deleteMany({ _id: { $in: toDelete } });
      }

      return reply.send({ success: true, count: toDelete.length });
    }

    const objId = new mongoose.Types.ObjectId(id);
    await Result.deleteMany({ student_id: objId });
    await TestSession.deleteMany({ student_id: objId });
    await Student.findByIdAndDelete(objId);
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.get('/admin/users/:id/results', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const id = (request.params as any)['id'];
    const results = await Result.find({ student_id: id }).populate('course_id');
    return reply.send(results.map((d: any) => ({
      id: d._id.toString(),
      code: d.course_id ? d.course_id.code : 'Unknown',
      percentage: d.percentage,
      created_at: d.created_at
    })));
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});



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

function getDeterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

interface RecalcResultInfo {
  score: number;
  percentage: number;
  grade: string;
  topicBreakdown: string; // JSON string
  correctOptionsMap: Record<string, string>; // Maps qid -> correct_option key
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
    topicBreakdown: JSON.stringify(topicBreakdown),
    correctOptionsMap
  };
}

app.get('/admin/results/:id/transparency', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const rId = (request.params as any)['id'];
    const resultDoc = await Result.findById(rId).populate('course_id');
    if (!resultDoc) return reply.status(404).send({ error: 'Result not found' });
    
    let questionIds: string[] = [];
    if (resultDoc.question_ids) {
      questionIds = JSON.parse(resultDoc.question_ids);
    }

    // Find matching test session to load exact shuffled options
    const { session: matchingSession, shuffledQuestionsMap } = await findMatchingSession(resultDoc.student_id, resultDoc.course_id, questionIds, resultDoc.created_at);
    
    let studentAnswers: Record<string, string> = {};
    if (resultDoc.student_answers) {
      studentAnswers = JSON.parse(resultDoc.student_answers);
    }
    
    const questions = await Question.find({ _id: { $in: questionIds } });
    
    // Sort questions to match the original questionIds order
    const orderedQuestions = questionIds.map(id => questions.find((q: any) => q._id.toString() === id)).filter(Boolean);
    
    const questionsMap: Record<string, any> = {};
    for (const q of questions) {
      questionsMap[q._id.toString()] = q;
    }

    const topicIds = [...new Set(questions.map(q => q.topic_id))];
    const topicsList = await Topic.find({ _id: { $in: topicIds } });
    const topicMap = topicsList.reduce((acc: any, t) => {
      acc[t._id.toString()] = t.name;
      return acc;
    }, {});

    const studentIdStr = (resultDoc.student_id ? (resultDoc.student_id._id || resultDoc.student_id) : '').toString();
    const courseIdStr = (resultDoc.course_id ? (resultDoc.course_id._id || resultDoc.course_id) : '').toString();

    const scoringInfo = computeStudentScoring(
      studentIdStr,
      courseIdStr,
      questionIds,
      studentAnswers,
      questionsMap,
      topicMap,
      shuffledQuestionsMap,
      matchingSession,
      resultDoc.created_at
    );

    const getQuestionOption = (q: any, key: string) => {
      const normKey = String(key).trim().toLowerCase();
      if (normKey === 'option_a' || normKey === 'opt_a' || normKey === 'a') return q.option_a || q.a || '';
      if (normKey === 'option_b' || normKey === 'opt_b' || normKey === 'b') return q.option_b || q.b || '';
      if (normKey === 'option_c' || normKey === 'opt_c' || normKey === 'c') return q.option_c || q.c || '';
      if (normKey === 'option_d' || normKey === 'opt_d' || normKey === 'd') return q.option_d || q.d || '';
      return '';
    };

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
        is_correct: isCorrect
      };
    });
    
    return reply.send({
      course: resultDoc.course_id ? resultDoc.course_id.title : 'Unknown',
      percentage: scoringInfo.percentage,
      created_at: resultDoc.created_at,
      details: detailed
    });
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.post('/admin/results/recalculate-all', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    // 1. Preload all necessary collections to perform recalculation entirely in-memory
    const results = await Result.find({});
    const allSessions = await TestSession.find({});
    const allQuestions = await Question.find({});
    const allTopics = await Topic.find({});

    // 2. Build indexed lookup maps in-memory
    const questionsMap: Record<string, any> = {};
    for (const q of allQuestions) {
      questionsMap[q._id.toString()] = q;
    }

    const topicMap: Record<string, string> = {};
    for (const t of allTopics) {
      topicMap[t._id.toString()] = t.name;
    }

    const sessionsGroupMap: Record<string, any[]> = {};
    for (const session of allSessions) {
      const studentIdStr = (session.student_id ? (session.student_id._id || session.student_id) : '').toString();
      const courseIdStr = (session.course_id ? (session.course_id._id || session.course_id) : '').toString();
      if (!studentIdStr || !courseIdStr) continue;

      const key = `${studentIdStr}_${courseIdStr}`;
      if (!sessionsGroupMap[key]) {
        sessionsGroupMap[key] = [];
      }
      sessionsGroupMap[key].push(session);
    }

    // Sort sessions in each group by start_time descending
    for (const key of Object.keys(sessionsGroupMap)) {
      sessionsGroupMap[key].sort((a, b) => {
        const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
        const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
        return timeB - timeA;
      });
    }

    // Helper to find session in memory
    const findMatchingSessionInMemory = (studentIdStr: string, courseIdStr: string, questionIds: string[], resultCreatedAt: any) => {
      const shuffledQuestionsMap: Record<string, any> = {};
      const key = `${studentIdStr}_${courseIdStr}`;
      const sessions = sessionsGroupMap[key] || [];

      let testSession = null;
      const rSet = new Set(questionIds.map(id => id.toString()));

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
          score -= (diff / 60000); // prefer start times closer to submission
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
          } catch (e) {
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

      return { session: testSession, shuffledQuestionsMap };
    };

    let count = 0;
    const bulkOps = [];

    // 3. Process each result using the preloaded data
    for (const resultDoc of results) {
      if (!resultDoc.student_answers) continue;

      let questionIds: string[] = [];
      if (resultDoc.question_ids) {
        try {
          questionIds = JSON.parse(resultDoc.question_ids);
        } catch (e) {
          questionIds = [];
        }
      }

      if (questionIds.length === 0) continue;

      let studentAnswers: Record<string, string> = {};
      try {
        studentAnswers = JSON.parse(resultDoc.student_answers);
      } catch (e) {
        continue; // Skip corrupted JSON
      }

      const studentIdStr = (resultDoc.student_id ? (resultDoc.student_id._id || resultDoc.student_id) : '').toString();
      const courseIdStr = (resultDoc.course_id ? (resultDoc.course_id._id || resultDoc.course_id) : '').toString();

      const { session: matchingSession, shuffledQuestionsMap } = findMatchingSessionInMemory(studentIdStr, courseIdStr, questionIds, resultDoc.created_at);

      const scoringInfo = computeStudentScoring(
        studentIdStr,
        courseIdStr,
        questionIds,
        studentAnswers,
        questionsMap,
        topicMap,
        shuffledQuestionsMap,
        matchingSession,
        resultDoc.created_at
      );

      bulkOps.push({
        updateOne: {
          filter: { _id: resultDoc._id },
          update: {
            $set: {
              total_score: scoringInfo.score,
              percentage: scoringInfo.percentage,
              grade: scoringInfo.grade,
              topic_breakdown: scoringInfo.topicBreakdown
            }
          }
        }
      });

      count++;
    }

    // 4. Batch update all modified results back to MongoDB safely in one round-trip
    if (bulkOps.length > 0) {
      await Result.bulkWrite(bulkOps);
    }

    return reply.send({ success: true, count });
  } catch (e: any) {
    console.error("[ERROR RecalculateAll]", e);
    return reply.status(500).send({ error: e.message });
  }
});

app.post('/admin/results/:id/recalculate', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const rId = (request.params as any)['id'];
    const resultDoc = await Result.findById(rId);
    if (!resultDoc) return reply.status(404).send({ error: 'Result not found' });

    if (!resultDoc.student_answers) {
      return reply.status(400).send({ error: 'This result was submitted under an older portal version and does not contain saved answers to recalculate with.' });
    }

    let questionIds: string[] = [];
    if (resultDoc.question_ids) {
      questionIds = JSON.parse(resultDoc.question_ids);
    }

    const { session: matchingSession, shuffledQuestionsMap } = await findMatchingSession(resultDoc.student_id, resultDoc.course_id, questionIds, resultDoc.created_at);

    let studentAnswers: Record<string, string> = {};
    try {
      studentAnswers = JSON.parse(resultDoc.student_answers);
    } catch (e) {
      return reply.status(400).send({ error: 'The saved student answers for this result are corrupted and cannot be recalculated.' });
    }

    const questionsList = await Question.find({ _id: { $in: questionIds } });
    const topicIds = [...new Set(questionsList.map(q => q.topic_id))];
    const topicsList = await Topic.find({ _id: { $in: topicIds } });
    const topicMap = topicsList.reduce((acc: any, t) => {
      acc[t._id.toString()] = t.name;
      return acc;
    }, {});

    const questionsMap: Record<string, any> = {};
    for (const q of questionsList) {
      questionsMap[q._id.toString()] = q;
    }

    const studentIdStr = (resultDoc.student_id ? (resultDoc.student_id._id || resultDoc.student_id) : '').toString();
    const courseIdStr = (resultDoc.course_id ? (resultDoc.course_id._id || resultDoc.course_id) : '').toString();

    const scoringInfo = computeStudentScoring(
      studentIdStr,
      courseIdStr,
      questionIds,
      studentAnswers,
      questionsMap,
      topicMap,
      shuffledQuestionsMap,
      matchingSession,
      resultDoc.created_at
    );

    resultDoc.total_score = scoringInfo.score;
    resultDoc.percentage = scoringInfo.percentage;
    resultDoc.grade = scoringInfo.grade;
    resultDoc.topic_breakdown = scoringInfo.topicBreakdown;
    await resultDoc.save();

    return reply.send({ success: true, percentage: scoringInfo.percentage, score: scoringInfo.score, grade: scoringInfo.grade });
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.delete('/admin/results/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    await Result.findByIdAndDelete((request.params as any)['id']);
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.get('/admin/telemetry', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => { 
  try {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const recentSessions = await TestSession.find({ 
      $or: [
        { status: "active" },
        { start_time: { $gte: yesterday } }
      ]
    }).populate('student_id course_id');
    const enriched = recentSessions.map((s: any) => {
      const sId = s._id.toString();
      const cached = latestProctorSnapshots.get(sId);
      const liveSnapshot = cached ? (cached.webcam || cached) : s.current_snapshot;
      return {
        session_id: sId,
        student_id: s.student_id ? s.student_id._id.toString() : null,
        student_name: s.student_id ? s.student_id.name : 'Unknown',
        matric_no: s.student_id ? s.student_id.matric_no : 'Unknown',
        course_id: s.course_id ? s.course_id._id.toString() : null,
        course_code: s.course_id ? s.course_id.code : 'Unknown',
        status: s.status,
        start_time: s.start_time,
        current_snapshot: liveSnapshot,
        incidents: s.incidents || [],
        incident_count: (s.incidents || []).length
      };
    });
    return reply.send(enriched);
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.get('/admin/incidents', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => { 
  try {
    const sessions = await TestSession.find({ "incidents.0": { "$exists": true } }).populate('student_id course_id');
    const allIncidents: any[] = [];
    sessions.forEach((s: any) => {
       if (s.incidents) {
         s.incidents.forEach((inc: any) => {
           allIncidents.push({
             _id: inc._id?.toString() || Math.random().toString(),
             student_name: s.student_id ? s.student_id.name : 'Unknown',
             matric_no: s.student_id ? s.student_id.matric_no : 'Unknown',
             course_code: s.course_id ? s.course_id.code : 'Unknown',
             violation: inc.violation,
             timestamp: inc.timestamp
           });
         });
       }
    });
    
    // Also fetch SystemLogs
    const sysLogs = await SystemLog.find().populate('student_id course_id').limit(800);
    sysLogs.forEach((l: any) => {
      allIncidents.push({
         _id: l._id?.toString() || Math.random().toString(),
         student_name: l.student_id ? (l.student_id as any).name : 'System',
         matric_no: l.student_id ? (l.student_id as any).matric_no : 'Unknown',
         course_code: l.course_id ? (l.course_id as any).code : 'System/App',
         violation: `[${l.event}] ${l.details || ''}`,
         timestamp: l.timestamp
      });
    });
    
    return reply.send(allIncidents.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  } catch(e:any) { return reply.status(500).send({error:e.message}); }
});

app.get('/admin/system-logs', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const logs = await SystemLog.find().populate('student_id course_id').sort({ timestamp: -1 }).limit(100);
    return reply.send(logs.map(l => ({
      id: l._id.toString(),
      event: l.event,
      details: l.details,
      student_name: l.student_id ? (l.student_id as any).name : 'System',
      course_code: l.course_id ? (l.course_id as any).code : 'N/A',
      timestamp: l.timestamp
    })));
  } catch(e:any) { return reply.status(500).send({error: e.message}); }
});

app.post('/admin/courses', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  const body: any = (request.body || {});
  const { code, title, icon, scheduled_date, end_date, is_mock, results_hidden, force_start, duration, question_limit, attempts_allowed, question_timer_limit, selected_topic_id, is_locked, results_locked, is_master, multicourse_config } = body;
  if (!code || !title) return reply.status(400).send({ error: 'Code and title are required' });
  try {
    const finalResultsLocked = results_locked !== undefined ? !!results_locked : (results_hidden !== undefined ? !!results_hidden : true);
    const finalResultsHidden = finalResultsLocked;

    const cRef = new Course({ 
      code, 
      title, 
      icon: icon || 'Book', 
      scheduled_date, 
      end_date, 
      is_mock: is_mock !== undefined ? is_mock : true, 
      results_hidden: finalResultsHidden, 
      force_start: force_start !== undefined ? force_start : false, 
      duration: duration || 30, 
      question_limit: question_limit || 20,
      attempts_allowed: attempts_allowed !== undefined ? attempts_allowed : 1,
      question_timer_limit: question_timer_limit !== undefined ? question_timer_limit : 0,
      selected_topic_id: selected_topic_id || undefined,
      is_locked: is_locked !== undefined ? is_locked : true,
      results_locked: finalResultsLocked,
      is_master: is_master !== undefined ? is_master : false,
      multicourse_config: multicourse_config || undefined
    });
    await cRef.save();
    return reply.send({ success: true, id: cRef._id.toString() });
  } catch(e:any) { return reply.status(500).send({error:e.message});}
});

app.put('/admin/courses/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = { ...(request.body as any || {}) };
    delete body._id;
    delete body.id;
    delete body.__v;
    if (body.results_locked !== undefined) {
      body.results_hidden = !!body.results_locked;
    } else if (body.results_hidden !== undefined) {
      body.results_locked = !!body.results_hidden;
    }
    await Course.findByIdAndUpdate((request.params as any)['id'], body);
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.delete('/admin/courses/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const courseId = (request.params as any)['id'];
    if (!courseId) return reply.status(400).send({ error: 'Missing course ID' });
    
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(courseId);
    } catch(err) {
      // If it's not a valid ObjectId, we can delete by string directly just in case, but relationships might fail.
      // Easiest is to just delete Course.
      await Course.deleteOne({ _id: courseId }).catch(() => {});
      return reply.send({ success: true, warning: 'Invalid ObjectId, soft delete executed' });
    }
    
    const courseDoc = await Course.findById(objectId).catch(() => null);
    const isMasterCourse = courseDoc ? !!courseDoc.is_master : false;

    if (isMasterCourse) {
      const topics = await Topic.find({ course_id: objectId }).catch(() => []);
      const topicIds = topics.map(t => t._id);
      
      if (topicIds.length > 0) {
          await Question.deleteMany({ topic_id: { $in: topicIds } }).catch(() => {});
      }
      await Topic.deleteMany({ course_id: objectId }).catch(() => {});
    }

    await Result.deleteMany({ course_id: objectId }).catch(() => {});
    await TestSession.deleteMany({ course_id: objectId }).catch(() => {});
    await Course.findByIdAndDelete(objectId).catch(() => {});
    
    return reply.send({success: true});
  } catch(e:any) {
    console.error("Delete course error:", e);
    return reply.status(500).send({ error: e.message || 'Internal deletion error' });
  }
});

app.post('/admin/topics', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  const body: any = (request.body || {});
  const { course_id, names } = body;
  for(const n of names) {
    await new Topic({ course_id, name: n, question_count: 0 }).save();
  }
  return reply.send({success: true});
});

app.delete('/admin/topics/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const id = (request.params as any)["id"];
    await Question.deleteMany({ topic_id: id }).catch(() => {});
    await Topic.findByIdAndDelete(id);
    return reply.send({ success: true });
  } catch (e: any) {
    return reply.status(500).send({ error: e.message || 'Failed to delete topic' });
  }
});

app.delete('/developer/nuke', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  const body: any = (request.body || {});
  if (body.password === DEV_PASSWORD) {
     return reply.send({success: true, message: 'Use MongoDB Atlas to delete collections.'});
  } else return reply.status(401).send({error:'Invalid'});
});

app.get('/admin/questions/:topicId', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const qSnap = await Question.find({ topic_id: (request.params as any)['topicId'] });
    return reply.send(qSnap.map((d: any) => ({
      id: d._id.toString(),
      topic_id: d.topic_id ? d.topic_id.toString() : null,
      question_text: d.text,
      option_a: d.a,
      option_b: d.b,
      option_c: d.c,
      option_d: d.d,
      correct_option: d.correct_option,
      diagram_url: d.diagram_url,
      explanation: d.explanation
    })));
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.post('/admin/questions', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = (request.body || {});
    const { topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, diagram_url, explanation } = body;
    const q = new Question({
      topic_id, text: question_text, a: option_a, b: option_b, c: option_c, d: option_d, correct_option: normalizeOptionKey(correct_option), diagram_url, explanation
    });
    await q.save();
    return reply.send({success: true, id: q._id.toString() });
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.post('/admin/questions/:id/diagram', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const id = (request.params as any)['id'];
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });

    const buffer = await data.toBuffer();
    const base64 = buffer.toString('base64');
    const diagram_url = `data:${data.mimetype};base64,${base64}`;

    await Question.findByIdAndUpdate(id, { diagram_url });
    return reply.send({ success: true, diagram_url });
  } catch(e:any) { return reply.status(500).send({error:e.message}); }
});

app.put('/admin/questions/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = (request.body || {});
    const { question_text, option_a, option_b, option_c, option_d, correct_option, diagram_url, explanation } = body;
    await Question.findByIdAndUpdate((request.params as any)['id'], {
      text: question_text, a: option_a, b: option_b, c: option_c, d: option_d, correct_option: normalizeOptionKey(correct_option), diagram_url, explanation
    });
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.delete('/admin/questions/:id/:topicId', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    await Question.findByIdAndDelete((request.params as any)['id']);
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.post('/admin/bulk-upload', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = (request.body || {});
    const { topic_id, questions } = body;
    if (!topic_id || !questions) return reply.status(400).send({error:'Invalid'});

    const qDocs = questions.map((q: any) => ({
      topic_id,
      text: q.text || q.question_text,
      a: q.a || q.option_a || 'N/A',
      b: q.b || q.option_b || 'N/A',
      c: q.c || q.option_c || 'N/A',
      d: q.d || q.option_d || 'N/A',
      correct_option: normalizeOptionKey(q.correct || q.correct_option || 'option_a'),
      explanation: q.explanation || ''
    }));
    await Question.insertMany(qDocs);
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});


app.get('/admin/session-details/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const session = await TestSession.findById((request.params as any)['id']).populate('student_id course_id');
    if (!session) return reply.status(404).send({error: "Not found"});
    
    let questions: any[] = [];
    if (session.question_ids) {
      let qids = typeof session.question_ids === 'string' ? JSON.parse(session.question_ids) : session.question_ids;
      for (const qid of qids) {
        const qDoc = await Question.findById(qid);
        if (qDoc) questions.push({ id: qDoc._id.toString(), ...qDoc.toObject() });
      }
    }

    const sId = session._id.toString();
    const cached = latestProctorSnapshots.get(sId);
    const liveSnapshot = cached ? (cached.webcam || cached) : session.current_snapshot;

    return reply.send({
      id: sId,
      session_id: sId,
      student_name: session.student_id ? (session.student_id as any).name : 'Unknown',
      matric_no: session.student_id ? (session.student_id as any).matric_no : 'Unknown',
      course_code: session.course_id ? (session.course_id as any).code : 'Unknown',
      status: session.status,
      start_time: session.start_time,
      incidents: session.incidents || [],
      warnings: session.warnings || [],
      termination_reason: session.termination_reason || '',
      current_snapshot: liveSnapshot,
      questions_total: session.question_ids ? JSON.parse(session.question_ids).length : 0,
      questions
    });
  } catch(e:any) { return reply.status(500).send({error: e.message}); }
});

app.post('/admin/terminate-session/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = (request.body || {});
    const sessionDoc = await TestSession.findByIdAndUpdate((request.params as any)['id'], {
      status: 'terminated_by_admin',
      termination_reason: body.reason || 'Admin manually terminated session'
    });
    if (sessionDoc) {
      const log = new SystemLog({
        event: "Admin Terminated Session",
        details: `Instructor remotely terminated test session`,
        student_id: sessionDoc.student_id,
        course_id: sessionDoc.course_id,
        timestamp: new Date()
      });
      await log.save();
    }
    return reply.send({success: true});
  } catch(e:any) { return reply.send({error: e.message}); }
});

app.get('/admin/announcements', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const data = await Announcement.find().sort({ created_at: -1 });
    return reply.send(data.map(d => ({
      id: d._id.toString(),
      title: d.title,
      content: d.content,
      created_at: d.created_at
    })));
  } catch(e:any) { return reply.status(500).send({error:e.message}); }
});

app.post('/admin/announcements', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = (request.body || {});
    const ann = new Announcement(body);
    await ann.save();
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.delete('/admin/announcements/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    await Announcement.findByIdAndDelete((request.params as any)['id']);
    return reply.send({success: true});
  } catch(e:any){ return reply.status(500).send({error:e.message}); }
});

app.post('/admin/prune-session-logs/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const id = (request.params as any)['id'];
    const session = await TestSession.findById(id);
    if (!session) return reply.status(404).send({error: 'Session not found'});
    
    const incidents = session.incidents || [];
    if (incidents.length === 0) return reply.send({success: true, message: 'No logs to prune'});
    
    const pruned = [];
    let last = null;
    for (const inc of incidents) {
      if (!last) {
        pruned.push(inc);
        last = inc;
        continue;
      }
      const diff = new Date(inc.timestamp).getTime() - new Date(last.timestamp).getTime();
      // Only keep logs that are at least 10 seconds apart if they are the same violation
      if (inc.violation === last.violation && diff < 10000) continue;
      
      pruned.push(inc);
      last = inc;
    }
    
    await TestSession.findByIdAndUpdate(id, { incidents: pruned });
    return reply.send({success: true, removed: incidents.length - pruned.length});
  } catch(e:any) { return reply.status(500).send({error: e.message}); }
});

app.post('/admin/warn-session/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const body: any = (request.body || {});
    await TestSession.findByIdAndUpdate((request.params as any)['id'], {
      $push: { warnings: body.message || 'Warning from Admin' }
    } as any);
    return reply.send({success: true});
  } catch(e:any) { return reply.send({error: e.message}); }
});

app.get('/admin/notifications', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const notifications = await AdminNotification.find().sort({ created_at: -1 }).limit(100).populate('student_id course_id');
    return reply.send(notifications.map(n => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      student_name: n.student_id ? (n.student_id as any).name : 'Unknown',
      course_code: n.course_id ? (n.course_id as any).code : 'Unknown',
      created_at: n.created_at
    })));
  } catch(e:any) { return reply.status(500).send({error: e.message}); }
});

app.post('/admin/notifications/:id/read', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    await AdminNotification.findByIdAndUpdate((request.params as any)['id'], { is_read: true });
    return reply.send({success: true});
  } catch(e:any) { return reply.status(500).send({error: e.message}); }
});

app.delete('/admin/notifications/clear', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    await AdminNotification.deleteMany({});
    return reply.send({success: true});
  } catch(e:any) { return reply.status(500).send({error: e.message}); }
});

app.delete('/admin/logs/clear', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    await SystemLog.deleteMany({});
    return reply.send({ success: true });
  } catch(e:any) { return reply.status(500).send({ error: e.message }); }
});

app.post('/admin/extract-questions', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  const { text, custom_count } = request.body as any;
  if (!text) return reply.status(400).send({ error: 'Text is required' });

  const targetCount = Number(custom_count) || 15;

  const fetchWithTimeout = async (url: string, options: any, timeoutMs = 25000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const attemptGeminiMCQ = async (): Promise<any[] | null> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('GEMINI_API_KEY is not defined or is empty in the environment for MCQ.');
      return null;
    }
    try {
      console.log(`GEMINI_API_KEY detected for MCQ extraction.`);

    const systemPrompt = `You are an expert pre-med and medical board professor on the Pre-med CBT platform.
Your task is to carefully read through the provided text/test notes and convert them into high-yield, non-generic, and tricky multiple-choice questions (MCQs) for the test. Formulate deep, integrated, and challenging scenario-based or conceptual MCQs that test critical thinking and deep clinical/scientific comprehension rather than surface-level definitions.
Ensure you generate EXACTLY ${targetCount} distinct questions based on the notes content. Do not generate more or less than ${targetCount} questions!

For each extracted question, follow these strict rules:
1. Every question must have exactly 4 options (a, b, c, d), representing high-quality scientific/clinical statements. Ensure incorrect options (distractors) are extremely plausible and tricky.
2. The correct option must be mapped directly to one of: "option_a", "option_b", "option_c", "option_d".
3. Crucial Explanations Rule: Write an extensive, step-by-step, highly educational detailed solution (aim for 120-250 words per explanation) that teaches the concept deeply from first principles. Teach very well on why the correct option is correct, and specifically why each of the incorrect options (distractors) is wrong.
4. Crucial Content-Focus Rule: You MUST NOT mention any option letters like "a", "b", "c", "d" (or "Option A", "A", etc.) explicitly anywhere in your explanation or detailed solution. Instead, refer directly to their content (e.g., write "while rising glucose acts to stimulate insulin secretion, glucagon is..." rather than "option a is wrong because").
5. Prohibited Phrases: NEVER reference the notes, syllabus, text, PDF, upload, or source document (do NOT use phrases like "according to the text", "the notes state", "based on the uploaded document", or "as described in the notes"). Instead, teach the medical/scientific concepts directly as an enthusiastic, authoritative professor.

Format requirement: Return ONLY a valid, parseable JSON array of question objects without any markdown tags (like \`\`\`json) or conversational introduction/conclusion text.

Every question object must match this schema:
[
  {
    "text": "The full text of the question",
    "a": "Option A text",
    "b": "Option B text",
    "c": "Option C text",
    "d": "Option D text",
    "correct": "option_a" | "option_b" | "option_c" | "option_d",
    "explanation": "High-quality, complete, teaching-dense explanation of the concepts without referencing document origin"
  }
]`;

    try {
      const { requestGeminiCompletion } = await import("../lib/gemini.js");
      const raw = await requestGeminiCompletion([{ role: "user", content: `Text to extract from:\n${text}` }], systemPrompt, { temperature: 0.2 });
      if (raw) {
        const cleaned = raw.replace(/```json/i, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`Gemini extraction succeeded (${parsed.length} questions)`);
          return parsed.map(q => ({
            text: q.text,
            a: q.a,
            b: q.b,
            c: q.c || '',
            d: q.d || '',
            correct: q.correct_option || q.correct || 'option_a',
            explanation: q.explanation || ''
          }));
        }
      }
    } catch (err: any) {
      console.warn(`Gemini MCQ extraction error:`, err.message || err);
    }
  } catch (mcqErr: any) {
    console.warn('Gemini MCQ unexpected exception:', mcqErr);
  }
  return null;
};

  try {
    let resultQuestions: any[] | null = null;

    if (process.env.GEMINI_API_KEY) {
      resultQuestions = await attemptGeminiMCQ();
    }

    if (resultQuestions && resultQuestions.length > 0) {
      return reply.send(resultQuestions);
    }

    console.log('All API-based extraction attempts failed. Deploying local rule-based fallback MCQ extraction...');
    const paragraphs = text.split(/\n+/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 20);

    const sentences: string[] = [];
    for (const p of paragraphs) {
      const matches = p.match(/[^.!?]+[.!?]+/g);
      if (matches) {
        sentences.push(...matches.map((s: string) => s.trim()));
      } else if (p.length > 30) {
        sentences.push(p);
      }
    }

    const filteredSentences = sentences
      .filter((s: string) => s.length > 35 && s.length < 280 && !/^\s*[\d\-\*•]+\s*$/.test(s));

    const medicalKeywords = /is|are|causes|leads|symptom|treatment|therapy|first-line|classic|characterized|associated|pathway|enzyme|hormone|diagnosis|clinical|pathological|anatomy|cell/i;
    const keySentences = filteredSentences.filter((s: string) => medicalKeywords.test(s));
    const sourcePool = keySentences.length >= 3 ? keySentences : (filteredSentences.length >= 1 ? filteredSentences : paragraphs);

    if (sourcePool.length === 0) {
      throw new Error('Syllabus text too short or unparseable for fallback extraction.');
    }

    const generatedQuestions = [];
    const numQuestions = Math.min(sourcePool.length, targetCount);

    for (let i = 0; i < numQuestions; i++) {
      const fact = sourcePool[i];
      let questionSubject = "this therapeutic topic";
      const subjectMatch = fact.match(/^([A-Z][a-zA-Z\s\-]{3,35})\s+(is|are|was|were|has|have|acts|inhibits|causes)\b/);
      if (subjectMatch && subjectMatch[1]) {
        questionSubject = subjectMatch[1].trim();
      }

      generatedQuestions.push({
        text: `Regarding ${questionSubject}, which of the following is correct based on established clinical or biological guidelines?`,
        a: fact,
        b: "Exhibits secondary systemic cleared pathways with low bio-availability.",
        c: "Primary clinical inhibition of ribosomal translation translocation steps.",
        d: "Undergoes multi-phasic first-pass degradation inside mitochondrial matrices.",
        correct: "option_a",
        explanation: `Let's analyze this concept in depth. ${fact}. Understanding this pathophysiological, biochemical, or anatomical relationship is essential for pre-medical and clinical mastery. This option correctly specifies the core function or attribute of the subject outlined in clinical science.`
      });
    }

    return reply.send(generatedQuestions);
  } catch (error: any) {
    console.error('Completely failed notes MCQ formulation:', error);
    return reply.status(500).send({ error: error.message || 'MCQ formulation failed' });
  }
});

app.post('/admin/expand-notes', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  const { text } = request.body as any;
  if (!text) return reply.status(400).send({ error: 'Text is required' });

  const fetchWithTimeout = async (url: string, options: any, timeoutMs = 25000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const systemPrompt = `You are an elite Pre-Med and Medical Board Prep Professor on the Pre-med CBT platform. 
Your goal is to read the provided medical syllabus or clinical notes and build a magnificent, expanded, highly extensive clinical textbook study guide containing extreme depth, details, and step-by-step mechanical breakdowns.

For every single fact, term, physiological relation, or pathway covered in the user text:
1. Explain it deeply from first principles. Define all complex medical terms, physiological mechanisms, regulatory loops, biochemical pathways, anatomical landmarks, and clinical indications in detail.
2. Structure the notes beautifully with clear headers (H1, H2, H3), dense bullet points, and clinical correlation boxes.
3. Every 3 paragraphs of teaching, insert a professional-grade clinical image prompt to illustrate the physiological, anatomical, or cellular processes described. You MUST use this exact dedicated format:
   [MED_IMAGE: highly detailed descriptive prompt of the clinical/medical illustration]
   - Example format:
   [MED_IMAGE: Highly detailed medical illustration of pancreatic beta cell insulin secretion pathway, showing GLUT2 transporter, ATP-sensitive potassium channels, and calcium flux, scientific diagram styling, high resolution, clinical textbook style]
   Make your image descriptions highly detailed, accurate, and vivid! Do not use generic descriptions.
4. CRITICAL RULES: 
   - NEVER reference "the uploaded notes", "according to the doc", "the provided text", "as mentioned here", "this file". 
   - Write with the authoritative, pedagogical eloquence of a legendary professor. 
   - Ensure the note is extremely high quality, detailed, and deeply explanatory.
   - Use beautiful Unicode mathematical, Greek symbols, superscripts, and subscripts for chemistry, physics, and equations (e.g., α, β, Δ, v_i, H₂O, C₆H₁₂O₆).
5. CRITICAL LENGTH MAXIMIZATION RULE: Write extremely comprehensive, detailed textbook guides. Do NOT summarize or shorten. Explode each vital topic. Aim for a thorough 1500 to 2000 words. Ensure technical detail and mechanical accuracy!`;

  let expandedNote = "";

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const { requestGeminiCompletion } = await import("../lib/gemini.js");
      console.log(`Sending expansion request to Gemini...`);
      const res = await requestGeminiCompletion([{ role: "user", content: `Please expand on and build diagrams for the following notes:\n\n${text}` }], systemPrompt, { temperature: 0.3 });
      
      if (res) {
         expandedNote = res;
         console.log(`Gemini Note expansion succeeded`);
      }
    } catch (fetchErr: any) {
      console.warn(`Gemini expansion error:`, fetchErr.message || fetchErr);
    }
  }

  if (!expandedNote) {
    expandedNote = "### Study Guide Formulation\n\nExpansion could not be fully compiled via active AI networks. Here are the core parsed elements compiled for study:\n\n" + text;
  }

  if (!expandedNote) {
    expandedNote = "### Study Guide Formulation\n\nExpansion could not be fully compiled via active AI networks. Here are the core parsed elements compiled for study:\n\n" + text;
  }

  return reply.send({ expanded_note: expandedNote });
});

app.post('/admin/notes-extractions', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  const { title, questions, expanded_note } = request.body as any;
  if (!title || !questions || !Array.isArray(questions)) {
    return reply.status(400).send({ error: 'Title and questions list are required' });
  }

  try {
    const { NotesExtraction } = await import('../models');
    
    const formattedQuestions = questions.map((q: any) => ({
      text: q.text,
      a: q.a,
      b: q.b,
      c: q.c || '',
      d: q.d || '',
      correct_option: normalizeOptionKey(q.correct_option || q.correct || 'option_a'),
      explanation: q.explanation || ''
    }));

    const extraction = new NotesExtraction({
      title,
      questions: formattedQuestions,
      expanded_note: expanded_note || ""
    });

    await extraction.save();
    return reply.send({ success: true, extraction });
  } catch (e: any) {
    console.error('Failed to save notes extraction:', e);
    return reply.status(500).send({ error: e.message || 'Failed to save notes extraction' });
  }
});

app.get('/admin/notes-extractions', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const { NotesExtraction } = await import('../models');
    const extractions = await NotesExtraction.find({}).sort({ uploaded_at: -1 });
    return reply.send(extractions);
  } catch (e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.delete('/admin/notes-extractions/:id', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  const { id } = request.params as any;
  try {
    const { NotesExtraction } = await import('../models');
    await NotesExtraction.findByIdAndDelete(id);
    return reply.send({ success: true });
  } catch (e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.get('/student/notes-extractions', { preHandler: [verifyToken] }, async (request, reply) => {
  try {
    const { NotesExtraction } = await import('../models');
    const extractions = await NotesExtraction.find({}).sort({ uploaded_at: -1 });
    return reply.send(extractions);
  } catch (e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.post('/admin/save-to-course-topic', { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  try {
    const { 
      course_id, 
      topic_mode, 
      topic_id, 
      topic_name, 
      questions,
      notes
    } = request.body as any;

    if (!course_id || !questions || !Array.isArray(questions)) {
      return reply.status(400).send({ error: 'course_id and questions list are required' });
    }

    const { Topic, Question } = await import('../models');

    let finalTopicId = topic_id;

    if (topic_mode === 'new') {
      if (!topic_name || !topic_name.trim()) {
        return reply.status(400).send({ error: 'New topic name is required' });
      }
      const existing = await Topic.findOne({ course_id, name: topic_name.trim() });
      if (existing) {
        finalTopicId = existing._id.toString();
        if (notes) {
          existing.notes = notes;
          await existing.save();
        }
      } else {
        const topic = new Topic({
          course_id,
          name: topic_name.trim(),
          question_count: 0,
          notes: notes || ""
        });
        await topic.save();
        finalTopicId = topic._id.toString();
      }
    } else {
      if (finalTopicId && notes) {
        await Topic.findByIdAndUpdate(finalTopicId, { notes });
      }
    }

    if (!finalTopicId) {
      return reply.status(400).send({ error: 'Topic selection or creation failed' });
    }

    const qDocs = questions.map((q: any) => ({
      topic_id: finalTopicId,
      text: q.text || q.question_text || 'N/A',
      a: q.a || q.option_a || 'N/A',
      b: q.b || q.option_b || 'N/A',
      c: q.c || q.option_c || '',
      d: q.d || q.option_d || '',
      correct_option: normalizeOptionKey(q.correct_option || q.correct || 'option_a'),
      explanation: q.explanation || ''
    }));

    await Question.insertMany(qDocs);

    // Update topic question count
    const count = await Question.countDocuments({ topic_id: finalTopicId });
    await Topic.findByIdAndUpdate(finalTopicId, { question_count: count });

    return reply.send({ success: true, topic_id: finalTopicId, count: qDocs.length });
  } catch (e: any) {
    console.error('Failed to save questions to course topic:', e);
    return reply.status(500).send({ error: e.message || 'Failed to save questions to course topic' });
  }
});


}
