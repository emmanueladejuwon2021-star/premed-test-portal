import 'dotenv/config';
import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";

async function cleanupGST112() {
  await connectDB();
  const course = await Course.findOne({ code: { $regex: /^gst\s*112$/i } });
  if (!course) {
    console.log("[CLEANUP] GST 112 course not found. Nothing to clean up.");
    process.exit(0);
  }

  console.log(`[CLEANUP] Found course: ${course.title} (ID: ${course._id})`);
  const topics = await Topic.find({ course_id: course._id });
  console.log(`[CLEANUP] Found ${topics.length} topics to delete.`);

  for (const topic of topics) {
    const qCount = await Question.deleteMany({ topic_id: topic._id });
    console.log(`[CLEANUP] Deleted ${qCount.deletedCount} questions for topic "${topic.name}"`);
    await Topic.deleteOne({ _id: topic._id });
    console.log(`[CLEANUP] Deleted topic "${topic.name}"`);
  }

  // Also remove any stray questions/topics or courses
  await Course.deleteOne({ _id: course._id });
  console.log("[CLEANUP] Deleted GST 112 Course!");

  console.log("[CLEANUP] Database cleaned up successfully for GST 112!");
  process.exit(0);
}

cleanupGST112().catch(err => {
  console.error("[CLEANUP ERROR]", err);
  process.exit(1);
});
