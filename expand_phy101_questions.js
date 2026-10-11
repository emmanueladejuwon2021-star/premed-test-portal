/**
 * Major expansion script for PHY 101 question bank
 * Expands PHY 101 to 100+ verified exam & CBT questions categorized across all 9 topics.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, 'premed_portal.sqlite');
const db = new DatabaseSync(dbPath);

const additionalQuestions = [
  // --- TOPIC 1: Space and time (topic_phy101_1) ---
  {
    id: 'q_phy101_52',
    topic_id: 'topic_phy101_1',
    text: 'An aircraft cruises with an airspeed of 400 km/h in an air stream flowing with a wind speed of 150 km/h. What are the velocities of the aircraft relative to the ground with a tailwind and a headwind respectively?',
    a: '550 km/h and 250 km/h',
    b: '400 km/h and 150 km/h',
    c: '600 km/h and 200 km/h',
    d: '500 km/h and 300 km/h',
    correct_option: 'A',
    explanation: 'Relative velocity with tailwind (same direction): v = 400 + 150 = 550 km/h. Relative velocity with headwind (opposite direction): v = 400 - 150 = 250 km/h.'
  },
  {
    id: 'q_phy101_53',
    topic_id: 'topic_phy101_1',
    text: 'A multi-stage rocket expels its exhaust gases at 1100 km/h while moving forward at 1200 km/h relative to its launch pad. What is the total velocity of the rocket relative to the launch reference frame?',
    a: '100 km/h',
    b: '2300 km/h',
    c: '1320 km/h',
    d: '2400 km/h',
    correct_option: 'B',
    explanation: 'v = 1200 + 1100 = 2300 km/h = 2.3 × 10³ km/h.'
  },
  {
    id: 'q_phy101_54',
    topic_id: 'topic_phy101_1',
    text: 'A hiker walks 24 m due East and then 10 m due North. What is the magnitude of the straight-line displacement in space from the origin?',
    a: '34 m',
    b: '26 m',
    c: '28 m',
    d: '14 m',
    correct_option: 'B',
    explanation: 'By Pythagoras theorem: x² = 24² + 10² = 576 + 100 = 676. x = √676 = 26 m.'
  },
  {
    id: 'q_phy101_55',
    topic_id: 'topic_phy101_1',
    text: 'A vehicle covers the first half of a total distance at a constant speed of 40 km/h and the remaining half at a constant speed of 60 km/h. What is the average speed of the vehicle over the entire journey?',
    a: '50.0 km/h',
    b: '48.0 km/h',
    c: '52.5 km/h',
    d: '45.0 km/h',
    correct_option: 'B',
    explanation: 'Average speed for equal distance segments is given by the harmonic mean: v_avg = 2 v₁ v₂ / (v₁ + v₂) = 2(40)(60) / (40 + 60) = 4800 / 100 = 48.0 km/h.'
  },
  {
    id: 'q_phy101_56',
    topic_id: 'topic_phy101_1',
    text: "Two reference frames S and S' coincide at t = 0. S' moves with a constant velocity u along the positive x-axis relative to S. According to Galilean transformation, the coordinate x' of an event is related to x by:",
    a: "x' = x + ut",
    b: "x' = x - ut",
    c: "x' = x / ut",
    d: "x' = x - 1/2 u t²",
    correct_option: 'B',
    explanation: "Under Galilean transformation for reference frames moving with relative velocity u along the x-axis: x' = x - ut, y' = y, z' = z, and t' = t."
  },
  {
    id: 'q_phy101_57',
    topic_id: 'topic_phy101_1',
    text: "In classical physics, an inertial frame of reference is defined as one in which:",
    a: "Newton's First Law holds true without introducing fictitious forces",
    b: 'The reference frame undergoes constant non-zero linear acceleration',
    c: 'The frame rotates with uniform angular velocity',
    d: 'Gravitational forces are strictly zero',
    correct_option: 'A',
    explanation: "An inertial frame of reference is a non-accelerating reference frame in which Newton's laws of motion hold true without introducing pseudo/fictitious forces."
  },

  // --- TOPIC 2: Units and dimensions; vectors and scalars (topic_phy101_2) ---
  {
    id: 'q_phy101_58',
    topic_id: 'topic_phy101_2',
    text: 'Given vectors A = 3i - 12j + 6k and B = 6i - 7j + 12k, calculate the scalar product A · B.',
    a: '120',
    b: '174',
    c: '144',
    d: '210',
    correct_option: 'B',
    explanation: 'A · B = (3)(6) + (-12)(-7) + (6)(12) = 18 + 84 + 72 = 174.'
  },
  {
    id: 'q_phy101_59',
    topic_id: 'topic_phy101_2',
    text: 'For vectors A = 3i - 12j + 6k and B = 6i - 7j + 12k, what is the angle α between the two vectors?',
    a: '45.0°',
    b: '33.18°',
    c: '60.0°',
    d: '53.2°',
    correct_option: 'B',
    explanation: '|A| = √(3² + (-12)² + 6²) = √189 ≈ 13.75. |B| = √(6² + (-7)² + 12²) = √229 ≈ 15.13. cos α = (A · B) / (|A||B|) = 174 / (13.75 × 15.13) = 174 / 208.0 = 0.8365. α = arccos(0.8365) = 33.18°.'
  },
  {
    id: 'q_phy101_60',
    topic_id: 'topic_phy101_2',
    text: 'Using dimensional analysis, if centripetal force is given by F = K m^x r^y t^z, determine the powers x, y, and z.',
    a: 'x = 1, y = 1, z = -2',
    b: 'x = 1, y = 2, z = -1',
    c: 'x = 2, y = 1, z = -2',
    d: 'x = 1, y = -1, z = 2',
    correct_option: 'A',
    explanation: '[F] = [M L T⁻²]. [m^x r^y t^z] = M^x L^y T^z. Equating powers: x = 1, y = 1, z = -2. Thus F = K m r / t².'
  },
  {
    id: 'q_phy101_61',
    topic_id: 'topic_phy101_2',
    text: 'If drag force is expressed as F = k ρ^x v^(2y) A^z where ρ is density [ML⁻³], v is speed [LT⁻¹], and A is area [L²], find the exponents x, y, and z.',
    a: 'x = 1, y = 1, z = 1',
    b: 'x = 1, y = 2, z = 1',
    c: 'x = 2, y = 1, z = 2',
    d: 'x = 1, y = 0.5, z = 1',
    correct_option: 'A',
    explanation: '[F] = MLT⁻² = (ML⁻³)^x (LT⁻¹)^(2y) (L²)^z = M^x L^(-3x + 2y + 2z) T^(-2y). From M: x = 1. From T: -2y = -2 => y = 1. From L: -3(1) + 2(1) + 2z = 1 => 2z = 2 => z = 1.'
  },
  {
    id: 'q_phy101_62',
    topic_id: 'topic_phy101_2',
    text: 'Given vectors A = 3i + 4j - 2k and B = 2i - 6j + 3k, find the angle between A and B.',
    a: '90°',
    b: '129.5°',
    c: '145.2°',
    d: '112.0°',
    correct_option: 'B',
    explanation: 'A · B = (3)(2) + (4)(-6) + (-2)(3) = 6 - 24 - 6 = -24. |A| = √(3² + 4² + (-2)²) = √29 ≈ 5.385. |B| = √(2² + (-6)² + 3²) = √49 = 7. cos α = -24 / (7 × √29) = -0.6366 => α = 129.5°.'
  },
  {
    id: 'q_phy101_63',
    topic_id: 'topic_phy101_2',
    text: 'Given C = A + B where C = 2.2i + 3.4j and A = 1.5i - 2.0j, find the magnitude and direction of vector B.',
    a: '|B| = 3.5 units at 45°',
    b: '|B| = 5.45 units at 82.6°',
    c: '|B| = 7.1 units at 60°',
    d: '|B| = 4.2 units at 30°',
    correct_option: 'B',
    explanation: 'B = C - A = (2.2 - 1.5)i + (3.4 - (-2.0))j = 0.7i + 5.4j. |B| = √(0.7² + 5.4²) = √29.65 ≈ 5.45 units. Direction α = arctan(5.4 / 0.7) = 82.6°.'
  },
  {
    id: 'q_phy101_64',
    topic_id: 'topic_phy101_2',
    text: 'What is the cross product A × B for vectors A = 3i + 4j - 2k and B = 2i - 6j + 3k?',
    a: '-13j - 26k',
    b: '-26i - 13j',
    c: '13i + 26j',
    d: '-13i - 26k',
    correct_option: 'A',
    explanation: 'A × B = | i  j  k |\n         | 3  4 -2 |\n         | 2 -6  3 |\n= i[12 - 12] - j[9 - (-4)] + k[-18 - 8] = -13j - 26k.'
  },

  // --- TOPIC 3: Differentiation of vectors; kinematics (topic_phy101_3) ---
  {
    id: 'q_phy101_65',
    topic_id: 'topic_phy101_3',
    text: 'The displacement of a particle moving in a straight line is given by x(t) = 2 + 5t² (meters). What are its average velocity between t = 1 s and t = 2 s, and its instantaneous velocity at t = 3 s?',
    a: '15 m/s and 30 m/s',
    b: '20 m/s and 25 m/s',
    c: '10 m/s and 15 m/s',
    d: '25 m/s and 40 m/s',
    correct_option: 'A',
    explanation: 'x(1) = 7 m, x(2) = 22 m. Average velocity = (22 - 7)/(2 - 1) = 15 m/s. v(t) = dx/dt = 10t. At t = 3 s: v(3) = 10(3) = 30 m/s.'
  },
  {
    id: 'q_phy101_66',
    topic_id: 'topic_phy101_3',
    text: 'The position of a body is given by s(t) = 3t³ + 5t² + 6t - 20 (meters). What is the instantaneous velocity of the body at t = 2 s?',
    a: '50 m/s',
    b: '62 m/s',
    c: '36 m/s',
    d: '88 m/s',
    correct_option: 'B',
    explanation: 'v(t) = ds/dt = 9t² + 10t + 6. At t = 2 s: v(2) = 9(4) + 10(2) + 6 = 36 + 20 + 6 = 62 m/s.'
  },
  {
    id: 'q_phy101_67',
    topic_id: 'topic_phy101_3',
    text: 'The position of a particle is x(t) = 0.75t² + 5t + 1 (m). What is the instantaneous velocity at t = 4 s, and the average velocity between t = 2 s and t = 7 s?',
    a: '11.0 m/s and 11.75 m/s',
    b: '10.0 m/s and 12.5 m/s',
    c: '8.5 m/s and 9.0 m/s',
    d: '14.0 m/s and 15.2 m/s',
    correct_option: 'A',
    explanation: 'v(t) = dx/dt = 1.5t + 5. v(4) = 11 m/s. x(2) = 14 m, x(7) = 72.75 m. v_avg = (72.75 - 14)/(7 - 2) = 58.75 / 5 = 11.75 m/s.'
  },
  {
    id: 'q_phy101_68',
    topic_id: 'topic_phy101_3',
    text: 'A car travels at initial speed u = 30 m/s and decelerates uniformly at a = -2 m/s² until it comes to rest. What is the stopping distance S?',
    a: '150 m',
    b: '225 m',
    c: '300 m',
    d: '180 m',
    correct_option: 'B',
    explanation: 'Using v² = u² + 2aS: 0 = 30² + 2(-2)S => 4S = 900 => S = 225 m.'
  },
  {
    id: 'q_phy101_69',
    topic_id: 'topic_phy101_3',
    text: 'A body moves with initial speed u = 20 m/s. After t = 10 s, its speed decreases to v = 5 m/s under uniform deceleration. What is the distance covered by the body during the 5th second alone?',
    a: '15.0 m',
    b: '13.25 m',
    c: '11.5 m',
    d: '18.0 m',
    correct_option: 'B',
    explanation: 'a = (5 - 20) / 10 = -1.5 m/s². S₄ = 20(4) - 0.75(16) = 68 m. S₅ = 20(5) - 0.75(25) = 81.25 m. Distance in 5th second = S₅ - S₄ = 81.25 - 68 = 13.25 m.'
  },
  {
    id: 'q_phy101_70',
    topic_id: 'topic_phy101_3',
    text: 'A projectile is fired with an initial velocity of 20 m/s at an angle of 30° to the horizontal. Taking g = 10 m/s², what are the maximum height H and the total time of flight T?',
    a: 'H = 5 m, T = 2 s',
    b: 'H = 10 m, T = 4 s',
    c: 'H = 7.5 m, T = 3 s',
    d: 'H = 5 m, T = 4 s',
    correct_option: 'A',
    explanation: 'H = u² sin²(30°) / (2g) = 400(0.25) / 20 = 5 m. T = 2u sin(30°) / g = 2(20)(0.5) / 10 = 2 seconds.'
  },

  // --- TOPIC 4: Newton’s laws of motion; impulse & momentum (topic_phy101_4) ---
  {
    id: 'q_phy101_71',
    topic_id: 'topic_phy101_4',
    text: 'A 1500 kg automobile moving at 20 m/s collides with a stationary 1000 kg truck. If they lock together upon impact, what is the velocity of the wreckage immediately after collision?',
    a: '15.0 m/s',
    b: '12.0 m/s',
    c: '10.0 m/s',
    d: '8.0 m/s',
    correct_option: 'B',
    explanation: 'm₁v₁ + m₂v₂ = (m₁ + m₂) v_f => 1500(20) + 0 = 2500 v_f => v_f = 30000 / 2500 = 12.0 m/s.'
  },
  {
    id: 'q_phy101_72',
    topic_id: 'topic_phy101_4',
    text: 'A rocket of mass 1000 kg ejects fuel at a constant rate of 5 kg/s with an exhaust velocity of 2000 m/s relative to the rocket. What is the thrust force exerted on the rocket?',
    a: '10000 N',
    b: '20000 N',
    c: '5000 N',
    d: '15000 N',
    correct_option: 'A',
    explanation: 'Thrust F = v_rel × (dm/dt) = 2000 m/s × 5 kg/s = 10,000 N.'
  },
  {
    id: 'q_phy101_73',
    topic_id: 'topic_phy101_4',
    text: 'A 0.1 kg baseball traveling horizontally at 40 m/s is struck by a bat and flies straight back at 60 m/s. If the contact time is 0.002 seconds, what is the average force exerted by the bat?',
    a: '2000 N',
    b: '5000 N',
    c: '1000 N',
    d: '4000 N',
    correct_option: 'B',
    explanation: 'Δp = m(v_f - v_i) = 0.1 × (-60 - 40) = -10 N·s. F_avg = |Δp| / Δt = 10 / 0.002 = 5000 N.'
  },
  {
    id: 'q_phy101_74',
    topic_id: 'topic_phy101_4',
    text: 'Two billiard balls of equal mass m undergo a head-on perfectly elastic collision. If ball 1 moves at velocity v and ball 2 is at rest, what are their velocities after the collision?',
    a: 'Ball 1: 0, Ball 2: v',
    b: 'Ball 1: v/2, Ball 2: v/2',
    c: 'Ball 1: -v, Ball 2: v',
    d: 'Ball 1: v, Ball 2: 0',
    correct_option: 'A',
    explanation: 'In a 1D elastic collision between identical masses, the colliding bodies completely exchange their velocities: ball 1 stops (0) and ball 2 moves forward with velocity v.'
  },
  {
    id: 'q_phy101_75',
    topic_id: 'topic_phy101_4',
    text: 'A helicopter of mass M hovers stationary in air. If the downward speed imparted to air of density ρ by rotor blades of area A is v, the upward thrust balancing the weight Mg is:',
    a: 'ρ A v',
    b: 'ρ A v²',
    c: '1/2 ρ A v²',
    d: 'ρ A² v',
    correct_option: 'B',
    explanation: 'Mass flow rate dm/dt = ρ A v. Momentum imparted per second = (dm/dt) v = ρ A v². For hovering equilibrium, Mg = ρ A v².'
  },

  // --- TOPIC 5: Applications of Newtonian mechanics (topic_phy101_5) ---
  {
    id: 'q_phy101_76',
    topic_id: 'topic_phy101_5',
    text: 'Two masses m₁ = 6 kg and m₂ = 4 kg are connected by a light string over a frictionless pulley (Atwood machine). Taking g = 10 m/s², what is the acceleration of the masses?',
    a: '1.0 m/s²',
    b: '2.0 m/s²',
    c: '2.5 m/s²',
    d: '5.0 m/s²',
    correct_option: 'B',
    explanation: 'Acceleration a = (m₁ - m₂) g / (m₁ + m₂) = (6 - 4)(10) / (6 + 4) = 20 / 10 = 2.0 m/s².'
  },
  {
    id: 'q_phy101_77',
    topic_id: 'topic_phy101_5',
    text: 'In an Atwood machine with masses m₁ = 6 kg and m₂ = 4 kg and g = 10 m/s², what is the tension in the connecting string?',
    a: '40 N',
    b: '48 N',
    c: '60 N',
    d: '24 N',
    correct_option: 'B',
    explanation: 'Tension T = 2 m₁ m₂ g / (m₁ + m₂) = 2(6)(4)(10) / (6 + 4) = 480 / 10 = 48 N.'
  },
  {
    id: 'q_phy101_78',
    topic_id: 'topic_phy101_5',
    text: 'A 50 kg crate rests on an incline of 37°. If the crate remains stationary, what is the static frictional force exerted by the incline? (Take g = 10 m/s², sin 37° = 0.6, cos 37° = 0.8)',
    a: '400 N',
    b: '300 N',
    c: '250 N',
    d: '500 N',
    correct_option: 'B',
    explanation: 'For static equilibrium along the incline: f_s = mg sin(37°) = 50 × 10 × 0.6 = 300 N.'
  },
  {
    id: 'q_phy101_79',
    topic_id: 'topic_phy101_5',
    text: 'A person of mass 60 kg rides a roller coaster. At the bottom of a vertical circular dip of radius 20 m, the car moves at 20 m/s. What normal force does the seat exert on the rider? (Take g = 10 m/s²)',
    a: '600 N',
    b: '1800 N',
    c: '1200 N',
    d: '2400 N',
    correct_option: 'B',
    explanation: 'At bottom of dip: N - mg = m v² / r => N = m(g + v²/r) = 60(10 + 400/20) = 60(30) = 1800 N.'
  },
  {
    id: 'q_phy101_80',
    topic_id: 'topic_phy101_5',
    text: 'A 1000 kg elevator descends with a downward acceleration of 3 m/s². Taking g = 9.8 m/s², what is the tension in the supporting cable?',
    a: '9800 N',
    b: '6800 N',
    c: '12800 N',
    d: '7000 N',
    correct_option: 'B',
    explanation: 'Downward acceleration: mg - T = ma => T = m(g - a) = 1000 × (9.8 - 3.0) = 6800 N.'
  },

  // --- TOPIC 6: Conservation principles; work & energy; centre of mass (topic_phy101_6) ---
  {
    id: 'q_phy101_81',
    topic_id: 'topic_phy101_6',
    text: 'A spring with spring constant k = 200 N/m is compressed by 0.10 m from its equilibrium position. What is the elastic potential energy stored in the spring?',
    a: '2.0 J',
    b: '1.0 J',
    c: '0.5 J',
    d: '4.0 J',
    correct_option: 'B',
    explanation: 'U_s = 1/2 k x² = 0.5 × 200 × (0.10)² = 100 × 0.01 = 1.0 Joule.'
  },
  {
    id: 'q_phy101_82',
    topic_id: 'topic_phy101_6',
    text: 'A 2 kg block slides down a rough incline from a vertical height of 5 m. At the bottom of the incline, its speed is 8 m/s. Taking g = 10 m/s², how much thermal energy was generated by friction?',
    a: '100 J',
    b: '36 J',
    c: '64 J',
    d: '20 J',
    correct_option: 'B',
    explanation: 'U_i = mgh = 2 × 10 × 5 = 100 J. K_f = 1/2 m v² = 0.5 × 2 × 64 = 64 J. Energy lost to friction = 100 - 64 = 36 Joules.'
  },
  {
    id: 'q_phy101_83',
    topic_id: 'topic_phy101_6',
    text: 'Four particles of masses 1 kg, 1 kg, 2 kg, and 2 kg are placed at the vertices (0,0), (2,0), (2,2), and (0,2) of a square of side 2 m. What are the coordinates of their centre of mass?',
    a: '(1.0 m, 1.0 m)',
    b: '(1.0 m, 1.33 m)',
    c: '(1.33 m, 1.0 m)',
    d: '(0.67 m, 1.33 m)',
    correct_option: 'B',
    explanation: 'M = 6 kg. x_cm = (1×0 + 1×2 + 2×2 + 2×0)/6 = 6/6 = 1.0 m. y_cm = (1×0 + 1×0 + 2×2 + 2×2)/6 = 8/6 = 1.33 m.'
  },
  {
    id: 'q_phy101_84',
    topic_id: 'topic_phy101_6',
    text: 'The force acting on a particle moving along the x-axis is F(x) = 6x - 2 (in Newtons). What is the work done by this force as the particle moves from x = 1 m to x = 3 m?',
    a: '20 J',
    b: '24 J',
    c: '16 J',
    d: '32 J',
    correct_option: 'A',
    explanation: 'W = ∫₁³ (6x - 2) dx = [3x² - 2x]₁³ = (27 - 6) - (3 - 2) = 21 - 1 = 20 Joules.'
  },
  {
    id: 'q_phy101_85',
    topic_id: 'topic_phy101_6',
    text: 'An electric motor lifts an elevator of mass 800 kg through a vertical height of 30 m in 20 seconds at constant speed. Taking g = 10 m/s², what average power is delivered by the motor?',
    a: '24 kW',
    b: '12 kW',
    c: '6 kW',
    d: '48 kW',
    correct_option: 'B',
    explanation: 'Work W = mgh = 800 × 10 × 30 = 240,000 J. P_avg = W / t = 240,000 / 20 = 12,000 W = 12 kW.'
  },

  // --- TOPIC 7: Rotational motion; torque; angular momentum (topic_phy101_7) ---
  {
    id: 'q_phy101_86',
    topic_id: 'topic_phy101_7',
    text: 'A flywheel initially rotating at 120 rev/min slows down uniformly to 60 rev/min in 10 seconds. What is the magnitude of its angular deceleration?',
    a: '0.63 rad/s²',
    b: '1.26 rad/s²',
    c: '6.28 rad/s²',
    d: '2.50 rad/s²',
    correct_option: 'A',
    explanation: 'ω₀ = 120 × (2π/60) = 4π rad/s. ω = 60 × (2π/60) = 2π rad/s. α = (4π - 2π)/10 = 0.2π ≈ 0.628 rad/s².'
  },
  {
    id: 'q_phy101_87',
    topic_id: 'topic_phy101_7',
    text: 'A solid cylinder of mass M and radius R rolls without slipping down an inclined plane of height h. What is the translational speed of the cylinder at the bottom?',
    a: '√(2gh)',
    b: '√(4/3 gh)',
    c: '√(gh)',
    d: '√(3/2 gh)',
    correct_option: 'B',
    explanation: 'Mgh = 1/2 M v² + 1/2 I ω². With I = 1/2 M R²: Mgh = 3/4 M v² => v = √(4/3 gh).'
  },
  {
    id: 'q_phy101_88',
    topic_id: 'topic_phy101_7',
    text: 'An ice skater spinning with her arms outstretched has moment of inertia I₁ = 3.0 kg·m² and rotates at 2.0 rev/s. When she pulls her arms in, her moment of inertia reduces to I₂ = 1.0 kg·m². What is her new rotational speed?',
    a: '3.0 rev/s',
    b: '6.0 rev/s',
    c: '4.0 rev/s',
    d: '9.0 rev/s',
    correct_option: 'B',
    explanation: 'By conservation of angular momentum: I₁ ω₁ = I₂ ω₂ => 3.0 × 2.0 = 1.0 × ω₂ => ω₂ = 6.0 rev/s.'
  },
  {
    id: 'q_phy101_89',
    topic_id: 'topic_phy101_7',
    text: 'A torque of 50 Nm is applied to a grinding wheel with moment of inertia I = 2.5 kg·m² initially at rest. What is its angular velocity after 4.0 seconds?',
    a: '40 rad/s',
    b: '80 rad/s',
    c: '20 rad/s',
    d: '100 rad/s',
    correct_option: 'B',
    explanation: 'α = τ / I = 50 / 2.5 = 20 rad/s². ω = α t = 20 × 4 = 80 rad/s.'
  },
  {
    id: 'q_phy101_90',
    topic_id: 'topic_phy101_7',
    text: 'What is the rotational kinetic energy of a wheel of moment of inertia 4.0 kg·m² rotating at a uniform angular speed of 15 rad/s?',
    a: '300 J',
    b: '450 J',
    c: '900 J',
    d: '600 J',
    correct_option: 'B',
    explanation: 'K_rot = 1/2 I ω² = 0.5 × 4.0 × (15)² = 2 × 225 = 450 Joules.'
  },

  // --- TOPIC 8: Polar coordinates; circular motion; moments of inertia (topic_phy101_8) ---
  {
    id: 'q_phy101_91',
    topic_id: 'topic_phy101_8',
    text: 'A thin uniform rod of length L and mass M has moment of inertia I_cm = (1/12) M L² about an axis through its centre perpendicular to its length. What is its moment of inertia about a parallel axis passing through one of its ends?',
    a: '1/3 M L²',
    b: '1/4 M L²',
    c: '1/2 M L²',
    d: '7/12 M L²',
    correct_option: 'A',
    explanation: 'Parallel axis theorem: I = I_cm + M(L/2)² = (1/12 + 1/4) M L² = 1/3 M L².'
  },
  {
    id: 'q_phy101_92',
    topic_id: 'topic_phy101_8',
    text: 'A car travels around a flat, unbanked circular curve of radius 50 m. If the coefficient of static friction between tires and road is μ_s = 0.5, what is the maximum speed without skidding? (Take g = 9.8 m/s²)',
    a: '12.5 m/s',
    b: '15.65 m/s',
    c: '20.0 m/s',
    d: '9.8 m/s',
    correct_option: 'B',
    explanation: 'v_max = √(μ_s g r) = √(0.5 × 9.8 × 50) = √245 ≈ 15.65 m/s.'
  },
  {
    id: 'q_phy101_93',
    topic_id: 'topic_phy101_8',
    text: 'At what angle θ should a road curve of radius 100 m be banked so that a car traveling at 20 m/s can negotiate the turn without relying on friction? (Take g = 10 m/s²)',
    a: 'tan θ = 0.2',
    b: 'tan θ = 0.4',
    c: 'tan θ = 0.5',
    d: 'tan θ = 0.8',
    correct_option: 'B',
    explanation: 'tan θ = v² / (g r) = 20² / (10 × 100) = 400 / 1000 = 0.4.'
  },
  {
    id: 'q_phy101_94',
    topic_id: 'topic_phy101_8',
    text: 'What is the moment of inertia of a uniform thin hoop (ring) of mass M and radius R about its central symmetry axis?',
    a: '1/2 M R²',
    b: 'M R²',
    c: '2/5 M R²',
    d: '2/3 M R²',
    correct_option: 'B',
    explanation: 'All elements of mass on the thin hoop are at distance R from the central axis. Thus I = M R².'
  },
  {
    id: 'q_phy101_95',
    topic_id: 'topic_phy101_8',
    text: 'A particle moves in a plane with polar coordinates r(t) and θ(t). What is the expression for the radial component of acceleration a_r?',
    a: 'a_r = d²r/dt² - r (dθ/dt)²',
    b: 'a_r = d²r/dt² + r (dθ/dt)²',
    c: 'a_r = r d²θ/dt²',
    d: 'a_r = 2 (dr/dt)(dθ/dt)',
    correct_option: 'A',
    explanation: 'In plane polar coordinates: a_r = r̈ - r θ̇² = d²r/dt² - r (dθ/dt)².'
  },

  // --- TOPIC 9: Gravitation; Kepler’s laws; satellite motion (topic_phy101_9) ---
  {
    id: 'q_phy101_96',
    topic_id: 'topic_phy101_9',
    text: 'A communications satellite is in geostationary orbit around the Earth. What is the orbital period T of a geostationary satellite?',
    a: '12 hours',
    b: '24 hours (1 sidereal day)',
    c: '48 hours',
    d: '90 minutes',
    correct_option: 'B',
    explanation: "A geostationary satellite matches Earth's rotation period of approximately 24 hours so it remains fixed over the same point on Earth."
  },
  {
    id: 'q_phy101_97',
    topic_id: 'topic_phy101_9',
    text: 'If the distance between the Earth and the Sun were doubled, what would the new gravitational force between them be compared to the original force F?',
    a: '2 F',
    b: 'F / 4',
    c: 'F / 2',
    d: '4 F',
    correct_option: 'B',
    explanation: 'F ∝ 1 / r². If distance doubles to 2r, F_new = F / 2² = F / 4.'
  },
  {
    id: 'q_phy101_98',
    topic_id: 'topic_phy101_9',
    text: 'What is the gravitational potential energy U of two point masses m₁ and m₂ separated by a distance r in space (taking U = 0 at r → ∞)?',
    a: 'U = -G m₁ m₂ / r',
    b: 'U = +G m₁ m₂ / r',
    c: 'U = -G m₁ m₂ / r²',
    d: 'U = -1/2 G m₁ m₂ / r',
    correct_option: 'A',
    explanation: 'Because gravity is an attractive conservative force, gravitational potential energy with reference U(∞) = 0 is U = -G m₁ m₂ / r.'
  },
  {
    id: 'q_phy101_99',
    topic_id: 'topic_phy101_9',
    text: 'A satellite is in a low Earth orbit at an altitude of 300 km where r ≈ 6.67 × 10⁶ m. Given G = 6.67 × 10⁻¹¹ N·m²/kg² and M_E = 6.0 × 10²⁴ kg, calculate the orbital speed v_o.',
    a: '11.2 km/s',
    b: '7.75 km/s',
    c: '5.50 km/s',
    d: '9.80 km/s',
    correct_option: 'B',
    explanation: 'v_o = √(GM/r) = √[(6.67 × 10⁻¹¹ × 6.0 × 10²⁴) / (6.67 × 10⁶)] = √(6.0 × 10⁷) ≈ 7746 m/s ≈ 7.75 km/s.'
  },
  {
    id: 'q_phy101_100',
    topic_id: 'topic_phy101_9',
    text: 'Planet X has twice the mass of Earth (M_X = 2 M_E) and half the radius of Earth (R_X = 0.5 R_E). What is the escape velocity from Planet X compared to Earth’s escape velocity v_e?',
    a: 'v_e,X = v_e',
    b: 'v_e,X = 2 v_e',
    c: 'v_e,X = 4 v_e',
    d: 'v_e,X = √2 v_e',
    correct_option: 'B',
    explanation: 'v_e = √(2GM/R). For Planet X: v_e,X = √[2G(2M) / (0.5 R)] = √[4 × (2GM/R)] = 2 √(2GM/R) = 2 v_e.'
  },
  {
    id: 'q_phy101_101',
    topic_id: 'topic_phy101_9',
    text: 'Kepler’s Second Law of Planetary Motion (the Law of Equal Areas) is a direct consequence of the conservation of which physical quantity?',
    a: 'Linear momentum',
    b: 'Angular momentum',
    c: 'Total mechanical energy',
    d: 'Gravitational potential',
    correct_option: 'B',
    explanation: 'Because gravitational force is a central force, the net external torque about the Sun is zero (τ = r × F = 0). Therefore, angular momentum L is conserved, ensuring constant areal velocity dA/dt = L / (2m).'
  }
];

const insertStmt = db.prepare(`
  INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    topic_id = excluded.topic_id,
    text = excluded.text,
    a = excluded.a,
    b = excluded.b,
    c = excluded.c,
    d = excluded.d,
    correct_option = excluded.correct_option,
    explanation = excluded.explanation
`);

let inserted = 0;
for (const q of additionalQuestions) {
  insertStmt.run(q.id, q.topic_id, q.text, q.a, q.b, q.c, q.d, q.correct_option, q.explanation);
  inserted++;
}

console.log(`Successfully ingested ${inserted} additional PHY 101 questions!`);
const total = db.prepare(`SELECT count(*) as count FROM questions WHERE topic_id LIKE 'topic_phy101_%'`).get();
console.log('Total PHY 101 questions now in database:', total.count);
