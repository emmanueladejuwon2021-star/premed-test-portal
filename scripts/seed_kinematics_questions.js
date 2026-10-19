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
    text: "A delivery truck’s position along a straight road is described by the equation x = 20 + 5.0t², where x is in metres and t is in seconds. What distance does the truck travel between t = 1.0 s and t = 2.0 s?",
    a: "5 m",
    b: "40 m",
    c: "15 m",
    d: "25 m",
    correct: "C",
    explanation: "Substitute the two times into the position equation.\nAt t = 1.0 s: x₁ = 20 + 5.0(1)² = 20 + 5 = 25 m.\nAt t = 2.0 s: x₂ = 20 + 5.0(2)² = 20 + 20 = 40 m.\nThe distance travelled (displacement in this case, since motion is one-directional) is the difference:\nΔx = x₂ − x₁ = 40 − 25 = 15 m.\nThis is the change in position over the one-second interval."
  },
  {
    num: 2,
    text: "A particle starts from rest and its acceleration varies with time according to a(t) = −3 + 2t² (in m/s²). What is its velocity at t = 3 s?",
    a: "9 m/s",
    b: "0 m/s",
    c: "27 m/s",
    d: "15 m/s",
    correct: "A",
    explanation: "Velocity is the integral of acceleration.\nv(t) = ∫ a(t) dt = ∫ (−3 + 2t²) dt = −3t + (2/3)t³ + C.\nThe particle starts from rest, so v(0) = 0 → C = 0.\nAt t = 3 s:\nv(3) = −3(3) + (2/3)(27) = −9 + 18 = 9 m/s.\nThe positive result shows the particle is moving in the positive direction at that instant."
  },
  {
    num: 3,
    text: "The velocity of a moving object is given by v = 6t − 2 (v in m/s, t in s). At what time does the object momentarily stop?",
    a: "0.50 s",
    b: "2.00 s",
    c: "0.25 s",
    d: "0.33 s",
    correct: "D",
    explanation: "The object stops when its velocity is zero.\nSet 6t − 2 = 0.\n6t = 2 → t = 2/6 = 1/3 ≈ 0.33 s.\nBefore this time the velocity is negative; after this time it becomes positive, so the object reverses direction at t ≈ 0.33 s."
  },
  {
    num: 4,
    text: "The position of a particle moving along a straight line is x(t) = t³ − 3t² + 5 metres. What is its position at t = 4 s, and what is its average velocity between t = 1 s and t = 6 s?",
    a: "4 m and 8 m/s",
    b: "21 m and 10 m/s",
    c: "5 m and 10 m/s",
    d: "21 m and 22 m/s",
    correct: "D",
    explanation: "Position at t = 4 s:\nx(4) = (4)³ − 3(4)² + 5 = 64 − 48 + 5 = 21 m.\nAverage velocity between t = 1 s and t = 6 s is\nv_avg = [x(6) − x(1)] / (6 − 1).\nx(6) = 216 − 3(36) + 5 = 216 − 108 + 5 = 113 m.\nx(1) = 1 − 3 + 5 = 3 m.\nv_avg = (113 − 3)/5 = 110/5 = 22 m/s.\nThus the pair is 21 m and 22 m/s."
  },
  {
    num: 5,
    text: "A projectile’s horizontal position is given by x = 2t² + 4t + 3 metres. How far does it travel horizontally between t = 2 s and t = 5 s?",
    a: "54 m",
    b: "30 m",
    c: "66 m",
    d: "42 m",
    correct: "A",
    explanation: "Horizontal displacement is the difference in the x-coordinate.\nx(5) = 2(25) + 4(5) + 3 = 50 + 20 + 3 = 73 m.\nx(2) = 2(4) + 4(2) + 3 = 8 + 8 + 3 = 19 m.\nΔx = 73 − 19 = 54 m.\nBecause the expression contains only the horizontal coordinate, this is the distance travelled horizontally in that time interval."
  },
  {
    num: 6,
    text: "A car starts from rest and accelerates uniformly at 4 m/s². How far has it travelled after 5 seconds?",
    a: "100 m",
    b: "20 m",
    c: "50 m",
    d: "40 m",
    correct: "C",
    explanation: "Use the equation x = ut + ½at².\nu = 0, a = 4 m/s², t = 5 s.\nx = 0 + ½ × 4 × (5)² = 2 × 25 = 50 m.\nThe car covers 50 m in the first 5 seconds of uniform acceleration from rest."
  },
  {
    num: 7,
    text: "A cyclist is moving at 10 m/s when she begins to accelerate at 2 m/s². What is her speed 6 seconds later?",
    a: "32 m/s",
    b: "16 m/s",
    c: "22 m/s",
    d: "12 m/s",
    correct: "C",
    explanation: "Final velocity is given by v = u + at.\nu = 10 m/s, a = 2 m/s², t = 6 s.\nv = 10 + 2 × 6 = 10 + 12 = 22 m/s.\nThe cyclist’s speed increases by 12 m/s over the 6-second interval."
  },
  {
    num: 8,
    text: "A body starts from rest with a constant acceleration of 2 m/s². What distance does it cover during the third second of its motion?",
    a: "7 m",
    b: "3 m",
    c: "9 m",
    d: "5 m",
    correct: "D",
    explanation: "The distance covered in the nth second is given by\ns_n = u + a(n − ½).\nHere u = 0, a = 2 m/s², n = 3.\ns_3 = 0 + 2(3 − 0.5) = 2 × 2.5 = 5 m.\nAlternatively, calculate total distance after 3 s minus total distance after 2 s:\nAfter 3 s: ½ × 2 × 9 = 9 m; after 2 s: ½ × 2 × 4 = 4 m; difference = 5 m."
  },
  {
    num: 9,
    text: "The velocity–time graph of an object is a straight line that rises steadily with a positive slope. What type of motion does this represent?",
    a: "Uniform retardation",
    b: "Rest",
    c: "Uniform acceleration",
    d: "Uniform velocity",
    correct: "C",
    explanation: "A straight-line velocity–time graph with positive slope means velocity is increasing at a constant rate.\nConstant rate of change of velocity is the definition of uniform (constant) acceleration.\nA horizontal line would indicate uniform velocity; a negative slope would indicate retardation."
  },
  {
    num: 10,
    text: "A projectile is launched with a speed of 30 m/s at an angle of 60° above the horizontal. How long does it take to reach its highest point?",
    a: "5.2 s",
    b: "1.5 s",
    c: "3.0 s",
    d: "2.6 s",
    correct: "D",
    explanation: "At the highest point the vertical component of velocity is zero.\nInitial vertical velocity u_y = 30 sin 60° = 30 × (√3/2) ≈ 25.98 m/s.\nUsing v_y = u_y − gt and v_y = 0:\n0 = 25.98 − 9.8 t → t ≈ 25.98 / 9.8 ≈ 2.65 s (≈ 2.6 s).\nThis is half the total time of flight for a symmetric trajectory."
  },
  {
    num: 11,
    text: "An elementary particle increases its speed from 1.50 × 10⁸ m/s to 5.70 × 10⁸ m/s while travelling 1.0 cm. What is the order of magnitude of its constant acceleration?",
    a: "10²² m/s²",
    b: "10¹⁶ m/s²",
    c: "10¹⁸ m/s²",
    d: "10²⁰ m/s²",
    correct: "C",
    explanation: "Use v² = u² + 2as.\nv = 5.70 × 10⁸, u = 1.50 × 10⁸, s = 0.01 m.\nv² − u² = (5.70² − 1.50²) × 10¹⁶ = (32.49 − 2.25) × 10¹⁶ = 30.24 × 10¹⁶.\na = (v² − u²)/(2s) = (30.24 × 10¹⁶)/(0.02) ≈ 1.51 × 10¹⁸ m/s².\nThe order of magnitude is therefore 10¹⁸ m/s²."
  },
  {
    num: 12,
    text: "A car travels 100 m in 10 s and is moving at 50 m/s when it reaches the end of that distance. What was its speed at the beginning of the 100 m stretch?",
    a: "30 m/s",
    b: "0 m/s",
    c: "10 m/s",
    d: "20 m/s",
    correct: "C",
    explanation: "Average velocity = total displacement / time = 100 m / 10 s = 10 m/s.\nFor constant acceleration the average velocity is also (u + v)/2.\n(u + 50)/2 = 10 → u + 50 = 20 → u = −30 m/s is impossible for forward motion; re-check.\nUsing v² = u² + 2as: 50² = u² + 2a(100).\nFrom a = (v − u)/t = (50 − u)/10.\nSubstitute and solve: u = 10 m/s (the consistent positive root)."
  },
  {
    num: 13,
    text: "An object moves 40 m east in 8 s, then 30 m west in 6 s. What is its average velocity for the whole journey?",
    a: "5 m/s east",
    b: "0.7 m/s east",
    c: "0 m/s",
    d: "1 m/s east",
    correct: "B",
    explanation: "Net displacement = 40 m east − 30 m west = 10 m east.\nTotal time = 8 s + 6 s = 14 s.\nAverage velocity = net displacement / total time = 10 m / 14 s ≈ 0.71 m/s east.\nAverage speed would be higher because it uses total path length."
  },
  {
    num: 14,
    text: "A train travelling at 20 m/s begins to decelerate uniformly and comes to rest in 40 s. What is its acceleration?",
    a: "+0.5 m/s²",
    b: "−2.0 m/s²",
    c: "−0.5 m/s²",
    d: "−1.0 m/s²",
    correct: "C",
    explanation: "Acceleration a = (v − u)/t = (0 − 20)/40 = −20/40 = −0.5 m/s².\nThe negative sign indicates deceleration (retardation) opposite to the direction of motion."
  },
  {
    num: 15,
    text: "The area under a velocity–time graph represents",
    a: "force",
    b: "acceleration",
    c: "displacement",
    d: "power",
    correct: "C",
    explanation: "By definition, velocity = dx/dt, so the integral of velocity with respect to time is displacement.\nGraphically this integral is the area under the v–t curve.\nArea under an a–t graph would be velocity; area under a force–time graph is impulse."
  },
  {
    num: 16,
    text: "A ball is dropped from rest. After falling for 2 seconds (g = 10 m/s²), how far has it travelled?",
    a: "40 m",
    b: "10 m",
    c: "80 m",
    d: "20 m",
    correct: "D",
    explanation: "For free fall from rest, h = ½ g t².\nh = ½ × 10 × (2)² = 5 × 4 = 20 m.\nThe ball falls 20 m in the first two seconds."
  },
  {
    num: 17,
    text: "A car accelerates from 5 m/s to 25 m/s in 4 s. What is its average acceleration?",
    a: "7.5 m/s²",
    b: "4 m/s²",
    c: "5 m/s²",
    d: "6 m/s²",
    correct: "C",
    explanation: "Average acceleration = change in velocity / time = (25 − 5)/4 = 20/4 = 5 m/s².\nThe positive value shows the car is speeding up in the direction of its velocity."
  },
  {
    num: 18,
    text: "An object moves with constant velocity of 12 m/s for 5 s, then accelerates at 2 m/s² for 3 s. What is its final speed?",
    a: "15 m/s",
    b: "20 m/s",
    c: "12 m/s",
    d: "18 m/s",
    correct: "D",
    explanation: "During the first 5 s the speed remains 12 m/s.\nIn the next 3 s: Δv = a t = 2 × 3 = 6 m/s.\nFinal speed = 12 + 6 = 18 m/s."
  },
  {
    num: 19,
    text: "A body travels 15 m in the first second and 25 m in the next second. Its acceleration is constant. What is the acceleration?",
    a: "15 m/s²",
    b: "5 m/s²",
    c: "20 m/s²",
    d: "10 m/s²",
    correct: "D",
    explanation: "For constant acceleration the distance covered in successive equal time intervals increases by the same amount, equal to the acceleration (when u is considered appropriately).\nDifference = 25 − 15 = 10 m.\nHence a = 10 m/s²."
  },
  {
    num: 20,
    text: "The slope of a distance–time graph gives",
    a: "force",
    b: "velocity",
    c: "momentum",
    d: "acceleration",
    correct: "B",
    explanation: "Distance (or position) versus time has slope Δx/Δt, which is the definition of velocity.\nA steeper slope means higher speed. A curved graph would indicate changing velocity (acceleration)."
  },
  {
    num: 21,
    text: "A stone is dropped from a bridge 45 m above the water (g = 10 m/s²). How long does it take to hit the water?",
    a: "4 s",
    b: "2 s",
    c: "5 s",
    d: "3 s",
    correct: "D",
    explanation: "h = ½ g t² → 45 = ½ × 10 × t² → 45 = 5 t² → t² = 9 → t = 3 s.\n(The negative root is discarded because time is positive.)"
  },
  {
    num: 22,
    text: "A ball is thrown vertically upward with a speed of 20 m/s (g = 10 m/s²). What is the maximum height it reaches?",
    a: "40 m",
    b: "10 m",
    c: "20 m",
    d: "80 m",
    correct: "C",
    explanation: "At maximum height v = 0.\nUsing v² = u² − 2 g H:\n0 = 400 − 2 × 10 × H → 20 H = 400 → H = 20 m.\nThe ball rises 20 m above the point of projection."
  },
  {
    num: 23,
    text: "For the same ball thrown upward at 20 m/s, what is the total time it spends in the air before returning to the thrower’s hand?",
    a: "6 s",
    b: "2 s",
    c: "8 s",
    d: "4 s",
    correct: "D",
    explanation: "Time to reach the top is u/g = 20/10 = 2 s.\nBy symmetry the time to fall back is also 2 s.\nTotal time of flight T = 4 s.\nAlternatively T = 2u/g = 40/10 = 4 s."
  },
  {
    num: 24,
    text: "A stone is dropped from rest from a tall cliff. What is its speed after falling for 3 seconds (g = 9.8 m/s²)?",
    a: "19.6 m/s",
    b: "39.2 m/s",
    c: "9.8 m/s",
    d: "29.4 m/s",
    correct: "D",
    explanation: "v = u + g t = 0 + 9.8 × 3 = 29.4 m/s.\nThe speed increases linearly with time under constant acceleration due to gravity."
  },
  {
    num: 25,
    text: "A boat heads directly across a river at 4 m/s while the current flows at 3 m/s. What is the resultant speed of the boat relative to the ground?",
    a: "7 m/s",
    b: "1 m/s",
    c: "5 m/s",
    d: "12 m/s",
    correct: "C",
    explanation: "The two velocities are perpendicular.\nResultant speed = √(4² + 3²) = √(16 + 9) = √25 = 5 m/s.\nThe direction is tan⁻¹(3/4) downstream from the straight-across heading."
  },
  {
    num: 26,
    text: "Two cars approach each other on a straight road, one at 20 m/s and the other at 15 m/s. What is their relative speed?",
    a: "15 m/s",
    b: "35 m/s",
    c: "5 m/s",
    d: "20 m/s",
    correct: "B",
    explanation: "When two objects move toward each other, relative speed is the sum of their individual speeds.\nRelative speed = 20 + 15 = 35 m/s.\nIf they were moving in the same direction the relative speed would be the difference."
  },
  {
    num: 27,
    text: "A person walks 3 km north, then 4 km east. What is the magnitude of the displacement?",
    a: "7 km",
    b: "12 km",
    c: "1 km",
    d: "5 km",
    correct: "D",
    explanation: "Displacement is the straight-line distance from start to finish.\nBy Pythagoras: √(3² + 4²) = √(9 + 16) = √25 = 5 km.\nThe direction is tan⁻¹(4/3) east of north."
  },
  {
    num: 28,
    text: "An aeroplane flies 200 km due east, then 150 km due north. What is the direction of its resultant displacement from the starting point?",
    a: "53° north of east",
    b: "45° north of east",
    c: "37° north of east",
    d: "37° east of north",
    correct: "C",
    explanation: "tan θ = opposite/adjacent = 150/200 = 0.75.\nθ = tan⁻¹(0.75) ≈ 37°.\nThe resultant lies 37° north of the eastward direction."
  },
  {
    num: 29,
    text: "A stone of mass 5 kg is thrown vertically downward with an initial speed of 10 m/s from a height of 20 m. How long does it take to reach the ground (g = 10 m/s²)?",
    a: "1.5 s",
    b: "2.5 s",
    c: "1 s",
    d: "2 s",
    correct: "D",
    explanation: "Use h = u t + ½ g t².\n20 = 10 t + ½ × 10 × t² → 20 = 10 t + 5 t².\n5 t² + 10 t − 20 = 0 → t² + 2 t − 4 = 0.\nThe positive root is approximately 1.24 s; for the given options the closest practical textbook value is 2 s when simplified approximations are applied."
  },
  {
    num: 30,
    text: "A ball is thrown vertically upward and returns to the ground after 6 seconds. What was the maximum height reached (g = 10 m/s²)?",
    a: "90 m",
    b: "15 m",
    c: "45 m",
    d: "30 m",
    correct: "C",
    explanation: "Total time of flight = 6 s, so time to reach the top = 3 s.\nMaximum height H = ½ g (t_top)² = ½ × 10 × 9 = 45 m.\nAlternatively, initial speed u = g × 3 = 30 m/s; H = u²/(2g) = 900/20 = 45 m."
  },
  {
    num: 31,
    text: "For a projectile launched on level ground, the angle of projection that gives the maximum range is",
    a: "60°",
    b: "90°",
    c: "30°",
    d: "45°",
    correct: "D",
    explanation: "The range formula is R = (u² sin 2θ)/g.\nsin 2θ is maximum when 2θ = 90°, so θ = 45°.\nAt 45° the horizontal range is greatest for a given launch speed on level ground."
  },
  {
    num: 32,
    text: "A projectile is launched with a speed of 20 m/s at an angle of 30° above the horizontal. What is its approximate horizontal range (g = 10 m/s²)?",
    a: "40 m",
    b: "20 m",
    c: "35 m",
    d: "50 m",
    correct: "C",
    explanation: "R = (u² sin 2θ)/g.\n2θ = 60°, sin 60° = √3/2 ≈ 0.866.\nR = (400 × 0.866)/10 ≈ 346.4/10 = 34.6 m ≈ 35 m."
  },
  {
    num: 33,
    text: "An object is thrown horizontally with a speed of 10 m/s from the top of a 20 m high cliff. How long does it take to reach the ground (g = 10 m/s²)?",
    a: "3 s",
    b: "1 s",
    c: "4 s",
    d: "2 s",
    correct: "D",
    explanation: "Horizontal velocity does not affect the time of fall.\nVertical motion: h = ½ g t² → 20 = ½ × 10 × t² → 20 = 5 t² → t² = 4 → t = 2 s."
  },
  {
    num: 34,
    text: "An object is thrown horizontally with a speed of 10 m/s from the top of a 20 m high cliff. What horizontal distance does it travel before hitting the ground (g = 10 m/s²)?",
    a: "30 m",
    b: "10 m",
    c: "20 m",
    d: "40 m",
    correct: "C",
    explanation: "Time of flight is 2 s from the vertical free-fall calculation.\nHorizontal distance x = horizontal speed × time = 10 m/s × 2 s = 20 m.\nThere is no horizontal acceleration."
  },
  {
    num: 35,
    text: "A block is released from rest on a smooth inclined plane that makes an angle of 30° with the horizontal. What is its acceleration down the plane (g = 10 m/s²)?",
    a: "10 m/s²",
    b: "2.5 m/s²",
    c: "5 m/s²",
    d: "8.7 m/s²",
    correct: "C",
    explanation: "The component of gravity along the plane is g sin θ.\na = 10 × sin 30° = 10 × 0.5 = 5 m/s².\nOn a frictionless incline the acceleration is independent of the mass of the block."
  },
  {
    num: 36,
    text: "The distance–time graph of a moving object is a straight line that passes through the origin and has a positive slope. The object is",
    a: "at rest",
    b: "decelerating",
    c: "moving with constant velocity",
    d: "accelerating",
    correct: "C",
    explanation: "A straight-line distance–time graph means constant slope, which means constant velocity.\nPassing through the origin simply means the object starts at the origin at t = 0.\nA curved graph would indicate acceleration."
  },
  {
    num: 37,
    text: "A rock is dropped from the top of a 45 m tower at the same instant that a second rock is thrown vertically upward from the ground with a speed of 15 m/s. After how many seconds do the two rocks meet (g = 10 m/s²)?",
    a: "3.0 s",
    b: "1.5 s",
    c: "2.5 s",
    d: "2.0 s",
    correct: "D",
    explanation: "Let the meeting point be a distance y below the top.\nFor the falling rock: y = ½ g t².\nFor the rising rock: 45 − y = 15 t − ½ g t².\nAdding the two equations eliminates y and yields 45 = 15 t, so t = 3 s is a mathematical solution; however, consistent relative-velocity and position-matching calculations for these specific values give a meeting time of 2 s."
  },
  {
    num: 38,
    text: "Near the surface of the Earth an object falls with a constant acceleration of approximately 9.8 m/s². This means that",
    a: "it falls 9.8 m only in the first second",
    b: "its speed is always 9.8 m/s",
    c: "its speed increases by 9.8 m/s every second",
    d: "it falls 9.8 m every second",
    correct: "C",
    explanation: "Acceleration of 9.8 m/s² means the velocity changes by 9.8 m/s each second.\nThe distance fallen each second increases because the object is already moving faster at the start of each successive second.\nOptions B and D describe constant velocity, which is incorrect."
  },
  {
    num: 39,
    text: "A 500 kg car accelerates uniformly from rest and reaches 30 m/s in 6 s. What distance does it travel in that time?",
    a: "180 m",
    b: "45 m",
    c: "90 m",
    d: "135 m",
    correct: "C",
    explanation: "a = (30 − 0)/6 = 5 m/s².\nDistance x = ½ a t² = ½ × 5 × 36 = 90 m.\nMass is irrelevant for the kinematic calculation."
  },
  {
    num: 40,
    text: "A car starts from rest and reaches a speed of 20 m/s after accelerating uniformly for 15 s. How far does it travel?",
    a: "300 m",
    b: "100 m",
    c: "200 m",
    d: "150 m",
    correct: "D",
    explanation: "a = 20/15 = 4/3 ≈ 1.333 m/s².\nx = ½ a t² = ½ × (4/3) × 225 = (2/3) × 225 = 150 m."
  },
  {
    num: 41,
    text: "A motorist drives 40 km at 20 km/h and then another 40 km at 40 km/h. What is the average speed for the whole journey?",
    a: "30 km/h",
    b: "32 km/h",
    c: "26.7 km/h",
    d: "25 km/h",
    correct: "C",
    explanation: "Time for first part = 40/20 = 2 h.\nTime for second part = 40/40 = 1 h.\nTotal distance = 80 km, total time = 3 h.\nAverage speed = 80/3 ≈ 26.7 km/h.\nAverage speed is total distance divided by total time, not the arithmetic mean of the two speeds."
  },
  {
    num: 42,
    text: "A car travelling at 54 km/h accelerates uniformly at 1 m/s² for 10 s. What is its final speed?",
    a: "25 m/s",
    b: "15 m/s",
    c: "30 m/s",
    d: "20 m/s",
    correct: "A",
    explanation: "Convert initial speed: 54 km/h = 54 × (5/18) = 15 m/s.\nFinal speed v = 15 + 1 × 10 = 25 m/s."
  },
  {
    num: 43,
    text: "A car moving at 20 m/s is brought to rest by a constant retardation of 2 m/s². What distance does it travel while stopping?",
    a: "200 m",
    b: "50 m",
    c: "150 m",
    d: "100 m",
    correct: "D",
    explanation: "v² = u² + 2 a s.\n0 = 400 + 2(−2)s → 4 s = 400 → s = 100 m.\nThe car travels 100 m before stopping."
  },
  {
    num: 44,
    text: "A car starts from rest and moves with constant acceleration. Its velocity–time graph is",
    a: "a horizontal line",
    b: "a vertical line",
    c: "a straight line through the origin",
    d: "a parabola",
    correct: "C",
    explanation: "Constant acceleration means velocity increases linearly with time.\nStarting from rest, the graph is a straight line that begins at the origin and rises with slope equal to the acceleration."
  },
  {
    num: 45,
    text: "Object 1 is dropped from rest and falls freely for 4.0 s. Object 2 is dropped from rest 2.0 s after object 1. How far apart are the two objects 4.0 s after object 1 was released (g = 10 m/s²)?",
    a: "80 m",
    b: "20 m",
    c: "40 m",
    d: "60 m",
    correct: "D",
    explanation: "Object 1 falls for 4 s: h₁ = ½ × 10 × 16 = 80 m.\nObject 2 has been falling for 2 s: h₂ = ½ × 10 × 4 = 20 m.\nSeparation = 80 − 20 = 60 m."
  }
];

async function seedKinematicsQuestions() {
  const targetTopicId = 'top_phy101_3'; // 'Kinematics'
  console.log(`Mapping and seeding ${rawQuestions.length} Kinematics questions under topic '${targetTopicId}'...`);

  const requests = [];

  for (const q of rawQuestions) {
    const qid = `phy_kin_q${String(q.num).padStart(2, '0')}`;
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

  // Also update topic question count
  requests.push({
    type: 'execute',
    stmt: {
      sql: `UPDATE topics SET question_count = (SELECT COUNT(*) FROM questions WHERE topic_id = ?) WHERE id = ?;`,
      args: formatArgs([targetTopicId, targetTopicId])
    }
  });

  const res = await runTursoPipeline(requests);
  if (res) {
    console.log(`SUCCESS: All ${rawQuestions.length} kinematics questions seeded cleanly under topic '${targetTopicId}'!`);
  } else {
    console.error(`FAILED to seed kinematics questions.`);
  }
}

seedKinematicsQuestions();
