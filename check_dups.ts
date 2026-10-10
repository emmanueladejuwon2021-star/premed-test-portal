import mongoose from 'mongoose';
import { TestSession, SystemLog } from './src/models/index.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/fcf_app');
  const sessions = await TestSession.find({ 'incidents.0': { '$exists': true } });
  const allIncidents: any[] = [];
  sessions.forEach((s) => {
    s.incidents.forEach((inc) => {
      allIncidents.push({
         _id: inc._id?.toString() || 'missing',
         violation: inc.violation
      });
    });
  });
  const sysLogs = await SystemLog.find().limit(50);
  sysLogs.forEach((l) => {
    allIncidents.push({
       _id: l._id?.toString() || 'missing',
       violation: '[' + l.event + ']'
    });
  });
  
  const counts: Record<string, number> = {};
  allIncidents.forEach(inc => {
    if (inc._id) {
       counts[inc._id] = (counts[inc._id] || 0) + 1;
    }
  });
  const duplicates = Object.keys(counts).filter(k => counts[k] > 1);
  console.log('Total:', allIncidents.length);
  console.log('Duplicates:', duplicates);
  process.exit(0);
}

run();
