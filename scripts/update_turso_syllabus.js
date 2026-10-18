const https = require('node:https');
const { parseJsonResponse } = require('../helpers/http_utils.js');

const TURSO_URL = process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/\/$/, '') + '/v2/pipeline' : 'https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io/v2/pipeline';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || '';

function formatArgs(args = []) {
  return args.map(a => {
    if (a === null || a === undefined) return { type: 'null' };
    if (typeof a === 'number') {
      return Number.isInteger(a) ? { type: 'integer', value: String(a) } : { type: 'float', value: a };
    }
    return { type: 'text', value: String(a) };
  });
}

function runTursoPipeline(requests) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify({ requests: [...requests, { type: 'close' }] });
      const req = https.request(TURSO_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TURSO_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 20000
      }, (res) => {
        parseJsonResponse(res, '[TURSO PARSE ERROR]').then(resolve);
      });
      req.on('error', (e) => {
        console.error('[TURSO PIPELINE ERROR]', e.message);
        resolve(null);
      });
      req.write(payload);
      req.end();
    } catch (e) {
      console.error('[TURSO DISPATCH ERROR]', e.message);
      resolve(null);
    }
  });
}

const syllabusData = [
  {
    code: 'COS 101',
    title: 'Introduction to Computer',
    icon: 'Monitor',
    topics: [
      'Introduction to computer',
      'Evolution of computer',
      'Computer systems: Components of a computer system',
      'Introduction to software and programming language',
      'Computer processing models and processing networks',
      'Information representation',
      'Introduction to programming',
      'Control structures in Visual Basic',
      'Internet'
    ]
  },
  {
    code: 'ZOO 101',
    title: 'General Zoology',
    icon: 'Activity',
    topics: [
      'Anatomy and physiology of the mammal',
      'Adaptation to the environment',
      'Skin',
      'Skeletal system',
      'Muscular system',
      'Digestion and absorption of food, nutrition',
      'Kidney and homeostasis',
      'Circulatory system',
      'Nervous system and coordination',
      'Maturity, sexuality, and reproduction in man'
    ]
  },
  {
    code: 'BIO 101',
    title: 'General Biology & Cell Organization',
    icon: 'Dna',
    topics: [
      'Concepts of biology and scientific inquiry',
      'Biomolecules and Central Dogma of life',
      'Cell structure and function',
      'Photosynthesis and Cellular Respiration',
      'Genetics, Cellular reproduction (cell cycle, mitosis, meiosis), and heredity',
      'Animal reproduction and development',
      'Ecology',
      'Classification and Evolution of living things'
    ]
  },
  {
    code: 'MTH 101',
    title: 'General Mathematics I',
    icon: 'Binary',
    topics: [
      'Elementary set theory',
      'Real numbers',
      'Mathematical induction',
      'Quadratic equations',
      'Binomial theorem',
      'Complex numbers',
      'De Moivre\'s theorem',
      'Circular measure',
      'Trigonometric functions of angles'
    ]
  },
  {
    code: 'PHY 103',
    title: 'Thermal Physics & Properties of Matter',
    icon: 'Thermometer',
    topics: [
      'Properties of metals',
      'Elasticity',
      'Bernoulli\'s equation and incompressible fluid flow',
      'Surface tension: Adhesion, cohesion, capillarity, viscosity, drops, and bubbles',
      'Heat and temperature',
      'Gas laws',
      'Thermal conductivity',
      'Laws of thermodynamics',
      'Thermodynamic processes',
      'Kinetic theory of gases',
      'Molecular collision and mean free path'
    ]
  },
  {
    code: 'PHY 101',
    title: 'General Medical Physics',
    icon: 'Atom',
    topics: [
      'Physical quantities, units, and dimensions',
      'Scalars and Vectors',
      'Kinematics',
      'Newton\'s laws of motion',
      'Linear momentum',
      'Work, Energy, and Power',
      'Centre of mass and rotational motion',
      'Moment of inertia and rigid bodies',
      'Gravitational motion'
    ]
  },
  {
    code: 'GST 111',
    title: 'Use of English & Communication Skills',
    icon: 'MessageSquare',
    topics: [
      'Listening skills',
      'Speaking skill: the sound of English',
      'Speaking skills: the syllable, stress, and intonation',
      'Reading skills: strategies for effective reading',
      'Reading skills: comprehension and summary',
      'Reading skills: study reading',
      'Writing skills: the paragraph',
      'Writing skills: essay writing',
      'Vocabulary development',
      'Grammar: Word classes and phrases',
      'Grammar: Clauses and sentences',
      'Library',
      'Information retrieval tool',
      'Search strategy',
      'Style manual'
    ]
  },
  {
    code: 'CHM 101',
    title: 'General Chemistry',
    icon: 'FlaskConical',
    topics: [
      'Atoms, molecules, elements, and compounds',
      'Modern electronic theory of atom',
      'Electronic configuration, periodicity, and building up of periodic table',
      'Chemical equations, Chemical reactions, and stoichiometry',
      'Chemical thermodynamics',
      'Elementary thermochemistry',
      'Chemical bonding, kinetic theory of matter, and intermolecular forces',
      'Properties of gases',
      'Hybridisation and shapes of simple molecules',
      'Valence forces and structure of solids',
      'Acids, bases, and salts',
      'Redox reactions',
      'Introduction to electrochemistry',
      'Rates of reaction',
      'Chemical equilibrium'
    ]
  }
];

async function updateSyllabus() {
  console.log('1. Wiping all existing questions and topics from Turso database...');
  const wipeReqs = [
    { type: 'execute', stmt: { sql: 'DELETE FROM questions;' } },
    { type: 'execute', stmt: { sql: 'DELETE FROM topics;' } }
  ];
  await runTursoPipeline(wipeReqs);

  console.log('2. Inserting official accredited courses & topics...');
  const insertReqs = [];

  for (const c of syllabusData) {
    const courseId = 'course_' + c.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    insertReqs.push({
      type: 'execute',
      stmt: {
        sql: `INSERT INTO courses (id, code, title, icon, is_mock, is_locked, duration, question_limit)
              VALUES (?, ?, ?, ?, 1, 0, 30, 20)
              ON CONFLICT(id) DO UPDATE SET code = excluded.code, title = excluded.title;`,
        args: formatArgs([courseId, c.code, c.title, c.icon])
      }
    });

    c.topics.forEach((topName, idx) => {
      const topicId = 'top_' + c.code.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + (idx + 1);
      insertReqs.push({
        type: 'execute',
        stmt: {
          sql: `INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, ?, 0);`,
          args: formatArgs([topicId, courseId, topName])
        }
      });
    });
  }

  const res = await runTursoPipeline(insertReqs);
  if (res) {
    console.log('SUCCESS: All 8 courses and their exact topic lists have been populated!');
  } else {
    console.error('FAILED to populate syllabus.');
  }
}

updateSyllabus();
