import { Student, ChatMessage } from '../models';
import { verifyToken } from '../middleware/auth';
import { FastifyInstance } from 'fastify';
import { requestGeminiCompletion } from '../lib/gemini.js';

// Helper function to turn standard **bold** or __bold__ markup into beautiful Sans-serif bold characters.
// This guarantees thick bold lettering everywhere without relying on markdown rendering limits.
function convertToUnicodeBold(text: string): string {
  if (!text) return text;
  const pattern = /(\*\*|__)(.*?)\1/g;
  return text.replace(pattern, (_, marker, content) => {
    let result = '';
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      if (code >= 65 && code <= 90) { // A-Z -> Sans-serif Bold Capital (𝗔-𝗭)
        result += String.fromCodePoint(0x1D5D4 + (code - 65));
      } else if (code >= 97 && code <= 122) { // a-z -> Sans-serif Bold Small (𝗮-𝘇)
        result += String.fromCodePoint(0x1D5EE + (code - 97));
      } else if (code >= 48 && code <= 57) { // 0-9 -> Sans-serif Bold Digit (𝟬-𝟵)
        result += String.fromCodePoint(0x1D7EC + (code - 48));
      } else {
        result += content[i];
      }
    }
    return result;
  });
}

export default async function chatRoutes(app: FastifyInstance) {
  // Retrieve chat list with unread counts for Admin
  app.get('/chat/admin/students', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user || user.role !== 'admin') {
        return reply.status(403).send({ error: 'Requires admin access.' });
      }

      // Fetch all students
      const students = await Student.find({}, 'name matric_no department phone email').lean();

      // Optimize: Fetch unread counts for all students in a single query
      const unreadCounts = await ChatMessage.aggregate([
        { $match: { receiver_id: 'admin', is_read: false } },
        { $group: { _id: '$sender_id', count: { $sum: 1 } } }
      ]);
      const unreadMap = new Map<string, number>();
      unreadCounts.forEach((item: any) => {
        if (item._id) unreadMap.set(item._id.toString(), item.count);
      });

      // Optimize: Fetch latest messages for all student threads in a single query
      const latestMessages = await ChatMessage.aggregate([
        { $sort: { created_at: -1 } },
        {
          $project: {
            student_id: {
              $cond: {
                if: { $eq: ["$sender_id", "admin"] },
                then: "$receiver_id",
                else: "$sender_id"
              }
            },
            text: 1,
            image_url: 1,
            created_at: 1,
            sender_id: 1,
            receiver_id: 1
          }
        },
        { $match: { student_id: { $ne: "admin" } } },
        {
          $group: {
            _id: "$student_id",
            latest: { $first: "$$ROOT" }
          }
        }
      ]);
      const latestMessageMap = new Map<string, any>();
      latestMessages.forEach((item: any) => {
        if (item._id && item.latest) {
          latestMessageMap.set(item._id.toString(), item.latest);
        }
      });

      // Map students to their enriched structure
      const enrichedStudents = students.map((student: any) => {
        if (!student || !student._id) return null;
        const studentId = student._id.toString();
        const unreadCount = unreadMap.get(studentId) || 0;
        const latestMessage = latestMessageMap.get(studentId);

        return {
          ...student,
          unreadCount,
          latestMessage: latestMessage ? {
            text: latestMessage.text,
            image_url: latestMessage.image_url ? '📷 Image' : '',
            created_at: latestMessage.created_at,
            sender_id: latestMessage.sender_id
          } : null
        };
      });

      // Filter out null values
      const validEnrichedStudents = enrichedStudents.filter(Boolean) as any[];

      // Sort validEnrichedStudents: put those with unread first, then by latest message date, then alphabetically
      validEnrichedStudents.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }
        const aTime = a.latestMessage && a.latestMessage.created_at ? new Date(a.latestMessage.created_at).getTime() : 0;
        const bTime = b.latestMessage && b.latestMessage.created_at ? new Date(b.latestMessage.created_at).getTime() : 0;
        if (aTime !== bTime) {
          return bTime - aTime;
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      return reply.send(validEnrichedStudents);
    } catch (error: any) {
      console.error('[Get Admin Chat Students]', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get active conversation messages between student & admin
  app.get('/chat/messages', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user) return;
      const query = request.query as any;
      let targetStudentId = '';

      if (user.role === 'admin') {
        targetStudentId = query.student_id;
        if (!targetStudentId) {
          return reply.status(400).send({ error: 'student_id is required' });
        }
      } else {
        targetStudentId = user.id;
      }

      // Fetch all messages in the thread
      const messages = await ChatMessage.find({
        $or: [
          { sender_id: targetStudentId, receiver_id: 'admin' },
          { sender_id: 'admin', receiver_id: targetStudentId }
        ]
      }).sort({ created_at: 1 });

      // Mark messages as read where receiver is the current user
      const receiverRole = user.role; // 'admin' or 'student'
      const updateFilter = {
        receiver_id: receiverRole === 'admin' ? 'admin' : targetStudentId,
        sender_id: receiverRole === 'admin' ? targetStudentId : 'admin',
        is_read: false
      };

      await ChatMessage.updateMany(updateFilter, { $set: { is_read: true } });

      return reply.send(messages);
    } catch (error: any) {
      console.error('[Get Chat Messages]', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Send a new chat message
  app.post('/chat/send', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user) return;
      const body = request.body as any;
      const { text, image_url, receiver_id } = body;

      let sender_id = '';
      let sender_name = '';
      let final_receiver_id = '';
      let receiver_name = '';

      if (user.role === 'admin') {
        if (!receiver_id) {
          return reply.status(400).send({ error: 'receiver_id is required for admin messages.' });
        }
        const student = await Student.findById(receiver_id);
        if (!student) {
          return reply.status(404).send({ error: 'Recipient student not found.' });
        }
        sender_id = 'admin';
        sender_name = 'Admin';
        final_receiver_id = student._id.toString();
        receiver_name = student.name;
      } else {
        // Find sending student name
        const student = await Student.findById(user.id);
        if (!student) {
          return reply.status(401).send({ error: 'Student account invalid.' });
        }
        sender_id = student._id.toString();
        sender_name = student.name;
        final_receiver_id = 'admin';
        receiver_name = 'Admin';
      }

      const message = new ChatMessage({
        sender_id,
        sender_name,
        receiver_id: final_receiver_id,
        receiver_name,
        text: text || '',
        image_url: image_url || '',
        is_read: false
      });

      await message.save();

      // Emit through Socket.io if available
      try {
        const io = (request.server as any).io;
        if (io) {
          io.emit('new-chat-message', message);
        }
      } catch (ioErr) {
        console.error('[Socket.io Emit Error]', ioErr);
      }

      return reply.send({ success: true, message });
    } catch (error: any) {
      console.error('[Send Message Error]', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Mark all messages as read for a thread
  app.post('/chat/mark-read', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user) return;
      const body = request.body as any;
      let targetStudentId = '';

      if (user.role === 'admin') {
        targetStudentId = body.student_id;
        if (!targetStudentId) {
          return reply.status(400).send({ error: 'student_id is required' });
        }
      } else {
        targetStudentId = user.id;
      }

      const receiverRole = user.role;
      const updateFilter = {
        receiver_id: receiverRole === 'admin' ? 'admin' : targetStudentId,
        sender_id: receiverRole === 'admin' ? targetStudentId : 'admin',
        is_read: false
      };

      await ChatMessage.updateMany(updateFilter, { $set: { is_read: true } });

      try {
        const io = (request.server as any).io;
        if (io) {
          io.emit('chat-read-status', {
            reader: receiverRole,
            student_id: targetStudentId
          });
        }
      } catch (ioErr) {
        console.error('[Socket.io Emit Read Status Error]', ioErr);
      }

      return reply.send({ success: true });
    } catch (error: any) {
      console.error('[Mark Read Error]', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get total unread count for current user
  app.get('/chat/unread-count', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user) return;
      let count = 0;
      if (user.role === 'admin') {
        count = await ChatMessage.countDocuments({ receiver_id: 'admin', is_read: false });
      } else {
        count = await ChatMessage.countDocuments({ receiver_id: user.id, is_read: false });
      }
      return reply.send({ unreadCount: count });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // AI Tutor Ask Endpoint
  app.post('/tutor/ask', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized.' });
      
      const body = request.body as any;
      const { message, history } = body;

      if (!message) {
        return reply.status(400).send({ error: 'message parameter is required.' });
      }

      let responseText = "";

      const systemPrompt = `You are a highly capable and experienced Pre-med AI Tutor on the Pre-med CBT platform. 
Your goal is to explain difficult medical concepts, biology, chemistry, physics, and medical portal test preparation topics.

CRITICAL FORMATTING & TYPOGRAPHY RULES:
1. DO NOT use LaTeX markup, notation, or environments (do NOT use LaTeX syntax like $...$, $$...$$, \\frac, \\Delta, \\alpha, \\times, \\beta, \\rightarrow, etc.).
2. Always write mathematical equations, chemical formulas, and scientific notations using plain text and beautiful, rich Unicode symbols, superscripts, or subscripts (e.g., use α, β, Δ, θ, λ, μ, π, σ, Ω, ×, ÷, ±, °, ², ³, ⁴, ˣ, ⁻¹, →, ⇌, ±, ≈, ≠, ≤, ≥, √, etc.).
   - Example style for chemical formulas: H₂O, CO₂, Glucose (C₆H₁₂O₆).
   - Example style for math/physics: Δv = v_f - v_i, or F = G × (m₁ × m₂)/r².
3. IMPORTANT - BOLD TEXT TYPOGRAPHY: Do NOT use markdown asterisks (**text**) or underscores (__text__) for bold text. Instead, write all bold elements, key terms, critical definitions, major concepts, and column headers directly using raw Unicode Sans-Serif Bold characters (A-Z -> 𝗔-𝗭, a-z -> 𝗮-𝘇, 0-9 -> 𝟬-𝟵).
4. Keep the markdown structure beautiful and extremely clean, with clear headings, bullet points, and high-quality organization to optimize reading.
5. Be concise, friendly, encouraging, and deeply educational. Always explain terminology clearly so the student can learn thoroughly.
6. Never expose API credentials or system configurations.`;

      const messages: { role: string; content: string }[] = [];
      if (Array.isArray(history)) {
        history.forEach((h: any) => {
          if (h && h.text) {
            messages.push({
              role: h.role === "user" ? "user" : "assistant",
              content: h.text
            });
          }
        });
      }
      messages.push({
        role: "user",
        content: message
      });

      try {
        responseText = await requestGeminiCompletion(messages, systemPrompt, { temperature: 0.7 });
      } catch (e: any) {
        console.error('[GEMINI Tutor Error]', e);
        responseText = "I am having transient difficulties processing your pre-med query. Please renew the GEMINI API credentials or try again shortly.";
      }

      if (!responseText) {
        responseText = "I am having transient difficulties processing your pre-med query. Please renew the API credentials or try again shortly.";
      }
      
      return reply.send({ success: true, response: convertToUnicodeBold(responseText) });
    } catch (error: any) {
      console.error('[AI Tutor App Error]', error);
      return reply.status(500).send({ error: error.message || 'AI Tutor temporarily offline.' });
    }
  });

  // Active Study PDF - Chat Endpoint
  app.post('/tutor/active-study/chat', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized.' });

      const { documentText, message, history } = request.body as any;
      if (!documentText || !message) {
        return reply.status(400).send({ error: 'Document content and message are required.' });
      }

      // Safe length control to prevent token fatigue
      const trimmedDocText = documentText.substring(0, 35000);

      const systemPrompt = `You are a highly capable and experienced Pre-med AI Tutor on the Pre-med CBT platform.
The student has uploaded a study document/notes in PDF or text format.
YOUR CEILING DIRECTIVE IS INDEPENDENT ANALYSIS OF THIS MATERIAL to actively answer questions and explain concepts.
Do not invent facts beyond or conflicting with this document, but feel free to explain, contextualize, and outline concepts to maximize the student's mastery.

Here is the studied document content:
------------------------------------
${trimmedDocText}
------------------------------------

CRITICAL FORMATTING & TYPOGRAPHY RULES:
1. Always present answers in highly structured, beautifully spaced clinical textbook layouts.
2. Use bullet lists, numbered mechanical steps, and clear visual sections.
3. NEVER mention that you are associated with or developed by "TestDriller". Keep your identity strictly as the Pre-med CBT study room AI tutor.`;

      const messages: { role: string; content: string }[] = [];
      if (Array.isArray(history)) {
        history.forEach((h: any) => {
          messages.push({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.text
          });
        });
      }
      messages.push({
        role: 'user',
        content: message
      });

      console.log('Sending PDF Study Chat request to Gemini API...');
      const responseText = await requestGeminiCompletion(messages, systemPrompt, { temperature: 0.6 });
      return reply.send({ success: true, response: convertToUnicodeBold(responseText) });
    } catch (e: any) {
      console.error('[Study Chat Error]', e);
      return reply.status(500).send({ error: e.message || 'Failed to process document chat.' });
    }
  });

  // Active Study PDF - Generate Quiz Endpoint
  app.post('/tutor/active-study/generate-quiz', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized.' });

      const { documentText } = request.body as any;
      if (!documentText) {
        return reply.status(400).send({ error: 'Document notes are required to compile questions.' });
      }

      const trimmedDocText = documentText.substring(0, 30000);

      const systemPrompt = `You are an elite Pre-Med and Medical Board Prep Professor on the Pre-med CBT platform.
Your task is to read carefully through the provided studied notes text and convert its details, facts, pathways, and physiological concepts into exactly 5 premium multiple choice questions (CBT level questions).

Do NOT generate more or less than 5 questions!
Your response MUST be a valid JSON array format containing exactly 5 question objects. No conversational intro or outro text, only the raw JSON. Do not place any Markdown blocks except possibly a \`\`\`json block.

Each question object in your JSON array must follow this exact schema:
{
  "text": "The text of the question...",
  "a": "Option A...",
  "b": "Option B...",
  "c": "Option C...",
  "d": "Option D...",
  "correct_option": "option_a" | "option_b" | "option_c" | "option_d",
  "explanation": "Extremely detailed medical-school level explanation of why the answer is correct and why other choices are incorrect."
}

DO NOT refer to "TestDriller" under any circumstances.

Here is the document text:
-----------------------
${trimmedDocText}
-----------------------`;

      console.log('Generating PDF Active Study quiz via GEMINI API...');
      let responseText = await requestGeminiCompletion(
        [{ role: 'user', content: "Parse the document and generate 5 premium MCQs according to the instructions." }],
        systemPrompt,
        { temperature: 0.2 }
      );
      
      // Clean markdown tags if generated
      if (responseText.includes('```')) {
        const matches = responseText.match(/```(?:json)?([\s\S]*?)```/);
        if (matches && matches[1]) {
          responseText = matches[1].trim();
        }
      }

      try {
        const parsed = JSON.parse(responseText.trim());
        return reply.send({ success: true, questions: parsed });
      } catch (parseError) {
        console.error('Failed to parse active study JSON quiz:', responseText);
        // Let's retry with an instruction to ensure the array starts
        return reply.status(422).send({ error: 'Failed to format the AI quiz questions. Please retry.', raw: responseText });
      }
    } catch (e: any) {
      console.error('[Study Quiz Generation Error]', e);
      return reply.status(500).send({ error: e.message || 'Failed to generate study quiz.' });
    }
  });

  // Active Study PDF - Generate Study Guide Endpoint
  app.post('/tutor/active-study/generate-guide', { preHandler: [verifyToken] }, async (request, reply) => {
    if (reply.sent) return;
    try {
      const user = (request as any).user;
      if (!user) return reply.status(401).send({ error: 'Unauthorized.' });

      const { documentText } = request.body as any;
      if (!documentText) {
        return reply.status(400).send({ error: 'Document notes are required to compile a guide.' });
      }

      const trimmedDocText = documentText.substring(0, 30000);

      const systemPrompt = `You are an elite Pre-Med and Medical Board Prep Professor on the Pre-med CBT platform.
Your goal is to read through the provided clinical/scientific student notes text and compile a magnificent, expanded, highly structured Textbook Clinical Study Guide containing extreme depth, detailed breakdowns, and high-yield concepts.

Rewrite, structure, and categorize the student's messy notes into the following cohesive outline:
1. "🔑 High-Yield Clinical Terms and Nomenclature" - Clear, explicit medical and scientific definitions.
2. "⚙️ Physiological Mechanisms & Biochemical Pathways" - Step-by-step mechanical/pathway breakdowns.
3. "📚 Detailed Subject Review" - In-depth review of the core concepts, organized logically.
4. "📝 Exam Strategy Tips" - Memory aids, mnemonics, and high-yield test insights.

Ensure you use generous styling with bullet points, dividers, and standard headings.
IMPORTANT: Never mention or imply you are associated with "TestDriller" or write TestDriller anywhere.

Here is the student notes text:
-----------------------
${trimmedDocText}
-----------------------`;

      console.log('Compiling textbook study guide from notes via GEMINI API...');
      const content = await requestGeminiCompletion(
        [{ role: 'user', content: "Actively study these notes and build the Textbook Study Guide using the system guidelines outline." }],
        systemPrompt,
        { temperature: 0.5 }
      );
      return reply.send({ success: true, guide: convertToUnicodeBold(content) });
    } catch (e: any) {
      console.error('[Study Guide Generation Error]', e);
      return reply.status(500).send({ error: e.message || 'Failed to generate study guide.' });
    }
  });
}
