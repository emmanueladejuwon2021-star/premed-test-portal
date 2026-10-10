import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";
import { CORRECT_OPTION_MARKER, stripOptionMarkers } from "../lib/optionUtils";

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
  console.log(`[STATUS] Found ${questions.length} questions to refine.`);

  const BATCH_SIZE = 10;
  let processedCount = 0;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    console.log(`\n-------------------------------------------------------------`);
    console.log(`[PROCESSING] Refining batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(questions.length / BATCH_SIZE)} (Questions ${i + 1} to ${Math.min(i + BATCH_SIZE, questions.length)})...`);

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

    const systemPrompt = `You are a distinguished University Professor in Zoology and Animal Diversity.
Your task is to refine the options (A, B, C, D) of the provided multiple choice questions to make them:
1. Shorter, more concise, and highly academic.
2. Plausible, sophisticated, and tricky (confuse students who only have surface-level knowledge).
3. EXTREMELY consistent in word count, grammatical structure, and phrasing style across all options (A, B, C, D) so the correct option is completely non-glaring and indistinguishable in style/length from distractors.
4. You MUST retain the EXACT same "correct_option" letter (e.g. if original correct_option was "a", option A must still be the correct answer, just refined).
5. Do NOT change the original question "text" or "id" — only refine "a", "b", "c", "d", and provide a concise, high-quality "explanation".
6. Do NOT mention "notes", "textbook", "lecture", or "study guide" in questions or explanations.

JSON Response Schema:
Provide a JSON array of objects matching the sequence and length of the input:
[{
  "id": "question_id_passed_in",
  "text": "original_question_text",
  "a": "refined_short_option_a",
  "b": "refined_short_option_b",
  "c": "refined_short_option_c",
  "d": "refined_short_option_d",
  "correct_option": "original_correct_option_letter",
  "explanation": "concise_clear_academic_explanation"
}]`;

    const userPrompt = `Refine the options for these ${batch.length} questions to be concise, trickier, and matching in length. Maintain the exact same correct_option letter:
${JSON.stringify(inputData, null, 2)}`;

    let success = false;
    let attempts = 0;

    while (!success && attempts < 3) {
      console.log(`[AI CALL] Calling Gemini (Attempt ${attempts + 1}/3)...`);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
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
          console.log(`[SUCCESS] Refined and updated ${batch.length} questions. Total processed: ${processedCount}/${questions.length}`);
          success = true;
        } else {
          console.warn(`[WARN] Received array size mismatch or invalid format. Array size: ${parsed?.length}, expected: ${batch.length}`);
          attempts++;
        }
      } catch (err: any) {
        console.error(`[ERROR] Attempt failed:`, err.message);
        attempts++;
        if (attempts < 3) {
          console.log("[INFO] Waiting 4 seconds before retrying...");
          await delay(4000);
        }
      }
    }

    if (!success) {
      console.error(`[FATAL] Failed to refine batch after 3 attempts. Skipping to next batch to prevent blocking...`);
    }

    // Standard sleep to avoid hitting API rate limits
    await delay(2000);
  }

  console.log(`\n=============================================================`);
  console.log(`[COMPLETED] Successfully refined all Zoo 102 questions options! Refined: ${processedCount}/${questions.length}`);
  console.log(`=============================================================`);
  process.exit(0);
}

run().catch(err => {
  console.error("Unhandled exception in refiner:", err);
  process.exit(1);
});
