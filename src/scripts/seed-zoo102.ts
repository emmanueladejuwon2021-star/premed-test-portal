import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const ZOO_TOPICS = [
  {
    number: 1,
    name: "Geographic Distribution of Animal Life and Issues in Conservation of Biodiversity",
    notes: `Geographic Distribution of Animal Life and Issues in Conservation of Biodiversity.
Animal species show highly uneven, non-random patterns of distribution across Earth. This results from a complex interaction of environmental, evolutionary, historical, and ecological factors that limit where species can survive, reproduce, and disperse.
Global Factors Influencing Range:
1. Climate: Temperature and rainfall define major biomes (tropical forests, deserts, tundras). Species have physiological limits (e.g., heat tolerance, water requirements) that restrict their ranges. Polar bears are confined to Arctic regions, while tropical birds thrive in rainforests.
2. Habitat Heterogeneity: Different regions provide different types of habitats (forests, grasslands, wetlands). Habitat availability and quality determine where species can find food, shelter, and breeding sites. Species adapted to particular habitats cannot easily colonize others (e.g., freshwater fish cannot live in the ocean).
3. Historical and Evolutionary Processes: Continental drift has separated species over millions of years, creating distinct biogeographic realms (e.g., Neotropical, Afrotropical). Past climate changes (ice ages) forced species to shift or fragment their ranges. Evolutionary history leads to endemism—species found nowhere else (e.g., lemurs of Madagascar, marsupials in Australia).
4. Vicariance: The splitting of a species' range by a barrier (e.g., mountains rising, rivers changing course, continental drift). Populations become isolated and may diverge genetically, leading to speciation. Example: Ratites (ostrich, emu, rhea) are flightless birds on different continents—a relic of Gondwana fragmentation.
5. Barriers to Dispersal: Physical barriers (oceans, mountains, deserts) limit movement. Islands often have unique faunas that evolved in isolation. Connected habitats may be separated by unsuitable terrain.
6. Biotic Interactions: Competition, predation, mutualism, and disease shape where species can establish and thrive. Invasive species can exclude natives. Some species depend on specific partners (e.g., pollinators, symbionts).
7. Human Activities: Habitat destruction, overexploitation, climate change, and species introductions.

Latitudinal Diversity Gradient: Species richness generally declines from the equator toward the poles. Tropical regions support many more species due to stable climates, higher productivity, and long evolutionary histories without glaciation.

Dispersal and Colonisation: Dispersal is the movement of individuals away from their place of birth. Birds cross barriers more easily than amphibians. Colonisation occurs when dispersing individuals establish a viable population. Island biogeography theory (MacArthur & Wilson, 1967): islands closer to continents tend to have more species.

Niche Theory: Fundamental niche (all conditions where a species can survive and reproduce) vs. Realised niche (actually occupied, limited by competition, predation, dispersal barriers).

Biogeographical Factors and Ecoregions in Nigeria:
- Climate Gradients: From humid tropical rainforests in the south (annual rainfall >3,000 mm) to semi-arid Sahel in the north (rainfall <500 mm). Central belt has Guinea and Sudan savannas.
- Topography: Terrain ranges from low-lying coastal plains to highlands/plateaus (Jos, Mambilla, Obudu at ~1,500 m elevation). These elevated areas act as "ecological islands"—isolated habitats with cooler climates, supporting montane-adapted species and local endemics (e.g., Leptopelis spp., Monticola semitorquatus).
- Hydrology: Major river systems (Niger and Benue) form one of Africa's largest inland delta systems, producing extensive floodplains/wetlands (Hadejia-Nguru and Lokoja acting as migratory stopovers for Afro-Palaearctic waterbirds) and riverine forests acting as wildlife corridors.
- Key Ecoregions in Nigeria:
  1. Niger Delta Mangroves: Rich in amphibious and aquatic species (e.g., manatees, mudskippers, estuarine birds).
  2. Lowland Rainforests: Primates, forest elephants, pangolins, endangered primates (Colobus vellerosus, Cercopithecus erythrogaster).
  3. Guinean Forest-Savanna Mosaic: Transitional habitat with mixed species.
  4. Sudanian Savanna and Sahel: Savanna elephants, cranes, antelopes, Kobus kob, Papio anubis, Lanius senator, drought-tolerant fauna (Oryx dammah - now extirpated), reptiles, Sahel-adapted birds.
  5. Montane Forest-Grassland Mosaic: Unique bird species, montane flora/fauna.

Concept of Conserving Biodiversity: Goals include ensuring sustainable populations of species, maintaining ecosystem services (pollination, water purification, climate regulation), and supporting resilience.
- Loss of Biodiversity Consequences: Reduced ecosystem stability, loss of key services (soil fertility, water filtration, carbon storage), disruption of food webs (removal of top predators or important pollinators).
- Nigeria's Conservation Challenges: Habitat loss (agriculture, logging, urban expansion), Bushmeat hunting and trade (unsustainable offtake), Fragmentation (roads, settlements), Human-Wildlife Conflict, Weak Enforcement.
- Species of Concern in Nigeria: Cross River Gorilla (fewer than 300 remain), Forest Elephant (threatened by ivory poaching), Ibadan Malimbe (endemic bird found only in southwestern forest patches), White-throated Guenon (endemic primate threatened by hunting/clearing), Hooded Vulture (declining due to poisoning, bushmeat, traditional medicine), Pangolins.
- Conservation Actions: Establishing protected areas (Cross River National Park, Yankari Game Reserve), Community-based conservation, Anti-poaching patrols, Research/monitoring, International collaborations (CITES, CBD).`
  },
  {
    number: 2,
    name: "Introduction to Animal Systematics",
    notes: `Introduction to Animal Systematics: Major features of the animal phylogenetic tree.
Animal systematics is the field of biology dedicated to classifying and understanding evolutionary relationships among animals. It encompasses taxonomy (naming, describing, classifying) and phylogeny (evolutionary history). Uses morphology, molecular data (DNA), and behavioral traits.

Key Concepts:
- Taxonomy: Science of naming, describing, and classifying.
- Phylogeny: Evolutionary history, often depicted as a tree-like diagram.
- Clades: Monophyletic groups including a common ancestor and all its descendants.
- Homology: Similarity due to shared ancestry (e.g., forelimbs of humans, bats, whales).
- Analogy: Similarity due to convergent evolution, not shared ancestry (e.g., wings of insects and birds).
- Importance of Systematics: Provides a framework for understanding diversity, helps in conservation of endangered species, provides foundation for ecology, behavior, and evolution.

Features of a Phylogenetic Tree:
- Branches: Represent evolutionary history and relatedness.
- Taxa: Endpoints of branches representing present-day species (Operational Taxonomic Units - OTUs).
- Node: Connecting point where two branches meet, representing an inferred common ancestor.
- Root: Represents the common ancestor of all members of the tree.
- Cladogram vs. Phylogenetic Tree: Cladograms represent evolutionary relationships based on shared derived traits (synapomorphies) where branch lengths do not represent time or degree of divergence. Phylogenetic trees represent descent patterns where branch lengths may represent evolutionary time or genetic change/divergence.
- Monophyly, Paraphyly, Polyphyly:
  * Monophyletic (Clade): Group including a common ancestor and all of its descendants.
  * Paraphyletic: Group excluding some descendants.
  * Polyphyly: Group combining unrelated lineages.

Basis of Classification Evidence: Based on morphological, fossil, and genetic evidence. Molecular biology allows comparisons of DNA and protein sequences, clarifying relationships between morphologically similar but genetically distinct groups. Example: Molecular data revealed echinoderms and chordates share a closer relationship than previously thought.`
  },
  {
    number: 3,
    name: "Basis of Categorization of the Diversity of Animals",
    notes: `Basis of Categorization of the Diversity of Animals.
Animal classification systems characterize animals based on their anatomy, morphology, evolutionary history, embryological development features, and genetic makeup.

Core Categorization Criteria:
1. Multicellularity: Multicellular organisms are composed of many cells. Developed by cellular specialization and division of labour. Visible to the naked eye, possess distinct organs/systems, are eukaryotes.
   - Simple Multicellularity: Composed of multiple similar cells occurring widely in the eukaryotic tree of life. Cells are similar in structure and function, with limited cell-to-cell communication. Lacks advanced levels of cell differentiation (colonial multicellularity).
   - True Multicellularity: Advanced form where cells are specialized and work together forming tissues and organs. Mitosis (two genetically identical 2n daughter cells, used for growth/repair) and Meiosis (four non-identical haploid n gametes/spores, reduction division, crucial for genetic diversity).

2. Body Symmetry: Balanced proportion of an animal.
   - Asymmetry: No symmetry, unique feature of Parazoa (Sponges).
   - Radial Symmetry: Symmetrical around a central axis (e.g., Ctenophora and Cnidaria like jellyfish, sea anemones). Suited for stationary/limited-motion lifestyles. Echinodermata display secondary radial symmetry as adults but their larval stages are bilateral.
   - Bilateral Symmetry: Divided into matching left and right halves. Promoted cephalization (collection of an organized nervous system at the anterior end), active mobility, and sophisticated predator-prey relationships.

3. Tissue Organization: Animals develop either two or three embryonic germ layers during gastrulation.
   - Diploblasts: Radial animals with two germ layers: an inner endoderm and outer ectoderm, with a non-living layer in between.
   - Triploblasts: Bilateral animals with three tissue layers: inner endoderm, outer ectoderm, and middle mesoderm (building block for heart, muscle, bones, blood).

4. Body Cavity (Coelom): Fluid-filled compartment protecting internal organs.
   - Acoelomates: Triploblasts with no coelom; the mesoderm region is completely filled with tissue (e.g., Phylum Platyhelminthes / flatworms).
   - Pseudocoelomates: Triploblasts with a "false" coelom derived partly from mesoderm and partly from endoderm, found between the two layers (e.g., Phylum Nematoda / roundworms).
   - Coelomates (Eucoelomates): True coelom completely lined by mesoderm-derived epithelium (e.g., Phylum Annelida, Mollusca, Arthropoda, Echinodermata, and Chordata). Provides cushioning, shock absorption, allows organs to grow and move freely, and provides space for nutrient diffusion.

5. Developmental Mode and Blastopore Fate:
   - During gastrulation, an indentation called the blastopore forms.
   - Protostomes ("mouth first"): The blastopore develops into the mouth, and the second opening becomes the anus (e.g., Arthropods, Molluscs, Annelids). Cleavage is typically spiral and determinate.
   - Deuterostomes ("mouth second"): The blastopore develops into the anus, and the second opening becomes the mouth (e.g., Chordates, Echinoderms). Cleavage is typically radial and indeterminate.

6. Presence of Notochord:
   - Non-Chordates: Lack a notochord (Phylum Porifera to Phylum Echinodermata).
   - Chordates: Possess a notochord during embryonic development. In complex chordates, it differentiates into the vertebral column (Vertebrates), while chordates without a vertebral column are Invertebrates.

7. Levels of Classification: Domain (Eukarya), Kingdom (Animalia), Phylum (Chordata), Class (Mammalia), Order (Carnivora), Family (Canidae), Genus (Vulpes), Species (Vulpes vulpes).`
  },
  {
    number: 4,
    name: "Diversity of Animal Forms, Structures, and Functions",
    notes: `Diversity of Animal Forms, Structures, and Functions.
Animal diversity spans over 600 million years, leading to a wide variety of body plans and adaptations (>1.4 million described species).

Vertebrate Body Plan: Characterized by a vertebral column, a skull encasing a brain, an internal skeleton, and paired appendages.

Functional Adaptations:
- Movement: Flying (birds, bats), swimming (fish), crawling (worms).
- Feeding: Filter feeders (sponges), predators (cats), grazers (cows).
- Respiration: Gills (fish), lungs (mammals), skin (amphibians).
- Reproduction: Sexual vs. asexual; oviparous (egg-laying) vs. viviparous (live birth).

Major Vertebrate Classes:
1. Fish (Pisces): Streamlined bodies, skin covered in scales, gills for respiration, two-chambered heart, lateral line system for sensing vibrations, external reproduction with high egg output.
2. Amphibians: Permeable skin for respiration/moisture, limbs adapted for water and land, respiration via gills (larvae), lungs, and skin, three-chambered heart, undergo metamorphosis, ecologically sensitive.
3. Reptiles: Tough keratinized skin, limbs positioned for land movement (snakes are limbless), well-developed lungs, excretion of uric acid, three-chambered heart (crocodilians have a four-chambered heart), amniotic eggs.
4. Birds: Feathers for flight/insulation, hollow bones, wings (modified forelimbs), beaks adapted to diet, highly efficient respiratory system with air sacs for unidirectional airflow, four-chambered heart, endothermic.
5. Mammals: Hair for insulation, mammary glands to feed young, lungs with a diaphragm, four-chambered heart, large brains, extensive parental care.

Skeletal & Muscular Systems: Skulls, limb bones, and vertebral structures customized for locomotion strategies (flying, running, swimming).

Digestive & Respiratory Systems: Digestive tract variations in herbivores (stomach/intestinal fermentation, e.g., kangaroo, pony), carnivores (simple short tract, e.g., dog), and omnivores (e.g., pig). Respiratory variations including gills, lungs, and specialized structures like bird air sacs.`
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function seedZooCourse() {
  console.log("[INFO] Connecting to MongoDB...");
  await connectDB();

  // Find ZOO 102 course
  let course = await Course.findOne({ code: { $regex: /^zoo\s*102$/i } });
  if (!course) {
    console.log("[INFO] ZOO 102 Course not found. Creating it...");
    course = await Course.create({
      code: "ZOO 102",
      title: "Zoology II (Animal Diversity)",
      icon: "BookOpen",
      is_mock: false,
      results_hidden: false,
      force_start: false,
      duration: 40,
      question_limit: 30, // Default display limit during tests
      attempts_allowed: 3,
      is_locked: false,
      results_locked: false,
      is_master: true
    });
  } else {
    console.log("[INFO] ZOO 102 Course found. Updating master/limit fields...");
    course.is_locked = false;
    course.results_locked = false;
    course.is_master = true;
    course.attempts_allowed = 3;
    await course.save();
  }

  const courseId = course._id;
  console.log(`[STATUS] Course ID: ${courseId}`);

  // Delete all old topics for ZOO 102 to ensure clean new structure mapping
  const oldTopics = await Topic.find({ course_id: courseId });
  const oldTopicIds = oldTopics.map(t => t._id);
  
  console.log(`[CLEANUP] Deleting ${oldTopics.length} old topics and their questions...`);
  await Question.deleteMany({ topic_id: { $in: oldTopicIds } });
  await Topic.deleteMany({ course_id: courseId });
  console.log(`[CLEANUP] Old ZOO 102 data cleared successfully.`);

  for (const session of ZOO_TOPICS) {
    console.log(`\n=============================================================`);
    console.log(`[TOPIC] Creating topic: "Study Session ${session.number}: ${session.name}"`);
    
    const topic = await Topic.create({
      course_id: courseId,
      name: `Study Session ${session.number}: ${session.name}`,
      notes: session.notes,
      question_count: 0
    });

    const topicId = topic._id;
    const TARGET_QUESTIONS = 10;
    const BATCH_SIZE = 10;
    let questionsSeeded = 0;

    const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let modelIndex = 0;

    while (questionsSeeded < TARGET_QUESTIONS) {
      const batchToGenerate = Math.min(BATCH_SIZE, TARGET_QUESTIONS - questionsSeeded);
      console.log(`[GENERATING] Requesting batch of ${batchToGenerate} questions for Topic ${session.number} (${questionsSeeded}/${TARGET_QUESTIONS})...`);

      const systemPrompt = `You are a distinguished University Professor in Zoology, Animal Biology, and Comparative Anatomy.
Your task is to generate extremely challenging, board-level, high-quality multiple choice questions based on the provided notes.

CRITICAL RULES:
1. Every question MUST be unique, intellectually difficult, and focus on testing deep understanding, mechanisms, processes, structural/functional comparisons, or exceptions.
2. Do NOT write simple recall or trivial definition questions. Focus on comparative morphology, developmental modes, evolutionary biology, and physiological adaptations.
3. Options A, B, C, and D MUST be EXTREMELY short and concise (ideally 2 to 5 words maximum, or very brief scientific phrases). Eliminate all unnecessary words, prepositions, and explanations within the options.
4. CRITICAL: Every option MUST be grammatically complete, meaningful, and make perfect academic sense as a standalone phrase. They must NEVER be cut off, truncated mid-sentence, or contain trailing nonsense.
5. Distractors (incorrect options) MUST be highly plausible, presenting common scientific misconceptions or alternative evolutionary theories. They must not be obviously fake or silly options.
6. Options A, B, C, and D MUST have identical or almost identical content length (e.g. same word count, sentence structure, and grammatical style) so that they are indistinguishable in visual length and pattern.
7. The correct option must NOT stand out or be glaringly obvious (e.g. it must not be longer, more detailed, more qualified, or more grammatically complex than the distractors).
8. DO NOT EXPLICITLY REFERENCE 'the notes', 'the text', 'as stated in the text', 'provided notes', 'according to the notes', 'lecture slides', or similar phrases in the questions or explanations. Write them as standalone academic/scientific exam questions as if they are in an official university final board examination.
9. Return exactly the requested number of questions.

JSON Output Schema:
Provide a JSON array matching this exact schema:
[{
  "text": "The question text here...",
  "a": "Option A content...",
  "b": "Option B content...",
  "c": "Option C content...",
  "d": "Option D content...",
  "correct_option": "a", // must be lowercase 'a', 'b', 'c', or 'd'
  "explanation": "High-quality academic explanation of why the correct option is correct and why the other options are sophisticated distractors."
}]

CRITICAL: Return the response in strict JSON array format matching the requested schema. Do NOT wrap the JSON in Markdown ticks or any additional text.`;

      const userPrompt = `Generate exactly ${batchToGenerate} unique, difficult multiple choice questions based on these notes:
"${session.notes}"

Ensure all options A, B, C, D are very concise (2-5 words or short phrases), grammatically complete, and highly sophisticated. NEVER mention "the notes", "the text", or "study guide" in questions or explanations. Distribute 'correct_option' evenly among a, b, c, d.`;

      let success = false;
      let attempts = 0;

      while (!success && attempts < 4) {
        const activeModel = models[modelIndex % models.length];
        console.log(`[AI CALL] Sending to model ${activeModel} (Attempt ${attempts + 1}/4)...`);
        
        try {
          const response = await ai.models.generateContent({
            model: activeModel,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.35,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    a: { type: Type.STRING },
                    b: { type: Type.STRING },
                    c: { type: Type.STRING },
                    d: { type: Type.STRING },
                    correct_option: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["text", "a", "b", "c", "d", "correct_option", "explanation"]
                }
              }
            }
          });

          const textResult = response.text || "";
          const cleanJson = textResult.trim();
          const parsed = JSON.parse(cleanJson);

          if (Array.isArray(parsed) && parsed.length > 0) {
            const CORRECT_OPTION_MARKER = '\u200E\u200F\u200E';
            const questionsToInsert = parsed.map(q => {
              const correctOpt = (q.correct_option || "a").toLowerCase().trim();
              let aVal = q.a || "";
              let bVal = q.b || "";
              let cVal = q.c || "";
              let dVal = q.d || "";
              
              if (correctOpt === "a") aVal += CORRECT_OPTION_MARKER;
              else if (correctOpt === "b") bVal += CORRECT_OPTION_MARKER;
              else if (correctOpt === "c") cVal += CORRECT_OPTION_MARKER;
              else if (correctOpt === "d") dVal += CORRECT_OPTION_MARKER;

              return {
                topic_id: topicId,
                text: q.text,
                a: aVal,
                b: bVal,
                c: cVal,
                d: dVal,
                correct_option: correctOpt,
                explanation: q.explanation,
                is_refined: true
              };
            });

            const docs = await Question.insertMany(questionsToInsert);
            questionsSeeded += docs.length;
            console.log(`[SUCCESS] Seeded ${docs.length} questions successfully.`);
            success = true;
          } else {
            console.log(`[WARN] Empty or invalid JSON array received from Gemini.`);
            attempts++;
            modelIndex++;
          }
        } catch (err: any) {
          console.error(`[ERROR] Attempt ${attempts + 1} failed:`, err.message);
          attempts++;
          modelIndex++;
          const waitTime = err.message.includes('429') || err.message.includes('quota') ? 30 : 5;
          console.log(`[INFO] Waiting ${waitTime} seconds before retrying...`);
          await delay(waitTime * 1000);
        }
      }

      if (!success) {
        console.error(`[FATAL] Failed to seed batch. Retrying after pause.`);
        await delay(10000);
      }

      // Update question count in topic
      topic.question_count = questionsSeeded;
      await topic.save();

      // Pacing to avoid hitting rate limits
      console.log(`[PACING] Waiting 15 seconds to respect rate limits...`);
      await delay(15000);
    }

    console.log(`[TOPIC FINISH] Seeded Grand Total of ${questionsSeeded} questions for Study Session ${session.number}.`);
  }

  console.log(`\n=============================================================`);
  console.log(`[SUCCESS] ZOO 102 course completely seeded with 4 topics, each with 10 high-quality questions!`);
  console.log(`=============================================================`);
  process.exit(0);
}

seedZooCourse().catch(err => {
  console.error("Unhandled exception in seeder:", err);
  process.exit(1);
});
