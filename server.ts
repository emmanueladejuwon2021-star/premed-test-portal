import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';
import fastifyMiddie from '@fastify/middie';
import fastifyStatic from '@fastify/static';

import { connectDB } from './src/db';
import app from './src/server-app';
import { Question, Topic } from './src/models/index';
import { latestProctorSnapshots } from './src/lib/proctorCache';

async function startServer() {
  try {
    await connectDB();
  } catch (e: any) {
    console.error('[ERROR] Initial MongoDB connection failed. Server will start and retry automatically, but database dependent operations may fail.', e.message);
  }

  if (process.env.VERCEL) return;
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    await app.register(fastifyMiddie);
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: undefined, port: Math.random() < 0.5 ? 24678 : 24679 } },
      appType: 'spa',
    });

    (app as any).use((req: any, res: any, next: any) => {
      if (req.url.startsWith('/api')) return next();
      vite.middlewares(req, res, next);
    });

    app.get('*', async (req, reply) => {
      if (req.url.startsWith('/api')) {
         return reply.status(404).send({ error: 'API GET Endpoint not found.' });
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.url, template);
        reply.type('text/html').send(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        reply.code(500).send(e.message);
      }
    });

  } else {
    await app.register(fastifyStatic, {
      root: path.join(process.cwd(), 'dist'),
      wildcard: false
    });

    app.get('*', (req, reply) => {
      if (req.url.startsWith('/api')) {
         return reply.status(404).send({ error: 'API GET Endpoint not found.' });
      }
      (reply as any).sendFile('index.html');
    });
  }

  const rooms: Record<string, any> = {};
  const onlineStudents: Record<string, { id: string, name: string, status: string }> = {};

  app.get('/api/admin/combat/rooms', async (req, reply) => {
    // Only basic check for now
    return Object.keys(rooms).map(code => ({
      code,
      gameStarted: rooms[code].gameStarted,
      teamA: rooms[code].teamA.length,
      teamB: rooms[code].teamB.length,
      health: rooms[code].health,
      scores: rooms[code].scores,
      turn: rooms[code].turn
    }));
  });

  await app.listen({ port: PORT, host: '0.0.0.0' });

  // Socket.io for Med Combat
  const io = new Server(app.server, { cors: { origin: '*' } });
  (app as any).io = io;

  const broadcastRooms = () => {
    io.emit('active-rooms-update', Object.keys(rooms).map(code => ({
      code,
      teamNames: rooms[code].teamNames,
      teamA: rooms[code].teamA.length,
      teamB: rooms[code].teamB.length,
      gameStarted: rooms[code].gameStarted
    })));
  };

  io.on('connection', (socket) => {
    socket.on('proctor-join', ({ sessionId }) => {
      socket.join(`proctor:${sessionId}`);
    });

    socket.on('proctor-snapshot', ({ sessionId, snapshot }) => {
      // Save deep snapshot in cache for rapid access
      latestProctorSnapshots.set(sessionId, snapshot);
      // Fast re-broadcast to any listening Admin panels
      io.emit('proctor-snapshot', { sessionId, snapshot });
    });

    socket.on('register-student', (name) => {
      onlineStudents[socket.id] = { id: socket.id, name, status: 'available' };
      io.emit('online-students-update', Object.values(onlineStudents));
      broadcastRooms();
    });

    socket.on('invite-player', ({ targetSocketId, fromName, roomCode }) => {
      io.to(targetSocketId).emit('pair-invite', { fromName, roomCode });
    });

    socket.on('disconnect', () => {
      delete onlineStudents[socket.id];
      io.emit('online-students-update', Object.values(onlineStudents));
    });

    socket.on('request-create-room', (courseId) => {
      let roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Ensure unique
      while (rooms[roomCode]) {
        roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
      rooms[roomCode] = { 
        teamA: [], 
        teamB: [], 
        turn: 'A', 
        scores: { A: 0, B: 0 }, 
        health: { A: 100, B: 100 },
        teamNames: { A: 'Squad Blue', B: 'Squad Red' },
        logs: [],
        gameStarted: false, 
        question: null, 
        teamAPicks: {}, 
        teamBPicks: {},
        courseId,
        lastFeedback: null,
        winner: null,
        targetScore: 100
      };
      socket.join(roomCode);
      socket.emit('room-created', roomCode);
      broadcastRooms();
    });

    socket.on('join-team', ({ roomCode, team, memberName, teamName }) => {
      if (rooms[roomCode]) {
        if (teamName) {
            rooms[roomCode].teamNames[team] = teamName;
        }

        // Update student status to in-hub
        if (onlineStudents[socket.id]) {
            onlineStudents[socket.id].status = 'in-hub';
            io.emit('online-students-update', Object.values(onlineStudents));
        }

        // Find existing student in room to prevent duplication if they reconnect
        const existing = [...rooms[roomCode].teamA, ...rooms[roomCode].teamB].find(m => m.name === memberName);
        if (existing) {
          existing.id = socket.id;
        } else {
          rooms[roomCode][team === 'A' ? 'teamA' : 'teamB'].push({ id: socket.id, name: memberName });
        }
        socket.join(roomCode);
        io.to(roomCode).emit('room-update', rooms[roomCode]);
        broadcastRooms();
      }
    });

    socket.on('start-match', async (roomCode) => {
       const room = rooms[roomCode];
       if (!room) return;
       room.gameStarted = true;
       room.winner = null;
       room.scores = { A: 0, B: 0 };
       
       // Find all topics for this course
       const topics = await Topic.find({ course_id: room.courseId });
       const topicIds = topics.map(t => t._id);
       
       // Fetch a random question from these topics
       const questions = await Question.aggregate([
          { $match: { topic_id: { $in: topicIds } } },
          { $sample: { size: 1 } }
       ]);

       room.question = questions[0];
       io.to(roomCode).emit('game-update', room);
    });

    socket.on('select-answer', ({ roomCode, team, memberId, answer }) => {
       if (!rooms[roomCode]) return;
       const teamPicks = team === 'A' ? rooms[roomCode].teamAPicks : rooms[roomCode].teamBPicks;
       teamPicks[memberId] = { answer, agreed: false };
       io.to(roomCode).emit('game-update', rooms[roomCode]);
    });

    socket.on('agree-answer', async ({ roomCode, team, memberId }) => {
       const room = rooms[roomCode];
       if (!room) return;
       const teamPicks = team === 'A' ? room.teamAPicks : room.teamBPicks;
       if (teamPicks[memberId]) {
           teamPicks[memberId].agreed = true;
       }
       
       // check for agreement
       const teamMembers = room[team === 'A' ? 'teamA' : 'teamB'];
       if (teamMembers.every((m: any) => teamPicks[m.id] && teamPicks[m.id].agreed)) {
           // Both agreed
           const finalPick = teamPicks[teamMembers[0].id].answer;
           const isCorrect = finalPick === room.question.correct_option;
           
           const opponent = team === 'A' ? 'B' : 'A';
           if (isCorrect) {
               room.scores[team] += 10;
               room.health[opponent] = Math.max(0, room.health[opponent] - 25);
               room.lastFeedback = { team, correct: true, answer: finalPick };
               room.logs.unshift({ 
                 id: Date.now(), 
                 msg: `TEAM ${team} deployed a perfect strike! Option ${finalPick.toUpperCase()} was correct.`,
                 type: 'success'
               });
           } else {
               room.health[team] = Math.max(0, room.health[team] - 15);
               room.lastFeedback = { team, correct: false, answer: finalPick, correctAnswer: room.question.correct_option };
               room.logs.unshift({ 
                 id: Date.now(), 
                 msg: `TEAM ${team} encountered a misfire. Option ${finalPick.toUpperCase()} was a dud.`,
                 type: 'error'
               });
           }

           io.to(roomCode).emit('game-update', room);

           // Check win condition
           if (room.health.A <= 0 || room.health.B <= 0 || room.scores[team] >= room.targetScore) {
             room.winner = room.health.A <= 0 ? 'B' : (room.health.B <= 0 ? 'A' : team);
             room.gameStarted = false;
             setTimeout(() => {
                io.to(roomCode).emit('game-update', room);
             }, 3000);
             return;
           }

           // Switch turn and reset picks after 3 seconds
           setTimeout(async () => {
             room.turn = team === 'A' ? 'B' : 'A';
             room.teamAPicks = {};
             room.teamBPicks = {};
             room.lastFeedback = null;

             // Get next question
             const topics = await Topic.find({ course_id: room.courseId });
             const topicIds = topics.map(t => t._id);
             const q = await Question.aggregate([{ $match: { topic_id: { $in: topicIds } } }, { $sample: { size: 1 } }]);
             room.question = q[0];
             io.to(roomCode).emit('game-update', room);
           }, 3500);
       } else {
           io.to(roomCode).emit('game-update', room);
       }
    });
  });

  console.log(`Academic Portal Server (Fastify + Vite) running on http://localhost:${PORT}`);
}

if (!process.env.VERCEL && process.env.NETLIFY !== 'true' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer().catch(console.error);
}

