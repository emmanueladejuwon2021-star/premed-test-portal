import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from "@google/genai";
import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";
import { CORRECT_OPTION_MARKER, stripOptionMarkers } from "../lib/optionUtils";

// Lock Mechanism to terminate stale background processes
const LOCK_FILE = path.join(process.cwd(), 'refine.lock');
if (fs.existsSync(LOCK_FILE)) {
  const oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
  if (oldPid && oldPid !== process.pid) {
    try {
      process.kill(oldPid, 'SIGKILL');
      console.log(`[LOCK] Terminated stale background refiner process with PID ${oldPid}`);
    } catch (err) {
      // Already dead
    }
  }
}
fs.writeFileSync(LOCK_FILE, process.pid.toString(), 'utf8');

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('[INFO] Connecting to MongoDB...');
  await connectDB();
  console.log('[INFO] MongoDB Connected. Finding ZOO 102 course...');

  const course = await Course.findOne({ code: "ZOO 102" });
  if (!course) {
    console.error('[ERROR] ZOO 102 course not found!');
    process.exit(1);
  }

  console.log(`[STATUS] Found course: "${course.title}" (${course._id})`);

  const topics = await Topic.find({ course_id: course._id });
  const topicIds = topics.map(t => t._id);
  console.log(`[STATUS] Found ${topics.length} topics.`);

  const questions = await Question.find({ topic_id: { $in: topicIds } });
  console.log(`[STATUS] Found ${questions.length} questions in database.`);

  // Find questions where ANY option is longer than 5 words or has not been refined yet.
  const questionsToRefine = questions.filter(q => {
    const cleanA = stripOptionMarkers(q.a || "");
    const cleanB = stripOptionMarkers(q.b || "");
    const cleanC = stripOptionMarkers(q.c || "");
    const cleanD = stripOptionMarkers(q.d || "");
    
    const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
    return wordCount(cleanA) > 5 || wordCount(cleanB) > 5 || wordCount(cleanC) > 5 || wordCount(cleanD) > 5;
  });

  console.log(`[STATUS] Found ${questionsToRefine.length}/${questions.length} questions that need ultra-short refinement.`);

  if (questionsToRefine.length === 0) {
    console.log('[SUCCESS] All questions are already refined to ultra-short options! Exiting.');
    fs.unlinkSync(LOCK_FILE);
    process.exit(0);
  }

  // Divide into batches of 10
  const BATCH_SIZE = 10;
  const batches: any[][] = [];
  for (let i = 0; i < questionsToRefine.length; i += BATCH_SIZE) {
    batches.push(questionsToRefine.slice(i, i + BATCH_SIZE));
  }

  console.log(`[STATUS] Total of ${batches.length} batches to process sequentially.`);
  let processedCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n-------------------------------------------------------------`);
    console.log(`[PROCESSING] Batch ${i + 1}/${batches.length} (Questions ${processedCount + 1} to ${processedCount + batch.length} of ${questionsToRefine.length})...`);

    const inputData = batch.map(q => ({
      id: q._id.toString(),
      text: q.text,
      a: stripOptionMarkers(q.a),
      b: stripOptionMarkers(q.b),
      c: stripOptionMarkers(q.c),
      d: stripOptionMarkers(q.d),
      correct_option: q.correct_option,
      explanation: q.explanation || ""
    }));

    const systemPrompt = `You are a distinguished University Professor in Zoology, Evolutionary Biology, and Animal Taxonomy.
Your task is to rewrite the options (A, B, C, D) of the provided multiple choice questions to make them:
1. EXTREMELY short and concise (ideally 1 to 4 words maximum, or very brief scientific phrases). Eliminate all unnecessary words, prepositions, and explanations within the options.
2. Highly plausible, scientific, sophisticated, and tricky (designing them to confuse students who lack deep understanding).
3. PERFECTLY matched and consistent in word count, grammatical structure, and phrasing style across all four options (A, B, C, D) so that they are indistinguishable in visual length and pattern.
4. You MUST retain the EXACT same "correct_option" letter (e.g. if original correct_option was "a", option A must still be the correct answer, just refined to be ultra-short).
5. Do NOT change the original question "text" or "id" — only refine "a", "b", "c", "d", and provide a concise, high-quality "explanation".
6. Do NOT mention "notes", "textbook", "lecture", or "study guide" in questions or explanations.

JSON Response Schema:
Provide a JSON array of objects matching the sequence and length of the input:
[{
  "id": "question_id_passed_in",
  "text": "original_question_text",
  "a": "ultra_short_option_a",
  "b": "ultra_short_option_b",
  "c": "ultra_short_option_c",
  "d": "ultra_short_option_d",
  "correct_option": "original_correct_option_letter",
  "explanation": "concise_clear_academic_explanation"
}]`;

    const userPrompt = `Refine the options for these ${batch.length} questions to be EXTREMELY short (1-4 words or very concise terms) and trickier, matching in length exactly:
${JSON.stringify(inputData, null, 2)}`;

    let success = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (!success && attempts < MAX_ATTEMPTS) {
      try {
        console.log(`[AI CALL] Calling Gemini (Attempt ${attempts + 1}/${MAX_ATTEMPTS})...`);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  a: { type: Type.STRING },
                  b: { type: Type.STRING },
                  c: { type: Type.STRING },
                  d: { type: Type.STRING },
                  correct_option: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["id", "text", "a", "b", "c", "d", "correct_option", "explanation"]
              }
            }
          }
        });

        const textResult = response.text || "";
        const cleanJson = textResult.trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed) && parsed.length === batch.length) {
          for (const refined of parsed) {
            const originalQ = batch.find(q => q._id.toString() === refined.id);
            if (originalQ) {
              const correctOpt = String(refined.correct_option || originalQ.correct_option).trim().toLowerCase();
              
              let cleanA = stripOptionMarkers(refined.a || "").trim();
              let cleanB = stripOptionMarkers(refined.b || "").trim();
              let cleanC = stripOptionMarkers(refined.c || "").trim();
              let cleanD = stripOptionMarkers(refined.d || "").trim();

              // Append hidden correct option marker to the correct option text
              if (correctOpt === "a" || correctOpt === "option_a") {
                cleanA += CORRECT_OPTION_MARKER;
              } else if (correctOpt === "b" || correctOpt === "option_b") {
                cleanB += CORRECT_OPTION_MARKER;
              } else if (correctOpt === "c" || correctOpt === "option_c") {
                cleanC += CORRECT_OPTION_MARKER;
              } else if (correctOpt === "d" || correctOpt === "option_d") {
                cleanD += CORRECT_OPTION_MARKER;
              }

              await Question.updateOne(
                { _id: originalQ._id },
                {
                  $set: {
                    a: cleanA,
                    b: cleanB,
                    c: cleanC,
                    d: cleanD,
                    correct_option: correctOpt,
                    explanation: refined.explanation || originalQ.explanation,
                    is_refined: true
                  }
                }
              );
              processedCount++;
            }
          }
          console.log(`[SUCCESS] Refined batch of ${batch.length} questions. Cumulative refined: ${processedCount}/${questionsToRefine.length}`);
          success = true;
        } else {
          console.warn(`[WARN] Array size mismatch or format error. Retrying...`);
          attempts++;
        }
      } catch (err: any) {
        console.error(`[ERROR] Attempt ${attempts + 1} failed:`, err.message);
        attempts++;
        if (attempts < MAX_ATTEMPTS) {
          const sleepSec = err.message.includes('429') || err.message.includes('quota') ? 30 : 10;
          console.log(`[COOLDOWN] Waiting ${sleepSec} seconds before retry...`);
          await delay(sleepSec * 1000);
        }
      }
    }

    if (!success) {
      console.error(`[FATAL] Failed to process batch after ${MAX_ATTEMPTS} attempts. Skipping to prevent lock...`);
    }

    // Gentle 15 seconds delay between batches to stay safely below 4 Requests Per Minute limit (perfectly under the 15 RPM limit)
    console.log(`[PACING] Waiting 15 seconds before starting the next batch to ensure clean rate limits...`);
    await delay(15000);
  }

  console.log(`\n=============================================================`);
  console.log(`[COMPLETED] Successfully refined all remaining ZOO 102 questions to ultra-short options!`);
  console.log(`=============================================================`);
  fs.unlinkSync(LOCK_FILE);
  process.exit(0);
}

run().catch(err => {
  console.error("Unhandled exception in ultra-short refiner:", err);
  try { fs.unlinkSync(LOCK_FILE); } catch(_) {}
  process.exit(1);
});
