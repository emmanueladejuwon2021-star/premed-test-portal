/**
 * Seed all premed courses and topics into premed_portal.sqlite
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, 'premed_portal.sqlite');
const db = new DatabaseSync(dbPath);

const curriculum = [
  {
    code: 'ZOO 101',
    title: 'Zoology',
    duration: 30,
    question_limit: 20,
    topics: [
      'Anatomy and Physiology of the Mammal',
      'Adaptation to the Environment',
      'Skin',
      'Skeletal System',
      'Muscular System',
      'Digestion and Absorption of Food, Nutrition',
      'Kidney and Homeostasis',
      'Circulatory System',
      'Nervous System and Coordination',
      'Maturity, Sexuality, and Reproduction in Man'
    ]
  },
  {
    code: 'PHY 101',
    title: 'General Physics I',
    duration: 30,
    question_limit: 20,
    topics: [
      'Space and time',
      'Units and dimensions; vectors and scalars',
      'Differentiation of vectors; displacement, velocity, acceleration; kinematics',
      'Newton’s laws of motion; inertial frames; impulse; momentum conservation; relative motion',
      'Applications of Newtonian mechanics; equations of motion',
      'Conservation principles; conservative forces; energy, work; centre of mass',
      'Rotational motion; torque; angular momentum',
      'Polar coordinates; circular motion; moments of inertia; gyroscopes',
      'Gravitation; Kepler’s laws; escape velocity; satellite motion'
    ]
  },
  {
    code: 'PHY 103',
    title: 'General Physics II',
    duration: 30,
    question_limit: 20,
    topics: [
      'Properties of metals',
      'Elasticity',
      'Bernoulli’s equation and incompressible fluid flow',
      'Surface tension: adhesion, cohesion, capillarity, viscosity',
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
    code: 'GST 101',
    title: 'Use of English',
    duration: 30,
    question_limit: 20,
    topics: [
      'Listening skills',
      'Speaking skills: sounds of English',
      'Speaking skills: syllable, stress, and intonation',
      'Reading skills: strategies for effective reading',
      'Reading comprehension and summary',
      'Study reading',
      'Paragraph writing',
      'Essay writing',
      'Vocabulary development',
      'Grammar: word classes and phrases',
      'Grammar: clauses and sentences',
      'Library use',
      'Information retrieval tools',
      'Search strategy',
      'Style manual'
    ]
  },
  {
    code: 'MTH 101',
    title: 'Elementary Mathematics I',
    duration: 30,
    question_limit: 20,
    topics: [
      'Elementary set theory and Venn diagrams',
      'Real numbers: rational and irrational numbers',
      'Mathematical induction; sequences and series; quadratic equations',
      'Binomial theorem; complex numbers; Argand diagram',
      'De Moivre’s theorem; nth roots of unity',
      'Circular measure; trigonometric functions'
    ]
  },
  {
    code: 'PCY 101',
    title: 'Pharmacy Orientation',
    duration: 30,
    question_limit: 20,
    topics: [
      'Orientation to Pharmacy and role of the pharmacist',
      'Opportunities in Pharmacy',
      'History of Pharmacy',
      'Evolution and disciplines of Pharmacy',
      'Stages in drug development',
      'Concept of dosage forms',
      'The prescription'
    ]
  },
  {
    code: 'BIO 101',
    title: 'General Biology',
    duration: 30,
    question_limit: 20,
    topics: [
      'Concepts of biology and scientific inquiry',
      'Biomolecules and the central dogma',
      'Cell structure and function',
      'Cellular reproduction and heredity',
      'Animal reproduction and development',
      'Ecology',
      'Classification and evolution of living things'
    ]
  },
  {
    code: 'CHM 101',
    title: 'General Chemistry I',
    duration: 30,
    question_limit: 20,
    topics: [
      'Atoms, molecules, elements and compounds',
      'Modern electronic theory of atoms',
      'Electronic configuration and periodic trends',
      'Chemical equations and stoichiometry',
      'Chemical thermodynamics',
      'Elementary thermochemistry',
      'Chemical bonding and intermolecular forces',
      'Properties of gases',
      'Hybridization and molecular shapes',
      'Acids, bases and salts',
      'Redox reactions and electrochemistry',
      'Rates of reaction',
      'Chemical equilibrium'
    ]
  },
  {
    code: 'COS 101',
    title: 'Introduction to Computer Science',
    duration: 30,
    question_limit: 20,
    topics: [
      'Introduction to computing sciences',
      'Evolution of computers',
      'Computer system components',
      'Software and programming languages',
      'Computer processing models and networks',
      'Information representation',
      'Introduction to programming',
      'Control structures in Visual Basic',
      'Internet'
    ]
  }
];

// Clean existing courses, topics, questions to start completely clean and organized
db.exec(`
  DELETE FROM questions;
  DELETE FROM topics;
  DELETE FROM courses;
`);

const insertCourse = db.prepare(`
  INSERT INTO courses (id, code, title, duration, question_limit, is_locked, is_master)
  VALUES (?, ?, ?, ?, ?, 0, 0)
`);

const insertTopic = db.prepare(`
  INSERT INTO topics (id, course_id, name)
  VALUES (?, ?, ?)
`);

let totalCourses = 0;
let totalTopics = 0;

for (const c of curriculum) {
  const codeSlug = c.code.toLowerCase().replace(/[^a-z0-9]/g, '');
  const courseId = `course_${codeSlug}`;
  insertCourse.run(courseId, c.code, c.title, c.duration, c.question_limit);
  totalCourses++;

  for (let i = 0; i < c.topics.length; i++) {
    const topicName = c.topics[i];
    const topicId = `topic_${codeSlug}_${i + 1}`;
    insertTopic.run(topicId, courseId, topicName);
    totalTopics++;
  }
}

console.log(`Successfully seeded ${totalCourses} courses and ${totalTopics} topics into premed_portal.sqlite!`);
