import { connectDB } from "./src/db";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Student, Course, Topic, Question, TestSession, Result, SystemLog, AdminNotification, Setting } from "./src/models";

dotenv.config();

async function run() {
  await connectDB();
  console.log("DB connected");

  const mthCourse = await Course.findOne({ code: /MTH/i });
  if (mthCourse) {
    console.log(`Found MTH Course: ${mthCourse.title} (${mthCourse._id})`);
    const topics = await Topic.find({ course_id: mthCourse._id });
    console.log(`Found ${topics.length} topics for MTH.`);
    for (const topic of topics) {
      console.log(`Topic: ${topic.title} (${topic._id})`);
      const questions = await Question.find({ topic_id: topic._id }).limit(10);
      console.log(`Found ${questions.length} questions.`);
      for (const q of questions) {
        console.log(`- Q: ${q.text}`);
        console.log(`  A: ${q.a} | B: ${q.b} | C: ${q.c} | D: ${q.d}`);
        console.log(`  Correct: ${q.correct_option}`);
        console.log(`  Explanation: ${q.explanation}`);
      }
    }
  } else {
    console.log("No MTH course found in DB.");
  }

  process.exit(0);
}

run().catch(console.error);
