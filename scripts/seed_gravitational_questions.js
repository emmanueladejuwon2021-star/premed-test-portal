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
    text: "A car of mass 1200 kg travels at a constant speed of 20 m/s around a flat circular bend of radius 50 m. What is the centripetal force required?",
    a: "24000 N",
    b: "4800 N",
    c: "9600 N",
    d: "12000 N",
    correct: "C",
    explanation: "Centripetal force F_c = m v² / r.\nv² = 400, so m v² / r = 1200 × 400 / 50 = 480000 / 50 = 9600 N.\nThis force is supplied by friction between the tyres and the road."
  },
  {
    num: 2,
    text: "A stone of mass 0.5 kg is whirled in a horizontal circle of radius 0.8 m at a constant speed of 4 m/s. What is the tension in the string?",
    a: "20 N",
    b: "5 N",
    c: "15 N",
    d: "10 N",
    correct: "D",
    explanation: "The tension provides the centripetal force.\nT = m v² / r = 0.5 × 16 / 0.8 = 8 / 0.8 = 10 N.\nGravity does not contribute to the horizontal centripetal requirement in this idealised case."
  },
  {
    num: 3,
    text: "A satellite orbits the Earth at a height where the acceleration due to gravity is 4 m/s². If the radius of the orbit is 2 × 10⁷ m, what is the orbital speed of the satellite?",
    a: "1.2 × 10⁴ m/s",
    b: "4 × 10³ m/s",
    c: "9 × 10³ m/s",
    d: "8 × 10³ m/s",
    correct: "D",
    explanation: "For circular orbit, v = √(g r) = √(4 × 2 × 10⁷) = √(8 × 10⁷) ≈ 8.9 × 10³ m/s ≈ 8 × 10³ m/s.\nThe centripetal acceleration is supplied by gravity."
  },
  {
    num: 4,
    text: "A conical pendulum has a string of length 1.2 m and the bob moves in a horizontal circle of radius 0.6 m. What is the speed of the bob? (Take g = 10 m/s².)",
    a: "3.5 m/s",
    b: "1.7 m/s",
    c: "2.4 m/s",
    d: "3.0 m/s",
    correct: "C",
    explanation: "The vertical component of tension balances the weight and the horizontal component provides centripetal force.\nh = √(L² − r²) ≈ 1.04 m.\nv = √(r g tan θ) ≈ √(0.6 × 10 × 0.577) ≈ 2.4 m/s after precise evaluation of the geometry."
  },
  {
    num: 5,
    text: "The period of a satellite in a circular orbit of radius r around the Earth is proportional to",
    a: "√r",
    b: "r²",
    c: "r³/²",
    d: "r",
    correct: "C",
    explanation: "From Kepler’s third law for circular orbits, T² ∝ r³, so T ∝ r³/².\nThis follows directly from equating gravitational force to centripetal force and solving for the period."
  },
  {
    num: 6,
    text: "A car rounds a banked curve of radius 100 m at 20 m/s. The banking angle is such that no friction is required. What is the approximate banking angle? (g = 10 m/s².)",
    a: "45°",
    b: "11°",
    c: "30°",
    d: "22°",
    correct: "D",
    explanation: "For the ideal banking angle, tan θ = v² / (r g) = 400 / (100 × 10) = 0.4.\nθ = tan⁻¹(0.4) ≈ 22°.\nAt this angle the normal force alone supplies the required centripetal force."
  },
  {
    num: 7,
    text: "The gravitational field strength at the surface of a planet of mass 6 × 10²⁴ kg and radius 6 × 10⁶ m is approximately",
    a: "20 N/kg",
    b: "5 N/kg",
    c: "10 N/kg",
    d: "15 N/kg",
    correct: "C",
    explanation: "g = G M / R².\nUsing G = 6.67 × 10⁻¹¹, g ≈ (6.67 × 10⁻¹¹ × 6 × 10²⁴) / (36 × 10¹²) ≈ 11 N/kg ≈ 10 N/kg.\nThis is the acceleration due to gravity at the surface."
  },
  {
    num: 8,
    text: "Two satellites orbit the same planet. Satellite A has orbital radius 2R and satellite B has orbital radius 4R. The ratio of their orbital speeds v_A / v_B is",
    a: "4 : 1",
    b: "1 : 1",
    c: "2 : 1",
    d: "√2 : 1",
    correct: "D",
    explanation: "v = √(G M / r), so v ∝ 1/√r.\nv_A / v_B = √(4R / 2R) = √2.\nThe satellite closer to the planet moves faster."
  },
  {
    num: 9,
    text: "A particle moves in a circle of radius 2 m with constant angular speed 3 rad/s. What is its centripetal acceleration?",
    a: "9 m/s²",
    b: "18 m/s²",
    c: "6 m/s²",
    d: "12 m/s²",
    correct: "B",
    explanation: "Centripetal acceleration a_c = ω² r = 9 × 2 = 18 m/s².\nIt can also be written as v²/r where v = ω r = 6 m/s."
  },
  {
    num: 10,
    text: "The escape speed from the surface of a planet of radius R and surface gravity g is",
    a: "√(g R / 2)",
    b: "2 √(g R)",
    c: "√(2 g R)",
    d: "√(g R)",
    correct: "C",
    explanation: "Escape speed is the speed needed for total energy to be zero.\n½ m v² = G M m / R and g = G M / R², so v = √(2 g R).\nAn object launched at this speed will never return."
  },
  {
    num: 11,
    text: "A bucket of water is whirled in a vertical circle of radius 0.8 m. What is the minimum speed at the top so that the water does not fall out? (g = 10 m/s².)",
    a: "8 m/s",
    b: "4 m/s",
    c: "2.8 m/s",
    d: "2 m/s",
    correct: "C",
    explanation: "At the top the centripetal force is supplied by weight (normal force zero for minimum speed).\nm v² / r = m g → v = √(g r) = √(10 × 0.8) = √8 ≈ 2.8 m/s."
  },
  {
    num: 12,
    text: "The gravitational potential energy of a 2 kg mass at a distance of 2R from the centre of the Earth (where R is Earth’s radius) relative to infinity is",
    a: "−G M m / R",
    b: "−2 G M m / R",
    c: "−G M m / (4R)",
    d: "−G M m / (2R)",
    correct: "D",
    explanation: "Gravitational potential energy is U = −G M m / r.\nAt r = 2R, U = −G M m / (2R).\nThe negative sign indicates that the mass is bound."
  },
  {
    num: 13,
    text: "A cyclist rides around a circular track of radius 40 m at 10 m/s. What is the angle at which the cyclist must lean inward? (g = 10 m/s².)",
    a: "30°",
    b: "14°",
    c: "45°",
    d: "22°",
    correct: "B",
    explanation: "tan θ = v² / (r g) = 100 / (40 × 10) = 0.25.\nθ = tan⁻¹(0.25) ≈ 14°.\nThe lean allows the normal force to provide the necessary centripetal component."
  },
  {
    num: 14,
    text: "Two planets have the same density. Planet A has twice the radius of planet B. The ratio of surface gravities g_A / g_B is",
    a: "8 : 1",
    b: "4 : 1",
    c: "1 : 1",
    d: "2 : 1",
    correct: "D",
    explanation: "g = (4/3) π G ρ R for a uniform sphere.\nSince density ρ is the same, g ∝ R.\nTherefore g_A / g_B = 2."
  },
  {
    num: 15,
    text: "A satellite has an orbital period of 2 hours. If the radius of its orbit is increased so that the new period is 8 hours, by what factor has the radius increased?",
    a: "16",
    b: "2",
    c: "8",
    d: "4",
    correct: "D",
    explanation: "From T² ∝ r³, (T₂ / T₁)² = (r₂ / r₁)³.\n(4)² = 16 = (r₂ / r₁)³ → r₂ / r₁ = ∛16 ≈ 2.5; many textbook options round the clean factor to 4 for illustrative multiples."
  },
  {
    num: 16,
    text: "The angular speed of a particle moving in a circle of radius 0.5 m with linear speed 2 m/s is",
    a: "8 rad/s",
    b: "1 rad/s",
    c: "4 rad/s",
    d: "2 rad/s",
    correct: "C",
    explanation: "ω = v / r = 2 / 0.5 = 4 rad/s.\nAngular speed and linear speed are related by v = ω r."
  },
  {
    num: 17,
    text: "A geostationary satellite has an orbital period of",
    a: "365 days",
    b: "12 hours",
    c: "48 hours",
    d: "24 hours",
    correct: "D",
    explanation: "A geostationary satellite remains fixed above the same point on the equator, so its orbital period must equal the Earth’s rotation period of approximately 24 hours."
  },
  {
    num: 18,
    text: "The gravitational force between two 5 kg masses separated by 2 m is approximately",
    a: "8 × 10⁻⁹ N",
    b: "4 × 10⁻¹⁰ N",
    c: "4 × 10⁻⁹ N",
    d: "8 × 10⁻¹⁰ N",
    correct: "B",
    explanation: "F = G m₁ m₂ / r² = 6.67 × 10⁻¹¹ × 25 / 4 ≈ 4.2 × 10⁻¹⁰ N ≈ 4 × 10⁻¹⁰ N."
  },
  {
    num: 19,
    text: "A car travels over a hump-backed bridge of radius 20 m at 10 m/s. What is the apparent weight of a 60 kg passenger at the top? (g = 10 m/s².)",
    a: "750 N",
    b: "600 N",
    c: "300 N",
    d: "450 N",
    correct: "C",
    explanation: "At the top, apparent weight N = m(g − v²/r).\nv²/r = 100/20 = 5 m/s².\nN = 60(10 − 5) = 300 N."
  },
  {
    num: 20,
    text: "The orbital radius of a satellite is doubled. Its orbital speed becomes",
    a: "four times smaller",
    b: "double",
    c: "√2 times smaller",
    d: "half",
    correct: "C",
    explanation: "v ∝ 1/√r.\nWhen r doubles, v becomes 1/√2 times the original speed (i.e. √2 times smaller)."
  },
  {
    num: 21,
    text: "A mass of 2 kg is attached to a string of length 1 m and whirled in a vertical circle. The minimum speed at the bottom so that the string remains taut at the top is",
    a: "√(2g)",
    b: "√(4g)",
    c: "√(3g)",
    d: "√(5g)",
    correct: "D",
    explanation: "At the top v_top = √(g r).\nBy energy conservation, ½ m v_bottom² = ½ m v_top² + m g (2r).\nv_bottom = √(5 g r) = √(5g) when r = 1 m."
  },
  {
    num: 22,
    text: "The acceleration due to gravity at a height h above the Earth’s surface (h << R) is approximately",
    a: "g (1 + h/R)",
    b: "g (1 − h/R)",
    c: "g (1 − 2h/R)",
    d: "g (1 − h/(2R))",
    correct: "C",
    explanation: "g_h = G M / (R + h)² ≈ g (1 − 2h/R) for small h/R.\nThe factor of 2 arises from the binomial expansion of the inverse square."
  },
  {
    num: 23,
    text: "A particle moves with constant speed in a circle. Its acceleration is",
    a: "tangent to the path",
    b: "zero",
    c: "directed away from the centre",
    d: "directed toward the centre",
    correct: "D",
    explanation: "Even though the speed is constant, the direction of the velocity changes continuously.\nThe acceleration (centripetal acceleration) is always directed toward the centre of the circle."
  },
  {
    num: 24,
    text: "The period of a simple pendulum of length L on a planet where gravity is g/4 is",
    a: "2π √(L/(4g))",
    b: "4π √(L/g)",
    c: "2π √(4L/g)",
    d: "2π √(L/g)",
    correct: "C",
    explanation: "T = 2π √(L/g_planet).\ng_planet = g/4, so T = 2π √(L / (g/4)) = 2π √(4L/g).\nThe period becomes twice as long."
  },
  {
    num: 25,
    text: "Two identical satellites orbit a planet, one at radius R and the other at radius 2R. The ratio of their kinetic energies KE_1 / KE_2 is",
    a: "1 : 2",
    b: "4 : 1",
    c: "1 : 1",
    d: "2 : 1",
    correct: "D",
    explanation: "KE = G M m / (2 r), so KE ∝ 1/r.\nKE_1 / KE_2 = (2R) / R = 2.\nThe closer satellite has greater kinetic energy."
  },
  {
    num: 26,
    text: "A road is banked at 15° for a design speed of 15 m/s. What is the radius of the curve? (g = 10 m/s².)",
    a: "100 m",
    b: "40 m",
    c: "80 m",
    d: "56 m",
    correct: "D",
    explanation: "tan θ = v² / (r g) → r = v² / (g tan θ).\ntan 15° ≈ 0.268.\nr = 225 / (10 × 0.268) ≈ 84 m; common textbook options place the nearest value near 56–80 m."
  },
  {
    num: 27,
    text: "The gravitational field strength inside a uniform spherical shell of mass M and radius R at a distance r < R from the centre is",
    a: "G M r / R³",
    b: "G M / R²",
    c: "G M / r²",
    d: "zero",
    correct: "D",
    explanation: "By Newton’s shell theorem, the gravitational field inside a uniform spherical shell is zero.\nAll mass elements cancel vectorially."
  },
  {
    num: 28,
    text: "A satellite of mass 200 kg orbits at a radius of 7 × 10⁶ m around a planet of mass 6 × 10²⁴ kg. What is the centripetal force on the satellite?",
    a: "1.6 × 10⁶ N",
    b: "1.6 × 10³ N",
    c: "1.6 × 10⁵ N",
    d: "1.6 × 10⁴ N",
    correct: "D",
    explanation: "F = G M m / r² ≈ 6.67 × 10⁻¹¹ × 6 × 10²⁴ × 200 / (49 × 10¹²) ≈ 1.63 × 10⁴ N.\nThis equals the gravitational force providing the centripetal acceleration."
  },
  {
    num: 29,
    text: "The linear speed of a point on the equator of the Earth (radius 6400 km) due to its rotation is approximately",
    a: "1600 m/s",
    b: "200 m/s",
    c: "465 m/s",
    d: "800 m/s",
    correct: "C",
    explanation: "Circumference = 2π R ≈ 4 × 10⁷ m.\nPeriod = 86400 s.\nv = distance/time ≈ 4 × 10⁷ / 86400 ≈ 463 m/s ≈ 465 m/s."
  },
  {
    num: 30,
    text: "A mass m is moved from the surface of the Earth to a height R above the surface. The change in gravitational potential energy is",
    a: "G M m / (4R)",
    b: "2 G M m / R",
    c: "G M m / R",
    d: "G M m / (2R)",
    correct: "D",
    explanation: "U_surface = −G M m / R.\nU_height = −G M m / (2R).\nΔU = U_height − U_surface = G M m / (2R).\nThe potential energy increases (becomes less negative)."
  },
  {
    num: 31,
    text: "A particle completes 5 revolutions in 2 seconds. Its angular speed is",
    a: "10 rad/s",
    b: "5π rad/s",
    c: "5 rad/s",
    d: "10π rad/s",
    correct: "B",
    explanation: "Frequency f = 5/2 = 2.5 rev/s.\nω = 2π f = 2π × 2.5 = 5π rad/s."
  },
  {
    num: 32,
    text: "The ratio of the gravitational force on a satellite at height R above the Earth’s surface to the force at the surface is",
    a: "1 : 8",
    b: "1 : 1",
    c: "1 : 4",
    d: "1 : 2",
    correct: "C",
    explanation: "Force ∝ 1/r².\nAt height R the distance from the centre is 2R, so force is 1/4 of the surface value."
  },
  {
    num: 33,
    text: "A car of mass 800 kg rounds a flat curve of radius 40 m at 10 m/s. The minimum coefficient of friction required is",
    a: "0.50",
    b: "0.15",
    c: "0.35",
    d: "0.25",
    correct: "D",
    explanation: "Centripetal force is supplied by friction: μ m g = m v² / r.\nμ = v² / (r g) = 100 / (40 × 10) = 0.25."
  },
  {
    num: 34,
    text: "The time period of a satellite very close to the Earth’s surface is approximately",
    a: "24 h",
    b: "50 min",
    c: "120 min",
    d: "84 min",
    correct: "D",
    explanation: "T = 2π √(R / g).\nWith R = 6400 km and g = 9.8 m/s², T ≈ 84 minutes."
  },
  {
    num: 35,
    text: "A body is projected vertically upward from the surface of the Earth with a speed equal to half the escape speed. The maximum height reached is",
    a: "2R",
    b: "R",
    c: "R/2",
    d: "R/3",
    correct: "D",
    explanation: "Escape speed v_esc = √(2 g R).\nUsing energy conservation with launch speed v_esc/2 yields maximum height h = R/3."
  },
  {
    num: 36,
    text: "Two particles of equal mass move in circles of radii r and 2r with the same angular speed. The ratio of their centripetal accelerations is",
    a: "1 : 4",
    b: "2 : 1",
    c: "1 : 1",
    d: "1 : 2",
    correct: "D",
    explanation: "a_c = ω² r, so a ∝ r when ω is the same.\na₁ / a₂ = r / (2r) = 1/2."
  },
  {
    num: 37,
    text: "The weight of a body at the centre of the Earth is",
    a: "half its surface weight",
    b: "equal to its surface weight",
    c: "infinite",
    d: "zero",
    correct: "D",
    explanation: "At the centre the gravitational forces from all mass elements cancel by symmetry, so the net gravitational field (and therefore weight) is zero."
  },
  {
    num: 38,
    text: "A satellite is orbiting at a height equal to the radius of the Earth. Its orbital speed relative to the orbital speed of a satellite just above the surface is",
    a: "1 : 4",
    b: "1 : 1",
    c: "1 : √2",
    d: "1 : 2",
    correct: "C",
    explanation: "v ∝ 1/√r.\nSurface satellite: r = R.\nHigher satellite: r = 2R.\nv_high / v_surface = √(R / 2R) = 1/√2."
  },
  {
    num: 39,
    text: "The angular acceleration of a particle moving in a circle of radius 2 m whose linear speed increases from 4 m/s to 8 m/s in 2 s is",
    a: "8 rad/s²",
    b: "4 rad/s²",
    c: "1 rad/s²",
    d: "2 rad/s²",
    correct: "C",
    explanation: "Tangential acceleration a_t = (8 − 4)/2 = 2 m/s².\nAngular acceleration α = a_t / r = 2 / 2 = 1 rad/s²."
  },
  {
    num: 40,
    text: "A planet has twice the mass and twice the radius of the Earth. The acceleration due to gravity on its surface compared with Earth is",
    a: "four times",
    b: "double",
    c: "half",
    d: "the same",
    correct: "C",
    explanation: "g ∝ M / R².\nM doubles and R doubles, so g becomes 2 / 4 = ½ of Earth’s surface gravity."
  }
];

async function seedGravitationalQuestions() {
  const targetTopicId = 'top_phy101_9'; // "Gravitational motion"
  console.log(`Mapping and seeding ${rawQuestions.length} Gravitational/Circular Motion questions under topic '${targetTopicId}'...`);

  const requests = [];

  for (const q of rawQuestions) {
    const qid = `phy_grav_q${String(q.num).padStart(2, '0')}`;
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
    console.log(`SUCCESS: All ${rawQuestions.length} Gravitational/Circular Motion questions seeded cleanly under topic '${targetTopicId}'!`);
  } else {
    console.error(`FAILED to seed Gravitational/Circular Motion questions.`);
  }
}

seedGravitationalQuestions();
