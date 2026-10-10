import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const CORRECT_OPTION_MARKER = '\u200E\u200F\u200E';

const TOPICS_CONFIG = [
  {
    name: "Alkanes: Structure, Bonding, Isomerism, Preparation & Reactions",
    notes: "Saturated hydrocarbons, sp3 hybridization, tetrahedral geometry (109.5°), general formula CnH2n+2. Structural & conformational isomerism (staggered vs eclipsed, Newman projections, dihedral angles). Preparation via alkene/alkyne hydrogenation, alkyl halide reduction, Wurtz reaction, Frankland method, Grignard reagents, decarboxylation, and Kolbe's electrolysis. Physical properties (boiling point trends, branching effects). Chemical properties: inertness (paraffins), free radical halogenation mechanism, complete/incomplete combustion.",
    curriculum: "Saturated hydrocarbons, sp3 hybridization of carbon, bond angle 109.5 degrees, tetrahedral geometry, General formula CnH2n+2, Homologous series (CH4 to C30), isomerism starting from butane, structural isomers, conformational isomerism in ethane, Newman projections, staggered/transoid vs eclipsed/ciscoid conformations, dihedral angle (60 vs 0 degrees), Methods of preparation: (1) Hydrogenation of alkenes/alkynes using Ni (250-300°C) or Pt/Pd at room temp, (2) Reduction of alkyl halides with Zn/HCl or Zn-Cu couple/alcohol, (3) Wurtz Reaction using Na metal in ether to make higher symmetric alkanes, (4) Frankland Method using Zn in inert solvent to form organo-zinc, (5) Grignard Reaction (R-MgX with active hydrogen sources like water, alcohols, amines), (6) Reduction of alcohols/ketones/fatty acids with HI/red phosphorus at 150-200°C, (7) Decarboxylation of sodium salts of alkanoic acids with soda lime (NaOH/CaO), (8) Kolbe's Electrolytic Method of sodium salts of monocarboxylic acids (free radical mechanism), (9) Total synthesis from carbon electrodes under hydrogen. Physical properties: C1-C4 gases, C5-C16 liquids, C17+ solids, boiling point increases with mass, branching lowers boiling point due to compactness and weaker van der Waals. Chemical properties: paraffinic unreactivity, substitution reactions with halogens under light/heat (free radical mechanism of initiation, propagation, termination), bromine radical selectivity for secondary over primary carbon, complete combustion to CO2 and H2O, incomplete combustion to CO or carbon soot."
  },
  {
    name: "Alkynes: Structure, Bonding, Isomerism, Preparation & Reactions",
    notes: "Hydrocarbons with C≡C triple bond, sp hybridization, linear geometry (180°). Triple bond consists of one sigma and two pi bonds. Greater s-character (50%) makes terminal C-H bond polar and weakly acidic. General formula CnH2n-2 (two degrees of unsaturation). Isomerism in alkynes (chain, positional, functional with dienes). Preparation: industrial pyrolysis, base-induced dehydrohalogenation of dihalides, acetylide coupling, tetrahalide dehalogenation. Reactions: hydrogenation (Lindlar's catalyst vs Na/NH3), electrophilic addition of HX (Markovnikov vs anti-Markovnikov HBr with peroxides), hydration (enol-keto tautomerism to ketones), terminal acetylide formation as qualitative test.",
    curriculum: "Structure and bonding of alkynes (carbon-carbon triple bond, sp hybridization, linear geometry, 180° bond angles, made of 1 sigma and 2 pi bonds, sp carbon is more electronegative than sp2/sp3 because of 50% s-character, polar C-H bond, weak acids). Terminal vs internal alkynes. General formula CnH2n-2 (introduces two degrees of unsaturation). IUPAC and common nomenclature ('alkyacetylene', priority of triple bond over alkyls/halogens, tie-breaker favors alkene numbering). Isomerism in alkynes starting from butyne (chain, positional, functional isomerism with dienes like butyne vs butadiene). Physical properties (low melting/boiling points, organic solubility). Preparation: (1) Acetylene from calcium carbide (CaC2 + 2H2O) or methane pyrolysis at 1500°C, (2) Dehydrohalogenation of vicinal/geminal dihalides using strong bases like KOH and NaNH2 via successive E2 reactions, (3) Coupling of metal acetylides (R-C≡C-Na+/Li+) with 1° alkyl halides (via SN2) to synthesize internal alkynes, (4) Dehalogenation of vicinal tetrahalides using Zinc and heat. Reactions: (1) Hydrogenation (H2 with Pt/Pd/Ni/Rh to alkane; or partial reduction to cis-alkene using poisoned Lindlar catalyst (Pd/CaCO3 with lead acetate and quinoline) via syn-addition; or partial reduction to trans-alkene using Na/liquid NH3), (2) Addition of HX (Markovnikov orientation with HBr, HCl, HI to gem-dihalides; or anti-Markovnikov HBr addition with peroxides), (3) Hydration (H2O, H+, Hg2+ to form unstable enol which undergoes rapid tautomerization to a ketone), (4) Oxidation (cleavage using KMnO4 or ozonolysis to carboxylic acids), (5) Substitution of terminal alkynes as acids with active metals (Na) or bases (Grignard reagents), (6) Precipitation test for terminal alkynes using ammonical silver nitrate (AgNO3) or copper (I) chloride (Cu2Cl2) to form insoluble heavy metal acetylides."
  },
  {
    name: "Carbonyl Compounds: Aldehydes & Ketones",
    notes: "Carbonyl group (C=O) is sp2 hybridized, highly polar. Aldehydes have carbonyl at chain end; ketones have it bonded to two carbons. Preparation: alcohol oxidation (PCC for aldehydes; dichromate/permanganate or PCC for ketones), acid chloride reduction, Friedel-Crafts acylation, ethyne hydration. Physical properties: moderately polar, water-soluble for lower members, characteristic smells. Reactions: nucleophilic additions (cyanohydrin, Grignard), condensation with amine derivatives (oximes, hydrazones, 2,4-DNP), haloform reaction, oxidation tests to distinguish them (Tollen's, Fehling's), reductions (Clemmensen, Wolff-Kishner), acetal/ketal formation, aromatic meta-direction.",
    curriculum: "Structure of carbonyl group (C=O double bond, sp2 hybridized, highly polar, bond angle 120°, shorter and stronger than C=C). Aldehydes (carbonyl at chain end with at least one H) vs Ketones (carbonyl bonded to two carbons). Nomenclature (IUPAC ending '-al' for aldehydes, '-one' for ketones; numbering begins closest to carbonyl; prefix formyl/oxo/carboxy priority). Preparation: (1) Controlled oxidation of primary alcohols to aldehydes using pyridinium chlorochromate (PCC) in dichloromethane, (2) Oxidation of secondary alcohols to ketones using inexpensive acidified dichromate (Na2Cr2O7) or PCC, (3) Mechanism of chromic acid oxidation via chromate ester and E2 elimination, (4) Reduction of acid chlorides with Lithium aluminium hydrogen tri-tertiary butoxide (mild reducing agent) to yield aldehydes, (5) Friedel-Crafts Acylation of aromatic hydrocarbons with acid chlorides and Lewis acid catalysts (AlCl3, FeBr3) to form ketones, (6) Industrial preparation of ethanal by catalytic addition of water to ethyne (H2SO4/HgSO4 at 97°C), (7) Industrial dehydrogenation of propan-2-ol using copper catalyst at 350°C to form propanone. Physical Properties: moderately polar, dipole-dipole attractions, no self-hydrogen bonding, lower boiling points than corresponding alcohols/acids, lower members are water-soluble through hydrogen bonding with water, lower aliphatic aldehydes have pungent smells, ketones and benzaldehyde have pleasant/sweet smells. Chemical properties and reactions: (1) High reactivity due to C=O polarity, (2) Nucleophilic additions: (a) addition of HCN with NaCN/dilute H2SO4 to form cyanohydrins (mechanism: attack of CN- followed by fast protonation), (b) addition of Grignard reagents (methanal yields primary alcohol, other aldehydes yield secondary, ketones yield tertiary), (3) Condensation reactions with ammonia derivatives to form C=N double bonds via water elimination (hydroxylamine forms oxime; hydrazine forms hydrazone; phenylhydrazine forms phenylhydrazone; 2,4-DNP/Brady's reagent forms yellow 2,4-dinitrophenylhydrazone crystals), (4) Haloform reaction of methyl carbonyls with sodium hypoiodite (I2/NaOH) to form yellow iodoform (CHI3) crystals, (5) Reactions to distinguish them (oxidation): aldehydes easily oxidized to carboxylic acids by acidified KMnO4, Tollen's test/silver mirror (reduction of Ag(NH3)2+ to metallic silver), and Fehling's test (reduction of Cu2+ to red/brown Cu2O precipitate); ketones are resistant, only oxidizing under harsh conditions (hot acidified KMnO4) to a mixture of smaller acids, (6) Reduction: (a) to alcohols using LiAlH4 or NaBH4, (b) to hydrocarbons using Clemmensen reduction (amalgamated zinc in conc. HCl for base-sensitive compounds) or Wolff-Kishner reduction (hydrazine and strong base for acid-sensitive compounds), (7) Addition of dry alcohols under dry HCl catalyst (aldehydes form hemiacetals then acetals; ketones form hemiketals then ketals), (8) Aromatic carbonyls (carbonyl group is meta-directing and deactivating for electrophilic aromatic substitution)."
  },
  {
    name: "Carboxylic Acids: Properties, Preparations & Reactions",
    notes: "Carboxyl group (-COOH) contains carbonyl and hydroxyl. Long-chain monocarboxylic acids are fatty acids. Highly polar, high boiling points due to dimer formation, water-soluble. Resonance stabilization of carboxylate ion. Preparations: oxidation of primary alcohols/aldehydes/alkenes, hydrolysis of nitriles/esters, Grignard carboxylation, carboxylation of alkenes with CO/steam, malonic ester synthesis. Reactions: salt formation, acyl halide/amide/anhydride formation, Fischer esterification, diazomethane esterification, LiAlH4 reduction, decarboxylation, HLZ alpha-halogenation. Qualitative tests: bicarbonate, esterification, fluorescein tests.",
    curriculum: "Structure and definition of carboxylic acids (contain carboxyl group -COOH where carbonyl C=O and hydroxyl -OH are directly bonded). Monocarboxylic, dicarboxylic, tricarboxylic acids. Fatty acids as long chain monocarboxylic acids. Nomenclature (IUPAC ending '-oic acid' with carboxyl carbon always as C1; common names like formic, acetic; dicarboxylic names like ethanedioic/oxalic, propanedioic/malonic, butanedioic/succinic, pentanedioic/glutaric, hexanedioic/adipic). Physical properties: polar covalent bonds (C=O, C-O, O-H), highest boiling points of comparable organic compounds due to strong intermolecular hydrogen bonding forming dimers, highly soluble in water for lower members, sharp/disagreeable odors, sour taste. Acidity: weak acids that ionize in water, carboxylate ion is highly resonance-stabilized with negative charge delocalized over both oxygens, electron-withdrawing groups (Cl, Br, F) increase acidity, electron-donating groups decrease acidity. Preparation methods: (1) Controlled oxidation of primary alcohols and aldehydes using potassium dichromate and sulfuric acid, (2) Oxidation of alkenes with basic KMnO4 under vigorous conditions, (3) Acidic or basic hydrolysis of nitriles (R-CN), (4) Alkaline hydrolysis of esters followed by acidification, (5) Carboxylation of Grignard reagents (R-MgX with CO2 followed by acidic hydrolysis), (6) Carboxylation of alkenes with CO and steam under pressure (300-400°C) with H3PO4 catalyst, (7) From malonic ester (diethyl malonate sodium derivative with alkyl halide followed by hydrolysis and decarboxylation). Reactions: (1) Salt formation with NaOH, NaHCO3 (effervescence of CO2), or NH3, (2) Formation of acyl halides using PCl5, PCl3, or SOCl2, (3) Formation of amides by treating with ammonia and heating, (4) Formation of anhydrides by dehydrating two acid molecules using phosphorus pentoxide (P2O5), (5) Formation of esters (Fischer Esterification: carboxylic acid + alcohol in presence of strong acid catalyst H2SO4), (6) Esterification using diazomethane (CH2N2) to form methyl esters, (7) Reduction to primary alcohols using powerful reducing agents like lithium aluminium hydride (LiAlH4) or diborane (BH3) (carboxylic acids are resistant to mild reduction), (8) Decarboxylation (loss of CO2 on heating), (9) alpha-halogenation (reaction of aliphatic acids with Cl2 or Br2 in presence of phosphorus to substitute alpha-hydrogen). Qualitative tests: (1) Sodium bicarbonate test (CO2 evolution), (2) Esterification test (fruity odor on reaction with alcohol/H2SO4), (3) Fluorescein test (heating with resorcinol and conc. H2SO4 yields green fluorescence in dilute NaOH)."
  },
  {
    name: "Ethers: Properties, Preparations & Reactions",
    notes: "Ethers have general formula R-O-R'. Oxygen is sp3-hybridized, tetrahedral bond angle (112°). Less polar than alcohols, insoluble in water, lower boiling points, chemically inert, highly flammable. Preparation: alcohol dehydration, Williamson Ether Synthesis (metal alkoxide + primary alkyl halide/tosylate), silver oxide-catalysed ether formation. Reactions: acidic cleavage (HI/HBr at high temperature). Cyclic ethers/epoxides (oxiranes): ethylene oxide prep from ethylene or mCPBA; ring-opening with water/HX/Grignard reagents. Crown ethers coordinate cations.",
    curriculum: "Structure of ethers (general formula R-O-R' with an oxygen atom bonded to two alkyl or aryl groups, oxygen is sp3-hybridized, tetrahedral bond angle ~112° in dimethyl ether, slight dipole moment). Nomenclature: common names (list alkyl substituents alphabetically + 'ether', e.g. dimethyl ether, methyl ethyl ether, chloromethyl ethyl ether), IUPAC system (shorter alkyl chain named as alkoxy prefix on longest parent chain, e.g. 1-methoxyporpan, 2-propoxybutane, 3-(2-chloroethoxy)-1-butanol). Properties: much less polar than alcohols, insoluble in water, lower melting and boiling points than alcohols, chemically inert, highly flammable. Synthesis: (1) Diethyl ether prepared industrially by sulfuric acid-catalysed dehydration of ethanol, (2) Williamson Ether Synthesis (reaction of metal alkoxide with primary alkyl halide or tosylate; best method, SN2 mechanism, alkoxides prepared by reacting alcohol with strong base like sodium hydride NaH in THF), (3) Silver Oxide-Catalysed ether formation (reaction of alcohol directly with alkyl halide in presence of Ag2O to generate ethers like glucose pentamethyl ether). Reactions: (1) Acidic cleavage (ethers are cleaved at high temperatures by strong acids HI or HBr; HI/HBr produce an alkyl halide from the less hindered component via SN2; tertiary ethers undergo SN1), (2) Cyclic Ethers: Epoxides (Oxiranes) (three-membered ring cyclic ethers, highly strained; ethylene oxide prepared industrially from ethylene and oxygen at 300°C over Ag2O, or prepared in lab by treating an alkene with a peroxyacid (mCPBA), or from halohydrins via intramolecular Williamson ether synthesis), (3) Reactions of Epoxides (ring-opening): (a) addition of water with dilute acid to form trans-1,2-diols, (b) addition of anhydrous HX (HF, HBr, HCl, HI) to form trans-2-halocyclohexanols, (c) addition of Grignard reagents to ethylene oxide to add a -CH2CH2OH group, extending the carbon chain by two, (4) Crown Ethers (large rings of repeating -OCH2CH2- units named as x-crown-y, coordinate cations in their electronegative central cavity)."
  },
  {
    name: "Alcohols: Properties, Preparations & Reactions",
    notes: "Alcohols contain hydroxyl group (-OH). Classified as Methyl, Primary, Secondary, Tertiary. Dihydric (ethylene glycol), Polyhydric (glycerol). Hydrogen bonding leads to high boiling points and water solubility. Prep: alkene hydration/hydroboration, halide exchange, Grignard additions, carbonyl reductions (NaBH4, LiAlH4, Raney Ni). Reactions: acid-catalyzed dehydration, oxidation (PCC vs chromic acid), Lucas test (ZnCl2/HCl Sn1 mechanism), esterification, active metal deprotonation.",
    curriculum: "Structure and classification of alcohols (contain hydroxyl -OH group; classified as methyl, primary 1°, secondary 2°, or tertiary 3° depending on what's bound to the C-OH group; dihydric alcohols like 1,2-ethanediol/ethylene glycol; polyhydric alcohols like 1,2,3-propanetriol/glycerol). Nomenclature (IUPAC replace '-e' with '-ol'; chain numbered to give -OH the lowest possible number; -OH has priority over alkenes; common names like alkyl + 'alcohol', e.g. isopropyl alcohol). Properties: polar covalent bonds, form strong intermolecular hydrogen bonds, high boiling points compared to alkanes/ethers, high solubility in water for lower members, phenols as alcohol-like compounds with -OH on benzene ring. Methods of preparation: (1) Hydration of alkenes (acid-catalyzed addition of water following Markovnikov's rule, or hydroboration-oxidation for anti-Markovnikov addition), (2) Halide exchange of primary and secondary alkyl halides with aqueous base (does not occur with tertiary halides), (3) Synthesis of 1° Alcohols by adding Grignard reagents to formaldehyde, (4) Synthesis of 2° Alcohols by adding Grignard reagents to aldehydes, (5) Synthesis of 3° Alcohols by adding Grignard reagents to ketones, (6) Reduction of carbonyls: (a) sodium borohydride (NaBH4) reduces only aldehydes/ketones, (b) lithium aluminium hydride (LiAlH4) is powerful and reduces acids/esters/carbonyls, (c) catalytic hydrogenation of carbonyls/alkenes using H2 with Raney nickel catalyst. Reactions: (1) Dehydration (removal of water in presence of acid and heat to form alkenes), (2) Oxidation (1° alcohols oxidized to aldehydes using PCC, or to carboxylic acids using chromic acid; 2° alcohols oxidized to ketones using Na2Cr2O7/H2SO4 or PCC; 3° alcohols do not oxidize because they lack an alpha-hydrogen), (3) Lucas Test (reaction with conc. HCl and ZnCl2 catalyst; tertiary alcohols react in < 1 minute via SN1 forming insoluble alkyl chloride, secondary react in 1-5 minutes, primary react slowly or not at all), (4) Formation of Esters (carboxylic acid + alcohol to yield sweet-smelling esters), (5) Deprotonation with active metals (Na, Li, K, Ca) to liberate H2 gas and form alkoxides."
  },
  {
    name: "Amines: Properties, Preparations & Reactions",
    notes: "Amines are ammonia derivatives, classified as 1°, 2°, 3°. Basic, polar, form weaker hydrogen bonds than alcohols. Preparation: halide ammonolysis, reductive amination, nitrile/amide/oxime/nitro reduction, Gabriel synthesis, Hoffmann degradation. Reactions: acylation, Carbylamine test, nitrous acid reaction (stable diazonium for aromatic 1°; unstable for aliphatic 1°; yellow nitrosoamines for 2°; ring nitrosation for aromatic 3°). Highly activating ortho/para-directing ring substitution.",
    curriculum: "Structure and definition of amines (derivatives of ammonia NH3, contain nitrogen attached to one or more alkyl (aliphatic) or aromatic groups, primary 1°, secondary 2°, or tertiary 3°). Nomenclature (IUPAC replace '-e' with '-amine', locate with numbers; common names list alkyl groups alphabetically + 'amine', e.g. ethylamine, dimethylamine, ethyldimethylamine). Isomerism in amines (chain, positional, metamerism, functional). Physical properties: unpleasant odors (rotting fish), polar, 1° and 2° amines have hydrogen bonds (weaker than alcohols O-H), 3° amines have no H on nitrogen and cannot hydrogen bond to themselves, boiling points of Hydrocarbons < Amines < Alcohols, highly soluble in water for lower members. Chemical properties: basic character (weak bases, form water-soluble ammonium salts with acids), relative base strength (aliphatic amines > ammonia > aromatic amines/aniline; aniline is weaker because of resonance stabilization of free base delocalizing nitrogen lone pair into the ring; electron-donating groups increase base strength; electron-withdrawing groups decrease it). Preparation methods: (1) Ammonolysis of alkyl halides (nucleophilic substitution via SN2 on 1° alkyl halides or methyl halides; sequential alkylation yields 1°, 2°, 3° and quaternary ammonium salts), (2) Reductive amination of alkanals and alkanones (reaction of aldehyde or ketone with NH3/amine in presence of H2/Ni-Cr or NaBH3CN to form 1°, 2°, 3° amines), (3) Reduction of nitriles, oximes, or amides using reducing agents like LiAlH4 or sodium in ethanol, (4) Reduction of nitroalkanes or nitrobenzene using tin (Sn) and concentrated HCl, (5) Gabriel Synthesis specifically for primary amines, (6) Hoffmann Degradation (reaction of acid amide with bromine Br2 and caustic potash KOH to yield primary amine with one fewer carbon). Reactions of amines: (1) Acylation (reaction of 1° or 2° amines with acid chlorides, anhydrides, or esters to form amides), (2) Isocyanide (Carbylamine) Test for primary amines (warming 1° amine with chloroform CHCl3 and alcoholic KOH yields foul-smelling methyl isocyanide), (3) Reaction with Nitrous Acid (HNO2 prepared in situ): (a) aliphatic 1° amines yield unstable diazonium salts which decompose to carbocations, nitrogen gas, and a mixture of alcohols, alkenes, ethers, (b) aromatic 1° amines yield stable arenediazonium salts below 5°C which can undergo substitution (using Cu2O/Cu2+, CuCl, CuBr, CuCN, KI, HBF4, H3PO2) or coupling reactions to form colored azo compounds, (c) aliphatic/aromatic 2° amines form N-nitrosoamines which are yellow oils, (d) aliphatic 3° amines form soluble salts, aromatic 3° amines undergo nitrosation in the para position, (4) Ring substitution in aromatic amines (amino group is highly activating and ortho/para-directing)."
  },
  {
    name: "Electronic Theory in Organic Chemistry",
    notes: "Aufbau principle, Pauli exclusion, Hund's rule. PELs, subshells. Lewis structures, valence electrons, dot diagrams, line bonds. Hybridization of carbon: sp3 (tetrahedral, 109.5°), sp2 (trigonal planar, 120°), sp (linear, 180°). s-character effects. VSEPR theory of shapes and lone pair repulsions. Hybridization rules (attached atoms + lone pairs), lone pair delocalization next to pi systems.",
    curriculum: "Foundational Theories of atomic structure: (1) Aufbau principle (filling orbitals in order of increasing energy: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p...), (2) Pauli's Exclusion Principle (no two electrons in a single atom have identical quantum numbers; only two electrons with opposite spins can occupy an orbital), (3) Hund's Rule (every orbital in a subshell is singly occupied before double occupation, and singly occupied electrons have parallel spins). Principal Energy Levels (PELs 1, 2, 3, 4) and subshells (s, p, d, f). Lewis Structures: noble gas configuration (octet rule), valence electrons (outermost energy level), valence dot diagrams (e.g. Na, Mg, Al, Si, P, S, Cl, Ar), Lewis line bonds structures. Hybridization of carbon: promotion of 2s electron to empty 2p orbital (2s1 2p3), mixing of orbitals to form equivalent degenerate hybrid orbitals. Types of hybridization: (1) sp3 (tetrahedral geometry, 109.5° bond angle, e.g. methane CH4), (2) sp2 (trigonal planar geometry, 120° bond angle, e.g. ethene), (3) sp (linear geometry, 180° bond angle, e.g. ethyne). Implications of hybridization on bonding: determines molecular shape, bond strength, electron density, and acidity (sp carbon is more electronegative and acidic than sp2/sp3 because of 50% s-character). VSEPR Theory (valence shell electron pair repulsion): electron pairs around central atom repel and arrange as far apart as possible, lone pairs repel more strongly than bonding pairs, affecting shape and bond angles (e.g. borane BH3 trigonal planar, methane CH4 tetrahedral, ammonia NH3 trigonal pyramidal, water H2O bent). Rules for determining hybridization: count number of attached atoms + number of lone pairs (do not count multiple bonds; sp3 = 4, sp2 = 3, sp = 2), lone pairs next to pi bonds can delocalize into the pi system."
  },
  {
    name: "Isolation & Purification of Organic Compounds",
    notes: "Reaction mixtures contain desired product, starting materials, side-products, solvents, and impurities. Purification techniques: filtration (solubility, size), evaporation, distillation (boiling points; simple, fractional, steam), solvent extraction (separating funnel, immiscible solvents), chromatography (TLC, column, paper; adsorption vs partition; Rf factor), crystallization/recrystallization (temperature solubility), sublimation.",
    curriculum: "Preamble: organic reactions produce mixtures containing products, unreacted starting materials, side-products, solvents, and desired compound. Separation techniques are crucial to purify target compounds, identify unknown substances, and remove impurities. Separation and purification techniques: (1) Filtration: common and simple technique based on particle size and solubility, useful for removing insoluble by-products, used in recrystallization to collect purified solids, (2) Evaporation: removing liquid solvent by heating, used to evaporate solvents like ethanol or hexane after extraction, (3) Distillation: separation based on boiling point differences, used to purify solvents or recover reagents, separates mixtures with large differences in boiling points (e.g. chloroform 60°C and aniline 189°C), types include simple, fractional, and steam distillation, (4) Fractional Distillation: employed when boiling points of liquids are close, fractionating column with packing is fixed to round-bottomed flask to prevent vapours from condensing together, examples include methanol and ethanol separation, petroleum fractions (gasoline, kerosene, diesel), benzene and toluene, (5) Steam Distillation: steam is passed into flask containing liquids, liquids boil faster because aqueous tension (vapour pressure of water) helps balance atmospheric pressure (total pressure = aqueous tension + vapour pressure of organic component), examples include essential oils from plants like Eugenol from clove oil, (6) Chromatography (Paper, Thin Layer, Column): separation based on solubility and movement through a medium, TLC used for reaction tracking (aspirin, paracetamol synthesis), column chromatography used for purifying intermediates, adsorption chromatography (constituents adsorbed on silica gel or alumina, e.g. Column and TLC), partition chromatography (liquid-liquid or gas-liquid), (7) Thin Layer Chromatography (TLC): sheet of adsorbent (alumina/silica), sample spotted on base line, solvent rises by capillary action, components move with different Rf (retardation/retention factor) values, Rf = distance moved by solute / distance moved by solvent, (8) Crystallization/Recrystallization: purification based on solubility differences at different temperatures, crystals form upon cooling, benzoic acid crystallised with water (sparingly soluble in cold water, highly soluble in hot water), (9) Sublimation: solid turns to gas directly without becoming liquid, purifies volatile organic solids like naphthalene, camphor, anthracene, benzoic acid."
  },
  {
    name: "Determination of Structure: Qualitative & Quantitative Analysis",
    notes: "Qualitative analysis detects elements (Lassaigne's sodium fusion test for N, S, halogens; Prussian blue, nitroprusside, lead acetate, silver halide precipitate) and functional groups (alcohols, aldehydes, ketones, carboxylic acids, amines, phenols, esters, halides, alkenes, alkynes). Quantitative analysis estimates C/H (Liebig's combustion), N (Kjeldahl digestion, Dumas combustion), S/halogens (Carius), P (Carius, pyrophosphate). Spectroscopic methods: IR (bond vibrations), NMR (chemical shift, splitting), MS (m/z ratio), UV-Vis (conjugated pi systems).",
    curriculum: "Qualitative Analysis - Element Detection: organic compounds contain C, H, N, O, S, halogens (Cl, Br, I). (1) Lassaigne's Test (Sodium Fusion Test): fusing organic compound with sodium metal converts covalent N, S, halogens into ionic NaCN, Na2S, NaX. Extract is tested. (a) Detection of Nitrogen: extract + FeSO4, heat, add FeCl3 and acidify with HCl yields Prussian blue precipitate of Fe4[Fe(CN)6]3. Interference of S and N forms sodium thiocyanate NaSCN yielding blood-red color, (b) Detection of Sulfur: sodium nitroprusside test yields purple complex, or lead acetate test acidified with acetic acid yields black PbS precipitate, (c) Detection of Halogens: extract + conc. HNO3 (boiled to remove HCN/H2S) + AgNO3 yields silver halide precipitates (AgCl curdy white soluble in ammonia; AgBr pale yellow partially soluble; AgI yellow insoluble). Qualitative Analysis - Functional Group Detection: (1) Alcohols: sodium metal test (H2 release), acetyl chloride test (ester formation, HCl fumes with ammonia), ceric ammonium nitrate test (red/pink complex), (2) Aldehydes: Tollen's test/silver mirror, Fehling's test (red Cu2O precipitate), Schiff's test (pink/magenta), (3) Ketones: iodoform test for methyl ketones (yellow CHI3 precipitate), 2,4-DNP test (yellow/orange precipitate), (4) Carboxylic Acids: sodium bicarbonate test (CO2 evolution turns limewater milky), esterification test (fruity odor with alcohol/H2SO4), (5) Amines: carbylamine test (1° amine + chloroform + KOH yields foul-smelling isocyanide), diazotization (aromatic 1° + nitrous acid yields diazonium, couples to form colored azo), Hinsberg's test, (6) Phenols: FeCl3 test (violet/purple complex), Liebermann's test (sodium nitrite + H2SO4), (7) Esters: hydrolysis, Zeisel test, (8) Halides: AgNO3 test, (9) Alkenes/Alkynes: bromine water test (decolorization), Baeyer's test (KMnO4 brown precipitate). Quantitative Analysis - Estimation of Elements: (1) C & H Estimation (Liebig's Combustion Method): known mass of sample combusted in excess O2 over CuO, CO2 absorbed by KOH U-tube, H2O absorbed by CaCl2 U-tube, calculate percentages, (2) Nitrogen Estimation: (a) Kjeldahl Method: digestion of sample with conc. H2SO4 and CuSO4 catalyst to convert N to ammonium sulfate, neutralized with NaOH, distilled NH3 into standard acid, titration; (b) Dumas Method: combustion in O2 to convert N to N2 gas, measured by TCD, (3) Halogen Estimation (Carius Method): sample heated with fuming HNO3 and AgNO3 in Carius tube, halides weighed as AgX, (4) Sulfur Estimation: Carius method to BaSO4, or sodium fusion followed by lead acetate to PbS, (5) Phosphorus Estimation: Carius method to ammonium phosphomolybdate or magnesium pyrophosphate method. Spectroscopic Methods: (1) IR Spectroscopy: measures bond vibrations, broad O-H (3200-3600 cm-1), strong C=O (1700 cm-1), sharp N-H (3300 cm-1), C-H (2800-3100 cm-1), (2) NMR Spectroscopy: detects environment of 1H/13C nuclei, chemical shift (delta), integration, multiplicity (splitting, n+1 rule), (3) Mass Spectrometry (MS): m/z of ionized molecules, molecular ion peak (M+) gives mass, base peak is most intense, isotope peaks for halogens, (4) UV-Vis Spectroscopy: electronic transitions (pi to pi*, n to pi*) in conjugated systems, more conjugation = higher lambda-max."
  },
  {
    name: "Nomenclature & Functional Group Classes of Organic Compounds",
    notes: "Functional groups determine chemical reactivity. Core prefix and suffix rules for Alkanes (-ane), Alkenes (-ene), Alkynes (-yne), Alcohols (-ol), Ethers (alkoxy- / ether), Aldehydes (-al), Ketones (-one), Carboxylic acids (-oic acid), Esters (-oate), Amines (-amine), Amides (-amide), Nitriles (-nitrile). Suffix priority rules (carboxylic acids > esters > amides > nitriles > aldehydes > ketones > alcohols > amines > alkenes/alkynes > ethers > halides). Naming compounds with multiple functional groups.",
    curriculum: "Definition of Functional Groups (specific group of atoms responsible for characteristic chemical reactions). General formulas, prefixes, suffixes, and examples for all classes: (1) Alkane (general formula R-H, suffix -ane, e.g. methane CH4), (2) Alkene (R-CH=CH-R, suffix -ene, e.g. ethene), (3) Alkyne (R-C≡C-R, suffix -yne, e.g. ethyne), (4) Alcohol (R-OH, prefix hydroxy-, suffix -ol, e.g. ethanol), (5) Ether (R-O-R', suffix ether or prefix alkoxy-, e.g. dimethyl ether), (6) Aldehyde (R-CHO, prefix formyl-, suffix -al, e.g. ethanal), (7) Ketone (R-CO-R', prefix oxo-, suffix -one, e.g. propanone), (8) Carboxylic acid (R-COOH, prefix carboxy-, suffix -oic acid, e.g. ethanoic acid), (9) Ester (R-COOR', prefix alkoxycarbonyl-, suffix -oate, e.g. methyl ethanoate), (10) Amine (R-NH2, prefix amino-, suffix -amine, e.g. methylamine), (11) Amide (R-CONH2, suffix -amide, e.g. ethanamide), (12) Nitrile (R-CN, prefix cyano-, suffix -nitrile, e.g. propanenitrile). Priority Order of Functional Groups in IUPAC Nomenclature (descending order): 1. Carboxylic acid (-COOH), 2. Ester (-COOR), 3. Amide (-CONH2), 4. Nitrile (-CN), 5. Aldehyde (-CHO), 6. Ketone (>C=O), 7. Alcohol (-OH), 8. Amine (-NH2), 9. Alkene (C=C), 10. Alkyne (C≡C), 11. Alkane (C-C), 12. Ether (R-O-R'), 13. Halide (F, Cl, Br, I). Naming compounds with multiple functional groups: use highest priority as suffix, others as prefixes. Specific examples: (1) CH3CH(OH)CH2COOH where COOH takes priority suffix (-oic acid) and -OH becomes prefix (hydroxy-), named as 3-Hydroxybutanoic acid, (2) 2-hydroxybenzoic acid (salicylic acid) consists of benzene ring with COOH and OH, (3) 3-formylbenzoic acid with COOH taking priority over aldehyde, (4) 3-oxohexanoic acid with COOH taking priority over ketone, (5) 2-carboxybenzaldehyde (rare case where aldehyde takes priority as base 'benzaldehyde' so COOH is carboxy prefix), (6) Methyl 3-(ethoxycarbonyl)benzoate where ester groups are present and named with alkoxycarbonyl- prefix, (7) 4-aminobenzoic acid with COOH taking priority over amine."
  }
];

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('[INFO] Connecting to MongoDB...');
  await connectDB();

  // Find CHM 102
  console.log('[INFO] Locating Course CHM 102...');
  const course = await Course.findOne({ code: "CHM 102" });
  if (!course) {
    console.error('[ERROR] Course CHM 102 not found.');
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[ERROR] GEMINI_API_KEY is not defined.');
    process.exit(1);
  }

  console.log('[INFO] Initializing GoogleGenAI client...');
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }
    }
  });

  let topicsProcessedThisRun = 0;
  // Process topics one-by-one, skipping those already fully seeded
  for (const topicConf of TOPICS_CONFIG) {
    console.log(`\n==================================================`);
    console.log(`[INFO] Analyzing topic: "${topicConf.name}"`);

    // Self-healing skip check
    const existingTopic = await Topic.findOne({ course_id: course._id, name: topicConf.name });
    if (existingTopic) {
      const qCount = await Question.countDocuments({ topic_id: existingTopic._id });
      if (qCount === 50) {
        console.log(`[INFO] Topic already has exactly 50 questions. SKIPPING to prevent timeouts/regen.`);
        continue;
      } else {
        console.log(`[INFO] Topic exists but has ${qCount} questions instead of 50. Cleaning up to re-seed...`);
        await Question.deleteMany({ topic_id: existingTopic._id });
        await Topic.deleteOne({ _id: existingTopic._id });
      }
    }

    if (topicsProcessedThisRun >= 1) {
      console.log(`[INFO] Reached maximum topic seeding limit (1) for this run to avoid timeouts. Exiting script...`);
      break;
    }
    topicsProcessedThisRun++;

    // Create topic only after API call succeeds
    console.log(`[INFO] Invoking Gemini for topic "${topicConf.name}"...`);

    const prompt = `You are a professional chemistry professor writing questions for a university Organic Chemistry exam (CHM 102).
Generate exactly 50 high-quality, scientifically accurate multiple-choice questions (MCQs) for the topic: "${topicConf.name}".

Core Curriculum Content:
${topicConf.curriculum}

CRITICAL CONSTRAINTS (Strictly Respect User Request):
1. Paraphrase all questions and answers to be EXTREMELY short and concise. No fluff.
2. Question Text: Under 15 words.
3. Option A, B, C, D Text: Under 5 words each (very brief).
4. Explanation: Under 15 words (very brief, direct fact).
5. Ensure 100% scientific accuracy based on organic chemistry principles.
6. The correct answer option 'correct' must correspond to one of 'a', 'b', 'c', or 'd'.

Return the output as a JSON array of objects conforming to this schema. Do not truncate the array; output exactly 50 distinct items.`;

    let attempts = 0;
    const maxAttempts = 5;
    let questionsRaw: any[] = [];
    let apiSuccess = false;

    while (attempts < maxAttempts && !apiSuccess) {
      try {
        attempts++;
        console.log(`[INFO] Calling Gemini API (attempt ${attempts}/${maxAttempts})...`);
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "Array of exactly 50 short multiple choice questions",
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  a: { type: Type.STRING },
                  b: { type: Type.STRING },
                  c: { type: Type.STRING },
                  d: { type: Type.STRING },
                  correct: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["text", "a", "b", "c", "d", "correct", "explanation"]
              }
            }
          }
        });

        questionsRaw = JSON.parse(response.text!.trim());
        console.log(`[INFO] Gemini successfully returned ${questionsRaw.length} questions.`);
        apiSuccess = true;
      } catch (apiError: any) {
        console.error(`[ERROR] Attempt ${attempts} failed:`, apiError.message);
        if (attempts < maxAttempts) {
          const isQuotaError = apiError.message.includes("429") || apiError.message.toLowerCase().includes("quota") || apiError.message.toLowerCase().includes("resource_exhausted") || apiError.message.toLowerCase().includes("limit");
          const waitTime = isQuotaError ? 25000 : 5000 * attempts;
          console.log(`[INFO] Waiting ${waitTime / 1000}s before retrying...`);
          await delay(waitTime);
        } else {
          console.error(`[FATAL] Exceeded maximum attempts for topic "${topicConf.name}". Skipping.`);
        }
      }
    }

    if (!apiSuccess || questionsRaw.length === 0) {
      continue;
    }

    try {
      const topic = new Topic({
        course_id: course._id,
        name: topicConf.name,
        question_count: 50,
        notes: topicConf.notes
      });
      await topic.save();
      console.log(`[INFO] Topic created in DB.`);

      const questionsToInsert = [];
      for (const raw of questionsRaw) {
        let correctVal = "";
        if (raw.correct === "a") correctVal = raw.a;
        else if (raw.correct === "b") correctVal = raw.b;
        else if (raw.correct === "c") correctVal = raw.c;
        else if (raw.correct === "d") correctVal = raw.d;

        const optionList = [
          { text: raw.a, originalKey: "option_a" },
          { text: raw.b, originalKey: "option_b" },
          { text: raw.c, originalKey: "option_c" },
          { text: raw.d, originalKey: "option_d" }
        ];

        const shuffledOptions = shuffleArray([...optionList]);
        const correctIdxInShuffled = shuffledOptions.findIndex(o => o.text === correctVal);
        const keys = ['option_a', 'option_b', 'option_c', 'option_d'];
        const correctOptionKey = keys[correctIdxInShuffled >= 0 ? correctIdxInShuffled : 0];

        const finalCorrectIdx = correctIdxInShuffled >= 0 ? correctIdxInShuffled : 0;
        shuffledOptions[finalCorrectIdx].text = shuffledOptions[finalCorrectIdx].text + CORRECT_OPTION_MARKER;

        questionsToInsert.push({
          topic_id: topic._id,
          text: raw.text,
          a: shuffledOptions[0].text,
          b: shuffledOptions[1].text,
          c: shuffledOptions[2].text,
          d: shuffledOptions[3].text,
          correct_option: correctOptionKey,
          explanation: raw.explanation,
          is_refined: true
        });
      }

      await Question.insertMany(questionsToInsert);
      console.log(`[INFO] Seeded ${questionsToInsert.length} questions for topic "${topicConf.name}"`);

    } catch (dbError: any) {
      console.error(`[ERROR] Database error for "${topicConf.name}":`, dbError.message);
    }
  }

  // Cleanup old initial topics
  console.log(`\n[INFO] Post-seed cleanup of older stale topics...`);
  const currentTopicNames = TOPICS_CONFIG.map(t => t.name);
  const oldTopics = await Topic.find({ course_id: course._id, name: { $nin: currentTopicNames } });
  for (const oldT of oldTopics) {
    console.log(`[INFO] Dropping old stale topic: "${oldT.name}"`);
    await Question.deleteMany({ topic_id: oldT._id });
    await Topic.deleteOne({ _id: oldT._id });
  }

  // Update counts
  const allCourseTopics = await Topic.find({ course_id: course._id });
  let totalCourseQuestions = 0;
  for (const t of allCourseTopics) {
    const count = await Question.countDocuments({ topic_id: t._id });
    t.question_count = count;
    await t.save();
    totalCourseQuestions += count;
  }

  console.log(`\n[SUCCESS] Seeding complete! Course CHM 102 now has ${allCourseTopics.length} topics and ${totalCourseQuestions} total questions.`);
  process.exit(0);
}

run().catch(err => {
  console.error('[ERROR] Seeding threw exception:', err);
  process.exit(1);
});
