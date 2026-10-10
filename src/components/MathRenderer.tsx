import React from 'react';
import katex from 'katex';

/**
 * Converts plain text mathematics notation (like exponents, Greek symbols,
 * limits, fractions, and derivatives) into standard, clean LaTeX syntax.
 */
export function convertPlainMathToLatex(text: string): string {
  let s = text.trim();
  
  // Superscripts
  s = s.replace(/²/g, '^2');
  s = s.replace(/³/g, '^3');
  s = s.replace(/⁴/g, '^4');
  s = s.replace(/⁵/g, '^5');
  s = s.replace(/⁶/g, '^6');
  s = s.replace(/⁷/g, '^7');
  s = s.replace(/⁸/g, '^8');
  s = s.replace(/⁹/g, '^9');
  s = s.replace(/ˣ/g, '^x');
  s = s.replace(/⁻¹/g, '^{-1}');
  s = s.replace(/₂/g, '_2');
  
  // Math operators & Greek symbols
  s = s.replace(/π/g, '\\pi');
  s = s.replace(/Δ/g, '\\Delta ');
  s = s.replace(/·/g, '\\cdot ');
  s = s.replace(/→/g, '\\to ');
  s = s.replace(/->/g, '\\to ');
  
  // Derivatives
  s = s.replace(/d²y\/dx²/g, '\\frac{d^2y}{dx^2}');
  s = s.replace(/dy\/dx/g, '\\frac{dy}{dx}');
  s = s.replace(/du\/dx/g, '\\frac{du}{dx}');
  s = s.replace(/dy\/du/g, '\\frac{dy}{du}');
  s = s.replace(/du\/dy/g, '\\frac{du}{dy}');
  s = s.replace(/dx\/du/g, '\\frac{dx}{du}');
  s = s.replace(/dv\/dx/g, '\\frac{dv}{dx}');
  s = s.replace(/d²y/g, 'd^2y');
  s = s.replace(/dx²/g, 'dx^2');
  
  // Math functions (add backslashes)
  s = s.replace(/\b(sin|cos|tan|cot|sec|cosec|csc|ln|log|lim|arctan)\b/g, '\\$1 ');
  
  // Clean up cosec and limits
  s = s.replace(/\\cosec\b/g, '\\csc');
  s = s.replace(/\\csc²/g, '\\csc^2');
  s = s.replace(/\\tan\s*\^{-1}/g, '\\tan^{-1}');
  s = s.replace(/\\lim\s+([xyt])\s*\\to\s*([a-zA-Z0-9]+)/gi, '\\lim_{$1 \\to $2}');
  s = s.replace(/\\lim\s+([xyt])\s*→\s*([a-zA-Z0-9]+)/gi, '\\lim_{$1 \\to $2}');
  
  // Exponential e^(...) and constant a^(...)
  s = s.replace(/\be\^\(([^)]+)\)/g, 'e^{$1}');
  s = s.replace(/\ba\^\(([^)]+)\)/g, 'a^{$1}');
  
  // Roots
  s = s.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
  s = s.replace(/√([a-zA-Z0-9]+)/g, '\\sqrt{$1}');
  
  // Fractions (e.g. 3/2 x or 1/2)
  s = s.replace(/\b(\d+)\/(\d+)\b/g, '\\frac{$1}{$2}');
  
  return s;
}

// Unified regex of alternative math patterns to parse the text
const mathRegex = /(?:[a-zA-Z0-9²³⁴⁵⁶⁷⁸⁹ˣ⁺⁻¹\s+-\/*()Δπ\']+\s*=\s*[a-zA-Z0-9²³⁴⁵⁶⁷⁸⁹ˣ⁺⁻¹\s+-\/*()√Δπ·⁻¹_\']+|[a-zA-Z0-9²³⁴⁵⁶⁷⁸⁹ˣ⁺⁻¹\s+-\/*()Δπ]+\s*[<>]+\s*[a-zA-Z0-9²³⁴⁵⁶⁷⁸⁹ˣ⁺⁻¹\s+-\/*()Δπ]+|\blim\s+[a-zA-Z]\s*(?:→|->|\\to)\s*[a-zA-Z0-9]+\s*(?:\[[^\]]+\]|f\(x\)|g\(x\))?|\be\^\([^)]+\)(?:\s*ln\([^)]+\))?|tan⁻¹√[a-zA-Z0-9²³⁴⁵⁶⁷⁸⁹ˣ⁺⁻¹()-]+|arctan\([^)]+\)|d[²³]?[y|u|v]\/d[x|y|u|v][²³]?|du\/dx|dv\/dx|dy\/du|du\/dy|dx\/du|\(\s*-?\d+\s*,\s*-?\d+\s*\)|\(\s*[a-zA-Z]\s*,\s*[a-zA-Z]\s*\)|[a-zA-Z]ˣ|[a-zA-Z]²|[a-zA-Z]³|[a-zA-Z]⁴|π\/[2346]|\\pi\/[2346]|\b\d+\/\d+\b|Δ[x|y]|\b(?:sin|cos|tan|cot|sec|cosec|csc|ln|log[₂2]?)\s*\(?[a-zA-Z0-9²³⁴⁵⁶⁷⁸⁹ˣ⁺⁻¹_+\-*\/]*\)?)/gi;

interface MathRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '', inline = true }) => {
  if (!text) return null;

  // Handle standard LaTeX enclosed in $ delimiters (e.g. $f(x) = \sin(x)$)
  if (text.includes('$')) {
    const normalizedText = text.replace(/\$\$/g, '$');
    const parts = normalizedText.split('$');
    return (
      <span className={className}>
        {parts.map((part, idx) => {
          if (idx % 2 === 0) {
            // Even indices are plain text
            const lines = part.split('\n');
            return (
              <React.Fragment key={idx}>
                {lines.map((line, lIdx) => (
                  <React.Fragment key={lIdx}>
                    {lIdx > 0 && <br />}
                    {line}
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          } else {
            // Odd indices are math blocks
            try {
              // Extract zero-width markers to not break KaTeX syntax
              const cleanPart = part.replace(/[\u200E\u200F]/g, '');
              const html = katex.renderToString(cleanPart, {
                displayMode: false,
                throwOnError: false,
                trust: true
              });
              // Append markers back as zero-width invisible text after the math span
              const markers = part.match(/[\u200E\u200F]/g)?.join('') || '';
              return (
                <span
                  key={idx}
                  className="inline-block mx-0.5 align-middle"
                  dangerouslySetInnerHTML={{ __html: html + markers }}
                />
              );
            } catch (err) {
              console.error('KaTeX rendering error:', err);
              return <React.Fragment key={idx}>${part}$</React.Fragment>;
            }
          }
        })}
      </span>
    );
  }

  // If the text has no math-like symbols or terms, render as plain text
  const hasMathSymbols = /[²³⁴⁵⁶⁷⁸⁹ˣ⁺⁻¹√Δπ·→]|dy\/dx|d²y\/dx²|\blim\b|\bsin\b|\bcos\b|\btan\b|\bcot\b|\bsec\b|\bcsc\b|\be\^/i.test(text);
  if (!hasMathSymbols) {
    return <span className={className}>{text}</span>;
  }

  // Tokenize the text into text segments and math segments
  const tokens: { type: 'text' | 'math'; value: string }[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex index
  mathRegex.lastIndex = 0;

  while ((match = mathRegex.exec(text)) !== null) {
    const matchStr = match[0];
    const matchIndex = match.index;

    // Add preceding text if any
    if (matchIndex > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.substring(lastIndex, matchIndex)
      });
    }

    // Add math token
    tokens.push({
      type: 'math',
      value: matchStr
    });

    lastIndex = mathRegex.lastIndex;
  }

  // Add any trailing text
  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: text.substring(lastIndex)
    });
  }

  // If no math tokens were extracted, fall back to entire text
  if (tokens.filter(t => t.type === 'math').length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'text') {
          return <React.Fragment key={idx}>{token.value}</React.Fragment>;
        } else {
          try {
            const latex = convertPlainMathToLatex(token.value);
            const html = katex.renderToString(latex, {
              displayMode: !inline,
              throwOnError: false,
              trust: true
            });
            return (
              <span
                key={idx}
                className="inline-block mx-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (err) {
            console.error('KaTeX rendering error:', err);
            return <React.Fragment key={idx}>{token.value}</React.Fragment>;
          }
        }
      })}
    </span>
  );
};
