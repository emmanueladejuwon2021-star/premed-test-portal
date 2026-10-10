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

const STUDY_SESSIONS = [
  {
    number: 1,
    name: "Culture and Society: A Conceptual Clarifications",
    notes: "Clarification of concepts of culture and society. Definitions of culture by Clyde Kluckhohn (historically created design for living), E.B. Taylor (complex whole of knowledge, beliefs, art, morals, law, custom). Cultural policy of Nigeria's official definition (totality of the way of life evolved by a people to meet challenges in their environment). Culture is dynamic, complex, acquired, and transmitted through socialization and language. Three components of culture: 1. Technological/Material component (tangible, stone tools, bronze, iron, computers); 2. Sociological component/Institutions (rules, norms, relationships, public behavior, marriage); 3. Ideological component (ideas, beliefs, values, perception of self). Society definitions: tissue of human relations, global village, organized group of persons, communal (small, simple division of labor, homogenous, custom-regulated) vs associational (large, complex, marked division of labor, formal relationships)."
  },
  {
    number: 2,
    name: "Nigeria: An Ethno-Historical Survey",
    notes: "Over 350-400 ethnic groups in Nigeria. Earliest human habitation evidence at Nok (Plateau State, 39,000 BC). Late Stone Age sites: Mejiro cave (Oyo State), Rop rock shelters (Plateau State), Daima (Borno State), Iwo Eleru (Ondo State). Geopolitical zones: NW (Hausa & Fulani, Bayajidda legend of Baghdad marrying Queen of Daura, Hausa Bakwai [Daura, Katsina, Kano, Rano, Zazzau, Gobir, Biram] and Banza Bakwai [Zamfara, Kebbi, Gwari, Yauri, Nupe, Jukun, Oyo]. Town/sedentary Fulani [Muslim] vs Cattle/nomadic Fulani [animist, Uthman Dan Fodio]). NE (Borno/Kanem-Borno, Saif of Baghdad, Saifawa dynasty, king title Mai. Jukun/Kwararafa empire). NC (largest concentration of ethnic groups: Borgu, Nupe, Igala, Idoma, Ebirra, Tiv. Non-centralized. Nupe founded by Tsoede/Edegi [son of Igala king], capital at Nupako, Gbara, Jima. Igala founded by outsider, king title Atta, capital Idah). SW (Yoruba, Ile-Ife creation/Oduduwa legend, Oyo Kingdom [Oyo Mesi council headed by Bashorun], title Oba, palace aafin). SE (Igbo, no centralized politics, village autonomy, council of elders Amala, Arochukwu oracle Ibinu Ukpabi, age grades, Umuada daughters of the land). SS (Edo/Benin Kingdom [Oba, 13th century, brass cast art], Itsekiri [Iginua son of Oba of Benin], Ishan, Urhobo, Isoko. Ijaw of Niger Delta [wards/polo, households/wari, Amanyanabo ritual head]. Efik of Calabar [ settlements Obio Oko/Creek Town, Atakpa, Obutong, Nsidung, Obong titular head, Ekpe secret society])."
  },
  {
    number: 3,
    name: "Historical Foundations of Nigeria's Culture",
    notes: "Historical foundations in pre-colonial and colonial periods. Six elements shaped pre-colonial culture: Geography (coastal fishermen vs savannah cattle/agriculturalists), Economy, Migration (linguistic and economic exchange), Inter-marriage (solidified ties), War (absorption of cultures, slavery), Islam (19th century introduction, dress, beliefs). Colonialism impact: established the notion of \"ethnic groups\", shaped political and economic cultures, introduced Western education, dressing, marital traditions."
  },
  {
    number: 4,
    name: "Christianity and Political Culture in Nigeria",
    notes: "First introduced by Portuguese Catholic traders in late 15th century (little fruit, warri cross relic). Re-introduced in 19th century (bore lasting fruit). Denominations: CMS/Anglican, Catholic, Methodist, Baptist, Presbyterian. Native/African secessionist churches in late 19th century. Proliferation of African Instituted Churches (AICs/Aladura - C&S, CAC, Celestial, CLA) in early 20th century. Foreign Pentecostal expansion (Foursquare, Assemblies of God). Indigenous Pentecostal explosion in late 20th century (RCCG, Deeper Life, Living Faith, Christ Embassy). Contributions: cultural nationalism, socio-political activism, human rights advocacy (Okogie, Kukah, Gbonigi), critique of bad governance/corruption, women empowerment (ordaining female clergy in Aladura, RCCG, CAC)."
  },
  {
    number: 5,
    name: "Nigerian Cultural Heritage",
    notes: "Focuses on marriage, naming, funeral ceremonies, abominations/sacrileges. Marriage among Yoruba (Ifojusode, Alarina, Iyojusile, Idana with honey, kola, sugarcane, alligator pepper, palm oil). Akoko Edo (abduction/capture). Igbo (inquiry, visits, palm wine test, bride price, Igba Nkwu, pre-colonial confession). Fulani (Sharo test, cattle, box of dresses, white sheet chastity). Edo (circumcision, ancestral shrine confession). Ibibio (courtship service, fattening confinement, circumcision, Ikot Oku Nsit circle on pregnant belly). Efik (fattening up to 5 years, Ndem spirit). Igala (man's family entertains, search party for bride). Urhobo (spirit link, ancestral shrines, circumcision in 7th month of pregnancy). Tiv (broom sticks, capture, bride exchange, chastity test). Naming: Ibibio night birth shadow bad omen, order of names (Akpan, Adieba, Udoh, Unwa, Ufot, Udunwan, Mfon). Igbo 8th day, eldest man names, Nwa + market day (Nwaeke, etc.), Okpara, Ada, Ulu, Chi names. Yoruba 8th day, Babatunde, Iyabode, deity names. Funerals: Yoruba parents don't see child corpse, non-titled (7 wrappers), hunters (gun shots, general hunt). Ibibio young/child death mutilated, chief death drum beating on top of house. Utit Urian ( Ekong, Ekpo seated on chair with staff and drum). Igbo (Amadioha god of thunder village Umuamadi brings down hanging corpse). Abominations: Adultery, yam stealing. Incest. Mothers of twins in certain streams (Ibibio). Polygamous same day birth (Igbo). Crow flying over roof. Left toe against stone indicates early death. Visiting restricted palace parts (Edo/Yoruba). Benin: Oba has been swallowed by ground (never died). Ijaw: drowning (buried in evil forest). Ebira: step across leg of pregnant woman. Urhobo: woman pushing husband down. Diala marrying Osu. Whistling at night in Kogi brings evil spirits."
  },
  {
    number: 6,
    name: "Islam and Political Culture in Nigeria",
    notes: "Emergence of Islamic religion and how it affected political culture. Stage of establishment in Kanem-Borno, Hausaland, and Yorubaland. Kanem-Borno real process of Islamization began in 11th century with ruler Umme Jilme of Seifawa dynasty. Peak under Mai Idris Alooma (1570-1602) - Amirul Mumineen. Hausaland wave of Islamization under Sarki Yaji of Kano (1349-1385). Milestone under Sarki Rumfa (1463-1499) who requested Algerian scholar Al-Maghilli to write treatise 'Tajud-din fii ma yajib alalMuslim' (Obligation of the Princes) in 1492. 19th-century Jihad launched by Fulani emigrants led by Shehu Usman dan Fodio against syncretic practices of Habe rulers. United Hausa states under Sokoto Caliphate (Sharia law) introducing offices: Emir, Waziri, Galadima, Amirul Jaysh. Colapse in 1903. Spread of Islam in Yorubaland: Influx of liberated slaves, wars in Yorubaland, and emergence of Ilorin as frontier emirate of Sokoto Caliphate. Sharia imbroglio in Fourth Republic: 1976/1977 deliberations of Constitution Drafting Committee, 1988 Constituent Assembly. Ahmed Sanni Yerima (Zamfara State) introduced Sharia Penal Code in 1999. 12 Northern states adopted it. Emergence of Boko Haram in 2002 by Muhammed Yusuf in Maiduguri, Borno State (meaning 'Western education is forbidden')."
  },
  {
    number: 7,
    name: "Gender and Culture in Nigeria",
    notes: "Pattern of gender relations in pre-colonial and colonial Nigeria. Culture is broad, gender refers to cultural construction of female and male characteristics. Pre-colonial patriarchal system was favorable to women in the public sphere. Women had autonomy and control over their lives. Yoruba, Edo, and other southern groups: women occupied traditional positions of power. Women once ruled as substantive monarchs in Ile-Ife, Akure, Ilesa, Ondo, Ado Ekiti, and Abeokuta. In Oyo: women as titled office-holders in palace administration (Queen Mother ranked higher than Oyo-mesi). Titles: Erelu, Iyalode (Efunsetan Aniwura of Ibadan), Madam Tinubu of Abeokuta. Benin: Queen Mother Idia, Omosogie. Igbo: Omu (Queen), Omu society. Pre-colonial economy: women dominated the trade sector, outnumbering men in local markets (Nupe, Yoruba, Hausa-Fulani). Gendered division of labour. Crafts: dyeing, pottery, cosmetics, bead-making, vertical looms for weaving. Colonialism educational and administrative policies favored men and neglected women (Indirect Rule, schools targeted boys). European concubinage, urbanization, sexual immoralities, hotels, Sabongaris. Resistance/protests: Aba Women's Riot, Egba Women's Riot. Outspoken leaders: Olufunmilayo Ransome Kuti, Margaret Ekpo, G.I. Okoye. Post-colonial changes, education policy, Obasanjo administration appointments: Dora Akunyili, Ngozi Okonjo-Iweala, Oby Ezekwesili."
  },
  {
    number: 8,
    name: "Influence of Western Civilization on the Evolution of Nigerian Culture",
    notes: "Introduction of western education and civilization. Career of Nathaniel David Oyerinde: born 1893, Ogbomoso Christian lineage, early education under Rev. C. E. Smith. Imbibed self-help/endurance. Left for studies in 1906, BA in 1914, studied Greek, Mathematics, Economics. Returned in 1916. Headmaster of Baptist Academy Ogbomoso, established Baptist College & Theological Seminary. Refused ordination. First President of Ogbomoso Progressive Union (OPU) in 1933. Established Ogbomoso People's Institute (OPI) comprehensive school in 1938. Career of Eyo Ita: born Jan 9, 1903 at Creek Town Calabar. Master's in Philosophy from University of London in 1934. National Education Movement (1936) with Oyerinde, Herbert Macaulay, Azikiwe, Alvan Ikoku (model schools, communal help, African worldview). Established National Institute Calabar (1938) with Calabar Improvement League (CIL). Rep of gov investments in Southern Nigeria (1951-1960). Scholarship scheme. Free compulsory Universal Primary Education (UPE) blueprint. Career of Benjamin Nnamdi Azikiwe: left in 1925, role model James E. K. Aggrey. Proponent of western education. Thwarted Monrovia university project. Secretary of West African Press Delegation to UK. Summary of western impacts: consumerist habits (Coca-Cola, fast food, dressing, pop music, Western movies/drama)."
  },
  {
    number: 9,
    name: "Political Economy and Culture of Underdevelopment in Nigeria",
    notes: "Definitions of political economy (ownership of means of production, property relations, field of study). Substructure (economy) and superstructure (political/civil society). Primacy of economy & material production. Pre-colonial economy: subsistence, regional trade (Oyo, Benin, Igbo, Kano, etc.), trans-Saharan, Atlantic trade. Colonial economy: agricultural raw materials for Britain, Department of Agriculture (1910-1912), Moor Plantation (Ibadan), experimentation stations (Zaria, Umuahia, Benin), veterinary schools (Kano, Vom). Transport: railway (western line 1929, eastern 1930), roads (Trunk A, Trunk B, minor). Ports (Lagos, Port Harcourt, Sapele). Trade dominated by British firms (UAC, John Holt, Cadbury). Mining: Jos tin, Enugu coal, Zaria/Kano/Ilesha gold. Underdevelopment & dependency: disarticulated economy, vertical integration with Britain, no domestic industrial multiplier. Post-independence: petroleum dominance, struck in Oloibiri/Otuakeme in 1956, production in 1958. Petroleum export earnings. Domination by transnationals (Shell, Texaco, Mobil, Agip, Chevron). Resource control agitation, Niger Delta. Uncontrolled urbanization, rural neglect. Corruption setbacks: Babangida (toppled Buhari, freed governors, reversed property confiscation, extra-budgetary spending, Liberian/Sierra Leone ECOMOG), Abacha (1993, loot savings). Obasanjo (1999, created EFCC, ICPC). Yar'Adua, Jonathan (Book-Haram, Niger Delta insurgency), Buhari."
  },
  {
    number: 10,
    name: "Diasporic Culture and Nigeria's Development",
    notes: "Diaspora definition (\"scattering or dispersion\"). Push factors (political unrest, environmental, religious, economic, military rule) and Pull factors (\"greener pastures\"). NIDO (Nigerians in Diaspora Organization). Returnees: Brazilian returnees settled in Lagos/Abeokuta, introduced Brazilian-style architecture, Brazilian carnival. Creoles from Sierra Leone (Fourah Bay College 1827) and Liberia. Ex-slaves returnees: Thomas Babington Macaulay founded CMS Grammar School in 1859 (first secondary school). Ajayi Crowther (Grammar and Vocabulary of Yoruba Language in 1843, Anglican Bishop 1864, Delta/Bonny missionary). Samuel Johnson (History of the Yorubas 1897). Newspaper mobilization: Lagos Weekly Records (Jacksons), Lagos Observer (J. Bagan Benjamin). Shitta Bey (Muslim Creole, Mosque building in 1890s, £400). Remittances."
  },
  {
    number: 11,
    name: "Labour and Culture in the Pre-Colonial Period",
    notes: "Traditional culture of labour. Communal economic system, no wages or monetary remuneration. Family unit as main manpower. Reciprocal labour: collective projects (shrines, roads, houses), head of age grade feeds workers. Demographic problems: high land availability, low population, low life expectancy, epidemics, child raids/kidnappings, hence polygamy to ensure labour supply. Group farming types: 1. Male family members under eldest supervision; 2. Aro: Yoruba labor exchange among age-mates in rotation; 3. Owe: relative/in-law assistance to needy member; 4. Nabo: younger dependent youth labor exchange on father's farm. Pre-colonial insurance: kinship ties, credit/social security, 'Apo Ijo' or 'Otu', Esusu, Aro (Yoruba), Ogbo, Isusu, mitiri (Igbo). Recruitment by slavery, trans-Saharan slave trade. Crafts (calabash dressing in Yoruba, jewelry, beads, brass casting in Benin, cotton/textile widespread). Revenue: tolls, taxes on trade (salt dinar tolls). Remuneration/wage labor came with British in 20th century, Public Works Dept, plantations, mines, leading to saving, private spending, rise of new elite. Pre-colonial training: indigenous education, apprenticeship, boys taking fathers' occupation, girls learning cooking, sweeping, cloth dyeing from mothers, intellectual training by sitting beside fathers in meetings (oratory, proverbs)."
  },
  {
    number: 12,
    name: "Intergroup Relations among Nigerian Communities",
    notes: "348 languages, 374 ethnic groups. Pre-dated 1914 amalgamation. Oral traditions of origin: Kanem-Borno (Saif from Baghdad, Saifawa dynasty), Hausa (Bayajida legend, Daura, snake killing, Bawo, Hausa Bakwai and Banza Bakwai), Kisra legend (Yoruba, Nupe, Bariba, Emir of Bussa and Oni of Ife brothers), Yoruba (Oduduwa from Mecca, Oranmiyan and Bini Eweka dynasty), Igbo (autochthony, Nsukka-Okigwe Cuesta, Egypt migration), West Niger Delta (Umu-Ezechinma, Bini/Igbo mix), Isoko (Edo origins, Ovie title), Itsekiri (Iginuwa). Conflicts (Yoruba vs Nupe wars, Kano vs Katsina, Jukun/Kwararafa conquests, Benin military expansion to Idah/Auchi/Lagos Eko [Bajulaiye, Olorogun, Basua titles], Igala vs Nsukka Igbo wars [Onoja Ogboni, Achandu Igbo slave office]). Trade/Commerce: barter, markets, trans-Saharan, trans-Atlantic. Item exchanges: Jukun salt for Tiv firewood, Borno horses to Oyo, Nupe shea butter/potash with Yoruba. Europeans/Slave trade. Religion: supreme deity, pantheon. Divination: Ifa (Yoruba), Afa (Igbo), Eva (Isoko), Iha (Bini), Eba (Nupe). Igunu (Yoruba) and Ndakogbaya (Nupe). Ubinu Ukpabi oracle (Ibibio origin, Aro conquest). Ekpe and Ekpo (Efik, Ibibio, Igbo). Nsibidi sign language (Ibibio origin). Traditional festivals (Igba Iwu among west-Niger Igbo). Bori cult (Hausa). Islam spread: 11th century Borno, 1804 Jihad. Christianity: Portuguese 15th century."
  },
  {
    number: 13,
    name: "Cities and Urban Culture in Nigeria",
    notes: "Description of city (dense population, non-agricultural). Table of cities. Colonial cities: Enugu (1909 geologist Kikson coal), Port Harcourt (1912 coal export, oil 1956), Kaduna (1913 Lugard HQ). Railway string of urban nuclei: Aba, Umuahia, Makurdi, Kaduna, Jos. Capital designation growth: Owerri (8000 employees). Industrial cities: Sapele (timber/rubber by Miller Brothers 1917, UAC 1929/1935). Urban culture characteristics: multicultural (Lagos \"no-man's land\"), competitive, individualistic (capitalist ethos), interactive/diverse (Aso-ebi), mix of affluence/poverty (SAP), high crime rate."
  },
  {
    number: 14,
    name: "The Contribution of Nigerian Women to National Development since Independence",
    notes: "Contribution of Nigerian women to national development since independence. UN Decade for Women 1975-1985. Marginalization of women. Post-independence mass political action dwindled. Military rule 1966. Obasanjo transitional politics, women appointed to Constituent Assembly and Local Gov Councils. No woman state governor. 1979 civilian politics. 4 out of 475 candidates for Senate were women (none successful). Two women elected to Fed House of Reps. only 5 women to state Houses of Assembly. Babangida administration: Grace Alele-Williams as first female VC. Better Life Programme for Rural Women in 1987 by Mrs. Maryam Babangida. Family Support Programme by Maryam Abacha in 1995. Women in late 1980s and 1990s. Education boom in 1970s, late 1980s over 42% in primary were girls. informed motherhood. Uthman Dan Fodio castigating Hausa aristocracy for not educating women. Oil boom of 1970s. agriculture decisive, women supply over 70% of labour force in agriculture. Operation Feed the Nation, Green Revolution. Informal sector: hair dressing, sewing, pottery, basketry, mat, sweets, soap. Eastern Nigeria civil war (1967-1970). SAP in 1980s. Hardships: divorce, death, underage marriage, VVF (Vesico-Vaginal Fistula) in Northern Nigeria. Purdah. Women's Commission (Babangida), Women's Ministry (Abacha). 1990s women organizations (NCWS - Nigerian Council for Women's Societies, hijacked). Beijing Conference 1995 (empowerment). Vision 2010. Summary."
  },
  {
    number: 15,
    name: "Culture of Corruption in Nigeria",
    notes: "Definition: taking advantage of the system, manipulating procedures (bribery, extortion, contract fraud, \"brown envelope journalism\", pocketing ghost salaries, soliciting marks, nepotism). Pre-colonial: strong moral values, open shaming, rituals, family name ridicule. Colonial introduction: Indirect Rule (eliminated ritual fears, monetized culture), Warrant Officers (abuse of power, bribes), non-transparent taxation (Aba Women's Riot). Post-independence: oil export replaced agriculture, quick money, culture of hard work lost. Causes: greed, poor reward, poverty, weak institutions (\"anything goes\"), family/ethnic pressure (nepotism). Effects: political (compromised elections, rigging), economic (looted treasury, foreign banks Switzerland/USA/Britain, poor infrastructure), social (skepticism, loss of commitment, bad international image). Solutions: value orientation, political de-monetization, committed leadership, judiciary strengthening, anti-corruption agencies (ICPC, EFCC, CCB, CCT, PCC)."
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSequentialSeeder() {
  console.log("[INFO] Connecting to MongoDB...");
  await connectDB();

  // Find course
  let course = await Course.findOne({ code: { $regex: /^gst\s*112$/i } });
  if (!course) {
    console.error("[ERROR] Course GST 112 not found. Run the seed script once first.");
    process.exit(1);
  }

  console.log(`[INFO] Found GST 112 Course. Seeding sequentially to avoid rate limits...`);

  const TARGET_QUESTIONS_PER_TOPIC = 200;
  const BATCH_SIZE = 25;
  const MODELS = ["gemini-3.1-flash-lite", "gemini-flash-latest"];
  let modelIndex = 0;

  for (const session of STUDY_SESSIONS) {
    const tName = `Study Session ${session.number}: ${session.name}`;
    const topic = await Topic.findOne({ course_id: course._id, name: tName });
    if (!topic) {
      console.warn(`[WARN] Topic not found: ${tName}. Skipping.`);
      continue;
    }

    let currentCount = await Question.countDocuments({ topic_id: topic._id });
    console.log(`\n======================================================`);
    console.log(`[SESSION ${session.number}] "${topic.name}" | Current questions: ${currentCount}`);
    console.log(`======================================================`);

    while (currentCount < TARGET_QUESTIONS_PER_TOPIC) {
      const needed = TARGET_QUESTIONS_PER_TOPIC - currentCount;
      const batchToGenerate = Math.min(BATCH_SIZE, needed);
      const activeModel = MODELS[modelIndex];
      console.log(`[GENERATOR] Generating ${batchToGenerate} hard MCQs for Session ${session.number} using model: ${activeModel}...`);

      const systemPrompt = `You are a distinguished University Professor in African Studies and Nigerian History, writing hard, challenging, board-level multiple choice questions for the course GST 112: Nigerian Peoples and Culture.
Your task is to generate highly authentic, advanced-level questions based EXACTLY on the notes of: Study Session ${session.number}: ${session.name}.

Your questions must:
1. Cover detailed mechanical, historical, and conceptual specifics mentioned in the notes.
2. Be challenging and intellectually stimulating ("HARD ones" for undergraduate board examinations). No simple recall. Use scenario-based analysis or deep historical correlation.
3. Be 100% accurate to the provided study guide material.
4. Have distinct options A, B, C, and D, with clear explanations of why the correct option is correct and why the distractors are wrong.
5. Have different correct options (distribute 'a', 'b', 'c', and 'd' evenly).
6. CRITICAL OPTION DESIGN RULES:
   - Options A, B, C, and D MUST have identical or almost identical length (e.g. same word count, grammatical style, and phrasing depth).
   - Distractors (incorrect choices) MUST be extremely plausible and intellectually tricky, presenting real-world misconceptions or alternative historical interpretations, not obviously fake options.
   - The correct option must NOT stand out or be glaringly obvious (e.g. it must not be longer, more detailed, more qualified, or more grammatically complex than the distractors).
7. CRITICAL LANGUAGE RULE: NEVER explicitly reference the source text, 'the notes', 'the text', 'as stated in the text', 'according to the notes', 'provided material', 'study guide', or similar phrases in the questions or explanations. Write them as independent academic facts or explanations as if they are in an official exam paper.

CRITICAL: Return the response in strict JSON array format matching the requested schema. Do NOT wrap the JSON in Markdown ticks or any additional text.`;

      const userPrompt = `Generate exactly ${batchToGenerate} unique, difficult multiple choice questions based on these notes:
"${session.notes}"

The questions must be highly original, distinct from each other, and intellectually hard. Specify 'a', 'b', 'c', or 'd' as correct_option (lowercase). All options A, B, C, D must have identical length and the correct option must not be glaringly obvious. NEVER mention "the notes", "the text", or "study guide" in questions or explanations.`;

      try {
        const response = await ai.models.generateContent({
          model: activeModel,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
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
          const questionsToInsert = parsed.map((q: any) => ({
            topic_id: topic._id,
            text: q.text,
            a: q.a,
            b: q.b,
            c: q.c,
            d: q.d,
            correct_option: (q.correct_option || "a").toLowerCase().trim(),
            explanation: q.explanation,
            is_refined: true
          }));

          const docs = await Question.insertMany(questionsToInsert);
          currentCount = await Question.countDocuments({ topic_id: topic._id });
          console.log(`[SUCCESS] Seeded ${docs.length} questions. Total now: ${currentCount}/${TARGET_QUESTIONS_PER_TOPIC}`);

          // Sync Mongoose count
          topic.question_count = currentCount;
          await topic.save();
        } else {
          console.log(`[WARN] Empty JSON response array returned.`);
        }
      } catch (err: any) {
        console.error(`[ERROR] Batch generation failed on ${activeModel}:`, err.message);
        modelIndex = (modelIndex + 1) % MODELS.length;
        console.log(`[ROUTER] Rotated to next model: ${MODELS[modelIndex]}`);
        console.log("[INFO] Waiting 10 seconds before retrying...");
        await delay(10000);
        continue;
      }

      // 5 seconds delay to prevent rate limits or server spikes
      await delay(5000);
    }
  }

  console.log("[SUCCESS] All GST 112 topics are fully seeded with 200 questions each!");
  process.exit(0);
}

runSequentialSeeder().catch(err => {
  console.error("[CRITICAL]", err);
  process.exit(1);
});
