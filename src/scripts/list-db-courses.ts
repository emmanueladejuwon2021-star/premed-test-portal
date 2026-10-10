import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";

async function run() {
  console.log('[INFO] Connecting to MongoDB...');
  await connectDB();
  const courses = await Course.find();
  console.log('\n--- Database Courses ---');
  for (const c of courses) {
    const topics = await Topic.find({ course_id: c._id });
    const topicIds = topics.map(t => t._id);
    const questions = await Question.find({ topic_id: { $in: topicIds } });
    console.log(`- [${c.code}] ${c.title}: ${topics.length} topics, ${questions.length} questions`);
  }
  process.exit(0);
}

run().catch(console.error);
