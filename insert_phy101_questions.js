/**
 * Ingestion script for PHY 101 question bank
 * Extracts, verifies, and populates questions with options and step-by-step solutions
 * categorized across all 9 PHY 101 topics.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, 'premed_portal.sqlite');
const db = new DatabaseSync(dbPath);

const questions = [
  // --- TOPIC 1: Space and time (topic_phy101_1) ---
  {
    id: 'q_phy101_01',
    topic_id: 'topic_phy101_1',
    text: 'A particle travels at a constant speed of 6 m/s. Which of the following statements best describes its motion in space and time?',
    a: 'The particle covers an acceleration of 6 m/s² every second',
    b: 'The particle travels a distance of 6 meters during every 1 second interval',
    c: 'The particle changes direction by 6 radians every second',
    d: 'The particle remains in a fixed position in space',
    correct_option: 'B',
    explanation: 'By definition, a constant speed of 6 m/s means the distance traveled per unit time is uniform, covering exactly 6 meters in each 1-second interval without change in rate.'
  },
  {
    id: 'q_phy101_02',
    topic_id: 'topic_phy101_1',
    text: 'A car travels 4 km East, stops, and then travels 7 km West. What are the total distance covered and the net displacement from the initial position in space?',
    a: 'Distance = 11 km, Displacement = 3 km West',
    b: 'Distance = 3 km, Displacement = 11 km East',
    c: 'Distance = 11 km, Displacement = 3 km East',
    d: 'Distance = 7 km, Displacement = 4 km West',
    correct_option: 'A',
    explanation: 'Total distance is the scalar sum of path lengths: 4 km + 7 km = 11 km. Displacement is the vector sum taking East as positive: +4 km + (-7 km) = -3 km, which is 3 km West.'
  },
  {
    id: 'q_phy101_03',
    topic_id: 'topic_phy101_1',
    text: 'A commuter walks 3 km North and then 4 km East. What is the magnitude of the displacement vector and the compass direction from the starting point?',
    a: '7 km, 45° North of East',
    b: '5 km, 36.9° North of East',
    c: '5 km, 53.1° North of East',
    d: '1 km, 30° East of North',
    correct_option: 'B',
    explanation: 'Displacement magnitude r = √(3² + 4²) = √(9 + 16) = √25 = 5 km. Angle with East (x-axis) is θ = arctan(3/4) = 36.87° North of East.'
  },
  {
    id: 'q_phy101_04',
    topic_id: 'topic_phy101_1',
    text: 'A body moving at a steady velocity of 50 km/h travels for a duration of 30 minutes. What is the distance covered in space?',
    a: '100 km',
    b: '25 km',
    c: '15 km',
    d: '1500 km',
    correct_option: 'B',
    explanation: 'Time t = 30 minutes = 0.5 hours. Distance = velocity × time = 50 km/h × 0.5 h = 25 km.'
  },
  {
    id: 'q_phy101_05',
    topic_id: 'topic_phy101_1',
    text: 'Which of the following physical quantities represents the rate of change of position of an object with respect to time in a specified direction?',
    a: 'Instantaneous Speed',
    b: 'Velocity',
    c: 'Scalar distance',
    d: 'Acceleration',
    correct_option: 'B',
    explanation: 'Velocity is defined as the vector rate of change of displacement (position) with respect to time: v = dr/dt, specifying both magnitude and spatial direction.'
  },
  {
    id: 'q_phy101_06',
    topic_id: 'topic_phy101_1',
    text: 'A cyclist travels 180 meters along a straight track in 20 seconds. What is the average speed of the cyclist?',
    a: '9.0 m/s',
    b: '18.0 m/s',
    c: '3.6 m/s',
    d: '90 m/s',
    correct_option: 'A',
    explanation: 'Average speed = Total distance / Total time = 180 m / 20 s = 9.0 m/s.'
  },

  // --- TOPIC 2: Units and dimensions; vectors and scalars (topic_phy101_2) ---
  {
    id: 'q_phy101_07',
    topic_id: 'topic_phy101_2',
    text: 'Given vectors A = 2i + 4j - 5k and B = -i + λj + 3k, find the value of λ such that A and B are perpendicular (orthogonal).',
    a: 'λ = 3.5',
    b: 'λ = 4.25',
    c: 'λ = 2.0',
    d: 'λ = -4.25',
    correct_option: 'B',
    explanation: 'Two vectors are perpendicular if their dot product A · B = 0.\nA · B = (2)(-1) + (4)(λ) + (-5)(3) = -2 + 4λ - 15 = 4λ - 17 = 0.\n4λ = 17 => λ = 17/4 = 4.25.'
  },
  {
    id: 'q_phy101_08',
    topic_id: 'topic_phy101_2',
    text: 'What are the dimensions of the product of Force and Angular Momentum?',
    a: '[M L T⁻¹]',
    b: '[M² L³ T⁻³]',
    c: '[M² L² T⁻²]',
    d: '[M L² T⁻³]',
    correct_option: 'B',
    explanation: 'Dimension of Force = [M L T⁻²]. Angular momentum L = r × p has dimension [L] × [M L T⁻¹] = [M L² T⁻¹].\nProduct = [M L T⁻²] × [M L² T⁻¹] = [M² L³ T⁻³].'
  },
  {
    id: 'q_phy101_09',
    topic_id: 'topic_phy101_2',
    text: 'Which of the following pairs have the same physical dimensions?',
    a: 'Work and Torque',
    b: 'Force and Impulse',
    c: "Planck's constant and Linear momentum",
    d: 'Pressure and Force',
    correct_option: 'A',
    explanation: 'Work = Force × distance = [M L² T⁻²]. Torque = Force × perpendicular lever arm = [M L² T⁻²]. Both have dimensions of [M L² T⁻²].'
  },
  {
    id: 'q_phy101_10',
    topic_id: 'topic_phy101_2',
    text: 'Which of the following is a pure scalar quantity?',
    a: 'Electric field',
    b: 'Altitude',
    c: 'Gravitational force',
    d: 'Linear momentum',
    correct_option: 'B',
    explanation: 'Altitude is the vertical distance or elevation above sea level, requiring only a numerical value and unit (magnitude alone), making it a scalar. Electric field, force, and momentum are vector quantities with specific spatial directions.'
  },
  {
    id: 'q_phy101_11',
    topic_id: 'topic_phy101_2',
    text: 'The SI unit of impulse is N·s. Which of the following expresses this unit in base SI units?',
    a: 'kg·m·s⁻²',
    b: 'kg·m·s⁻¹',
    c: 'kg·m²·s⁻¹',
    d: 'kg·m⁻¹·s⁻¹',
    correct_option: 'B',
    explanation: '1 N = 1 kg·m/s² = kg·m·s⁻². Therefore, N·s = (kg·m·s⁻²) × s = kg·m·s⁻¹.'
  },
  {
    id: 'q_phy101_12',
    topic_id: 'topic_phy101_2',
    text: 'Find the cross product A × B for vectors A = 2i - 3j + k and B = i + 2j - 4k.',
    a: '10i + 9j + 7k',
    b: '10i - 9j + 7k',
    c: '5i + 9j - 7k',
    d: '14i + 7j + k',
    correct_option: 'A',
    explanation: 'A × B = | i  j  k |\n         | 2 -3  1 |\n         | 1  2 -4 |\n= i[(-3)(-4) - (1)(2)] - j[(2)(-4) - (1)(1)] + k[(2)(2) - (-3)(1)]\n= i[12 - 2] - j[-8 - 1] + k[4 + 3]\n= 10i + 9j + 7k.'
  },
  {
    id: 'q_phy101_13',
    topic_id: 'topic_phy101_2',
    text: 'Two vectors have magnitudes 6 units and 8 units, and the angle between them is 90°. What is the magnitude of their vector sum?',
    a: '14 units',
    b: '2 units',
    c: '10 units',
    d: '48 units',
    correct_option: 'C',
    explanation: 'For perpendicular vectors, R = √(A² + B²) = √(6² + 8²) = √(36 + 64) = √100 = 10 units.'
  },

  // --- TOPIC 3: Differentiation of vectors; displacement, velocity, acceleration; kinematics (topic_phy101_3) ---
  {
    id: 'q_phy101_14',
    topic_id: 'topic_phy101_3',
    text: 'The acceleration of a particle moving along a straight line is given by a(t) = -2 + 3t² (m/s²). If its initial velocity at t = 0 is v(0) = 1 m/s, what is its velocity at t = 1 s?',
    a: '0 m/s',
    b: '2 m/s',
    c: '-1 m/s',
    d: '3 m/s',
    correct_option: 'A',
    explanation: 'v(t) = ∫ a(t) dt = ∫ (-2 + 3t²) dt = -2t + t³ + C.\nAt t = 0, v(0) = C = 1 m/s.\nThus, v(t) = -2t + t³ + 1.\nAt t = 1 s: v(1) = -2(1) + 1³ + 1 = -2 + 1 + 1 = 0 m/s.'
  },
  {
    id: 'q_phy101_15',
    topic_id: 'topic_phy101_3',
    text: 'A stone is thrown vertically upward with an initial velocity of 20 m/s (taking g = 10 m/s²). What is the maximum height attained and the time taken to reach it?',
    a: 'Height = 20 m, Time = 2 s',
    b: 'Height = 40 m, Time = 4 s',
    c: 'Height = 15 m, Time = 1.5 s',
    d: 'Height = 20 m, Time = 4 s',
    correct_option: 'A',
    explanation: 'At maximum height, v = 0. Using v = u - gt: 0 = 20 - 10t => t = 2 s.\nUsing h = u² / (2g) = 20² / (2 × 10) = 400 / 20 = 20 meters.'
  },
  {
    id: 'q_phy101_16',
    topic_id: 'topic_phy101_3',
    text: 'A boat heads directly across a river with a speed of 4 m/s relative to the water. The river flows at 3 m/s parallel to the banks. What is the resultant speed of the boat relative to the shore?',
    a: '7 m/s',
    b: '1 m/s',
    c: '5 m/s',
    d: '12 m/s',
    correct_option: 'C',
    explanation: 'The velocity components are perpendicular: v_x = 3 m/s (river flow), v_y = 4 m/s (boat crossing).\nResultant speed v = √(v_x² + v_y²) = √(3² + 4²) = √25 = 5 m/s.'
  },
  {
    id: 'q_phy101_17',
    topic_id: 'topic_phy101_3',
    text: 'A projectile is launched with an initial velocity of 50 m/s at an angle of 30° above the horizontal. What is the magnitude of its velocity at t = 1.0 s? (Take g = 9.8 m/s²)',
    a: '43.3 m/s',
    b: '45.9 m/s',
    c: '50.0 m/s',
    d: '25.0 m/s',
    correct_option: 'B',
    explanation: 'v_x = u cos(30°) = 50 × (√3/2) = 43.30 m/s (remains constant).\nv_y = u sin(30°) - gt = 50(0.5) - 9.8(1) = 25 - 9.8 = 15.2 m/s.\nResultant velocity v = √(v_x² + v_y²) = √(43.30² + 15.2²) = √(1875 + 231) = √2106 ≈ 45.89 m/s.'
  },
  {
    id: 'q_phy101_18',
    topic_id: 'topic_phy101_3',
    text: 'What does the slope (gradient) of a velocity-time graph represent?',
    a: 'Displacement',
    b: 'Instantaneous Acceleration',
    c: 'Total distance',
    d: 'Work done',
    correct_option: 'B',
    explanation: 'The slope of a velocity-time graph is defined as dv/dt, which represents the acceleration of the body.'
  },
  {
    id: 'q_phy101_19',
    topic_id: 'topic_phy101_3',
    text: 'An electron enters a uniform electric field horizontally with velocity 2 × 10⁷ m/s. It travels 0.10 m horizontally while undergoing vertical acceleration. How long does the electron spend in the field?',
    a: '5.0 × 10⁻⁹ s',
    b: '2.0 × 10⁻⁸ s',
    c: '1.0 × 10⁻⁶ s',
    d: '5.0 × 10⁻⁷ s',
    correct_option: 'A',
    explanation: 'Horizontal motion has no acceleration, so t = x / v_x = 0.10 m / (2 × 10⁷ m/s) = 5.0 × 10⁻⁹ seconds.'
  },

  // --- TOPIC 4: Newton’s laws of motion; inertial frames; impulse; momentum conservation; relative motion (topic_phy101_4) ---
  {
    id: 'q_phy101_20',
    topic_id: 'topic_phy101_4',
    text: "Which of the following statements is INCORRECT regarding Newton's Third Law of Motion?",
    a: 'Action and reaction forces act on different interacting bodies',
    b: 'Action and reaction forces are equal in magnitude and opposite in direction',
    c: 'Action and reaction forces cancel each other out to produce static equilibrium on a single body',
    d: 'Action and reaction forces occur simultaneously',
    correct_option: 'C',
    explanation: 'Action and reaction forces act on DIFFERENT bodies, so they never cancel each other out on a single body to produce equilibrium.'
  },
  {
    id: 'q_phy101_21',
    topic_id: 'topic_phy101_4',
    text: 'A 0.5 kg rubber ball moving at 10 m/s collides normally with a solid wall and rebounds in the opposite direction at 8 m/s. What is the magnitude of the impulse exerted by the wall on the ball?',
    a: '1.0 N·s',
    b: '9.0 N·s',
    c: '4.0 N·s',
    d: '18.0 N·s',
    correct_option: 'B',
    explanation: 'Taking initial velocity direction as positive: v_i = +10 m/s, v_f = -8 m/s.\nImpulse J = Δp = m(v_f - v_i) = 0.5 × (-8 - 10) = 0.5 × (-18) = -9 N·s.\nMagnitude = 9.0 N·s.'
  },
  {
    id: 'q_phy101_22',
    topic_id: 'topic_phy101_4',
    text: 'A sprinter of mass 75 kg starts from rest and accelerates out of the blocks at 17 m/s². What horizontal force must the blocks exert on the sprinter?',
    a: '1275 N',
    b: '4.4 N',
    c: '750 N',
    d: '2550 N',
    correct_option: 'A',
    explanation: "Using Newton's Second Law: F = m × a = 75 kg × 17 m/s² = 1275 N."
  },
  {
    id: 'q_phy101_23',
    topic_id: 'topic_phy101_4',
    text: 'A 2.8 g bullet traveling at 500 m/s strikes a wooden barrier and emerges with a velocity of 200 m/s. What is the total energy transferred (lost as work) to the barrier?',
    a: '294 J',
    b: '588 J',
    c: '140 J',
    d: '700 J',
    correct_option: 'A',
    explanation: 'Mass m = 2.8 g = 0.0028 kg.\nΔK = 1/2 m (v_i² - v_f²) = 1/2 × 0.0028 × (500² - 200²)\n= 0.0014 × (250000 - 40000) = 0.0014 × 210000 = 294 Joules.'
  },
  {
    id: 'q_phy101_24',
    topic_id: 'topic_phy101_4',
    text: 'In a completely inelastic collision between two bodies moving in an isolated system, which of the following quantities is conserved?',
    a: 'Kinetic energy only',
    b: 'Total mechanical energy only',
    c: 'Linear momentum only',
    d: 'Neither momentum nor kinetic energy',
    correct_option: 'C',
    explanation: 'In all collisions in isolated systems, total linear momentum is strictly conserved. In an inelastic collision, kinetic energy is NOT conserved because part of it transforms into thermal, sound, or deformation energy.'
  },
  {
    id: 'q_phy101_25',
    topic_id: 'topic_phy101_4',
    text: 'A 3 kg glider moving at 2 m/s collides head-on and sticks to a 1 kg glider initially at rest on a frictionless air track. What is the common final velocity of the gliders?',
    a: '2.0 m/s',
    b: '1.5 m/s',
    c: '0.5 m/s',
    d: '3.0 m/s',
    correct_option: 'B',
    explanation: 'By conservation of linear momentum: m₁v₁ + m₂v₂ = (m₁ + m₂)v_f.\n(3 × 2) + (1 × 0) = (3 + 1) v_f\n6 = 4 v_f => v_f = 6 / 4 = 1.5 m/s.'
  },

  // --- TOPIC 5: Applications of Newtonian mechanics; equations of motion (topic_phy101_5) ---
  {
    id: 'q_phy101_26',
    topic_id: 'topic_phy101_5',
    text: 'A block of mass 10 kg sits on a horizontal surface where the coefficient of kinetic friction is μ_k = 0.25. A horizontal pulling force of 45 N is applied. Taking g = 10 m/s², what is the acceleration of the block?',
    a: '4.5 m/s²',
    b: '2.0 m/s²',
    c: '2.5 m/s²',
    d: '0.5 m/s²',
    correct_option: 'B',
    explanation: 'Normal force N = mg = 10 × 10 = 100 N.\nFriction force f_k = μ_k N = 0.25 × 100 = 25 N.\nNet force F_net = F_pull - f_k = 45 - 25 = 20 N.\nAcceleration a = F_net / m = 20 / 10 = 2.0 m/s².'
  },
  {
    id: 'q_phy101_27',
    topic_id: 'topic_phy101_5',
    text: 'A man of mass 70 kg stands on a bathroom scale inside an elevator. What does the scale read (apparent weight) when the elevator accelerates upward at 2 m/s²? (Take g = 9.8 m/s²)',
    a: '686 N',
    b: '546 N',
    c: '826 N',
    d: '140 N',
    correct_option: 'C',
    explanation: 'For an upward accelerating elevator: N - mg = ma => N = m(g + a).\nN = 70 × (9.8 + 2.0) = 70 × 11.8 = 826 N.'
  },
  {
    id: 'q_phy101_28',
    topic_id: 'topic_phy101_5',
    text: 'What are the two necessary and sufficient conditions for a rigid body to be in complete mechanical equilibrium?',
    a: 'Zero net force only',
    b: 'Zero net torque only',
    c: 'Vector sum of all external forces is zero (∑F = 0) AND vector sum of all external torques is zero (∑τ = 0)',
    d: 'Constant non-zero acceleration and zero angular velocity',
    correct_option: 'C',
    explanation: 'Translational equilibrium requires ∑F = 0, and rotational equilibrium requires ∑τ = 0. Both conditions must be satisfied simultaneously for complete mechanical equilibrium.'
  },
  {
    id: 'q_phy101_29',
    topic_id: 'topic_phy101_5',
    text: 'A box of mass 20 kg slides down a 30° frictionless inclined plane. Taking g = 9.8 m/s², what is the acceleration of the box along the plane?',
    a: '9.8 m/s²',
    b: '4.9 m/s²',
    c: '8.5 m/s²',
    d: '2.45 m/s²',
    correct_option: 'B',
    explanation: 'The component of gravity parallel to the incline is F_parallel = mg sin(θ).\nAcceleration a = F_parallel / m = g sin(θ) = 9.8 × sin(30°) = 9.8 × 0.5 = 4.9 m/s².'
  },
  {
    id: 'q_phy101_30',
    topic_id: 'topic_phy101_5',
    text: 'A car traveling at 20 m/s applies its brakes and comes to a complete halt over a distance of 40 meters. What was the deceleration (magnitude of acceleration)?',
    a: '10 m/s²',
    b: '5 m/s²',
    c: '2.5 m/s²',
    d: '8 m/s²',
    correct_option: 'B',
    explanation: 'Using v² = u² + 2as with v = 0: 0 = 20² + 2a(40) => 0 = 400 + 80a => a = -400 / 80 = -5 m/s².\nMagnitude of deceleration = 5 m/s².'
  },

  // --- TOPIC 6: Conservation principles; conservative forces; energy, work; centre of mass (topic_phy101_6) ---
  {
    id: 'q_phy101_31',
    topic_id: 'topic_phy101_6',
    text: 'Three particles of masses 1 kg, 2 kg, and 3 kg are positioned along the x-axis at coordinates x = 0 m, x = 2 m, and x = 4 m respectively. What is the x-coordinate of the centre of mass?',
    a: '2.00 m',
    b: '2.67 m',
    c: '3.00 m',
    d: '1.67 m',
    correct_option: 'B',
    explanation: 'x_cm = (m₁x₁ + m₂x₂ + m₃x₃) / (m₁ + m₂ + m₃)\n= (1×0 + 2×2 + 3×4) / (1 + 2 + 3) = (0 + 4 + 12) / 6 = 16 / 6 = 2.67 meters.'
  },
  {
    id: 'q_phy101_32',
    topic_id: 'topic_phy101_6',
    text: 'A simple pendulum of length L = 1.0 m with a bob of mass m = 0.2 kg is released from an angle θ = 60° to the vertical. Taking g = 9.8 m/s², what is the potential energy stored at this angle relative to the lowest point?',
    a: '1.96 J',
    b: '0.98 J',
    c: '0.49 J',
    d: '1.70 J',
    correct_option: 'B',
    explanation: 'Height h = L(1 - cos θ) = 1.0(1 - cos 60°) = 1.0(1 - 0.5) = 0.5 m.\nU = mgh = 0.2 × 9.8 × 0.5 = 0.98 Joules.'
  },
  {
    id: 'q_phy101_33',
    topic_id: 'topic_phy101_6',
    text: 'An object is dropped from rest from a height H above the ground. At what point does its kinetic energy equal its potential energy (taking ground level as U = 0)?',
    a: 'At height H/4',
    b: 'At height H/2 (halfway point)',
    c: 'At height 3H/4',
    d: 'Just before striking the ground',
    correct_option: 'B',
    explanation: 'Total mechanical energy E = mgH. At height h, U = mgh and K = E - U = mg(H - h).\nSetting K = U gives mg(H - h) = mgh => H - h = h => 2h = H => h = H/2.'
  },
  {
    id: 'q_phy101_34',
    topic_id: 'topic_phy101_6',
    text: 'A force F = 20 N pulls a sled through a distance of 15 m across a horizontal snow field at an angle of 60° above the horizontal. What is the work done by the force?',
    a: '300 J',
    b: '150 J',
    c: '260 J',
    d: '75 J',
    correct_option: 'B',
    explanation: 'Work W = F · d = F d cos(θ) = 20 × 15 × cos(60°) = 300 × 0.5 = 150 Joules.'
  },
  {
    id: 'q_phy101_35',
    topic_id: 'topic_phy101_6',
    text: 'Which of the following is a characteristic property of a conservative force?',
    a: 'The work done depends on the exact path taken between two points',
    b: 'The work done around any closed loop path is zero (∮ F · dr = 0)',
    c: 'Mechanical energy is always converted to thermal energy',
    d: 'Frictional force is a primary example',
    correct_option: 'B',
    explanation: 'For any conservative force (such as gravity or electrostatic force), the work done is independent of path and equals zero along any closed loop: ∮ F · dr = 0.'
  },

  // --- TOPIC 7: Rotational motion; torque; angular momentum (topic_phy101_7) ---
  {
    id: 'q_phy101_36',
    topic_id: 'topic_phy101_7',
    text: 'A tangential force of 200 N is applied to the outer rim of a circular pulley wheel of radius 0.20 m. What is the torque exerted on the wheel?',
    a: '1000 Nm',
    b: '40 Nm',
    c: '20 Nm',
    d: '400 Nm',
    correct_option: 'B',
    explanation: 'Torque τ = r × F = r F sin(90°) = 0.20 m × 200 N = 40 Nm.'
  },
  {
    id: 'q_phy101_37',
    topic_id: 'topic_phy101_7',
    text: 'A wheel accelerates uniformly from rest to an angular speed of 10 rad/s in 2.0 seconds. What is the total angle (in radians) through which the wheel rotates?',
    a: '20 rad',
    b: '10 rad',
    c: '5 rad',
    d: '40 rad',
    correct_option: 'B',
    explanation: 'Using rotational kinematics: θ = 1/2 (ω_0 + ω) t = 1/2 (0 + 10) × 2.0 = 10 radians.'
  },
  {
    id: 'q_phy101_38',
    topic_id: 'topic_phy101_7',
    text: 'A uniform meter rule of mass 100 g is pivoted at its 50 cm mark. Where must a 50 g mass be hung to balance a 25 g mass placed at the 10 cm mark?',
    a: 'At the 70 cm mark',
    b: 'At the 60 cm mark',
    c: 'At the 80 cm mark',
    d: 'At the 90 cm mark',
    correct_option: 'A',
    explanation: 'Pivot is at 50 cm.\nLeft moment: 25 g × (50 - 10) cm = 25 × 40 = 1000 g·cm.\nRight moment: 50 g × d = 1000 g·cm => d = 20 cm from pivot.\nPosition = 50 + 20 = 70 cm mark.'
  },
  {
    id: 'q_phy101_39',
    topic_id: 'topic_phy101_7',
    text: 'A crowbar of length 120 cm is used to lift a heavy stone. The pivot (fulcrum) is located 20 cm from the stone. If a force of 100 N is applied at the long end, what lifting force is exerted on the stone?',
    a: '500 N',
    b: '600 N',
    c: '200 N',
    d: '1200 N',
    correct_option: 'A',
    explanation: 'Effort arm = 120 - 20 = 100 cm. Load arm = 20 cm.\nBy principle of moments: Load × Load arm = Effort × Effort arm\nLoad × 20 = 100 × 100 => Load = 10000 / 20 = 500 N.'
  },
  {
    id: 'q_phy101_40',
    topic_id: 'topic_phy101_7',
    text: 'If no external torque acts on a rotating system, which of the following quantities remains strictly constant?',
    a: 'Angular velocity',
    b: 'Moment of inertia',
    c: 'Angular momentum',
    d: 'Rotational kinetic energy',
    correct_option: 'C',
    explanation: 'According to the Law of Conservation of Angular Momentum, when net external torque ∑τ = 0, the total angular momentum L = Iω is conserved.'
  },

  // --- TOPIC 8: Polar coordinates; circular motion; moments of inertia; gyroscopes (topic_phy101_8) ---
  {
    id: 'q_phy101_41',
    topic_id: 'topic_phy101_8',
    text: 'What is the moment of inertia of a solid uniform sphere of mass M and radius R about an axis passing through its centre?',
    a: '1/2 M R²',
    b: '2/5 M R²',
    c: '2/3 M R²',
    d: '1/12 M R²',
    correct_option: 'B',
    explanation: 'For a uniform solid sphere rotating about its diameter/central axis, I = (2/5) M R².'
  },
  {
    id: 'q_phy101_42',
    topic_id: 'topic_phy101_8',
    text: 'According to the Parallel Axis Theorem, what is the moment of inertia I of a body of mass M about an axis at distance d from its centre of mass axis (I_cm)?',
    a: 'I = I_cm - M d²',
    b: 'I = I_cm + M d²',
    c: 'I = I_cm + 1/2 M d²',
    d: 'I = I_cm / d²',
    correct_option: 'B',
    explanation: 'The parallel axis theorem states I = I_cm + M d², where I_cm is the moment of inertia about a parallel axis passing through the centre of mass and d is the perpendicular distance between the two axes.'
  },
  {
    id: 'q_phy101_43',
    topic_id: 'topic_phy101_8',
    text: 'A particle moves with uniform speed v = 6 m/s in a circle of radius r = 3 m. What is the magnitude of its centripetal acceleration?',
    a: '2 m/s²',
    b: '12 m/s²',
    c: '18 m/s²',
    d: '36 m/s²',
    correct_option: 'B',
    explanation: 'Centripetal acceleration a_c = v² / r = 6² / 3 = 36 / 3 = 12 m/s² directed radially inward toward the centre.'
  },
  {
    id: 'q_phy101_44',
    topic_id: 'topic_phy101_8',
    text: 'A 0.2 kg stopper tied to a string of length 0.5 m whirls in a horizontal circle at an angular speed of 10 rad/s. What is the centripetal force acting on the stopper?',
    a: '10 N',
    b: '1 N',
    c: '5 N',
    d: '20 N',
    correct_option: 'A',
    explanation: 'Centripetal force F_c = m ω² r = 0.2 kg × (10 rad/s)² × 0.5 m = 0.2 × 100 × 0.5 = 10 N.'
  },
  {
    id: 'q_phy101_45',
    topic_id: 'topic_phy101_8',
    text: 'What physical property causes a spinning gyroscope to resist changes in the orientation of its rotational axis?',
    a: 'Centrifugal reaction',
    b: 'Conservation of angular momentum (Gyroscopic inertia)',
    c: 'Gravitational attraction',
    d: 'Viscous damping',
    correct_option: 'B',
    explanation: 'A spinning gyroscope possesses large angular momentum L = Iω. In the absence of external torque, the direction of L remains fixed in space, a phenomenon known as gyroscopic stability/inertia.'
  },

  // --- TOPIC 9: Gravitation; Kepler’s laws; escape velocity; satellite motion (topic_phy101_9) ---
  {
    id: 'q_phy101_46',
    topic_id: 'topic_phy101_9',
    text: "Which of the following correctly expresses Newton's Law of Universal Gravitation for two point masses m₁ and m₂ separated by a distance r?",
    a: 'F = G (m₁ m₂) / r',
    b: 'F = G (m₁ m₂) / r²',
    c: 'F = G (m₁ + m₂) / r²',
    d: 'F = G (m₁ m₂)² / r',
    correct_option: 'B',
    explanation: "Newton's universal law of gravitation states that the attractive force between two masses is directly proportional to the product of their masses and inversely proportional to the square of the distance between their centres: F = G m₁ m₂ / r²."
  },
  {
    id: 'q_phy101_47',
    topic_id: 'topic_phy101_9',
    text: 'What is the escape velocity v_e from the surface of a spherical planet of mass M and radius R?',
    a: 'v_e = √(GM / R)',
    b: 'v_e = √(2GM / R)',
    c: 'v_e = 2GM / R²',
    d: 'v_e = √(GM / 2R)',
    correct_option: 'B',
    explanation: 'Setting total mechanical energy at surface to zero (escape condition): 1/2 m v_e² - GMm/R = 0 => 1/2 v_e² = GM/R => v_e = √(2GM/R).'
  },
  {
    id: 'q_phy101_48',
    topic_id: 'topic_phy101_9',
    text: "According to Kepler's Third Law of Planetary Motion, what is the mathematical relationship between the orbital period T of a planet and the semi-major axis a of its orbit?",
    a: 'T² ∝ a³ (T² / a³ = constant)',
    b: 'T³ ∝ a²',
    c: 'T ∝ a²',
    d: 'T² ∝ a',
    correct_option: 'A',
    explanation: "Kepler's Third Law (Law of Periods) states that the square of the orbital period T of any planet is directly proportional to the cube of the semi-major axis a of its elliptical orbit: T² / a³ = 4π² / (GM) = constant."
  },
  {
    id: 'q_phy101_49',
    topic_id: 'topic_phy101_9',
    text: 'The acceleration due to gravity on Earth is g = 9.8 m/s². If a planet has the same mass as Earth but its radius is twice that of Earth (R_p = 2R_E), what is the gravitational acceleration on its surface?',
    a: '19.6 m/s²',
    b: '4.9 m/s²',
    c: '2.45 m/s²',
    d: '9.8 m/s²',
    correct_option: 'C',
    explanation: "Surface gravity g = GM / R². When radius doubles to 2R, g' = GM / (2R)² = GM / (4R²) = g / 4 = 9.8 / 4 = 2.45 m/s²."
  },
  {
    id: 'q_phy101_50',
    topic_id: 'topic_phy101_9',
    text: 'A satellite orbits the Earth in a circular orbit of radius r. What is its orbital speed v_o?',
    a: 'v_o = √(GM / r)',
    b: 'v_o = √(2GM / r)',
    c: 'v_o = GM / r²',
    d: 'v_o = √(GM / r³)',
    correct_option: 'A',
    explanation: 'Equating gravitational force to centripetal force: m v_o² / r = G M m / r² => v_o² = GM / r => v_o = √(GM / r).'
  },
  {
    id: 'q_phy101_51',
    topic_id: 'topic_phy101_9',
    text: 'What is the net gravitational force on a mass positioned exactly at the centre of a uniform spherical shell of mass M?',
    a: 'GM / R²',
    b: 'Zero (0 N)',
    c: 'Infinite',
    d: '2 GM / R',
    correct_option: 'B',
    explanation: "By Gauss's Law for gravity and Newton's shell theorem, the gravitational field inside any uniform spherical shell is identically zero everywhere within the interior; therefore, net gravitational force on any mass at the centre is 0 N."
  }
];

// Insert statement
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

let insertedCount = 0;
const topicCounts = {};

for (const q of questions) {
  insertStmt.run(q.id, q.topic_id, q.text, q.a, q.b, q.c, q.d, q.correct_option, q.explanation);
  insertedCount++;
  topicCounts[q.topic_id] = (topicCounts[q.topic_id] || 0) + 1;
}

console.log(`Successfully ingested ${insertedCount} PHY 101 questions into premed_portal.sqlite!`);
console.log('Breakdown by topic:');
for (const [tId, cnt] of Object.entries(topicCounts)) {
  const topicRow = db.prepare('SELECT name FROM topics WHERE id = ?').get(tId);
  console.log(`  - [${tId}] ${topicRow ? topicRow.name : 'Unknown'}: ${cnt} questions`);
}
