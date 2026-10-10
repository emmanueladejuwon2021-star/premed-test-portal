import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";
import mongoose from "mongoose";

const CORRECT_OPTION_MARKER = '\u200E\u200F\u200E';

const TOPIC_NAMES = [
  // Chapter 1: Functions and Limits (1 - 8)
  "Intro to Functions, Dependent & Independent Variables",
  "Explicit vs Implicit Functions & Functions of Two Variables",
  "Inverse Functions & Evaluating f⁻¹(y)",
  "Composite Functions & Function Decomposition",
  "Basic Limits and Direct Substitution",
  "Limits of Rational Functions & Factorization",
  "Limits as x Tends to Infinity",
  "Trigonometric Limits & Continuous Functions",

  // Chapter 2: Theory of Differentiation (9 - 12)
  "Gradient of a Curve & Tangent Lines",
  "Differentiation from First Principles - Polynomials",
  "Differentiation from First Principles - Rational Functions",
  "Increment Notation and Average Rates of Change",

  // Chapter 3: Differentiation of Various Functions (13 - 17)
  "Derivative of Polynomial Functions & Power Rule",
  "Derivative of Exponential Functions",
  "Derivative of Logarithmic Functions",
  "Derivative of Circular Trigonometric Functions",
  "Derivative of Inverse Circular Trigonometric Functions",

  // Chapter 4: Techniques of Differentiation (18 - 21)
  "The Chain Rule / Function of a Function",
  "The Product Rule",
  "The Quotient Rule",
  "Multi-Step Techniques / Combination of Rules",

  // Chapter 5: Some Other Types of Differentiation (22 - 25)
  "Higher-Order Derivatives",
  "Implicit Differentiation",
  "Partial Derivatives - First Order",
  "Partial Derivatives - Second Order & Mixed Derivatives",

  // Chapter 6: Application of Differentiation Calculus (26 - 32)
  "Maxima and Minima - Critical and Stationary Points",
  "Classification of Turning Points & Inflection",
  "Application of Calculus to Finance",
  "Application to Geometry, Area, and Volume Optimization",
  "L'Hopital's Rule for Indeterminate Limits",
  "First-Order Ordinary Differential Equations",
  "Taylor and Maclaurin Series Expansions",

  // Chapter 7: Basic Definitions of Integration (33 - 35)
  "The Indefinite Integral as Reverse Differentiation",
  "Definite Integrals and Fundamental Theorem of Calculus",
  "Elementary Properties of Definite Integrals",

  // Chapter 8: Integration Techniques (36 - 39)
  "Integration of Simple Polynomial & Rational Functions",
  "Integration by Simple Substitution - Polynomials",
  "Integration by Simple Substitution - Rational & Transcendental",
  "Integration of Rational Functions via Partial Fractions",

  // Chapter 9: Integration of Circular Functions (40 - 43)
  "Elementary Trigonometric Integrals",
  "Advanced Trigonometric Powers and Identity Substitutions",
  "Integration of Trigonometric Functions by Substitution",
  "Integrals leading to Inverse Trigonometric Functions",

  // Chapter 10: Integration by Parts (44 - 45)
  "Integration by Parts - Algebraic & Log",
  "Integration by Parts - Trigonometric",

  // Chapter 11: Definite Integrals (46 - 47)
  "Evaluation of Definite Integrals with Limits",
  "Wallis' Formulae for Sine and Cosine Products",

  // Chapter 12: Application of Integration (48 - 50)
  "Area Under a Curve & Between Curves",
  "Volume of Revolution about Co-ordinate Axes",
  "Numerical and Approximate Integration & Kinematics"
];

// Helper to shuffle array in-place
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getQuestionData(tIdx: number, qIdx: number): {
  text: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct_option: string;
  explanation: string;
} {
  // Generate distinct coefficients
  const a = (qIdx % 4) + 2; // 2, 3, 4, 5
  const b = (qIdx % 3) + 3; // 3, 4, 5
  const c = (qIdx % 5) + 1; // 1, 2, 3, 4, 5
  const k = (qIdx % 3) + 1;   // 1, 2, 3

  let text = "";
  let correctValText = "";
  let distractors: string[] = [];
  let explanation = "";

  switch (tIdx) {
    case 0: { // Intro to Functions, Dependent & Independent Variables
      const ans = a * k * k + b * k - c;
      text = `Evaluate the function $f(x) = ${a}x^2 + ${b}x - ${c}$ at $x = ${k}$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 5}`, `${ans - 4}`, `${-ans}`];
      explanation = `Substitute $x = ${k}$ into $f(x)$:\n$f(${k}) = ${a}(${k})^2 + ${b}(${k}) - ${c}$\n$= ${a}(${k * k}) + ${b * k} - ${c}$\n$= ${a * k * k} + ${b * k} - ${c} = ${ans}$.`;
      break;
    }
    case 1: { // Explicit vs Implicit Functions & Functions of Two Variables
      const ans = a * 4 * 1 - b * 1 + c;
      text = `For the function of two variables $f(x, y) = ${a}x^2y - ${b}y + ${c}$, evaluate $f(2, 1)$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 3}`, `${ans - 5}`, `${ans * 2}`];
      explanation = `Substitute $x=2$ and $y=1$:\n$f(2, 1) = ${a}(2^2)(1) - ${b}(1) + ${c}$\n$= ${a}(4) - ${b} + ${c}$\n$= ${a * 4} - ${b} + ${c} = ${ans}$.`;
      break;
    }
    case 2: { // Inverse Functions & Evaluating f⁻¹(y)
      const mul = a * 2;
      const targetY = mul * k + b;
      const ans = k;
      text = `If $f(x) = ${mul}x + ${b}$, find the value of $f^{-1}(${targetY})$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 1}`, `${ans - 1}`, `${ans * 2}`];
      explanation = `To find $f^{-1}(${targetY})$, set $f(x) = ${targetY}$:\n$${mul}x + ${b} = ${targetY}$\n$${mul}x = ${targetY - b}$\n$x = ${ans}$. Thus, $f^{-1}(${targetY}) = ${ans}$.`;
      break;
    }
    case 3: { // Composite Functions & Function Decomposition
      const ans = b * (a * k + 1) + c;
      text = `Let $f(x) = ${a}x + 1$ and $g(x) = ${b}x + ${c}$. Find the composite value of $g(f(${k}))$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 4}`, `${ans - 4}`, `${ans * 2}`];
      explanation = `First, evaluate $f(${k}) = ${a}(${k}) + 1 = ${a * k + 1}$.\nNext, evaluate $g(${a * k + 1}) = ${b}(${a * k + 1}) + ${c} = ${b * (a * k + 1)} + ${c} = ${ans}$.`;
      break;
    }
    case 4: { // Basic Limits and Direct Substitution
      const ans = a * k * k - b * k + c;
      text = `Evaluate the limit using direct substitution: $\\lim_{x \\to ${k}} (${a}x^2 - ${b}x + ${c})$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 2}`, `${ans - 2}`, `${ans + 10}`];
      explanation = `Since the polynomial function is continuous everywhere, directly substitute $x = ${k}$:\n$\\lim_{x \\to ${k}} (${a}x^2 - ${b}x + ${c}) = ${a}(${k})^2 - ${b}(${k}) + ${c} = ${ans}$.`;
      break;
    }
    case 5: { // Limits of Rational Functions & Factorization
      const ans = 2 * k;
      text = `Evaluate the limit of the rational function: $\\lim_{x \\to ${k}} \\frac{x^2 - ${k * k}}{x - ${k}}$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 2}`, `${ans - 2}`, `0`];
      explanation = `Factor the numerator as a difference of squares:\n$\\frac{x^2 - ${k * k}}{x - ${k}} = \\frac{(x - ${k})(x + ${k})}{x - ${k}} = x + ${k}$ for $x \\neq ${k}$.\nTaking the limit: $\\lim_{x \\to ${k}} (x + ${k}) = ${k} + ${k} = ${ans}$.`;
      break;
    }
    case 6: { // Limits as x Tends to Infinity
      const numCoeff = a * 2;
      const denCoeff = 2;
      const ansFrac = numCoeff / denCoeff;
      text = `Evaluate the limit at infinity: $\\lim_{x \\to \\infty} \\frac{${numCoeff}x^2 + ${b}x}{${denCoeff}x^2 + ${c}}$.`;
      correctValText = `${ansFrac}`;
      distractors = [`0`, `\\infty`, `${ansFrac + 1}`];
      explanation = `Divide the numerator and denominator by the highest power of $x$, which is $x^2$:\n$\\lim_{x \\to \\infty} \\frac{${numCoeff} + \\frac{${b}}{x}}{${denCoeff} + \\frac{${c}}{x^2}} = \\frac{${numCoeff} + 0}{${denCoeff} + 0} = ${ansFrac}$.`;
      break;
    }
    case 7: { // Trigonometric Limits & Continuous Functions
      const limVal = a;
      text = `Evaluate the trigonometric limit: $\\lim_{x \\to 0} \\frac{\\sin(${limVal}x)}{x}$.`;
      correctValText = `${limVal}`;
      distractors = [`1`, `0`, `${limVal + 2}`];
      explanation = `Using the standard limit theorem $\\lim_{\\theta \\to 0} \\frac{\\sin \\theta}{\\theta} = 1$, we can rewrite the expression:\n$\\lim_{x \\to 0} \\frac{\\sin(${limVal}x)}{x} = ${limVal} \\times \\lim_{x \\to 0} \\frac{\\sin(${limVal}x)}{${limVal}x} = ${limVal} \\times 1 = ${limVal}$.`;
      break;
    }
    case 8: { // Gradient of a Curve & Tangent Lines
      const grad = 2 * a * k + b;
      text = `Find the gradient of the curve $y = ${a}x^2 + ${b}x$ at the point where $x = ${k}$.`;
      correctValText = `${grad}`;
      distractors = [`${grad + 3}`, `${grad - 3}`, `${a * k + b}`];
      explanation = `First, differentiate $y$ with respect to $x$:\n$\\frac{dy}{dx} = 2(${a})x + ${b} = ${2 * a}x + ${b}$.\nEvaluate this derivative at $x = ${k}$ to find the gradient:\n$m = ${2 * a}(${k}) + ${b} = ${2 * a * k} + ${b} = ${grad}$.`;
      break;
    }
    case 9: { // Differentiation from First Principles - Polynomials
      const deriv = 2 * a * k;
      text = `Using differentiation from first principles, find the value of $f'(${k})$ for $f(x) = ${a}x^2$.`;
      correctValText = `${deriv}`;
      distractors = [`${deriv + 2}`, `${deriv - 2}`, `${a * k}`];
      explanation = `Using the first principles limit formula:\n$f'(x) = \\lim_{h \\to 0} \\frac{${a}(x+h)^2 - ${a}x^2}{h} = \\lim_{h \\to 0} \\frac{${a}(x^2 + 2xh + h^2) - ${a}x^2}{h}$\n$= \\lim_{h \\to 0} \\frac{${2 * a}xh + ${a}h^2}{h} = \\lim_{h \\to 0} (${2 * a}x + ${a}h) = ${2 * a}x$.\nEvaluating at $x = ${k}$: $f'(${k}) = ${2 * a}(${k}) = ${deriv}$.`;
      break;
    }
    case 10: { // Differentiation from First Principles - Rational Functions
      const num = a * 4;
      const deriv = -num / (k * k);
      text = `Using first principles of differentiation, evaluate $g'(${k})$ for the rational function $g(x) = \\frac{${num}}{x}$.`;
      correctValText = `${deriv}`;
      distractors = [`${-deriv}`, `${deriv + 1}`, `${deriv - 1}`];
      explanation = `By definition:\n$g'(x) = \\lim_{h \\to 0} \\frac{\\frac{${num}}{x+h} - \\frac{${num}}{x}}{h} = \\lim_{h \\to 0} \\frac{${num}x - ${num}(x+h)}{hx(x+h)} = \\lim_{h \\to 0} \\frac{-${num}h}{hx(x+h)} = \\frac{-${num}}{x^2}$.\nEvaluating at $x = ${k}$: $g'(${k}) = \\frac{-${num}}{${k}^2} = ${deriv}$.`;
      break;
    }
    case 11: { // Increment Notation and Average Rates of Change
      const avgRate = a * (k + 1);
      text = `Using increment notation, find the average rate of change $\\frac{\\Delta y}{\\Delta x}$ for the function $y = ${a}x^2$ as $x$ changes from $1$ to $${k}$.`;
      correctValText = `${avgRate}`;
      distractors = [`${avgRate + 2}`, `${avgRate - 2}`, `${a * k}`];
      explanation = `Average rate of change is given by:\n$\\frac{\\Delta y}{\\Delta x} = \\frac{y(${k}) - y(1)}{${k} - 1} = \\frac{${a}(${k})^2 - ${a}(1)^2}{${k - 1}}$\n$= \\frac{${a * k * k} - ${a}}{${k - 1}} = \\frac{${a * k * k - a}}{${k - 1}} = ${avgRate}$.`;
      break;
    }
    case 12: { // Derivative of Polynomial Functions & Power Rule
      const deriv = 4 * a + 2 * b;
      text = `Evaluate the derivative of $y = ${a}x^4 + ${b}x^2$ at the point where $x = 1$.`;
      correctValText = `${deriv}`;
      distractors = [`${deriv + 4}`, `${deriv - 4}`, `${a + b}`];
      explanation = `Apply the power rule term-by-term:\n$\\frac{dy}{dx} = 4(${a})x^3 + 2(${b})x = ${4 * a}x^3 + ${2 * b}x$.\nSubstitute $x = 1$:\n$\\left.\\frac{dy}{dx}\\right|_{x=1} = ${4 * a}(1)^3 + ${2 * b}(1) = ${4 * a + 2 * b} = ${deriv}$.`;
      break;
    }
    case 13: { // Derivative of Exponential Functions
      const deriv = a * b;
      text = `Calculate the derivative of $f(x) = ${a}e^{${b}x}$ at $x = 0$.`;
      correctValText = `${deriv}`;
      distractors = [`${a}`, `${b}`, `${deriv + 3}`];
      explanation = `Using the chain rule for exponential functions:\n$f'(x) = ${a} \\times ${b}e^{${b}x} = ${a * b}e^{${b}x}$.\nSubstitute $x = 0$:\n$f'(0) = ${a * b}e^0 = ${deriv}$.`;
      break;
    }
    case 14: { // Derivative of Logarithmic Functions
      const num = a * 2;
      const deriv = num / k;
      text = `Find the derivative of the logarithmic function $y = ${num}\\ln(${b}x)$ at $x = ${k}$.`;
      correctValText = `${deriv}`;
      distractors = [`${deriv * 2}`, `${deriv / 2}`, `${num * b}`];
      explanation = `Recall that $\\frac{d}{dx}(\\ln(ux)) = \\frac{1}{x}$. Thus:\n$\\frac{dy}{dx} = ${num} \\times \\frac{1}{x} = \\frac{${num}}{x}$.\nEvaluating at $x = ${k}$ yields $\\frac{${num}}{${k}} = ${deriv}$.`;
      break;
    }
    case 15: { // Derivative of Circular Trigonometric Functions
      const deriv = a * b;
      text = `Find the derivative of the trigonometric function $y = ${a}\\sin(${b}x)$ at the point $x = 0$.`;
      correctValText = `${deriv}`;
      distractors = [`0`, `${a}`, `${-deriv}`];
      explanation = `Differentiating using the trigonometric chain rule:\n$\\frac{dy}{dx} = ${a} \\times ${b}\\cos(${b}x) = ${a * b}\\cos(${b}x)$.\nSubstitute $x = 0$:\n$\\left.\\frac{dy}{dx}\\right|_{x=0} = ${a * b}\\cos(0) = ${deriv}$.`;
      break;
    }
    case 16: { // Derivative of Inverse Circular Trigonometric Functions
      const deriv = a;
      text = `Evaluate the derivative of $y = \\arcsin(${a}x)$ at $x = 0$.`;
      correctValText = `${deriv}`;
      distractors = [`1`, `0`, `${deriv * 2}`];
      explanation = `Using the derivative formula for inverse sine:\n$\\frac{dy}{dx} = \\frac{${a}}{\\sqrt{1 - (${a}x)^2}}$.\nSubstitute $x = 0$:\n$\\left.\\frac{dy}{dx}\\right|_{x=0} = \\frac{${a}}{\\sqrt{1 - 0}} = ${deriv}$.`;
      break;
    }
    case 17: { // The Chain Rule / Function of a Function
      const inside = 2 * k + b;
      const deriv = 3 * 2 * inside * inside;
      text = `Apply the Chain Rule to evaluate the derivative of $y = (2x + ${b})^3$ at $x = ${k}$.`;
      correctValText = `${deriv}`;
      distractors = [`${deriv + 10}`, `${deriv - 15}`, `${deriv * 2}`];
      explanation = `Let $u = 2x + ${b}$, so $y = u^3$.\nBy Chain Rule:\n$\\frac{dy}{dx} = \\frac{dy}{du} \\times \\frac{du}{dx} = 3u^2 \\times 2 = 6(2x + ${b})^2$.\nEvaluate at $x = ${k}$:\n$6(2(${k}) + ${b})^2 = 6(${2 * k + b})^2 = 6(${inside * inside}) = ${deriv}$.`;
      break;
    }
    case 18: { // The Product Rule
      const power = a;
      const deriv = Math.pow(1, power) * b + power * Math.pow(1, power - 1);
      text = `Find the derivative of the product $y = x^{${power}}e^{${b}x}$ at $x = 1$. Express your answer in terms of $e^{${b}}$.`;
      correctValText = `${deriv}e^{${b}}`;
      distractors = [`${deriv + 2}e^{${b}}`, `${deriv - 1}e^{${b}}`, `e^{${b}}`];
      explanation = `Apply the product rule $\\frac{d}{dx}(uv) = u'v + uv'$:\nLet $u = x^{${power}} \\implies u' = ${power}x^{${power - 1}}$, and $v = e^{${b}x} \\implies v' = ${b}e^{${b}x}$.\n$$dy/dx = (${power}x^{${power-1}})e^{${b}x} + (x^{power})(b e^{${b}x})$$\nSubstitute $x = 1$:\n$dy/dx = (${power})e^{${b}} + (1)(${b}e^{${b}}) = (${power + b})e^{${b}} = ${deriv}e^{${b}}$.`;
      break;
    }
    case 19: { // The Quotient Rule
      const ansNum = 2 * a - b;
      text = `Apply the Quotient Rule to calculate the derivative of $y = \\frac{${a}x + ${b}}{x + 2}$ at $x = 0$.`;
      correctValText = `${ansNum}/4`;
      distractors = [`${ansNum}/2`, `${ansNum + 2}/4`, `-${ansNum}/4`];
      explanation = `Let $u = ${a}x + ${b} \\implies u' = ${a}$, and $v = x + 2 \\implies v' = 1$.\nBy Quotient Rule:\n$\\frac{dy}{dx} = \\frac{u'v - uv'}{v^2} = \\frac{${a}(x+2) - (${a}x+${b})(1)}{(x+2)^2} = \\frac{${2 * a} - ${b}}{(x+2)^2}$ at $x=0$.\nSubstitute $x=0$:\n$\\frac{${2 * a} - ${b}}{4} = \\frac{${ansNum}}{4}$.`;
      break;
    }
    case 20: { // Multi-Step Techniques / Combination of Rules
      const deriv = a;
      text = `Find the derivative of the combined function $y = e^{${a}x}\\cos(${b}x)$ at the point $x = 0$.`;
      correctValText = `${deriv}`;
      distractors = [`0`, `${b}`, `${-deriv}`];
      explanation = `Using the product and chain rules:\n$\\frac{dy}{dx} = (\\frac{d}{dx}e^{${a}x})\\cos(${b}x) + e^{${a}x}(\\frac{d}{dx}\\cos(${b}x)) = ${a}e^{${a}x}\\cos(${b}x) - ${b}e^{${a}x}\\sin(${b}x)$.\nAt $x = 0$:\n$\\left.\\frac{dy}{dx}\\right|_{x=0} = ${a}e^0\\cos(0) - ${b}e^0\\sin(0) = ${a}(1)(1) - 0 = ${deriv}$.`;
      break;
    }
    case 21: { // Higher-Order Derivatives
      const secondDeriv = 6 * a + 2 * b;
      text = `Find the second derivative $\\frac{d^2y}{dx^2}$ of the function $y = ${a}x^3 + ${b}x^2$ at the point $x = 1$.`;
      correctValText = `${secondDeriv}`;
      distractors = [`${secondDeriv + 6}`, `${secondDeriv - 6}`, `${3 * a + 2 * b}`];
      explanation = `First derivative:\n$\\frac{dy}{dx} = 3(${a})x^2 + 2(${b})x = ${3 * a}x^2 + ${2 * b}x$.\nSecond derivative:\n$\\frac{d^2y}{dx^2} = 6(${a})x + 2(${b}) = ${6 * a}x + ${2 * b}$.\nAt $x = 1$:\n$\\frac{d^2y}{dx^2} = ${6 * a}(1) + ${2 * b} = ${secondDeriv}$.`;
      break;
    }
    case 22: { // Implicit Differentiation
      const slopeNum = -k;
      const slopeDen = b;
      text = `Given the circle $x^2 + y^2 = ${k * k + b * b}$, find the slope of the tangent line $\\frac{dy}{dx}$ at the point $(${k}, ${b})$ using implicit differentiation.`;
      correctValText = `${slopeNum}/${slopeDen}`;
      distractors = [`${slopeDen}/${slopeNum}`, `${-slopeNum}/${slopeDen}`, `1`];
      explanation = `Differentiate implicitly with respect to $x$:\n$2x + 2y\\frac{dy}{dx} = 0 \\implies 2y\\frac{dy}{dx} = -2x \\implies \\frac{dy}{dx} = -\\frac{x}{y}$.\nEvaluating at the point $(${k}, ${b})$:\n$\\frac{dy}{dx} = -\\frac{${k}}{${b}}$.`;
      break;
    }
    case 23: { // Partial Derivatives - First Order
      const ans = 2 * a * 2 * 3; // 2ax*y
      text = `Compute the first-order partial derivative $\\frac{\\partial f}{\\partial x}$ of the function $f(x,y) = ${a}x^2y + ${b}y^2$ evaluated at the point $(2, 3)$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 4}`, `${ans - 4}`, `${ans / 2}`];
      explanation = `Treat $y$ as a constant and differentiate with respect to $x$:\n$\\frac{\\partial f}{\\partial x} = 2(${a})xy + 0 = ${2 * a}xy$.\nSubstitute $x = 2$ and $y = 3$:\n$\\frac{\\partial f}{\\partial x} = ${2 * a}(2)(3) = ${ans}$.`;
      break;
    }
    case 24: { // Partial Derivatives - Second Order & Mixed Derivatives
      const ans = 6 * a;
      text = `For the function of two variables $f(x, y) = ${a}x^2y^3$, evaluate the mixed second-order partial derivative $\\frac{\\partial^2 f}{\\partial x \\partial y}$ at $(1, 1)$.`;
      correctValText = `${ans}`;
      distractors = [`${ans / 2}`, `${ans * 2}`, `${ans + 6}`];
      explanation = `First, find the partial derivative with respect to $y$:\n$\\frac{\\partial f}{\\partial y} = 3(${a})x^2y^2 = ${3 * a}x^2y^2$.\nNow, differentiate that result with respect to $x$:\n$\\frac{\\partial^2 f}{\\partial x \\partial y} = \\frac{\\partial}{\\partial x}(${3 * a}x^2y^2) = 6(${a})xy^2 = ${6 * a}xy^2$.\nEvaluating at $(1, 1)$: $6(${a})(1)(1)^2 = ${ans}$.`;
      break;
    }
    case 25: { // Maxima and Minima - Critical and Stationary Points
      const stationaryX = a;
      text = `Find the $x$-coordinate of the stationary point of the quadratic curve $y = x^2 - ${2 * a}x + ${b}$.`;
      correctValText = `${stationaryX}`;
      distractors = [`${2 * a}`, `${-stationaryX}`, `0`];
      explanation = `To find the stationary point, take the derivative and set it to zero:\n$\\frac{dy}{dx} = 2x - ${2 * a} = 0$.\nSolve for $x$:\n$2x = ${2 * a} \\implies x = ${stationaryX}$.`;
      break;
    }
    case 26: { // Classification of Turning Points & Inflection
      text = `Classify the nature of the turning point of $y = x^2 - ${2 * a}x + ${b}$.`;
      correctValText = `Local Minimum`;
      distractors = [`Local Maximum`, `Point of Inflection`, `Saddle Point`];
      explanation = `First, differentiate: $\\frac{dy}{dx} = 2x - ${2 * a}$, which equals $0$ at $x = ${a}$.\nNow, perform the second derivative test:\n$\\frac{d^2y}{dx^2} = 2$.\nSince the second derivative is positive ($2 > 0$), the stationary point at $x = ${a}$ represents a local minimum.`;
      break;
    }
    case 27: { // Application of Calculus to Finance
      const MC = 2 * a * 5 + b;
      text = `A production cost function is given by $C(q) = ${a}q^2 + ${b}q + 150$. Find the Marginal Cost (MC) of producing $5$ units.`;
      correctValText = `${MC}`;
      distractors = [`${MC + 10}`, `${MC - 5}`, `${MC * 2}`];
      explanation = `Marginal Cost is the first derivative of the Cost function with respect to quantity:\n$MC = \\frac{dC}{dq} = 2(${a})q + ${b} = ${2 * a}q + ${b}$.\nEvaluating at $q = 5$:\n$MC(5) = ${2 * a}(5) + ${b} = ${10 * a} + ${b} = ${MC}$.`;
      break;
    }
    case 28: { // Application to Geometry, Area, and Volume Optimization
      const fenceLength = a * 8;
      const maxArea = (fenceLength * fenceLength) / 8;
      text = `A farmer wants to construct a rectangular enclosure using a straight brick wall as one of the boundaries. If they have $${fenceLength}$ meters of fencing available for the other three sides, find the maximum area they can enclose.`;
      correctValText = `${maxArea} m²`;
      distractors = [`${maxArea - 50} m²`, `${maxArea + 100} m²`, `${maxArea * 2} m²`];
      explanation = `Let the sides perpendicular to the wall be $x$, and the parallel side be $y$.\nWe are given $2x + y = ${fenceLength} \\implies y = ${fenceLength} - 2x$.\nArea $A = x \\times y = x(${fenceLength} - 2x) = ${fenceLength}x - 2x^2$.\nTo maximize, differentiate and set to $0$:\n$\\frac{dA}{dx} = ${fenceLength} - 4x = 0 \\implies x = ${fenceLength / 4}$.\nSubstitute back into Area:\n$A = (${fenceLength / 4})(${fenceLength} - 2(${fenceLength / 4})) = \\frac{${fenceLength}^2}{8} = ${maxArea}$ m².`;
      break;
    }
    case 29: { // L'Hopital's Rule for Indeterminate Limits
      const doubleVal = a * a;
      text = `Use L'Hopital's Rule to evaluate the limit: $\\lim_{x \\to 0} \\frac{1 - \\cos(${a}x)}{x^2}$.`;
      correctValText = `${doubleVal}/2`;
      distractors = [`${a}`, `0`, `${doubleVal}`];
      explanation = `Direct substitution gives $\\frac{0}{0}$ (indeterminate form). Apply L'Hopital's Rule by differentiating numerator and denominator:\n$\\lim_{x \\to 0} \\frac{${a}\\sin(${a}x)}{2x}$.\nSubstituting again still gives $\\frac{0}{0}$. Apply L'Hopital's Rule a second time:\n$\\lim_{x \\to 0} \\frac{${doubleVal}\\cos(${a}x)}{2} = \\frac{${doubleVal}(1)}{2} = \\frac{${doubleVal}}{2}$.`;
      break;
    }
    case 30: { // First-Order Ordinary Differential Equations
      const solveC = 5;
      const ansVal = 2 * a + 2 * b + solveC; // integral at x=2
      text = `Solve the differential equation $\\frac{dy}{dx} = ${a}x + ${b}$ subject to the initial condition $y(0) = ${solveC}$. Find the value of $y(2)$.`;
      correctValText = `${ansVal}`;
      distractors = [`${ansVal + 4}`, `${ansVal - 4}`, `${ansVal * 2}`];
      explanation = `Integrate both sides with respect to $x$:\n$y(x) = \\int (${a}x + ${b}) dx = \\frac{${a}}{2}x^2 + ${b}x + C$.\nUsing the initial condition $y(0) = ${solveC}$, we find $C = ${solveC}$.\nThus, $y(x) = \\frac{${a}}{2}x^2 + ${b}x + ${solveC}$.\nEvaluating at $x = 2$:\n$y(2) = \\frac{${a}}{2}(4) + ${b}(2) + ${solveC} = ${2 * a} + ${2 * b} + ${solveC} = ${ansVal}$.`;
      break;
    }
    case 31: { // Taylor and Maclaurin Series Expansions
      const doubleVal = a * a;
      text = `Find the coefficient of $x^2$ in the Maclaurin series expansion of the function $f(x) = \\cos(${a}x)$.`;
      correctValText = `-${doubleVal}/2`;
      distractors = [`${doubleVal}/2`, `-${a}/2`, `0`];
      explanation = `Recall that the Maclaurin series of $\\cos(u) = 1 - \\frac{u^2}{2!} + \\frac{u^4}{4!} - \\dots$\nSubstitute $u = ${a}x$:\n$\\cos(${a}x) = 1 - \\frac{(${a}x)^2}{2} + \\dots = 1 - \\frac{${doubleVal}}{2}x^2 + \\dots$\nThus, the coefficient of $x^2$ is $-\\frac{${doubleVal}}{2}$.`;
      break;
    }
    case 32: { // The Indefinite Integral as Reverse Differentiation
      const mulA = a * 3;
      text = `Evaluate the indefinite integral: $\\int (${mulA}x^2 + ${b}) dx$.`;
      correctValText = `${a}x^3 + ${b}x + C`;
      distractors = [`${mulA}x^3 + ${b}x + C`, `${a}x^3 + C`, `${2 * a}x^3 + ${b}x + C`];
      explanation = `Integrate each term using the reverse power rule:\n$\\int (${mulA}x^2 + ${b}) dx = \\frac{${mulA}}{3}x^3 + ${b}x + C = ${a}x^3 + ${b}x + C$.`;
      break;
    }
    case 33: { // Definite Integrals and Fundamental Theorem of Calculus
      const mulA = a * 3;
      const ans = mulA * 8 / 3;
      text = `Evaluate the definite integral using the Fundamental Theorem of Calculus: $\\int_{0}^{2} ${mulA}x^2 dx$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 4}`, `${ans - 4}`, `${ans / 2}`];
      explanation = `First, find the antiderivative of ${mulA}$x^2$:\n$F(x) = \\int ${mulA}x^2 dx = ${a}x^3$.\nBy the Fundamental Theorem of Calculus, evaluate from $0$ to $2$:\n$\\left[ ${a}x^3 \\right]_{0}^{2} = ${a}(2)^3 - ${a}(0)^3 = ${8 * a} = ${ans}$.`;
      break;
    }
    case 34: { // Elementary Properties of Definite Integrals
      const total = qIdx + 12;
      const part1 = qIdx + 4;
      const ans = total - part1;
      text = `Given that $\\int_{1}^{5} f(x) dx = ${total}$ and $\\int_{1}^{3} f(x) dx = ${part1}$, evaluate the definite integral $\\int_{3}^{5} f(x) dx$.`;
      correctValText = `${ans}`;
      distractors = [`${total + part1}`, `${total}`, `${part1}`];
      explanation = `Using the interval additive property of definite integrals:\n$\\int_{1}^{5} f(x) dx = \\int_{1}^{3} f(x) dx + \\int_{3}^{5} f(x) dx$.\nSubstitute the known values:\n$${total} = ${part1} + \\int_{3}^{5} f(x) dx \\implies \\int_{3}^{5} f(x) dx = ${total} - ${part1} = ${ans}$.`;
      break;
    }
    case 35: { // Integration of Simple Polynomial & Rational Functions
      const mulA = a * 2;
      const ans = 3 * a + b;
      text = `Evaluate the definite integral of the polynomial: $\\int_{1}^{2} (${mulA}x + ${b}) dx$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 2}`, `${ans - 2}`, `${ans * 2}`];
      explanation = `Find the antiderivative:\n$F(x) = \\frac{${mulA}}{2}x^2 + ${b}x = ${a}x^2 + ${b}x$.\nNow evaluate the integral from $1$ to $2$:\n$F(2) - F(1) = (${a}(2^2) + ${b}(2)) - (${a}(1^2) + ${b}(1))$\n$= (${4 * a} + ${2 * b}) - (${a} + ${b}) = ${3 * a} + ${b} = ${ans}$.`;
      break;
    }
    case 36: { // Integration by Simple Substitution - Polynomials
      const ansNum = Math.pow(b + 1, 4) - Math.pow(b, 4);
      text = `Evaluate the definite integral using substitution: $\\int_{0}^{1} (x + ${b})^3 dx$.`;
      correctValText = `${ansNum}/4`;
      distractors = [`${ansNum}/2`, `${ansNum + 4}/4`, `${ansNum - 4}/4`];
      explanation = `Let $u = x + ${b} \\implies du = dx$.\nWhen $x = 0, u = ${b}$. When $x = 1, u = ${b + 1}$.\nIntegrate in terms of $u$:\n$\\int_{${b}}^{${b + 1}} u^3 du = \\left[ \\frac{u^4}{4} \\right]_{${b}}^{${b + 1}} = \\frac{(${b + 1})^4 - ${b}^4}{4} = \\frac{${ansNum}}{4}$.`;
      break;
    }
    case 37: { // Integration by Simple Substitution - Rational & Transcendental
      const mulA = a * 2;
      text = `Evaluate the transcendental definite integral: $\\int_{0}^{1} \\frac{${mulA}x}{x^2 + 1} dx$.`;
      correctValText = `${a}\\ln(2)`;
      distractors = [`${mulA}\\ln(2)`, `${a}\\ln(3)`, `\\ln(2)`];
      explanation = `Let $u = x^2 + 1 \\implies du = 2x\\,dx$.\nRewrite the integral:\n$\\int_{0}^{1} \\frac{${mulA}x}{x^2 + 1} dx = ${a} \\int_{0}^{1} \\frac{2x}{x^2 + 1} dx = ${a} \\left[ \\ln(x^2 + 1) \\right]_{0}^{1}$\n$= ${a}(\\ln(2) - \\ln(1)) = ${a}\\ln(2)$.`;
      break;
    }
    case 38: { // Integration of Rational Functions via Partial Fractions
      text = `Find the indefinite integral: $\\int \\frac{1}{(x+${a})(x+${a + b})} dx$.`;
      correctValText = `1/${b} \\ln|x+${a}| - 1/${b} \\ln|x+${a + b}| + C`;
      distractors = [`\\ln|x+${a}| - \\ln|x+${a+b}| + C`, `1/${b} \\ln|x+${a}| + C`, `1/2 \\ln|x+${a}| + C`];
      explanation = `Use partial fractions to split the integrand:\n$\\frac{1}{(x+${a})(x+${a + b})} = \\frac{A}{x+${a}} + \\frac{B}{x+${a + b}}$.\nSolving gives $A = \\frac{1}{${b}}$, $B = -\\frac{1}{${b}}$.\nIntegrate both terms:\n$\\int \\left( \\frac{1/${b}}{x+${a}} - \\frac{1/${b}}{x+${a + b}} \\right) dx = \\frac{1}{${b}}\\ln|x+${a}| - \\frac{1}{${b}}\\ln|x+${a + b}| + C$.`;
      break;
    }
    case 39: { // Elementary Trigonometric Integrals
      text = `Evaluate the definite trigonometric integral: $\\int_{0}^{\\pi/2} ${a}\\sin(x) dx$.`;
      correctValText = `${a}`;
      distractors = [`0`, `-${a}`, `1`];
      explanation = `The antiderivative of $\\sin(x)$ is $-\\cos(x)$. Therefore:\n$\\int_{0}^{\\pi/2} ${a}\\sin(x) dx = \\left[ -${a}\\cos(x) \\right]_{0}^{\\pi/2} = -${a}\\cos(\\pi/2) - (-${a}\\cos(0))$\n$= 0 + ${a}(1) = ${a}$.`;
      break;
    }
    case 40: { // Advanced Trigonometric Powers and Identity Substitutions
      const doubleA = a * 2;
      text = `Evaluate the trigonometric definite integral: $\\int_{0}^{\\pi} ${doubleA}\\sin^2(x) dx$.`;
      correctValText = `${a}\\pi`;
      distractors = [`${doubleA}\\pi`, `${a}\\pi/2`, `\\pi`];
      explanation = `Use the double-angle identity $\\sin^2(x) = \\frac{1 - \\cos(2x)}{2}$:\n$\\int_{0}^{\\pi} ${doubleA}\\sin^2(x) dx = \\int_{0}^{\\pi} ${a}(1 - \\cos(2x)) dx = ${a} \\left[ x - \\frac{\\sin(2x)}{2} \\right]_{0}^{\\pi}$\n$= ${a} \\left( (\\pi - 0) - (0 - 0) \\right) = ${a}\\pi$.`;
      break;
    }
    case 41: { // Integration of Trigonometric Functions by Substitution
      const mulA = a * 3;
      text = `Evaluate the trigonometric definite integral: $\\int_{0}^{\\pi/2} ${mulA}\\sin^2(x)\\cos(x) dx$.`;
      correctValText = `${a}`;
      distractors = [`${mulA}`, `0`, `1`];
      explanation = `Let $u = \\sin(x) \\implies du = \\cos(x) dx$.\nWhen $x = 0, u = 0$. When $x = \\pi/2, u = 1$.\nRewrite the integral:\n$\\int_{0}^{1} ${mulA}u^2 du = \\left[ ${a}u^3 \\right]_{0}^{1} = ${a}(1)^3 - 0 = ${a}$.`;
      break;
    }
    case 42: { // Integrals leading to Inverse Trigonometric Functions
      const sqVal = a * a;
      text = `Evaluate the inverse trigonometric integral: $\\int_{0}^{${a}} \\frac{1}{${sqVal} + x^2} dx$.`;
      correctValText = `\\pi/(${4 * a})`;
      distractors = [`\\pi/${2 * a}`, `\\pi/${sqVal}`, `\\pi`];
      explanation = `Recall that $\\int \\frac{1}{a^2 + x^2} dx = \\frac{1}{a} \\arctan\\left(\\frac{x}{a}\\right)$.\nEvaluate from $0$ to $${a}$:\n$\\left[ \\frac{1}{${a}} \\arctan\\left(\\frac{x}{${a}}\\right) \\right]_{0}^{${a}} = \\frac{1}{${a}} \\arctan(1) - 0 = \\frac{1}{${a}} \\left(\\frac{\\pi}{4}\\right) = \\frac{\\pi}{${4 * a}}$.`;
      break;
    }
    case 43: { // Integration by Parts - Algebraic & Log
      const mulA = a * 4;
      text = `Using integration by parts, evaluate the definite integral: $\\int_{1}^{e} ${mulA}x\\ln(x) dx$.`;
      correctValText = `${a}e² + ${a}`;
      distractors = [`${a}e²`, `${a}e² - ${a}`, `${2 * a}e²`];
      explanation = `Let $u = \\ln(x) \\implies du = \\frac{1}{x} dx$, and $dv = ${mulA}x \\, dx \\implies v = ${2 * a}x^2$.\nUsing the integration by parts formula $\\int u \\, dv = uv - \\int v \\, du$:\n$\\int ${mulA}x\\ln(x) dx = \\left[ ${2 * a}x^2\\ln(x) \\right]_{1}^{e} - \\int_{1}^{e} ${2 * a}x^2 \\left(\\frac{1}{x}\\right) dx$\n$= ${2 * a}e^2 - \\left[ ${a}x^2 \\right]_{1}^{e} = ${2 * a}e^2 - (${a}e^2 - ${a}) = ${a}e^2 + ${a}$.`;
      break;
    }
    case 44: { // Integration by Parts - Trigonometric
      text = `Using integration by parts, evaluate the definite integral: $\\int_{0}^{\\pi/2} ${a}x\\cos(x) dx$.`;
      correctValText = `${a}\\pi/2 - ${a}`;
      distractors = [`${a}\\pi/2`, `${a}\\pi - ${a}`, `0`];
      explanation = `Let $u = x \\implies du = dx$, and $dv = ${a}\\cos(x) dx \\implies v = ${a}\\sin(x)$.\nUsing the formula $\\int u \\, dv = uv - \\int v \\, du$:\n$\\int_{0}^{\\pi/2} ${a}x\\cos(x) dx = \\left[ ${a}x\\sin(x) \\right]_{0}^{\\pi/2} - \\int_{0}^{\\pi/2} ${a}\\sin(x) dx$\n$= ${a}\\left(\\frac{\\pi}{2}\\right)(1) - \\left[ -${a}\\cos(x) \\right]_{0}^{\\pi/2} = \\frac{${a}\\pi}{2} - ${a}$.`;
      break;
    }
    case 45: { // Evaluation of Definite Integrals with Limits
      const mulA = a * 2;
      text = `Evaluate the definite integral with exponential limits: $\\int_{0}^{1} ${mulA}xe^{x^2} dx$.`;
      correctValText = `${a}e - ${a}`;
      distractors = [`${a}e`, `${a}e + ${a}`, `${mulA}e`];
      explanation = `Let $u = x^2 \\implies du = 2x\\,dx$.\nRewrite the integral:\n$\\int_{0}^{1} ${a} e^{x^2} (2x\\,dx) = \\int_{0}^{1} ${a} e^u du = \\left[ ${a}e^u \\right]_{0}^{1} = ${a}e^1 - ${a}e^0 = ${a}e - ${a}$.`;
      break;
    }
    case 46: { // Wallis' Formulae for Sine and Cosine Products
      if (qIdx % 2 === 0) {
        text = `Using Wallis' formula, evaluate: $\\int_{0}^{\\pi/2} \\sin^2(x) dx$.`;
        correctValText = `\\pi/4`;
        distractors = [`\\pi/2`, `1/2`, `\\pi/8`];
        explanation = `Wallis' Formula for an even power $n=2$ states:\n$\\int_{0}^{\\pi/2} \\sin^2(x) dx = \\frac{2-1}{2} \\times \\frac{\\pi}{2} = \\frac{1}{2} \\times \\frac{\\pi}{2} = \\frac{\\pi}{4}$.`;
      } else {
        text = `Using Wallis' formula, evaluate: $\\int_{0}^{\\pi/2} \\sin^3(x) dx$.`;
        correctValText = `2/3`;
        distractors = [`\\pi/4`, `1/3`, `3/4`];
        explanation = `Wallis' Formula for an odd power $n=3$ states:\n$\\int_{0}^{\\pi/2} \\sin^3(x) dx = \\frac{3-1}{3} \\times 1 = \\frac{2}{3}$.`;
      }
      break;
    }
    case 47: { // Area Under a Curve & Between Curves
      const ans = a * 9;
      text = `Find the area of the region bounded by the curve $y = ${a}x^2$, the $x$-axis, and the vertical lines $x = 0$ and $x = 3$.`;
      correctValText = `${ans}`;
      distractors = [`${ans + 6}`, `${ans - 9}`, `${ans * 2}`];
      explanation = `The area $A$ is given by the definite integral:\n$A = \\int_{0}^{3} ${a}x^2 dx = \\left[ \\frac{${a}}{3}x^3 \\right]_{0}^{3} = \\frac{${a}}{3}(27) - 0 = ${9 * a} = ${ans}$.`;
      break;
    }
    case 48: { // Volume of Revolution about Co-ordinate Axes
      const sqA = a * a;
      const ans = sqA * 2;
      text = `Find the volume of the solid generated when the region bounded by $y = ${a}\\sqrt{x}$, the $x$-axis, from $x=0$ to $x=2$ is rotated $360^\\circ$ about the $x$-axis.`;
      correctValText = `${ans}\\pi`;
      distractors = [`${sqA}\\pi`, `${4 * sqA}\\pi`, `${ans * 2}\\pi`];
      explanation = `The volume $V$ of revolution about the $x$-axis is:\n$V = \\pi \\int_{a}^{b} [f(x)]^2 dx = \\pi \\int_{0}^{2} (${a}\\sqrt{x})^2 dx = \\pi \\int_{0}^{2} ${sqA}x \\, dx$\n$= \\pi \\left[ \\frac{${sqA}}{2}x^2 \\right]_{0}^{2} = \\pi \\left( \\frac{${sqA}}{2}(4) - 0 \\right) = ${2 * sqA}\\pi = ${ans}\\pi$.`;
      break;
    }
    case 49: { // Numerical and Approximate Integration & Kinematics
      const ansVal = 3 * a;
      text = `Use the Trapezium Rule with $2$ equal intervals ($h = 1$) to approximate the definite integral $\\int_{0}^{2} ${a}x^2 dx$.`;
      correctValText = `${ansVal}`;
      distractors = [`${ansVal + 1}`, `${ansVal - 1}`, `${ansVal * 2}`];
      explanation = `With $h = 1$, the ordinates are at $x_0 = 0$, $x_1 = 1$, $x_2 = 2$.\nEvaluate the function $f(x) = ${a}x^2$ at these points:\n$y_0 = f(0) = 0$, $y_1 = f(1) = ${a}$, $y_2 = f(2) = ${4 * a}$.\nBy Trapezium Rule:\n$Area \\approx \\frac{h}{2} [ y_0 + 2y_1 + y_2 ] = \\frac{1}{2} [ 0 + 2(${a}) + ${4 * a} ] = \\frac{1}{2} [ ${6 * a} ] = ${3 * a} = ${ansVal}$.`;
      break;
    }
  }

  // Generate 4 structured options
  const optionList = [
    { text: `$${correctValText}$`, isCorrect: true },
    { text: distractors[0].startsWith('$') ? distractors[0] : `$${distractors[0]}$`, isCorrect: false },
    { text: distractors[1].startsWith('$') ? distractors[1] : `$${distractors[1]}$`, isCorrect: false },
    { text: distractors[2].startsWith('$') ? distractors[2] : `$${distractors[2]}$`, isCorrect: false }
  ];

  // Shuffle the options to ensure beautiful variations
  const shuffledOptions = shuffleArray([...optionList]);

  // Find the index of the correct option
  const correctIdx = shuffledOptions.findIndex(o => o.isCorrect);
  const keys = ['option_a', 'option_b', 'option_c', 'option_d'];
  const correctOptionKey = keys[correctIdx];

  // Append CORRECT_OPTION_MARKER strictly to the correct option text
  shuffledOptions[correctIdx].text = shuffledOptions[correctIdx].text + CORRECT_OPTION_MARKER;

  return {
    text,
    a: shuffledOptions[0].text,
    b: shuffledOptions[1].text,
    c: shuffledOptions[2].text,
    d: shuffledOptions[3].text,
    correct_option: correctOptionKey,
    explanation
  };
}

async function run() {
  console.log('[INFO] Connecting to MongoDB...');
  await connectDB();

  // 1. Find or create MTH 102
  console.log('[INFO] Fetching Course MTH 102...');
  let course = await Course.findOne({ code: "MTH 102" });

  if (course) {
    const topics = await Topic.find({ course_id: course._id });
    const topicIds = topics.map(t => t._id);
    await Question.deleteMany({ topic_id: { $in: topicIds } });
    await Topic.deleteMany({ course_id: course._id });
    console.log(`[INFO] Cleared ${topics.length} topics and associated questions for MTH 102.`);
  } else {
    course = new Course({
      code: "MTH 102",
      title: "Introductory Calculus",
      icon: "TrendingUp",
      duration: 120, // 120 minutes
      question_limit: 50,
      attempts_allowed: 3,
      is_locked: false,
      results_locked: false
    });
    await course.save();
    console.log(`[INFO] Created new course MTH 102.`);
  }

  // 2. Iterate and create 50 topics
  console.log('[INFO] Seeding 50 topics and 1000 questions (20 per topic)...');
  
  for (let tIdx = 0; tIdx < TOPIC_NAMES.length; tIdx++) {
    const topicName = TOPIC_NAMES[tIdx];
    const newTopic = new Topic({
      course_id: course._id,
      name: `${tIdx + 1}. ${topicName}`,
      question_count: 20,
      notes: `Notes for calculus target: ${topicName}. Covered extensively in textbook chapters.`
    });
    await newTopic.save();

    const questionsToInsert = [];
    for (let qIdx = 1; qIdx <= 20; qIdx++) {
      const qData = getQuestionData(tIdx, qIdx);
      questionsToInsert.push({
        topic_id: newTopic._id,
        text: qData.text,
        a: qData.a,
        b: qData.b,
        c: qData.c,
        d: qData.d,
        correct_option: qData.correct_option,
        explanation: qData.explanation,
        is_refined: true
      });
    }

    await Question.insertMany(questionsToInsert);
    console.log(`  - Seeded Topic ${tIdx + 1}/50: "${topicName}" with 20 questions.`);
  }

  console.log('[INFO] Seeding completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('[ERROR] Seeding threw error:', err);
  process.exit(1);
});
