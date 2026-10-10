import 'dotenv/config';
import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";

async function checkStatus() {
  await connectDB();
  const course = await Course.findOne({ code: { $regex: /^gst\s*112$/i } });
  if (!course) {
    console.log("GST 112 Course not found.");
    process.exit(0);
  }
  console.log(`Course Found: ${course.title} (${course.code})`);
  const topics = await Topic.find({ course_id: course._id });
  console.log(`Total Topics: ${topics.length}`);
  let grandTotal = 0;
  for (const topic of topics) {
    const count = await Question.countDocuments({ topic_id: topic._id });
    console.log(`- Topic: "${topic.name}" | Question Count: ${count}`);
    grandTotal += count;
  }
  console.log(`Grand Total Questions: ${grandTotal}`);
  process.exit(0);
}

checkStatus().catch(err => {
  console.error(err);
  process.exit(1);
});
