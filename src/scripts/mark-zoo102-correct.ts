import 'dotenv/config';
import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";
import { CORRECT_OPTION_MARKER, stripOptionMarkers } from "../lib/optionUtils";

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
  console.log(`[STATUS] Found ${questions.length} questions in database for ZOO 102.`);

  let updatedCount = 0;
  for (const q of questions) {
    const correctOpt = String(q.correct_option).trim().toLowerCase();
    
    // First strip all markers to avoid duplicates
    let cleanA = stripOptionMarkers(q.a);
    let cleanB = stripOptionMarkers(q.b);
    let cleanC = stripOptionMarkers(q.c);
    let cleanD = stripOptionMarkers(q.d);

    // Append correct option marker
    if (correctOpt === 'a' || correctOpt === 'option_a') {
      cleanA += CORRECT_OPTION_MARKER;
    } else if (correctOpt === 'b' || correctOpt === 'option_b') {
      cleanB += CORRECT_OPTION_MARKER;
    } else if (correctOpt === 'c' || correctOpt === 'option_c') {
      cleanC += CORRECT_OPTION_MARKER;
    } else if (correctOpt === 'd' || correctOpt === 'option_d') {
      cleanD += CORRECT_OPTION_MARKER;
    }

    await Question.updateOne(
      { _id: q._id },
      { $set: { a: cleanA, b: cleanB, c: cleanC, d: cleanD } }
    );
    updatedCount++;
  }

  console.log(`[SUCCESS] Finished marking correct options! Updated ${updatedCount}/${questions.length} questions successfully.`);
  process.exit(0);
}

run().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
