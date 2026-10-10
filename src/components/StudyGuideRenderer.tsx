import React, { useState } from 'react';
import { Sparkles, Terminal, Layers } from 'lucide-react';

interface StudyGuideRendererProps {
  content: string;
}

// Helper to format standard markdown bold blocks **text** nicely inside components
const renderBoldText = (text: string) => {
  if (!text.includes('**')) return text;
  
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) { // Odd indexes are the text inside **bold**
      return (
        <b key={index} className="font-extrabold text-slate-900 dark:text-emerald-400 uppercase tracking-wide text-[10px]">
          {part}
        </b>
      );
    }
    return part;
  });
};

function ClinicalImageBlock({ prompt, cleanedPrompt, seed }: { prompt: string; cleanedPrompt: string; seed: number }) {
  const [errorCount, setErrorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fallback chain of URLs
  const urls = [
    `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=700&height=450&nologo=true&seed=${seed}`,
    `https://image.pollinations.ai/p/${encodeURIComponent(prompt)}?width=700&height=450&nologo=true&seed=${seed}`
  ];

  const currentUrl = urls[Math.min(errorCount, urls.length - 1)];
  const isFailedAll = errorCount >= urls.length;

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-slate-205/60 dark:border-slate-800 bg-slate-100/50 dark:bg-black/40 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-900/60 overflow-hidden flex flex-col items-center justify-center text-center">
        {loading && !isFailedAll && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/80 z-10 gap-2">
            <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Rendering AI Illustration...</p>
          </div>
        )}

        {!isFailedAll ? (
          <img 
            src={currentUrl} 
            alt={cleanedPrompt}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            onError={() => {
              setErrorCount(prev => prev + 1);
            }}
            onLoad={() => setLoading(false)}
            referrerPolicy="no-referrer"
          />
        ) : (
          /* Elegant Schematic Blueprint when dynamic image generation is blocked or fails */
          <div className="w-full h-full bg-gradient-to-br from-indigo-950/35 via-slate-900/40 to-blue-950/35 border border-blue-500/10 flex flex-col items-center justify-center p-6 select-none relative">
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 text-[7px] font-extrabold uppercase px-2 py-0.5 rounded-md">
              <Layers size={8} />
              <span>Visual Model Block</span>
            </div>
            
            <div className="p-2.5 bg-blue-500/10 rounded-full border border-blue-500/20 mb-2 animate-pulse">
              <Layers size={18} className="text-blue-400" />
            </div>
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-1">
              Interactive Clinical Diagram
            </h4>
            <div className="max-w-[85%] bg-black/40 border border-slate-800/80 p-3 rounded-xl mt-1.5 shadow-inner">
              <p className="text-[9.5px] font-mono leading-relaxed text-teal-300 italic text-center">
                {cleanedPrompt}
              </p>
            </div>
            <span className="text-[7.5px] font-sans font-bold text-slate-500 mt-3.5 uppercase tracking-widest">
              [ Offline Clinical Board Blueprint Loaded ]
            </span>
          </div>
        )}

        {!isFailedAll && (
          <div className="absolute top-2.5 left-2.5 bg-blue-600/90 text-white text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 shadow-md backdrop-blur-xs z-10">
            <Sparkles size={8} />
            <span>AI Clinical Reference</span>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-neutral-900/45 text-left">
        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 italic leading-normal">
          <span className="font-extrabold text-blue-600 dark:text-blue-400 mr-1.5 not-italic uppercase tracking-widest text-[9px]">Figure Reference:</span> 
          {cleanedPrompt}
        </p>
      </div>
    </div>
  );
}

export default function StudyGuideRenderer({ content }: StudyGuideRendererProps) {
  if (!content) {
    return (
      <div className="py-12 text-center text-slate-400 dark:text-slate-600">
        <p className="text-[10px] uppercase tracking-widest font-black">No study guide compiled for this set</p>
      </div>
    );
  }

  // Parse markdown-like content into visual blocks
  const parseBlocks = () => {
    const blocks: React.ReactNode[] = [];
    const lines = content.split('\n');
    let insideCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle custom diagram / standard code block tag ```
      if (line.trim().startsWith('```')) {
        if (insideCodeBlock) {
          // Close block
          const blockContent = codeBlockContent.join('\n');
          insideCodeBlock = false;
          codeBlockContent = [];
          codeBlockType = '';

          blocks.push(
            <div key={`diagram-${i}`} className="my-4 relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-slate-900 to-indigo-950 p-4 shadow-lg shadow-indigo-950/20">
              <div className="absolute top-0 right-0 p-1 bg-blue-500/15 border-b border-l border-blue-500/20 rounded-bl-xl flex items-center gap-1">
                <Terminal size={10} className="text-blue-400" />
                <span className="text-[8px] font-mono uppercase tracking-widest text-blue-300 font-extrabold">Flow Process Diagram</span>
              </div>
              <pre className="font-mono text-[9px] text-teal-300 leading-normal overflow-x-auto whitespace-pre pr-6 select-all scrollbar-thin">
                {blockContent}
              </pre>
            </div>
          );
        } else {
          // Open block
          insideCodeBlock = true;
          codeBlockType = line.replace('```', '').trim().toLowerCase();
        }
        continue;
      }

      if (insideCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle Custom image generation tag [MED_IMAGE: <prompt>]
      if (line.includes('[MED_IMAGE:')) {
        const startIndex = line.indexOf('[MED_IMAGE:') + 11;
        const endIndex = line.lastIndexOf(']');
        if (endIndex > startIndex) {
          const rawPrompt = line.substring(startIndex, endIndex).trim();
          const cleanedPrompt = rawPrompt.replace(/[#*`_[\]]/g, '').trim();
          
          let finalPrompt = cleanedPrompt;
          if (!finalPrompt.toLowerCase().includes('illustration') && !finalPrompt.toLowerCase().includes('diagram')) {
            finalPrompt = `Highly detailed medical scientific illustration of ${cleanedPrompt}, textbook diagram style, labeled clinical artwork, studio lighting, professional 3D medical render, 4k resolution`;
          }

          blocks.push(
            <ClinicalImageBlock 
              key={`med-img-${i}`}
              prompt={finalPrompt}
              cleanedPrompt={cleanedPrompt}
              seed={i}
            />
          );
          continue;
        }
      }

      // Headers
      if (line.startsWith('# ')) {
        blocks.push(
          <h1 key={`h1-${i}`} className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-100 dark:border-slate-900 pb-2 mt-6 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-sm" />
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        blocks.push(
          <h2 key={`h2-${i}`} className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mt-5 mb-3 flex items-center gap-1.5">
            <Layers size={13} className="text-blue-500 shrink-0" />
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        blocks.push(
          <h3 key={`h3-${i}`} className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest mt-4 mb-2">
            {line.substring(4)}
          </h3>
        );
      }
      // Bullets
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleaned = line.trim().substring(2);
        blocks.push(
          <div key={`bullet-${i}`} className="flex items-start gap-2 pl-4 py-0.5">
            <span className="text-blue-500 shrink-0 mt-1.5 text-[6px]">●</span>
            <p className="text-[11px] leading-relaxed text-slate-650 dark:text-slate-400 font-medium">
              {renderBoldText(cleaned)}
            </p>
          </div>
        );
      }
      // Empty lines
      else if (!line.trim()) {
        continue;
      }
      // Clinical / Callout correlation boxes
      else if (line.startsWith('[CLINICAL') || line.startsWith('[Clinical') || line.startsWith('**Clinical') || line.startsWith('> Clinical') || line.startsWith('[Pathology')) {
        blocks.push(
          <div key={`callout-${i}`} className="my-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 text-left">
            <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">Clinical Integration Study Box</span>
              <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-350 font-medium">
                {renderBoldText(line.replace(/^\[CLINICAL.*?\]|^>|^\*\*Clinical Correlation:\*\*/i, '').trim())}
              </p>
            </div>
          </div>
        );
      }
      // Standard Paragraph
      else {
        blocks.push(
          <p key={`p-${i}`} className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-medium text-left my-2 pl-1">
            {renderBoldText(line)}
          </p>
        );
      }
    }

    return blocks;
  };

  return (
    <div className="space-y-4 pr-1 text-left select-text">
      {parseBlocks()}
    </div>
  );
}
