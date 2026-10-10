import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import { connectDB } from "../db";
import { Question } from "../models/index";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const BATCH_SIZE = 15;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function cleanSourceReferences() {
  console.log("[INFO] Connecting to MongoDB...");
  await connectDB();

  const totalQuestions = await Question.countDocuments();
  console.log(`[STATUS] Total Questions in DB: ${totalQuestions}`);

  // Fetch all questions to inspect them for meta-references in memory
  const allQuestions = await Question.find({});
  console.log(`[STATUS] Loaded ${allQuestions.length} questions from MongoDB.`);

  // Regex to detect meta-references to notes, text, study guides, etc.
  const metaRegex = /\b(the notes?|the text|study guide|provided notes|lecture notes|the source|according to the notes?|in the notes?|as stated in the notes?|mentioned in the notes?|provided text|text notes|the provided material|notes state|text states)\b/i;

  const targetQuestions = allQuestions.filter(q => {
    const textMatch = metaRegex.test(q.text || "");
    const optAMatch = metaRegex.test(q.a || "");
    const optBMatch = metaRegex.test(q.b || "");
    const optCMatch = metaRegex.test(q.c || "");
    const optDMatch = metaRegex.test(q.d || "");
    const expMatch = metaRegex.test(q.explanation || "");
    return textMatch || optAMatch || optBMatch || optCMatch || optDMatch || expMatch;
  });

  console.log(`[STATUS] Found ${targetQuestions.length} questions containing meta-references to notes/text.`);

  if (targetQuestions.length === 0) {
    console.log("[SUCCESS] No questions with meta-references found in the database!");
    process.exit(0);
  }

  console.log(`[START] Beginning cleanup of ${targetQuestions.length} questions...`);

  for (let i = 0; i < targetQuestions.length; i += BATCH_SIZE) {
    const batch = targetQuestions.slice(i, i + BATCH_SIZE);
    console.log(`\n------------------------------------------------------------`);
    console.log(`[BATCH] Processing questions ${i + 1} to ${Math.min(i + BATCH_SIZE, targetQuestions.length)} of ${targetQuestions.length}...`);

    const formattedQuestions = batch.map(q => ({
      id: q._id.toString(),
      text: q.text,
      a: q.a,
      b: q.b,
      c: q.c || "",
      d: q.d || "",
      correct_option: q.correct_option,
      explanation: q.explanation || ""
    }));

    const systemPrompt = `You are a world-class University Professor and multiple-choice question editor.
Your task is to refine the provided multiple-choice questions to REMOVE any explicit references to 'the notes', 'the text', 'as stated in the notes', 'according to the text', 'provided study guide', 'lecture notes', or similar source-text/material attributions in both the questions, the options, and the explanations.

For each question:
1. Retain the original 'id'.
2. Rewrite the 'text', options ('a', 'b', 'c', 'd'), and 'explanation' to make them standalone, independent academic/historical facts or conceptual insights.
3. Keep the original semantic meaning, the same trickiness level, the same options length, and the correct option letter.
4. CRITICAL: NEVER use words like "the notes", "the text", "according to the notes", "as stated in the text", "provided notes", or any meta-references to any study guide/notes source. Write the explanation as a direct historical or theoretical explanation.
5. Provide a clear and concise explanation that explains why the correct choice is correct and why the distractors are wrong, without referencing any source document.

You must return a JSON array matching the exact schema provided.`;

    const userPrompt = `Clean this batch of multiple-choice questions to remove any references to source materials or notes. Return them in the exact same JSON array format:
${JSON.stringify(formattedQuestions, null, 2)}`;

    let success = false;
    let attempts = 0;
    const models = ["gemini-3.1-flash-lite", "gemini-flash-latest"];

    while (!success && attempts < 3) {
      const activeModel = models[attempts % models.length];
      console.log(`[AI CALL] Sending batch to model ${activeModel} (Attempt ${attempts + 1}/3)...`);
      try {
        const response = await ai.models.generateContent({
          model: activeModel,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2, // Low temperature for factual edits and format preservation
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

        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[AI SUCCESS] Received ${parsed.length} cleaned questions. Updating MongoDB...`);
          
          for (const cleanedQ of parsed) {
            const original = batch.find(q => q._id.toString() === cleanedQ.id);
            if (original) {
              await Question.updateOne(
                { _id: original._id },
                {
                  $set: {
                    text: cleanedQ.text,
                    a: cleanedQ.a,
                    b: cleanedQ.b,
                    c: cleanedQ.c,
                    d: cleanedQ.d,
                    correct_option: cleanedQ.correct_option.toLowerCase().trim(),
                    explanation: cleanedQ.explanation,
                    is_refined: true // Mark refined since we did a refinement pass on options/explanation
                  }
                }
              );
            }
          }
          console.log(`[SUCCESS] Batch cleanup completed successfully!`);
          success = true;
        } else {
          console.log(`[WARN] Empty or invalid JSON received from Gemini.`);
          attempts++;
        }
      } catch (err: any) {
        console.error(`[ERROR] Attempt ${attempts + 1} failed:`, err.message);
        attempts++;
        if (attempts < 3) {
          console.log("[INFO] Waiting 5 seconds before retrying with next model...");
          await delay(5000);
        }
      }
    }

    if (!success) {
      console.error(`[FATAL] Skipped batch due to multiple failures.`);
    }

    // Small delay between batches to avoid rate limit spikes
    await delay(2000);
  }

  console.log(`\n======================================================`);
  console.log(`[FINISH] Clean-up run finished!`);
  console.log(`======================================================`);
  process.exit(0);
}

cleanSourceReferences().catch(err => {
  console.error("Unhandled exception in cleaner:", err);
  process.exit(1);
});
