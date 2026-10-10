import 'dotenv/config';
import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";
import { CORRECT_OPTION_MARKER, stripOptionMarkers } from "../lib/optionUtils";

// Comprehensive academic simplification dictionary for Zoology & Evolutionary Biology
const ACADEMIC_REPLACEMENTS: [RegExp, string][] = [
  // Double-part / Comparison phrases
  [/the root signifies the most ancient common ancestor/gi, "Root: ancient ancestor"],
  [/internal nodes mark subsequent divergence events/gi, "Nodes: subsequent divergence"],
  [/the root denotes the most recently evolved lineage/gi, "Root: recent lineage"],
  [/internal nodes identify primitive ancestral forms/gi, "Nodes: ancestral forms"],
  [/the root indicates total species count in the clade/gi, "Root: clade species count"],
  [/internal nodes show shared character states/gi, "Nodes: shared characters"],
  [/the root is a theoretical construct only/gi, "Root: theoretical construct"],
  [/internal nodes reflect empirical data/gi, "Nodes: empirical data"],
  
  [/monophyletic groups represent natural evolutionary units/gi, "Monophyletic: natural units"],
  [/paraphyletic groups are incomplete historical representations/gi, "Paraphyletic: incomplete history"],
  [/paraphyletic groups reveal convergent evolution/gi, "Paraphyletic: convergence"],
  [/monophyletic groups only track ancestral traits/gi, "Monophyletic: ancestral traits"],
  [/monophyletic groups require molecular data/gi, "Monophyletic: molecular data"],
  [/paraphyletic groups rely solely on morphology/gi, "Paraphyletic: morphology data"],

  [/taxonomy classifies and names organisms/gi, "Taxonomy: names; Phylogeny: history"],
  [/phylogeny reconstructs their evolutionary history/gi, "Phylogeny: evolutionary history"],
  [/taxonomy describes physical traits within phylogeny/gi, "Taxonomy: physical traits"],
  [/phylogeny analyzes genetic sequences/gi, "Phylogeny: genetic sequences"],
  [/taxonomy provides evolutionary theory/gi, "Taxonomy: evolutionary theory"],
  [/phylogeny applies that theory in biological practice/gi, "Phylogeny: applies theory"],

  [/cladogram: arbitrary length; tree: character topology/gi, "Cladogram: arbitrary; Tree: topology"],
  [/tree: divergence length; cladogram: branching order/gi, "Tree: divergence; Cladogram: branching"],
  [/cladogram: ancestral traits; tree: derived traits/gi, "Cladogram: ancestral; Tree: derived"],
  [/tree: monophyletic groups; cladogram: polyphyletic groups/gi, "Tree: monophyletic; Cladogram: polyphyletic"],

  // Single phrases - redundant prefixes
  [/it offers an independent evidence stream to corroborate or revise/gi, "Corroborates evidence"],
  [/it entirely supersedes morphological analysis, providing a more accurate/gi, "Supersedes morphology"],
  [/it is restricted to species-level identification, lacking utility for/gi, "Species-level only"],
  [/it inherently surpasses fossil evidence, being immune to preservation/gi, "Surpasses fossils"],
  [/it depicts the evolutionary trajectory of a lineage from/gi, "Depicts evolutionary trajectory"],
  [/it signifies the precise emergence point of a novel trait/gi, "Signifies novel traits"],
  [/it quantifies the cumulative genetic mutations since the/gi, "Quantifies genetic mutations"],
  [/it marks the geographical locale where an ancestral population/gi, "Marks geographical locale"],
  [/it identifies distinct evolutionary lineages, guiding efforts to/gi, "Identifies lineages"],
  [/it predicts future extinction rates based on current genetic/gi, "Predicts extinction rates"],
  [/it facilitates creating artificial environments mimicking ancestral/gi, "Creates artificial habitats"],
  [/it enables cross-breeding of related species to enhance/gi, "Enables cross-breeding"],

  [/it establishes character polarity, distinguishing ancestral from/gi, "Establishes character polarity"],
  [/it inflates taxon count, thereby enhancing the statistical/gi, "Inflates taxon count"],
  [/it functions as the tree's root, representing the most/gi, "Functions as root"],
  [/it comprises organisms excluded from analysis due to/gi, "Comprises excluded organisms"],

  [/organisms grouped by independently evolved similar traits, lacking a/gi, "Independently evolved traits"],
  [/traits are often absent in fossil records, hindering comprehensive/gi, "Absent fossil records"],
  [/the inclusion of all descendants originating from a singular common/gi, "Includes all descendants"],
  [/the presence of shared ancestral traits that define the group/gi, "Shared ancestral traits"],
  [/the reliance on morphological synapomorphies rather than molecular/gi, "Morphological synapomorphies"],
  [/the exclusion of lineages that demonstrate significant phenotypic/gi, "Excludes divergent lineages"],

  // Generic patterns & phrase shortenings
  [/distinguishing ancestral from derived states within the ingroup/gi, "Ancestral vs derived"],
  [/distinguishing ancestral from derived/gi, "Ancestral vs derived"],
  [/representing the most recent common ancestor/gi, "Recent common ancestor"],
  [/reconstructed from shared derived characters/gi, "Shared derived characters"],
  [/reconstructed from shared ancestral characters/gi, "Shared ancestral characters"],
  [/based on morphological similarity alone/gi, "Morphological similarity"],
  [/based on molecular sequence analysis/gi, "Molecular analysis"],
  [/homologous structures originating from a/gi, "Homologous structures"],
  [/analogous structures resulting from/gi, "Analogous structures"],
  [/derived from a single common ancestor/gi, "Single common ancestor"],
  [/derived from multiple distinct ancestors/gi, "Multiple ancestors"],
  [/exhibiting convergent evolution/gi, "Convergent evolution"],
  [/exhibiting divergent evolution/gi, "Divergent evolution"],
  [/exhibiting parallel evolution/gi, "Parallel evolution"],
];

// Clean up short filler words and redundant phrases
function heuristicShorten(text: string): string {
  let clean = text.trim();
  
  // 1. Remove ending periods
  if (clean.endsWith('.')) {
    clean = clean.substring(0, clean.length - 1).trim();
  }

  // 2. Try dict-based replacements first
  for (const [regex, replacement] of ACADEMIC_REPLACEMENTS) {
    if (regex.test(clean)) {
      clean = clean.replace(regex, replacement);
    }
  }

  // If already under 5 words, return it
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 4) {
    return clean;
  }

  // 3. General linguistic simplification rules
  // Remove starting fillers like "It is ", "Which is ", "By using ", "The primary ", "Refers to ", "Represents "
  clean = clean.replace(/^(the|a|an|it|its|this|they|their|which|by|through|for|to|of|with|in|on|at|relying|using|refers to|represents|depicts|indicates|signifies|characterizes|is characterized by|is defined as|is considered|is associated with|is used to|acts as|functions as)\s+/gi, '');

  // Split on transition words to make a neat short phrase
  const parts = clean.split(/,?\s+(whereas|while|but|although|though|however|contrasted with|compared to|rather than|instead of)\s+/i);
  if (parts.length >= 3) {
    const p1 = heuristicShorten(parts[0]);
    const p2 = heuristicShorten(parts[2]);
    return `${p1}; ${p2}`;
  }

  // Strip trailing descriptors like "within the defined taxon", "of the organism", "found in animals"
  clean = clean.replace(/\s+(within the defined taxon|of the organism|found in animals|in evolutionary history|in phylogenetic trees|during development|in the fossil record|of sister taxa|of the group|of organisms)$/gi, '');

  // 4. Ultimate truncation: If still too long, take the first 4-5 words or truncate at comma/semicolon
  const finalParts = clean.split(/[,;]+/);
  if (finalParts[0].trim().split(/\s+/).filter(Boolean).length <= 5) {
    return finalParts[0].trim();
  }

  const finalWords = clean.split(/\s+/).filter(Boolean);
  if (finalWords.length > 5) {
    // Keep the first 4 words and make it look clean
    return finalWords.slice(0, 4).join(' ');
  }

  return clean;
}

async function run() {
  console.log('[INFO] Connecting to MongoDB...');
  await connectDB();
  console.log('[INFO] MongoDB Connected. Finding ZOO 102 course...');

  const course = await Course.findOne({ code: "ZOO 102" });
  if (!course) {
    console.error('[ERROR] ZOO 102 course not found!');
    process.exit(1);
  }

  console.log(`[STATUS] Found course: "${course.title}" (${course._id})`);

  const topics = await Topic.find({ course_id: course._id });
  const topicIds = topics.map(t => t._id);
  console.log(`[STATUS] Found ${topics.length} topics.`);

  const questions = await Question.find({ topic_id: { $in: topicIds } });
  console.log(`[STATUS] Found ${questions.length} total questions.`);

  let modifiedCount = 0;
  console.log(`\n[PROCESSING] Running advanced academic shortening on long options...`);

  for (const q of questions) {
    const rawA = q.a || "";
    const rawB = q.b || "";
    const rawC = q.c || "";
    const rawD = q.d || "";

    const cleanA = stripOptionMarkers(rawA).trim();
    const cleanB = stripOptionMarkers(rawB).trim();
    const cleanC = stripOptionMarkers(rawC).trim();
    const cleanD = stripOptionMarkers(rawD).trim();

    const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
    const maxWords = Math.max(wordCount(cleanA), wordCount(cleanB), wordCount(cleanC), wordCount(cleanD));

    // If any option has more than 4 words, we shorten them!
    if (maxWords > 4) {
      const shortA = heuristicShorten(cleanA);
      const shortB = heuristicShorten(cleanB);
      const shortC = heuristicShorten(cleanC);
      const shortD = heuristicShorten(cleanD);

      const correctOpt = String(q.correct_option || "a").trim().toLowerCase();

      let finalA = shortA;
      let finalB = shortB;
      let finalC = shortC;
      let finalD = shortD;

      // Re-apply correct option marker
      if (correctOpt === "a" || correctOpt === "option_a") {
        finalA += CORRECT_OPTION_MARKER;
      } else if (correctOpt === "b" || correctOpt === "option_b") {
        finalB += CORRECT_OPTION_MARKER;
      } else if (correctOpt === "c" || correctOpt === "option_c") {
        finalC += CORRECT_OPTION_MARKER;
      } else if (correctOpt === "d" || correctOpt === "option_d") {
        finalD += CORRECT_OPTION_MARKER;
      }

      if (finalA !== rawA || finalB !== rawB || finalC !== rawC || finalD !== rawD) {
        if (modifiedCount < 5) {
          console.log(`\n-------------------------------------------------------------`);
          console.log(`[EXAMPLE SHORTENING]`);
          console.log(`Q: "${q.text.substring(0, 60)}..."`);
          console.log(`BEFORE:`);
          console.log(`  A: "${cleanA}"`);
          console.log(`  B: "${cleanB}"`);
          console.log(`  C: "${cleanC}"`);
          console.log(`  D: "${cleanD}"`);
          console.log(`AFTER:`);
          console.log(`  A: "${shortA}"`);
          console.log(`  B: "${shortB}"`);
          console.log(`  C: "${shortC}"`);
          console.log(`  D: "${shortD}"`);
        }

        await Question.updateOne(
          { _id: q._id },
          {
            $set: {
              a: finalA,
              b: finalB,
              c: finalC,
              d: finalD,
              is_refined: true
            }
          }
        );
        modifiedCount++;
      }
    }
  }

  console.log(`\n=============================================================`);
  console.log(`[COMPLETED] Successfully processed and shortened ${modifiedCount} questions!`);
  console.log(`=============================================================`);
  process.exit(0);
}

run().catch(err => {
  console.error("Unhandled exception in local shortener:", err);
  process.exit(1);
});
