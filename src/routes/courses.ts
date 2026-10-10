import { Hono } from "hono";
import { Course, Topic, Question } from "../models";
import { verifyToken } from "../middleware/auth";

import { FastifyInstance } from "fastify";

export default async function routes(app: FastifyInstance) {

app.get("/announcements", async (request, reply) => {
  try {
    const { Announcement } = await import("../models");
    const data = await Announcement.find().sort({ created_at: -1 });
    return reply.send(data.map(d => ({
      id: d._id.toString(),
      title: d.title,
      content: d.content,
      created_at: d.created_at
    })));
  } catch(e:any) { return reply.status(500).send({error:e.message}); }
});

// In-memory cache for the courses endpoint to sustain high-traffic polling
let coursesCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 3000; // 3 seconds Cache TTL

app.get("/courses", async (request, reply) => {
  try {
    const now = Date.now();
    // Serve from cache if available and fresh
    if (coursesCache && (now - coursesCache.timestamp < CACHE_TTL_MS)) {
      reply.header("X-Cache", "HIT");
      return reply.send(coursesCache.data);
    }

    // Performance Optimization: Use .lean() to bypass heavy Mongoose document wrappers
    const rawCourses = await Course.find().lean();
    const courses = rawCourses.map((d: any) => {
      const obj = d;
      const id = d._id.toString();
      
      const isInstance = !!(obj.selected_topic_id || obj.scheduled_date || obj.end_date || obj.title?.includes('—') || obj.title?.includes('Practice Mock') || obj.title?.includes('Official Exam') || obj.title?.includes('Practice Test'));
      const is_master = obj.is_master !== undefined ? !!obj.is_master : !isInstance;
      
      return { id, ...obj, is_master };
    });

    const rawTopics = await Topic.find().lean();
    const topics = rawTopics.map((d: any) => ({ id: d._id.toString(), ...d }));

    // Performance Bottleneck Solved: Fetch ONLY topic_id and _id for questions instead of loading massive texts/explanations
    const rawQuestions = await Question.find({}, { topic_id: 1 }).lean();
    const questions = rawQuestions.map((d: any) => ({ id: d._id.toString(), ...d }));

    const enriched = courses.map(c => {
      let targetCourseId = String(c.id);
      if (c.selected_topic_id) {
        const matchedTopic = topics.find((t: any) => String(t.id) === String(c.selected_topic_id));
        if (matchedTopic) {
          targetCourseId = String(matchedTopic.course_id);
        }
      } else {
        const directTopics = topics.filter((t: any) => String(t.course_id) === String(c.id));
        if (directTopics.length === 0 && c.code) {
          const sameCodeCourses = courses.filter(oth => oth.code === c.code);
          const sameCodeIds = sameCodeCourses.map(oth => String(oth.id));
          const hasTopicsCourse = sameCodeIds.find(cid => topics.some(t => String(t.course_id) === cid));
          if (hasTopicsCourse) {
            targetCourseId = hasTopicsCourse;
          }
        }
      }

      const cTopics = topics.filter((t: any) => String(t.course_id) === targetCourseId);
      let topicIds = cTopics.map(t => String(t.id));
      
      let activeTopicName = null;
      if (c.selected_topic_id) {
         const selectedTopic = cTopics.find(t => String(t.id) === String(c.selected_topic_id));
         if (selectedTopic) {
            topicIds = [String(selectedTopic.id)];
            activeTopicName = selectedTopic.name;
         }
      }
      
      const cQuestions = questions.filter((q: any) => topicIds.includes(String(q.topic_id)));
      
      let finalTopicsCount = cTopics.length;
      let finalQuestionsCount = cQuestions.length;

      if (c.multicourse_config) {
        try {
          const configs = typeof c.multicourse_config === 'string' ? JSON.parse(c.multicourse_config) : c.multicourse_config;
          if (Array.isArray(configs)) {
            const uniqueQuestionIds = new Set<string>();
            const uniqueTopicIds = new Set<string>();

            for (const config of configs) {
              const { courseId, topics: configTopics } = config;
              const subCourse = courses.find(oth => String(oth.id) === String(courseId));
              
              let subTopicIds: string[] = [];
              if (configTopics && configTopics.length > 0) {
                subTopicIds = configTopics.map(String);
              } else {
                let subTopics = topics.filter((t: any) => String(t.course_id) === String(courseId));
                if (subTopics.length === 0 && subCourse && subCourse.code) {
                  const sameCodeCourses = courses.filter(oth => oth.code === subCourse.code);
                  const sameCodeIds = sameCodeCourses.map(oth => String(oth.id));
                  subTopics = topics.filter((t: any) => sameCodeIds.includes(String(t.course_id)));
                }
                subTopicIds = subTopics.map(t => String(t.id));
              }

              subTopicIds.forEach(tid => uniqueTopicIds.add(tid));

              const subQuestions = questions.filter((q: any) => subTopicIds.includes(String(q.topic_id)));
              subQuestions.forEach(q => uniqueQuestionIds.add(String(q._id || q.id)));
            }

            finalTopicsCount = uniqueTopicIds.size;
            finalQuestionsCount = uniqueQuestionIds.size;
          }
        } catch (err) {
          console.error("Error parsing multicourse_config of course " + c.id, err);
        }
      }

      return {
        ...c,
        topicsCount: finalTopicsCount,
        questionsCount: finalQuestionsCount,
        activeTopicName // passed to the frontend
      };
    });

    // Populate cache
    coursesCache = {
      data: enriched,
      timestamp: now
    };

    reply.header("X-Cache", "MISS");
    return reply.send(enriched);
  } catch(e: any) { return reply.status(500).send({error: e.message}); }
});

app.get("/courses/:id/search-questions", async (request, reply) => {
  try {
    const courseId = (request.params as any)["id"];
    const query = ((request.query as any)["q"] || "").toLowerCase().trim();
    const scope = (request.query as any)["scope"] || "all"; // "all" | "question" | "explanation" | "topic"

    const topics = await Topic.find({ course_id: courseId });
    const topicIds = topics.map(t => t._id);
    const topicMap = new Map(topics.map(t => [t._id.toString(), t.name]));

    const questions = await Question.find({ topic_id: { $in: topicIds } });

    const filtered = questions.filter((q: any) => {
      if (!query) return true;

      const textMatch = q.text && q.text.toLowerCase().includes(query);
      const explanationMatch = q.explanation && q.explanation.toLowerCase().includes(query);
      const aMatch = q.a && q.a.toLowerCase().includes(query);
      const bMatch = q.b && q.b.toLowerCase().includes(query);
      const cMatch = q.c && q.c.toLowerCase().includes(query);
      const dMatch = q.d && q.d.toLowerCase().includes(query);
      const optionsMatch = aMatch || bMatch || cMatch || dMatch;

      const parentTopicName = topicMap.get(q.topic_id?.toString() || "") || "";
      const topicMatch = parentTopicName.toLowerCase().includes(query);

      if (scope === 'question') {
        return textMatch || optionsMatch;
      } else if (scope === 'explanation') {
        return explanationMatch;
      } else if (scope === 'topic') {
        return topicMatch;
      } else {
        return textMatch || explanationMatch || optionsMatch || topicMatch;
      }
    });

    return reply.send(filtered.map((q: any) => {
      const parentTopicName = topicMap.get(q.topic_id?.toString() || "") || "General Topic";
      return {
        id: q._id.toString(),
        text: q.text,
        optA: q.a || "",
        optB: q.b || "",
        optC: q.c || "",
        optD: q.d || "",
        ans: q.correct_option || "",
        explanation: q.explanation || "No explanation provided.",
        subject: parentTopicName,
        code: q.code || `Q-${q._id.toString().slice(-4).toUpperCase()}`,
        diagram_url: q.diagram_url || null
      };
    }));
  } catch(e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.get("/courses/:id/topics", async (request, reply) => {
  try {
    const courseId = (request.params as any)["id"];
    let tSnap = await Topic.find({ course_id: courseId }).lean();
    
    if (tSnap.length === 0) {
      // Find the course details to get the parent code
      const currentCourse = await Course.findById(courseId).lean() as any;
      if (currentCourse && currentCourse.code) {
        // Find all courses with this code
        const similarCourses = await Course.find({ code: currentCourse.code }).lean() as any[];
        const similarIds = similarCourses.map(c => c._id);
        // Find topics pointing to any of these courses
        tSnap = await Topic.find({ course_id: { $in: similarIds } }).lean();
      }
    }
    
    // Get all questions for these topics to count them dynamically
    const topicIdsObj = tSnap.map((d: any) => d._id);
    // Performance Optimization: Fetch ONLY topic_id using projection and use .lean() to avoid large document footprint in memory
    const rawQuestions = await Question.find({ topic_id: { $in: topicIdsObj } }, { topic_id: 1 }).lean();
    
    // Create a map of topic_id to question count
    const qCountMap: Record<string, number> = {};
    rawQuestions.forEach((q: any) => {
      const tId = q.topic_id ? q.topic_id.toString() : null;
      if (tId) qCountMap[tId] = (qCountMap[tId] || 0) + 1;
    });

    const topics = tSnap.map((d: any) => {
      const obj = d;
      const id = d._id.toString();
      return { id, ...obj, questionsCount: qCountMap[id] || 0 };
    });
    return reply.send(topics);
  } catch(e: any) { return reply.status(500).send({error: e.message}); }
});

app.get("/settings", async (request, reply) => {
  try {
    const { Setting } = await import("../models");
    let setting = await Setting.findOne({ key: "allow_unlimited_reattempts" });
    return reply.send({ allow_unlimited_reattempts: setting ? !!setting.value : false });
  } catch (e: any) {
    return reply.status(500).send({ error: e.message });
  }
});

app.post("/courses/topics/:id/generate-notes", async (request, reply) => {
  try {
    const topicId = (request.params as any)["id"];
    const { Topic, Course } = await import("../models");
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return reply.status(404).send({ error: "Topic not found" });
    }

    if (topic.notes && topic.notes.trim().length > 50) {
      return reply.send({ success: true, notes: topic.notes });
    }

    const parentCourse = await Course.findById(topic.course_id);
    const courseInfo = parentCourse ? `Course: ${parentCourse.title} (${parentCourse.code})` : "";

    const systemPrompt = `You are an elite Clinical Board Prep Professor. 
Write an extensive, textbook-grade study guide for the topic "${topic.name}" ${parentCourse ? `within the module "${parentCourse.title}"` : ""}.
Provide extreme depth, mechanical detail, physiological mechanisms, clinical associations, and clinical image prompts.

Structure the study guide with:
1. Core Clinical Concepts (clear headers)
2. Detailed Diagnostic & Analytical breakdowns
3. Highly visual clinical image markers in this EXACT format:
   [MED_IMAGE: Highly detailed medical illustration description suited for the topic]
4. Clinical Correlation Box (for high-yield exam points)

Write with the pedagogical authority of a top-tier professor. Aim for an intensive 800 - 1500 words.`;

    const { requestGeminiCompletion } = await import("../lib/gemini.js");
    const notes = await requestGeminiCompletion(
      [{ role: "user", content: "Generate the Clinical Study Guide according to the specifications." }],
      systemPrompt,
      { temperature: 0.5, maxTokens: 4000 }
    );

    topic.notes = notes;
    await topic.save();

    return reply.send({ success: true, notes });
  } catch (e: any) {
    console.error("Failed to compile active study notes:", e);
    return reply.status(500).send({ error: e.message || "Failed to generate dynamic notes." });
  }
});

}
