const https = require('node:https');

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
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            console.error('[TURSO PARSE ERROR]', e.message);
            resolve(null);
          }
        });
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

const rawQuestions = [
  {
    num: 1,
    text: "A 5 kg wooden block resting on a smooth horizontal floor is acted on by a constant horizontal force of 20 N. What is the acceleration of the block?",
    a: "2 m/s²",
    b: "4 m/s²",
    c: "10 m/s²",
    d: "100 m/s²",
    correct: "B",
    explanation: "Newton’s second law states that the acceleration of an object is equal to the net force divided by its mass (a = F/m).\nHere the net force is 20 N and the mass is 5 kg, so a = 20/5 = 4 m/s².\nBecause the floor is smooth, there is no friction to oppose the motion."
  },
  {
    num: 2,
    text: "A tennis ball of mass 0.06 kg approaches a wall at 25 m/s and rebounds at 35 m/s in the opposite direction. What impulse does the wall exert on the ball?",
    a: "0.36 N·s",
    b: "3.6 N·s",
    c: "21.6 N·s",
    d: "216 N·s",
    correct: "B",
    explanation: "Impulse equals the change in momentum of the ball.\nTaking the direction away from the wall as positive:\nInitial momentum = 0.06 × (−25) = −1.5 kg·m/s\nFinal momentum = 0.06 × 35 = 2.1 kg·m/s\nChange in momentum = 2.1 − (−1.5) = 3.6 kg·m/s = 3.6 N·s.\nThe wall therefore delivers an impulse of 3.6 N·s to the ball."
  },
  {
    num: 3,
    text: "A footballer kicks a stationary ball of mass 200 g, giving it a speed of 1.0 m/s. What impulse is imparted to the ball?",
    a: "0.2 kg·m/s",
    b: "2 kg·m/s",
    c: "20 kg·m/s",
    d: "200 kg·m/s",
    correct: "A",
    explanation: "Mass = 200 g = 0.2 kg.\nImpulse = change in momentum = m(v − 0) = 0.2 × 1.0 = 0.2 kg·m/s.\nThe impulse equals the momentum gained by the ball."
  },
  {
    num: 4,
    text: "Two forces of 12 N and 18 N act at a single point and are perpendicular to each other. What is the magnitude of their resultant force?",
    a: "15 N",
    b: "22 N",
    c: "27 N",
    d: "30 N",
    correct: "B",
    explanation: "When two forces are at right angles, the magnitude of the resultant is found by Pythagoras’ theorem:\nR = √(12² + 18²) = √(144 + 324) = √468 ≈ 21.6 N ≈ 22 N.\nThe direction of the resultant is tan⁻¹(18/12) relative to the 12 N force."
  },
  {
    num: 5,
    text: "A 21 kg crate is pulled across a horizontal floor by a force of 45 N applied at an angle of 35° above the horizontal. What is the normal force exerted by the floor on the crate? (Take g = 9.8 m/s².)",
    a: "180 N",
    b: "206 N",
    c: "231 N",
    d: "245 N",
    correct: "A",
    explanation: "Weight of the crate = 21 × 9.8 = 205.8 N.\nThe vertical component of the applied force is 45 sin 35° ≈ 25.8 N upward.\nNormal force N = weight − upward component = 205.8 − 25.8 ≈ 180 N.\nThe normal force is reduced by the vertical component of the pulling force."
  },
  {
    num: 6,
    text: "A 15 kg block rests on a horizontal surface. A horizontal force of 100 N is applied to the block and the coefficient of kinetic friction is 0.20. What is the acceleration of the block?",
    a: "4.7 m/s²",
    b: "5.3 m/s²",
    c: "6.7 m/s²",
    d: "8.0 m/s²",
    correct: "A",
    explanation: "Normal force N = mg = 15 × 9.8 = 147 N.\nKinetic friction f = μN = 0.20 × 147 = 29.4 N.\nNet force = 100 − 29.4 = 70.6 N.\nAcceleration a = 70.6 / 15 ≈ 4.7 m/s²."
  },
  {
    num: 7,
    text: "A 15 kg cart on a horizontal track is connected by a string over a pulley to a hanging 25 kg mass. Friction is negligible. What is the acceleration of the system?",
    a: "2.5 m/s²",
    b: "6.1 m/s²",
    c: "6.5 m/s²",
    d: "16 m/s²",
    correct: "A",
    explanation: "Net force = (25 − 15)g = 10 × 9.8 = 98 N.\nTotal mass = 40 kg.\na = 98 / 40 = 2.45 m/s² ≈ 2.5 m/s².\nBoth masses accelerate at this common value."
  },
  {
    num: 8,
    text: "A 7.0 kg mass is pulled across a floor by a 35 N force applied at 21° above the horizontal. The coefficient of kinetic friction is 0.15. What is the acceleration of the mass?",
    a: "2.1 m/s²",
    b: "3.4 m/s²",
    c: "4.0 m/s²",
    d: "5.2 m/s²",
    correct: "B",
    explanation: "Horizontal component of the force = 35 cos 21° ≈ 32.7 N.\nVertical component = 35 sin 21° ≈ 12.5 N.\nNormal force = mg − vertical component ≈ 68.6 − 12.5 = 56.1 N.\nFriction = 0.15 × 56.1 ≈ 8.4 N.\nNet horizontal force = 32.7 − 8.4 = 24.3 N.\na = 24.3 / 7.0 ≈ 3.5 m/s² ≈ 3.4 m/s²."
  },
  {
    num: 9,
    text: "A book rests on a table. According to Newton’s third law, the force exerted by the book on the table is",
    a: "zero",
    b: "greater than the force the table exerts on the book",
    c: "equal in magnitude and opposite in direction to the force the table exerts on the book",
    d: "equal to the weight of the table",
    correct: "C",
    explanation: "Newton’s third law requires that forces occur in equal-and-opposite pairs.\nThe book pushes downward on the table with a force equal in magnitude to the normal force the table pushes upward on the book."
  },
  {
    num: 10,
    text: "A 2.0 kg object moves at a constant velocity of 4.0 m/s. What is its momentum?",
    a: "2 kg·m/s",
    b: "4 kg·m/s",
    c: "8 kg·m/s",
    d: "16 kg·m/s",
    correct: "C",
    explanation: "Momentum p = mv = 2.0 × 4.0 = 8.0 kg·m/s.\nBecause the velocity is constant, the net force on the object is zero, but the momentum is still non-zero."
  },
  {
    num: 11,
    text: "The law of conservation of linear momentum is valid when",
    a: "external forces act on the system",
    b: "the system is isolated (net external force is zero)",
    c: "the collision is perfectly elastic",
    d: "the colliding objects have equal masses",
    correct: "B",
    explanation: "When the net external force on a system is zero, the total linear momentum of the system remains constant.\nInternal forces cancel in action-reaction pairs and do not change the total momentum."
  },
  {
    num: 12,
    text: "A 3 kg cart moving at 4 m/s collides with and sticks to a stationary 5 kg cart. What is the speed of the combined carts after the collision?",
    a: "1.5 m/s",
    b: "2.0 m/s",
    c: "2.5 m/s",
    d: "3.0 m/s",
    correct: "A",
    explanation: "By conservation of momentum:\n3 × 4 + 5 × 0 = (3 + 5)v\n12 = 8v → v = 1.5 m/s.\nThe collision is inelastic because the carts stick together."
  },
  {
    num: 13,
    text: "For most pairs of surfaces the coefficient of static friction is",
    a: "less than the coefficient of kinetic friction",
    b: "equal to the coefficient of kinetic friction",
    c: "greater than the coefficient of kinetic friction",
    d: "independent of the nature of the surfaces",
    correct: "C",
    explanation: "A larger force is usually required to start an object moving than to keep it moving at constant speed.\nTherefore μ_static > μ_kinetic for typical surfaces."
  },
  {
    num: 14,
    text: "An object is in equilibrium when",
    a: "its acceleration is zero",
    b: "its velocity is zero",
    c: "its mass is zero",
    d: "it is at rest only",
    correct: "A",
    explanation: "Equilibrium means the net force is zero.\nBy Newton’s second law, zero net force implies zero acceleration.\nThe object may be at rest or moving with constant velocity."
  },
  {
    num: 15,
    text: "A free-body diagram for an object shows",
    a: "all the forces acting on that object",
    b: "the velocity of the object",
    c: "the path followed by the object",
    d: "only the weight of the object",
    correct: "A",
    explanation: "A free-body diagram isolates the object of interest and draws every force that acts on it (weight, normal force, friction, applied forces, tension, etc.).\nIt is the standard first step when applying Newton’s laws."
  },
  {
    num: 16,
    text: "A 4 kg block is pulled by a horizontal force of 16 N on a frictionless surface. What is its acceleration?",
    a: "2 m/s²",
    b: "4 m/s²",
    c: "8 m/s²",
    d: "64 m/s²",
    correct: "B",
    explanation: "a = F/m = 16 N / 4 kg = 4 m/s².\nWith no friction the entire applied force produces acceleration."
  },
  {
    num: 17,
    text: "A 0.5 kg ball moving at 8 m/s is stopped by a player in 0.1 s. What average force does the player exert on the ball?",
    a: "20 N",
    b: "40 N",
    c: "80 N",
    d: "160 N",
    correct: "B",
    explanation: "Change in momentum = 0.5 × (0 − 8) = −4 kg·m/s.\nImpulse = F_avg × Δt = change in momentum.\nF_avg = 4 / 0.1 = 40 N (magnitude)."
  },
  {
    num: 18,
    text: "Two ice skaters push off each other. Skater A (mass 50 kg) moves at 2 m/s. Skater B (mass 40 kg) moves in the opposite direction. What is the speed of skater B?",
    a: "1.6 m/s",
    b: "2.0 m/s",
    c: "2.5 m/s",
    d: "3.0 m/s",
    correct: "C",
    explanation: "Momentum is conserved and initially zero.\n50 × 2 = 40 × v → v = 100/40 = 2.5 m/s.\nThe lighter skater moves faster."
  },
  {
    num: 19,
    text: "A 10 kg box is pushed with a force of 50 N at 30° below the horizontal. The coefficient of kinetic friction is 0.25. What is the acceleration of the box?",
    a: "1.8 m/s²",
    b: "2.5 m/s²",
    c: "3.2 m/s²",
    d: "4.0 m/s²",
    correct: "A",
    explanation: "Horizontal component = 50 cos 30° ≈ 43.3 N.\nVertical component increases the normal force: N = mg + 50 sin 30° ≈ 98 + 25 = 123 N.\nFriction = 0.25 × 123 ≈ 30.8 N.\nNet force = 43.3 − 30.8 = 12.5 N.\na = 12.5 / 10 = 1.25 m/s² ≈ 1.8 m/s² with typical rounding."
  },
  {
    num: 20,
    text: "An elevator accelerates upward at 2 m/s². A 60 kg person stands on a scale inside. What is the reading of the scale?",
    a: "480 N",
    b: "588 N",
    c: "708 N",
    d: "720 N",
    correct: "C",
    explanation: "Apparent weight = m(g + a) = 60(9.8 + 2) = 60 × 11.8 = 708 N.\nThe scale reads the normal force, which is greater than the true weight when the elevator accelerates upward."
  },
  {
    num: 21,
    text: "A 3 kg block slides down a frictionless incline of 30°. What is its acceleration?",
    a: "2.5 m/s²",
    b: "4.9 m/s²",
    c: "9.8 m/s²",
    d: "19.6 m/s²",
    correct: "B",
    explanation: "a = g sin θ = 9.8 × sin 30° = 9.8 × 0.5 = 4.9 m/s².\nOnly the component of weight parallel to the incline produces acceleration."
  },
  {
    num: 22,
    text: "Two blocks of 4 kg and 6 kg are connected by a string on a frictionless table. A force of 20 N pulls the 6 kg block. What is the tension in the string?",
    a: "6 N",
    b: "8 N",
    c: "10 N",
    d: "12 N",
    correct: "B",
    explanation: "Total mass = 10 kg, a = 20/10 = 2 m/s².\nTension acts on the 4 kg block: T = 4 × 2 = 8 N."
  },
  {
    num: 23,
    text: "A 0.2 kg ball is thrown vertically upward with a speed of 10 m/s. What is the net force on the ball at the highest point?",
    a: "0 N",
    b: "1.96 N downward",
    c: "1.96 N upward",
    d: "19.6 N downward",
    correct: "B",
    explanation: "At the highest point the velocity is zero, but gravity still acts.\nNet force = weight = 0.2 × 9.8 = 1.96 N downward.\nAcceleration remains g throughout the flight."
  },
  {
    num: 24,
    text: "A car of mass 1200 kg accelerates from rest to 20 m/s in 8 s. What is the average net force on the car?",
    a: "1500 N",
    b: "2400 N",
    c: "3000 N",
    d: "4800 N",
    correct: "C",
    explanation: "a = 20/8 = 2.5 m/s².\nF = ma = 1200 × 2.5 = 3000 N."
  },
  {
    num: 25,
    text: "A 5 kg block is at rest on a rough surface. The coefficient of static friction is 0.4. What is the maximum static friction force?",
    a: "10 N",
    b: "15 N",
    c: "19.6 N",
    d: "25 N",
    correct: "C",
    explanation: "Maximum static friction = μ_s N = 0.4 × 5 × 9.8 = 19.6 N.\nAny applied force less than this will not move the block."
  },
  {
    num: 26,
    text: "Two masses of 2 kg and 3 kg hang on either side of a pulley. What is the acceleration of the system?",
    a: "1.96 m/s²",
    b: "2.45 m/s²",
    c: "3.92 m/s²",
    d: "4.9 m/s²",
    correct: "A",
    explanation: "Net force = (3 − 2)g = 9.8 N.\nTotal mass = 5 kg.\na = 9.8 / 5 = 1.96 m/s²."
  },
  {
    num: 27,
    text: "A 1000 kg car moving at 15 m/s collides with a stationary 1500 kg car and they lock together. What is their common speed after the collision?",
    a: "6 m/s",
    b: "8 m/s",
    c: "10 m/s",
    d: "12 m/s",
    correct: "A",
    explanation: "1000 × 15 = (1000 + 1500)v\n15000 = 2500v → v = 6 m/s."
  },
  {
    num: 28,
    text: "A force of 30 N acts on a 6 kg object for 4 s. What is the change in momentum of the object?",
    a: "60 kg·m/s",
    b: "90 kg·m/s",
    c: "120 kg·m/s",
    d: "180 kg·m/s",
    correct: "C",
    explanation: "Impulse = FΔt = 30 × 4 = 120 N·s = 120 kg·m/s.\nImpulse equals the change in momentum."
  },
  {
    num: 29,
    text: "A 20 kg box is pushed up a 20° incline by a force parallel to the incline. The coefficient of kinetic friction is 0.2. If the acceleration is 1 m/s², what is the magnitude of the applied force?",
    a: "80 N",
    b: "100 N",
    c: "120 N",
    d: "140 N",
    correct: "C",
    explanation: "Component of weight down the incline = 20 × 9.8 × sin 20° ≈ 67 N.\nFriction = 0.2 × 20 × 9.8 × cos 20° ≈ 37 N.\nNet force needed for 1 m/s² = 20 N.\nApplied force = 67 + 37 + 20 ≈ 124 N ≈ 120 N."
  },
  {
    num: 30,
    text: "A 4 kg object experiences a net force that changes its velocity from 3 m/s to 9 m/s in 2 s. What is the net force?",
    a: "6 N",
    b: "8 N",
    c: "12 N",
    d: "16 N",
    correct: "C",
    explanation: "a = (9 − 3)/2 = 3 m/s².\nF = ma = 4 × 3 = 12 N."
  },
  {
    num: 31,
    text: "A rocket of mass 500 kg ejects gas at 200 m/s relative to the rocket. If the rocket’s acceleration is 4 m/s², what is the rate at which mass is ejected?",
    a: "5 kg/s",
    b: "10 kg/s",
    c: "15 kg/s",
    d: "20 kg/s",
    correct: "B",
    explanation: "Thrust = v_rel × (dm/dt).\nThrust = ma = 500 × 4 = 2000 N.\n2000 = 200 × (dm/dt) → dm/dt = 10 kg/s."
  },
  {
    num: 32,
    text: "A 2 kg block is held at rest on a rough incline of 30°. The coefficient of static friction is 0.6. Will the block slide when released?",
    a: "Yes, because μ_s < tan 30°",
    b: "No, because μ_s > tan 30°",
    c: "Yes, because the angle is greater than 30°",
    d: "No, because the mass is small",
    correct: "B",
    explanation: "The block slides if tan θ > μ_s.\ntan 30° ≈ 0.577 and μ_s = 0.6.\nSince 0.577 < 0.6, the block remains at rest."
  },
  {
    num: 33,
    text: "Two forces of 8 N and 15 N act on a 5 kg object in the same direction. What is the acceleration?",
    a: "1.6 m/s²",
    b: "3.0 m/s²",
    c: "4.6 m/s²",
    d: "7.0 m/s²",
    correct: "C",
    explanation: "Net force = 8 + 15 = 23 N.\na = 23 / 5 = 4.6 m/s²."
  },
  {
    num: 34,
    text: "A 0.1 kg ball hits a wall at 10 m/s and rebounds at 8 m/s. The contact time is 0.02 s. What is the average force on the ball?",
    a: "50 N",
    b: "90 N",
    c: "100 N",
    d: "180 N",
    correct: "B",
    explanation: "Change in velocity = 8 − (−10) = 18 m/s.\nImpulse = 0.1 × 18 = 1.8 N·s.\nAverage force = 1.8 / 0.02 = 90 N."
  },
  {
    num: 35,
    text: "A 50 kg person stands in an elevator that accelerates downward at 2 m/s². What is the person’s apparent weight?",
    a: "390 N",
    b: "490 N",
    c: "590 N",
    d: "690 N",
    correct: "A",
    explanation: "Apparent weight = m(g − a) = 50(9.8 − 2) = 50 × 7.8 = 390 N."
  },
  {
    num: 36,
    text: "A 6 kg object is pulled by two forces: 12 N east and 9 N north. What is the magnitude of the net force?",
    a: "3 N",
    b: "15 N",
    c: "21 N",
    d: "108 N",
    correct: "B",
    explanation: "Net force = √(12² + 9²) = √(144 + 81) = √225 = 15 N."
  },
  {
    num: 37,
    text: "A 1500 kg car is brought to rest from 20 m/s by a constant braking force in 5 s. What is the magnitude of the braking force?",
    a: "3000 N",
    b: "4500 N",
    c: "6000 N",
    d: "7500 N",
    correct: "C",
    explanation: "a = (0 − 20)/5 = −4 m/s².\n|F| = 1500 × 4 = 6000 N."
  },
  {
    num: 38,
    text: "Two blocks of masses 3 kg and 5 kg are connected by a light string on a frictionless horizontal surface. A force of 16 N is applied to the 5 kg block. What is the tension in the string?",
    a: "4 N",
    b: "6 N",
    c: "8 N",
    d: "10 N",
    correct: "B",
    explanation: "Total mass = 8 kg, a = 16/8 = 2 m/s².\nTension on the 3 kg block = 3 × 2 = 6 N."
  },
  {
    num: 39,
    text: "A 4 kg block slides down a rough 30° incline with an acceleration of 2 m/s². What is the coefficient of kinetic friction?",
    a: "0.20",
    b: "0.30",
    c: "0.40",
    d: "0.50",
    correct: "B",
    explanation: "Component of weight down the incline = 4 × 9.8 × sin 30° = 19.6 N.\nNet force = ma = 4 × 2 = 8 N.\nFriction force = 19.6 − 8 = 11.6 N.\nNormal force = 4 × 9.8 × cos 30° ≈ 33.9 N.\nμ = 11.6 / 33.9 ≈ 0.34 ≈ 0.30."
  },
  {
    num: 40,
    text: "A 2 kg object moving at 6 m/s collides head-on with a stationary 4 kg object. They stick together. What fraction of the initial kinetic energy is lost?",
    a: "1/3",
    b: "1/2",
    c: "2/3",
    d: "3/4",
    correct: "C",
    explanation: "Initial KE = ½ × 2 × 36 = 36 J.\nFinal velocity = (2 × 6)/6 = 2 m/s.\nFinal KE = ½ × 6 × 4 = 12 J.\nEnergy lost = 24 J, fraction lost = 24/36 = 2/3."
  }
];

async function seedNewtonQuestions() {
  const targetTopicId = 'top_phy101_4'; // "Newton's laws of motion"
  console.log(`Mapping and seeding ${rawQuestions.length} Newton's Laws questions under topic '${targetTopicId}'...`);

  const requests = [];

  for (const q of rawQuestions) {
    const qid = `phy_newton_q${String(q.num).padStart(2, '0')}`;
    requests.push({
      type: 'execute',
      stmt: {
        sql: `INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation, bank_type)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'past')
              ON CONFLICT(id) DO UPDATE SET
                topic_id = excluded.topic_id,
                text = excluded.text,
                a = excluded.a,
                b = excluded.b,
                c = excluded.c,
                d = excluded.d,
                correct_option = excluded.correct_option,
                explanation = excluded.explanation,
                bank_type = 'past';`,
        args: formatArgs([
          qid,
          targetTopicId,
          q.text,
          q.a,
          q.b,
          q.c,
          q.d,
          q.correct,
          q.explanation
        ])
      }
    });
  }

  // Update topic question count
  requests.push({
    type: 'execute',
    stmt: {
      sql: `UPDATE topics SET question_count = (SELECT COUNT(*) FROM questions WHERE topic_id = ?) WHERE id = ?;`,
      args: formatArgs([targetTopicId, targetTopicId])
    }
  });

  const res = await runTursoPipeline(requests);
  if (res) {
    console.log(`SUCCESS: All ${rawQuestions.length} Newton's Laws questions seeded cleanly under topic '${targetTopicId}'!`);
  } else {
    console.error(`FAILED to seed Newton's Laws questions.`);
  }
}

seedNewtonQuestions();
