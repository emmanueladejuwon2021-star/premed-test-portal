import { Course, Topic, Question, Result } from "../models";
import { verifyToken, requireAdmin } from "../middleware/auth";
import { connectDB } from "../db";
import { ANIMALIA_QUESTIONS } from "../data/animaliaQuestions";
import { ADAPTATION_QUESTIONS } from "../data/adaptationQuestions";

import { FastifyInstance } from "fastify";

// Raw Questions Text (100 premium multiple-choice questions)
const NUTRITION_QUESTIONS_RAW = `1. Which process enables an organism to manufacture food from inorganic chemicals? A) Phototropism B) Ingestion C) Chemotropism D) Heterotrophism solution: C Explanation: The text defines chemotropism as manufacturing food using inorganic chemicals.
2. What structural feature helps plant cells get gases needed for life functions? A) Lenticels B) Heartwood C) Stomata D) Mycelia solution: C Explanation: Plants obtain the gases they need through pores of intercellular spaces called stomata.
3. Which group contains only organisms that use autotrophic nutritional pathways? A) Green plants, algae, some bacteria B) Fungi, algae, green plants C) Dodder, green plants, bacteria D) Algae, broomrape, some bacteria solution: A Explanation: Autotrophs include green plants, algae, and some bacteria.
4. What is a defining feature of the process of chemosynthesis? A) It requires sunlight to oxidize carbon B) It relies on chemical cellular reactions C) It liberates oxygen into the air D) It utilizes water as a hydrogen donor solution: B Explanation: Chemosynthetic energy is obtained by chemical reactions within the cell and does not require light.
5. Which chemical energy source can be utilized during cellular chemosynthesis? A) Hydrogen gas, hydrogen sulfide, ferrous iron B) Ethyl alcohol, hydrogen sulfide, nitrates C) Ferric hydroxide, elemental sulfur, methane D) Ferrous hydroxide, ammonia, nitrous acid solution: A Explanation: Chemosynthesis energy sources include hydrogen gas, hydrogen sulfide, or ferrous iron.
6. What waste product is produced when sulfur bacteria oxidize hydrogen sulfide? A) Hydrogen gas B) Elemental sulfur C) Methane gas D) Ferrous iron solution: B Explanation: Sulfur bacteria consume hydrogen sulfide gas and produce solid, elemental sulfur as a waste product.
7. What gives water its reddish color near iron bacterial activities? A) Consumption of elemental sulfur deposits B) Oxidation of ferrous to ferric hydroxide C) Reduction of ferric iron to carbon D) Processing of stagnant hydrogen sulfide gas solution: B Explanation: Iron bacteria oxidize ferrous hydroxide to ferric hydroxide, making the water reddish.
8. Which organism converts ammonia directly into nitrite inside soil environments? A) Nitrobacter B) Mistletoe C) Nitrosomonas D) Dodder solution: C Explanation: Nitrosomonas is a nitrite bacterium that converts ammonia to nitrite.
9. What is the direct substrate oxidized by the bacterium Nitrobacter? A) Ammonia B) Nitrite C) Nitrate D) Oxygen solution: B Explanation: Nitrobacter is a nitrate bacterium that converts nitrite to nitrate.
10. Why is ammonia conversion vital before plants use it for growth? A) Ammonia is toxic to most plants B) Ammonia contains no usable nitrogen C) Ammonia blocks stomatal gas exchange D) Ammonia causes anaerobic soil conditions solution: A Explanation: Nitrifying bacteria live in soil that contains ammonia, which is an inorganic nitrogen compound toxic to most plants and animals.
11. Which option lists only products of hydrogen sulfide chemosynthesis equations? A) Glucose, water, and elemental sulfur B) Carbon dioxide, water, and sulfur C) Methane, glucose, and hydrogen gas D) Glucose, amino acids, and iron solution: A Explanation: The sulfur chemosynthesis equation produces carbohydrate/sugar (C₆H₁₂O₆), water (H₂O), and elemental sulfur (S).
12. Where do sulfur bacteria typically grow according to the text? A) Lakes, marshes, and reddish waters B) Soil containing high ammonia concentrations C) Sulfur springs and stagnant waters D) Within the living tissues of hosts solution: C Explanation: Sulfur bacteria grow in sulfur springs and stagnant water containing hydrogen sulfide.
13. What serves as the carbon source in all chemosynthetic equations? A) Methane or elemental sulfur molecules B) Carbon dioxide or methane compounds C) Carbon dioxide or ferrous hydroxide D) Glucose or organic amino acids solution: B Explanation: Chemosynthesis requires a carbon-containing inorganic compound, such as carbon dioxide or methane, as a reactant.
14. How do heterotrophs obtain nutrition from their surrounding environment? A) By utilizing inorganic chemical cellular reactions B) By ingesting and digesting organic compounds C) By absorbing carbon dioxide through stomata D) By oxidizing hydrogen sulfide into sugars solution: B Explanation: Heterotrophic food is obtained by ingestion and digestion of organic compounds from the environment.
15. Which of the following is true regarding chemotrophs' mechanics? A) They use water to reduce carbon dioxide B) They liberate oxygen during carbohydrate synthesis C) They do not use water as a hydrogen donor D) They depend on red and blue light solution: C Explanation: Chemotrophs do not use water as the donor of hydrogen to reduce CO₂, therefore, oxygen is not liberated.
16. What product is formed from the action of nitrite bacteria? A) HNO₃ B) NH₃ C) HNO₂ D) H₂S solution: C Explanation: Nitrite bacteria (Nitrosomonas) convert ammonia to nitrite, shown as HNO₂ in the slides.
17. What compound do nitrate bacteria produce at the end of oxidation? A) HNO₃ B) HNO₂ C) NH₃ D) O₂ solution: A Explanation: Nitrate bacteria (Nitrobacter) convert nitrite to nitrate, shown as HNO₃ in the slides.
18. What are the two main divisions of autotrophic nutritional types? A) Parasitic and saprophytic nutrition types B) Photosynthesis and chemosynthesis pathways C) Ingestion and digestion chemical reactions D) Holozoic and heterotrophic plant modes solution: B Explanation: There are two types of autotrophic nutrition, namely: Photosynthesis and Chemosynthesis.
19. Which process describes an organism utilizing sunlight to manufacture food? A) Chemotropism B) Phototropism C) Saprophytism D) Holozoism solution: B Explanation: Manufacturing its own food by using sunlight is defined in the slides as phototropism.
20. What is a key product of iron bacteria oxidation processes? A) Hydrogen sulfide B) Ferrous hydroxide C) Ferric hydroxide D) Nitrous acid solution: C Explanation: Iron bacteria obtain energy by the oxidation of ferrous hydroxide to ferric hydroxide.
21. What geological feature is caused by iron bacteria activities? A) Sulfur spring channels B) Bog iron ore C) Stagnant water basins D) Alkaline soil crusts solution: B Explanation: Bog iron ore and deposits of iron oxides in lakes and marshes are due to the activity of iron bacteria.
22. Beside carbon dioxide, what carbon source can begin chemosynthesis? A) Amino acid B) Glucose C) Methane D) Ferrous iron solution: C Explanation: The carbon-containing inorganic compound reactant will be a source such as carbon dioxide or methane.
23. What chemical change occurs to ammonia during soil nitrification steps? A) It is reduced to toxic gas B) It is oxidized into nitrites C) It is turned into methane D) It is transformed to sulfur solution: B Explanation: Nitrifying bacteria convert ammonia into nitrites, and then to nitrates through oxidation.
24. How many molecules of water are produced in the sulfur equation? A) Twelve water molecules B) Six water molecules C) Three water molecules D) Two water molecules solution: B Explanation: The equation 12H₂S + 6CO₂ → C₆H₁₂O₆ + 6H₂O + 12S creates 6 molecules of H₂O.
25. What organic compound type is synthesized at chemosynthesis conclusions? A) Ferrous hydroxide or sugar B) Sugar or amino acid C) Elemental sulfur or sugar D) Nitric acid or protein solution: B Explanation: The organic compound products of chemosynthesis are described as a sugar or amino acid.
26. Which statement describes the oxidation-reduction nature of plant photosynthesis? A) Glucose is oxidized, oxygen is reduced B) Water is oxidized, carbon dioxide reduced C) Carbon dioxide oxidized, water reduced D) Oxygen is oxidized, glucose is reduced solution: B Explanation: Photosynthesis is an oxidation-reduction process where water is oxidized and carbon dioxide is reduced to carbohydrates.
27. Why does maximum photosynthesis occur in red and blue light? A) These wavelengths activate dark reactions first B) Chlorophyll easily absorbs them in high quantity C) They maximize the photolysis of carbon dioxide D) They increase stomatal opening size directly solution: B Explanation: Maximum photosynthesis occurs in red and blue light because these two colors are easily absorbed in high quantity by chlorophyll.
28. What is the source of oxygen liberated during photosynthesis? A) Photolysis of water molecules B) Breakdown of carbon dioxide C) Reduction of oxidized NADP D) Splitting of glucose molecules solution: A Explanation: Oxygen is liberated from water during the light reactions stage via the photolysis of water.
29. Where do the light-dependent reactions of photosynthesis occur? A) In the stroma of chloroplasts B) In the grana of chloroplasts C) In the cytoplasm of cells D) In the plant stem lenticels solution: B Explanation: The light reaction takes place in the presence of light and occurs in the grana of the chloroplast.
30. Which compounds temporarily store chemical energy during light reactions? A) Glucose and nicotinamide adenine dinucleotide B) Adenosine triphosphate and reduced NADP C) Carbon dioxide and adenosine triphosphate D) Glucose and adenosine triphosphate molecules solution: B Explanation: Energy is temporarily stored in Adenosine triphosphate (ATP) and Nicotinamide Adenine dinucleotide phosphate (NADP.H₂).
31. Where do the light-independent dark reactions take place? A) In the grana of chloroplasts B) In the stroma of chloroplasts C) Within the thylakoid membrane D) Inside the stem's intercellular spaces solution: B Explanation: The second stage of photosynthesis is the dark reaction, which occurs in the stroma of the chloroplast.
32. What occurs during the carbon fixation phase of photosynthesis? A) Water supplies hydrogen ions for splitting B) Carbon dioxide is converted into carbohydrates C) Oxygen is liberated as a by-product D) Chlorophyll absorbs light energy directly solution: B Explanation: CO₂ is converted to carbohydrates (carbon fixation) during the dark reaction stage.
33. What happens to reduced NADP during the dark reactions? A) It is stored within stroma lamellae B) It is oxidized to drive carbohydrates C) It undergoes photolysis using sunlight D) It gets converted into adenosine triphosphate solution: B Explanation: In the dark reaction, glucose is produced and reduced NADP is oxidized.
34. What is the alternative name for the dark reaction? A) Krebs cycle or C4 pathway B) Calvin cycle or C3 pathway C) Citric cycle or C2 pathway D) Electron transport chain pathway solution: B Explanation: The dark reaction stage is also known as the Calvin cycle or C₃ pathway.
35. What is the light saturation point for typical plant photosynthesis? A) Usually around 5000 lux intensity B) Usually around 10000 lux intensity C) Usually around 15000 lux intensity D) Usually around 20000 lux intensity solution: B Explanation: The light saturation point for typical photosynthesis is stated as usually 10000 lux.
36. What defines the light saturation point during plant photosynthesis? A) When enzymes get completely destroyed by light B) When further light intensity does not increase rate C) When the plant enters anaerobic fermentation states D) When water photolysis stops producing oxygen gas solution: B Explanation: Light saturation is the point at which no further addition of light will benefit the plant and the rate becomes dependent on other factors.
37. Which factor is controlled by enzymes, making it temperature-sensitive? A) Both day and night photosynthesis reactions B) Only the light-harvesting grana reactions C) The absorption of blue light wavelengths D) The structural opening of gaseous stomata solution: A Explanation: To some extent both the day and night reactions of photosynthesis are enzyme controlled; therefore, temperature-sensitive.
38. Which of the following is an additional factor affecting photosynthesis? A) Nitrification rate of soil bacteria B) Chlorophyll concentration in the leaf C) Cellular accumulation of heartwood deposits D) Production of elemental sulfur crystals solution: B Explanation: Other factors that affect photosynthesis include chlorophyll concentration, water, and pollution.
39. What is the primary pigment responsible for trapping light energy? A) Nicotinamide adenine dinucleotide phosphate B) Green pigment called chlorophyll C) Ferric hydroxide cell complexes D) Trapped carbon dioxide gas molecules solution: B Explanation: Chloroplasts contain the green pigment called chlorophyll, which traps light energy.
40. What are the reactants in the summary photosynthesis equation? A) Glucose, oxygen, and solar light energy B) Carbon dioxide, water, and light energy C) Carbohydrates, water, and chemical energy D) Oxygen, water, and chemical cellular energy solution: B Explanation: The photosynthesis equation reactants are 6CO₂ + 6H₂O + Light Energy.
41. What structural parts make up a single granum stack? A) Stroma lamellae matrix units B) Intermembrane space fluid pores C) Interconnected stacks of thylakoids D) Loose layers of outer membranes solution: C Explanation: The diagram labels a granum as a "Stack of Thylakoids".
42. What happens to the rate of photosynthesis as carbon dioxide increases? A) It decreases steadily until it hits zero B) It increases up to a certain point C) It fluctuates based on ammonia levels D) It triggers immediate anaerobic respiration pathways solution: B Explanation: The rate increases as CO₂ increases until a point where further increases will not lead to any further increase.
43. Which products are generated during light reactions to power dark reactions? A) Glucose and oxygen gas by-products B) Adenosine triphosphate and reduced NADP C) Carbon dioxide and adenosine triphosphate molecules D) Water molecules and oxidized NADP forms solution: B Explanation: ATP and NADPH are produced in the light reaction and used to drive the dark reaction.
44. Which statement about the dark reaction is fully accurate? A) It takes place within the thylakoids B) It is a light-independent process C) It splits water to release oxygen D) It produces adenosine triphosphate molecules solution: B Explanation: The dark reaction is a process that does not require light.
45. What does water supply during the photolysis reaction step? A) Carbon atoms for carbohydrate structural frameworks B) Hydrogen ions for reducing oxidized NADP C) Oxygen ions to form glucose molecules D) Energy to split stroma lamellae layers solution: B Explanation: Photolysis of water supplies hydrogen ions for the reduction of oxidized NADP into NADP.H₂.
46. What type of pathway is the dark reaction known as? A) The C4 metabolic cycle pathway B) The C3 metabolic pathway C) The aerobic citric cycle pathway D) The anaerobic fermentation pathway solution: B Explanation: The dark reaction stage is explicitly called the C₃ pathway or Calvin cycle.
47. How do green plants obtain carbon dioxide for carbohydrate synthesis? A) Through root hairs in waterlogged soil B) Through pores called stomata on leaves C) By oxidizing ammonia into soil nitrates D) From chemical reactions in the stroma solution: B Explanation: Plants obtain the gases they need through pores of intercellular spaces called stomata.
48. What organic molecule is the final product of photosynthesis? A) Ferrous iron B) Glucose C) Methane D) Amino acid solution: B Explanation: The summary equation states that plants convert carbon dioxide and water into glucose (C₆H₁₂O₆).
49. What happens to photosynthesis if light intensity exceeds the saturation point? A) Rate increases exponentially with light intensity B) Rate becomes dependent on other factors C) Rate drops to zero from fatigue D) Rate triggers immediate thylakoid breakdown solution: B Explanation: At the light saturation point, the rate of photosynthesis becomes dependent on other factors.
50. Which two factors besides water and chlorophyll affect photosynthesis rates? A) Ammonia concentration and salt crystal deposition B) Carbon dioxide concentration and temperature C) Methane concentration and iron oxide accumulation D) Nitrogen concentration and root hair length solution: B Explanation: Carbon dioxide concentration and temperature are both detailed as key limiting factors of photosynthesis.
51. What characterizes total plant parasites like dodder or broomrape? A) They contain chlorophyll but lack root structures B) They are never green and draw all nourishment C) They manufacture food but require host water D) They capture insects to absorb vital nitrogen solution: B Explanation: Total parasites are never green, cannot manufacture their own food, and draw all nourishment from the host.
52. Why are partial parasites like mistletoe not entirely dependent? A) They possess root systems absorbing soil ammonia B) They are green and can manufacture food C) They live on decaying organic vegetable matter D) They absorb nitrogenous products from trapped prey solution: B Explanation: Partial parasites are green, therefore they are not entirely dependent on the host plant as they can photosynthesize.
53. How do parasitic fungi absorb food from host tissues? A) By developing specialised climbing stem lenticels B) By producing mycelia that grow in all directions C) By utilizando modified surface pores called hydathodes D) By trapping organic matter within structural pitchers solution: B Explanation: Parasitic fungi produce mycelia which grow into the tissue of the host plant in all directions and absorb food.
54. Where do saprophytic plants like the Indian pipe get food? A) From the living tissues of host plants B) From decaying animal or vegetable matter C) By capturing lower insects via leaf triggers D) From chemical reactions involving soil ammonia solution: B Explanation: Saprophytic plants grow on decaying animal or vegetable matter and absorb organic food from them.
55. What is the primary characteristic of holozoic nutrition in plants? A) Complete reliance on fungal mycelia networks B) Intake of solid pieces of food material C) Synthesis of nutrients from sulfur springs D) Absorption of nitrates through breathing roots solution: B Explanation: Holozoic nutrition is a mode of heterotrophic nutrition which involves the intake of solid pieces of food.
56. Why do insectivorous plants capture lower animals like insects? A) To acquire carbohydrates missing from shady zones B) To digest prey and absorb nitrogenous products C) To clear out pests blocking leaf stomata D) To utilize insect shells for heartwood structural formation solution: B Explanation: Carnivorous or insectivorous plants capture lower animals, digest them, and absorb nitrogenous products.
57. Which option contains only examples of carnivorous or insectivorous plants? A) Mistletoe, dodder, and the pitcher plant B) Venus fly-trap, pitcher plant, bladderwort C) Indian pipe, broomrape, and Venus fly-trap D) Bladderwort, mistletoe, and saprophytic fungi solution: B Explanation: Examples of insectivorous/holozoic plants include the Venus fly-trap, pitcher plant, and bladderwort.
58. How many total chemical elements are required by plants? A) Six core soil elements total B) Sixteen elements total C) Seven minor elements total D) Nine air elements total solution: B Explanation: The text states there are 16 elements required by plants, obtained from soil, water, and air.
59. What are macronutrients in plant mineral requirements defined as? A) Elements obtained exclusively from air spaces B) Soil elements needed in relatively large amounts C) Trace elements required in very small amounts D) Elements that prevent anaerobic root respiration solution: B Explanation: Soil elements required by plants that are needed in relatively large amounts are called macronutrients.
60. Which group contains only macronutrients needed by plant cells? A) Oxygen, hydrogen, carbon, nitrogen, phosphorus, sulphur B) Iron, manganese, boron, molybdenum, copper, zinc C) Chlorine, potassium, calcium, magnesium, copper, iron D) Nitrogen, phosphorus, sulphur, boron, zinc, chlorine solution: A Explanation: Oxygen, Hydrogen, Carbon, Nitrogen, Phosphorus, and Sulphur are all listed in the macronutrients table.
61. What form of nitrogen is used by the plant? A) NH₃ B) NO₃⁻ or NH₄⁺ C) HNO₂ D) HNO₃ solution: B Explanation: The macronutrient table lists the chemical forms of Nitrogen used by plants as NO₃⁻ and NH₄⁺.
62. What chemical form of phosphorus do plants utilize from soil? A) SO₄²⁻ B) H₂PO₄⁻ or HPO₄²⁻ C) MoO₄²⁻ D) H₂BO₃⁻ solution: B Explanation: The macronutrients table states that Phosphorus is utilized in the forms of H₂PO₄⁻ and HPO₄²⁻.
63. Which element is classified as a micronutrient or minor element? A) Magnesium B) Iron C) Calcium D) Phosphorus solution: B Explanation: Iron (Fe) is listed under the micronutrients table, whereas magnesium, calcium, and phosphorus are macronutrients.
64. What chemical form of boron is absorbed by plant systems? A) MoO₄²⁻ B) H₂BO₃⁻ C) Zn²⁺ D) Cl⁻ solution: B Explanation: The form of Boron used by the plant is given as H₂BO₃⁻ in the micronutrient table.
65. Which of the following is a source for carbon and hydrogen? A) Soil mineral particles B) Air or water C) Decaying organic matter D) Host plant tissues solution: B Explanation: The macronutrient table demonstrates that the source for Hydrogen, Oxygen, and Carbon is air or water.
66. What form of sulphur do plants utilize for metabolic needs? A) H₂S B) SO₄²⁻ C) Elemental sulfur D) HNO₂ solution: B Explanation: In the macronutrient table, Sulphur (S) is absorbed from the soil in the form of SO₄²⁻.
67. Which option lists only micronutrients required by plant tissues? A) Potassium, calcium, magnesium, iron, copper, zinc B) Manganese, boron, molybdenum, copper, zinc, chlorine C) Oxygen, hydrogen, carbon, nitrogen, phosphorus, sulphur D) Iron, manganese, boron, potassium, calcium, magnesium solution: B Explanation: The micronutrients table includes Iron, Manganese, Boron, Molybdenum, Copper, Zinc, and Chlorine.
68. What form of molybdenum is used by plant systems? A) Mn²⁺ B) MoO₄²⁻ C) Cu²⁺ D) Zn²⁺ solution: B Explanation: The micronutrient table states that Molybdenum (Mo) is used by plants in the form of MoO₄²⁻.
69. What are heterotrophic plants unable to manufacture for themselves? A) Inorganic chemical structures B) Their supply of carbohydrates C) Mycelia for cellular absorption D) Nitrogenous products from soil solution: B Explanation: Heterotrophic plants cannot manufacture their own food; they get their supply of carbohydrates from various sources.
70. Which organisms can be either total parasites or saprophytes? A) Algae and green plants B) Fungi and bacteria C) Mistletoe and dodder D) Pitcher plants and bladderworts solution: B Explanation: Fungi and bacteria are explicitly listed as being either total parasites or saprophytes.
71. What is the botanical term used for trace elements? A) Macronutrients B) Micronutrients C) Heartwood minerals D) Holozoic compounds solution: B Explanation: Elements required in very small amounts are termed micronutrients, minor, or trace elements.
72. What are the ionic forms of copper and zinc used? A) Cu⁺ and Zn⁺ B) Cu²⁺ and Zn²⁺ C) CuO and ZnO D) Cu³⁺ and Zn³⁺ solution: B Explanation: The micronutrients table lists Copper as Cu²⁺ and Zinc as Zn²⁺.
73. From where do plants obtain the sixteen required chemical elements? A) Exclusively from decaying vegetable matter in dark zones B) Obtained from the soil, water, and air C) Entirely from host tissues via fungal mycelia networks D) From the ingestion and digestion of lower insects solution: B Explanation: The 16 elements required by plants are obtained from the soil, water, and air.
74. Which ionic form of iron is absorbed by plants? A) Fe³⁺ B) Fe²⁺ C) Fe₂O₃ D) Fe(OH)₃ solution: B Explanation: The form of Iron utilized by plants is the ferrous ion, Fe²⁺, in the micronutrient table.
75. What form of chlorine is used by the plant? A) Cl₂ B) Cl⁻ C) ClO⁻ D) HCl solution: B Explanation: The form of Chlorine used by the plant is the chloride ion, Cl⁻.
76. What is the primary purpose of respiration in plant cells? A) To manufacture glucose using light energy and chlorophyll B) To break down sugars and release usable ATP energy C) To convert ammonia into non-toxic soil nitrate forms D) To transport excess water out through leaf hydathodes solution: B Explanation: Respiration is the process by which plants break down sugars to release energy as ATP, carbon dioxide, and water.
77. Which statement about plant respiratory structures is entirely accurate? A) Plants have highly specialized complex respiratory organs like animals B) Plants have no specialized organs but use stomata, lenticels, root hairs C) Plants perform respiration using only leaf stomatal structures D) Plants rely completely on pneumatophores across all environments solution: B Explanation: Plants have no specialized organs for gaseous exchange, but they have stomata, lenticels, and root hairs for this purpose.
78. Where do the aerobic respiration pathways take place inside cells? A) Only within the thylakoids and stroma lamellae B) In both the cytoplasm and the mitochondria C) Exclusively inside the outer chloroplast membranes D) Within heartwood structures and old xylem channels solution: B Explanation: Aerobic respiration occurs in the presence of oxygen in both the cell cytoplasm and mitochondria.
79. What products are generated by complete oxidation in aerobic respiration? A) Ethyl alcohol, carbon dioxide, and 2 ATP molecules B) Carbon dioxide, water, and 36 ATP molecules C) Glucose, oxygen, and metabolic light energy D) Ammonia, nitrites, and structural carbohydrate forms solution: B Explanation: Aerobic respiration involves the complete oxidation of glucose into carbon dioxide and water, releasing 36 ATP.
80. What occurs during anaerobic respiration in plant cell cytoplasm? A) Complete oxidation of glucose into water and energy B) Partial oxidation of glucose to form ethyl alcohol and CO₂ C) Synthesis of carbohydrates without needing light energy D) Production of elemental sulfur crystals from toxic gases solution: B Explanation: Anaerobic respiration occurs in the absence of oxygen in the cell cytoplasm and involves partial oxidation of glucose to form ethyl alcohol and carbon dioxide.
81. How do guard cells regulate gas exchange in leaves? A) By developing long extensions into soil particle gaps B) By controlling the opening and closing of stomatal pores C) By storing organic wastes like tannins and resins D) By transforming ferrous hydroxide into ferric forms solution: B Explanation: The opening and closing of stomatal pores during gas exchange are directly controlled by the guard cells.
82. What structures do woody stems use for gaseous exchange diffusion? A) Smooth green stomata pores B) Loosely packed cells called lenticels C) Elongated root hair extensions D) Heartwood cell channels solution: B Explanation: In woody plants, gaseous exchange occurs through lenticels, which are a specialized group of loosely packed cells.
83. What are breathing roots developed by waterlogged plants called? A) Mycelia B) Pneumatophores C) Lenticels D) Hydathodes solution: B Explanation: Plants in waterlogged environments develop breathing roots called pneumatophores to access atmospheric oxygen.
84. What happens when excess water deprives root cells of oxygen? A) It increases aerobic respiration to form 36 ATP B) It leads to harmful anaerobic respiration in plants C) It accelerates the formation of structural heartwood D) It triggers the instant closing of stem lenticels solution: B Explanation: Excess water in the soil can deprive plants of oxygen and lead to anaerobic respiration, which can be harmful.
85. How does increasing environmental carbon dioxide affect plant respiration? A) The higher the CO₂ concentration, the higher the respiration rate B) The higher the CO₂ concentration, the lower the respiration rate C) It forces the plant to perform water photolysis D) It converts the cell cytoplasm into ferric hydroxide solution: B Explanation: The slides state: the higher the concentration of carbon dioxide in the environment, the lower the respiration rate.
86. Why does a higher light intensity increase plant respiration rates? A) Light directly split glucose into ethyl alcohol inside cells B) The temperature of the surrounding rises as light intensity increases C) Light deactivates enzymes responsible for anaerobic fermentation D) It stimulates root hairs to absorb more toxic ammonia solution: B Explanation: Respiration rate increases with light intensity because the surrounding temperature rises as light intensity increases.
87. Which plant tissue type exhibits a higher respiration rate? A) Older structural heartwood tissues B) Younger plant tissues C) Mature sapwood tissue regions D) Dead shed bark layers solution: B Explanation: The age of the tissue affects respiration; younger tissues exhibit a higher respiration rate than older ones.
88. Why do plants have lesser waste products compared to animals? A) They lack cytoplasm and mitochondria for breakdown B) They have a lower level of metabolic activities C) They completely reuse all elements within the stroma D) Their stomata remain closed during dark reactions solution: B Explanation: Plants have a lesser amount of waste products as they have a lower level of metabolic activities.
89. What is the process of losing excess water vapor through stomata called? A) Guttation B) Transpiration C) Nitrification D) Chemotropism solution: B Explanation: Transpiration is defined as the process through which excess water evaporates from the plant's surface.
90. What is guttation in certain shrubs and grasses? A) Evaporation of water vapor from the plant surface B) Excretion of liquid droplets from modified pores called hydathodes C) Accumulation of dark resins within older xylem cells D) Secretion of organic acids into soil via root hairs solution: B Explanation: Guttation is when certain shrubs and grasses excrete excess water as liquid droplets from leaf margins/edges through modified pores.
91. Where do the plants store wastes like tannins, resins, and gums before shedding? A) In the grana and stroma lamellae B) In the leaves and bark C) Within the actively dividing root hairs D) Inside the guard cells of stomata solution: B Explanation: Plants store waste products such as tannins, resins, and gums in leaves and bark, which are later shed.
92. What structural feature is formed partly by waste accumulation in old xylem? A) Sapwood B) Heartwood C) Pneumatophore D) Thylakoid solution: B Explanation: Waste products accumulating in the older xylem play a major role in the formation of heartwood.
93. What substances do plant roots excrete directly into the soil? A) Ethyl alcohol, elemental sulfur, and ferric hydroxide B) Organic acids, amino acids, and sugars C) Tannins, resins, and metabolic gums D) Nitrites, nitrates, and toxic ammonia compounds solution: B Explanation: Organic acids, amino acids, and sugars are excreted into the soil through plant roots.
94. How do specialized salt glands excrete excess salts from tissues? A) By diffusing gaseous salt molecules through leaf lenticels B) Often in the form of crystals from their tissues C) By transforming them into structural heartwood matrices D) Through anaerobic fermentation within root hairs solution: B Explanation: Some plants have specialized salt glands that excrete excess salts from their tissues, often in the form of crystals.
95. Which respiration factors list shows only elements that increase respiration rate? A) Aging cells, high carbon dioxide, and low temperature B) Increasing temperature, adequate water, and presence of salt C) Deprived oxygen, waterlogged soil, and older tissue cells D) Decreasing light, high carbon dioxide, and cellular fatigue solution: B Explanation: Increasing temperature (up to optimum), adequate water content, and the presence of salt all increase the respiration rate.
96. When does plant respiration occur according to the text? A) Only at night when dark reactions take place B) During the day and at night C) Only during daylight hours when light is trapped D) Exclusively when stomata are closed during guttation solution: B Explanation: Respiration occurs in all living plant cells, during the day and at night.
97. What biochemical cycles are involved in aerobic plant respiration? A) Calvin cycle and C3 metabolic pathways B) Krebs cycle, citric cycle, and electron transport chain C) Photolysis and dark carbon fixation cycles D) Chemosynthesis and inorganic oxidation pathways solution: B Explanation: Aerobic respiration involves the Krebs cycle, the citric cycle, and the electron transport chain.
98. Through what structures do root hairs absorb oxygen from soil? A) From the air spaces between soil particles B) Through modified margin pores called hydathodes C) Via interconnected stroma lamellae networks D) Directly from old xylem waste accumulation sites solution: B Explanation: Root hairs absorb oxygen from the air spaces between the soil particles.
99. What are the end products of plant aerobic respiration? A) Glucose, oxygen gas, and cellular light energy B) Carbon dioxide, water, and energy C) Ethyl alcohol, carbon dioxide, and partial sugars D) Nitric acid, water, and elemental sulfur compounds solution: B Explanation: The respiration equation shows that glucose and oxygen yield carbon dioxide, water, and energy.
100. From what part of the leaf are liquid droplets excreted during guttation? A) From the central stroma lamellae matrix B) From the leaf tip or edges C) Directly through the stem lenticels D) Out of the green chloroplast membranes solution: B Explanation: Liquid droplets during guttation are excreted from the leaf tip or edges through modified pores.`;

// Parse questions logic helper
function parseQuestions(topicId: string): any[] {
  const lines = NUTRITION_QUESTIONS_RAW.split(/\r?\n/);
  const parsedQuestions: any[] = [];
  const seenTexts = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const numMatch = trimmed.match(/^(\d+)\.\s+/);
    if (!numMatch) continue;

    const content = trimmed.substring(numMatch[0].length);

    const aIndex = content.indexOf(" A) ");
    const bIndex = content.indexOf(" B) ");
    const cIndex = content.indexOf(" C) ");
    const dIndex = content.indexOf(" D) ");
    const solIndex = content.indexOf(" solution: ");
    const expIndex = content.indexOf(" Explanation: ");

    if (aIndex === -1 || bIndex === -1 || cIndex === -1 || dIndex === -1 || solIndex === -1 || expIndex === -1) {
      continue;
    }

    const questionText = content.substring(0, aIndex).trim();
    
    // Deduplicate by text
    if (seenTexts.has(questionText)) {
      continue;
    }
    seenTexts.add(questionText);

    const optionA = content.substring(aIndex + 4, bIndex).trim();
    const optionB = content.substring(bIndex + 4, cIndex).trim();
    const optionC = content.substring(cIndex + 4, dIndex).trim();
    const optionD = content.substring(dIndex + 4, solIndex).trim();
    const solVal = content.substring(solIndex + 11, expIndex).trim().toLowerCase();
    const explanationText = content.substring(expIndex + 13).trim();

    parsedQuestions.push({
      topic_id: topicId,
      text: questionText,
      a: optionA,
      b: optionB,
      c: optionC,
      d: optionD,
      correct_option: solVal,
      explanation: explanationText
    });
  }

  return parsedQuestions;
}

// Background auto-seeder to guarantee populating on startup / reload
async function runAutoSeed() {
  try {
    // Await database connection
    await connectDB();

    console.log("[Auto-Seed] Initiating questions database check...");

    // 1. Find or create Course BIO102
    let course = await Course.findOne({ code: { $regex: /^bio\s*102$/i } });
    if (!course) {
      course = await Course.create({
        code: "BIO102",
        title: "General Biology II (Bio 102)",
        icon: "BookOpen",
        is_mock: false,
        duration: 45,
        question_limit: 50,
        attempts_allowed: 1,
        is_locked: false,
        results_locked: false
      });
      console.log(`[Auto-Seed] Created Course BIO102: "${course.title}"`);
    } else {
      console.log(`[Auto-Seed] Found existing Course BIO102: "${course.title}"`);
    }

    // 2. Find or create Topic "Nutrition"
    let nutritionTopic = await Topic.findOne({ course_id: course._id, name: { $regex: /^nutrition$/i } });
    if (!nutritionTopic) {
      nutritionTopic = await Topic.create({
        course_id: course._id,
        name: "Nutrition",
        question_count: 0,
        notes: "Study of plant autotrophic nutrition, chemosynthesis, photosynthesis limiting factors, plant parasites, mineral requirements, plant respiration, and plant excretion."
      });
      console.log(`[Auto-Seed] Created Topic "Nutrition"`);
    } else {
      console.log(`[Auto-Seed] Found existing Topic "Nutrition"`);
    }

    // 3. Count/seed Nutrition questions
    const nutritionCount = await Question.countDocuments({ topic_id: nutritionTopic._id });
    if (nutritionCount < 95) {
      console.log(`[Auto-Seed] Nutrition topic contains ${nutritionCount} questions. Re-seeding clean 100 questions...`);
      await Question.deleteMany({ topic_id: nutritionTopic._id });
      const questionsToInsert = parseQuestions(nutritionTopic._id.toString());
      let inserted = 0;
      if (questionsToInsert.length > 0) {
        const docs = await Question.insertMany(questionsToInsert);
        inserted = docs.length;
      }
      nutritionTopic.question_count = inserted;
      await nutritionTopic.save();
      console.log(`[Auto-Seed] Successfully seeded ${inserted} questions into "Nutrition"!`);
    } else {
      console.log(`[Auto-Seed] Nutrition topic already contains ${nutritionCount} questions. Skipping seed.`);
    }

    // 4. Find or create Topic "Kingdom Animalia"
    let animaliaTopic = await Topic.findOne({ course_id: course._id, name: { $regex: /^kingdom\s*animalia$/i } });
    if (!animaliaTopic) {
      animaliaTopic = await Topic.create({
        course_id: course._id,
        name: "Kingdom Animalia",
        question_count: 0,
        notes: "Phylum-by-phylum classification of animals (Porifera, Cnidaria, Platyhelminthes, Nematoda, Annelida, Arthropoda, Mollusca, Echinodermata, Hemichordata, Chordata), key anatomical features, body cavities, symmetry, and metamerism."
      });
      console.log(`[Auto-Seed] Created Topic "Kingdom Animalia"`);
    } else {
      console.log(`[Auto-Seed] Found existing Topic "Kingdom Animalia"`);
    }

    // 5. Count/seed Kingdom Animalia questions
    const animaliaCount = await Question.countDocuments({ topic_id: animaliaTopic._id });
    if (animaliaCount < 95) {
      console.log(`[Auto-Seed] Kingdom Animalia topic contains ${animaliaCount} questions. Re-seeding clean 100 questions...`);
      await Question.deleteMany({ topic_id: animaliaTopic._id });
      const questionsToInsert = ANIMALIA_QUESTIONS.map(q => ({
        ...q,
        topic_id: animaliaTopic._id.toString()
      }));
      let inserted = 0;
      if (questionsToInsert.length > 0) {
        const docs = await Question.insertMany(questionsToInsert);
        inserted = docs.length;
      }
      animaliaTopic.question_count = inserted;
      await animaliaTopic.save();
      console.log(`[Auto-Seed] Successfully seeded ${inserted} questions into "Kingdom Animalia"!`);
    } else {
      console.log(`[Auto-Seed] Kingdom Animalia topic already contains ${animaliaCount} questions. Skipping seed.`);
    }

    // 6. Find or create Topic "Ecological Adaptation"
    let adaptationTopic = await Topic.findOne({ course_id: course._id, name: { $regex: /^ecological\s*adaptation$/i } });
    if (!adaptationTopic) {
      adaptationTopic = await Topic.create({
        course_id: course._id,
        name: "Ecological Adaptation",
        question_count: 0,
        notes: "Study of ecological adaptations in the animal kingdom, including structural, behavioral, and physiological adaptations with key examples like camels, arctic foxes, frogs, and cacti."
      });
      console.log(`[Auto-Seed] Created Topic "Ecological Adaptation"`);
    } else {
      console.log(`[Auto-Seed] Found existing Topic "Ecological Adaptation"`);
    }

    // 7. Count/seed Ecological Adaptation questions
    const adaptationCount = await Question.countDocuments({ topic_id: adaptationTopic._id });
    if (adaptationCount < 95) {
      console.log(`[Auto-Seed] Ecological Adaptation topic contains ${adaptationCount} questions. Re-seeding clean 100 questions...`);
      await Question.deleteMany({ topic_id: adaptationTopic._id });
      const questionsToInsert = ADAPTATION_QUESTIONS.map(q => ({
        ...q,
        topic_id: adaptationTopic._id.toString()
      }));
      let inserted = 0;
      if (questionsToInsert.length > 0) {
        const docs = await Question.insertMany(questionsToInsert);
        inserted = docs.length;
      }
      adaptationTopic.question_count = inserted;
      await adaptationTopic.save();
      console.log(`[Auto-Seed] Successfully seeded ${inserted} questions into "Ecological Adaptation"!`);
    } else {
      console.log(`[Auto-Seed] Ecological Adaptation topic already contains ${adaptationCount} questions. Skipping seed.`);
    }

  } catch (err: any) {
    console.error("[Auto-Seed] Critical error running auto-seeding routine:", err.message);
  }
}

// Trigger background execution asynchronously on module loading
runAutoSeed();

export default async function routes(app: FastifyInstance) {

app.get("/developer/health", { preHandler: [verifyToken, requireAdmin] }, async (request, reply) => {
  const q = await Question.countDocuments();
  const e = await Result.countDocuments();
  return reply.send({
    uptimeDays: process.uptime() / 86400,
    totalQuestions: q,
    totalExams: e,
  });
});

app.get("/developer/seed-nutrition", async (request, reply) => {
  try {
    await runAutoSeed();
    
    const course = await Course.findOne({ code: { $regex: /^bio\s*102$/i } });
    const nutrition = course ? await Topic.findOne({ course_id: course._id, name: { $regex: /^nutrition$/i } }) : null;
    const animalia = course ? await Topic.findOne({ course_id: course._id, name: { $regex: /^kingdom\s*animalia$/i } }) : null;
    const adaptation = course ? await Topic.findOne({ course_id: course._id, name: { $regex: /^ecological\s*adaptation$/i } }) : null;

    return reply.send({
      success: true,
      message: `Manual seed trigger completed successfully.`,
      course: course ? { id: course._id.toString(), code: course.code, title: course.title } : null,
      topics: {
        nutrition: nutrition ? { name: nutrition.name, question_count: nutrition.question_count } : null,
        animalia: animalia ? { name: animalia.name, question_count: animalia.question_count } : null,
        adaptation: adaptation ? { name: adaptation.name, question_count: adaptation.question_count } : null
      }
    });

  } catch (error: any) {
    console.error("Failed manual seed invocation:", error);
    return reply.status(500).send({
      success: false,
      error: error.message
    });
  }
});

}
