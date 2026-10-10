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

async function refineAllQuestions() {
  console.log("[INFO] Connecting to MongoDB...");
  await connectDB();

  const totalQuestions = await Question.countDocuments();
  const unrefinedCount = await Question.countDocuments({ is_refined: { $ne: true } });
  console.log(`[STATUS] Total Questions in DB: ${totalQuestions}`);
  console.log(`[STATUS] Unrefined Questions in DB: ${unrefinedCount}`);

  if (unrefinedCount === 0) {
    console.log("[SUCCESS] All questions are already refined. Nothing to do!");
    process.exit(0);
  }

  // Fetch all unrefined questions
  const unrefined = await Question.find({ is_refined: { $ne: true } });
  console.log(`[START] Beginning batch refinement of ${unrefined.length} questions...`);

  for (let i = 0; i < unrefined.length; i += BATCH_SIZE) {
    const batch = unrefined.slice(i, i + BATCH_SIZE);
    console.log(`\n------------------------------------------------------------`);
    console.log(`[BATCH] Processing questions ${i + 1} to ${Math.min(i + BATCH_SIZE, unrefined.length)} of ${unrefined.length}...`);

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
Your task is to refine the provided multiple-choice questions to make them extremely tricky and challenging.

For each question:
1. Retain the original 'id' and 'text'.
2. Rewrite options 'a', 'b', 'c', and 'd' so that they have IDENTICAL or ALMOST IDENTICAL length (same word count and grammatical complexity).
3. The distractors (incorrect options) must be highly plausible, confusing, and intellectually challenging (no obvious joke answers or simplistic options).
4. The correct answer must NOT be glaringly obvious (do not make the correct choice longer, more descriptive, or use more specific qualifiers than the distractors).
5. CRITICAL: You MUST preserve the 'correct_option' letter. If 'correct_option' is 'c', option C MUST represent the correct answer to the question text. Do not swap correct letters.
6. Provide a concise, clear explanation explaining why the correct choice is correct and why the other options are sophisticated distractors.
7. CRITICAL LANGUAGE RULE: Remove any explicit references to 'the notes', 'the text', 'as stated in the notes', 'according to the text', 'provided study guide', or similar source-text attributions in both the questions and the explanations. Write all questions and explanations as direct, standalone academic/historical facts or conceptual insights as they would appear in an official university board examination.

You must return a JSON array matching the exact schema provided.`;

    const userPrompt = `Refine this batch of multiple-choice questions. Return them in the exact same JSON array format:
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
            temperature: 0.3, // Lower temperature for more consistent structural compliance
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
          console.log(`[AI SUCCESS] Received ${parsed.length} refined questions. Updating MongoDB...`);
          
          for (const refinedQ of parsed) {
            const original = batch.find(q => q._id.toString() === refinedQ.id);
            if (original) {
              await Question.updateOne(
                { _id: original._id },
                {
                  $set: {
                    text: refinedQ.text,
                    a: refinedQ.a,
                    b: refinedQ.b,
                    c: refinedQ.c,
                    d: refinedQ.d,
                    correct_option: refinedQ.correct_option.toLowerCase().trim(),
                    explanation: refinedQ.explanation,
                    is_refined: true
                  }
                }
              );
            }
          }
          console.log(`[SUCCESS] Batch completed successfully!`);
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
      console.error(`[FATAL] Skipped batch due to multiple failures. Moving to next batch to prevent getting stuck.`);
    }

    // Small delay between batches to avoid rate limit spikes
    await delay(3000);
  }

  const finalUnrefinedCount = await Question.countDocuments({ is_refined: { $ne: true } });
  console.log(`\n======================================================`);
  console.log(`[FINISH] Refinement run finished!`);
  console.log(`[STATUS] Remaining unrefined questions: ${finalUnrefinedCount}`);
  console.log(`======================================================`);
  process.exit(0);
}

refineAllQuestions().catch(err => {
  console.error("Unhandle exception in refiner:", err);
  process.exit(1);
});
