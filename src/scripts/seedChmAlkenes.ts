import { connectDB } from "../db";
import { Course, Topic, Question } from "../models/index";
import mongoose from "mongoose";

const CORRECT_OPTION_MARKER = '\u200E\u200F\u200E';

const QUESTIONS_RAW = [
  {
    text: "Alkenes are also historically referred to as:",
    a: "Olefins",
    b: "Alkanes",
    c: "Alkynes",
    d: "Arenes",
    correct: "a",
    explanation: "Alkenes are historically called olefins (oil-forming gas) because low molecular weight alkenes react with chlorine/bromine to form oily liquid products."
  },
  {
    text: "Which of the following defines terminal, internal, and cycloalkenes?",
    a: "Terminal has double bond at chain end; internal has carbons on both ends of double bond; cycloalkenes have it in a ring.",
    b: "Terminal has double bonds at both ends; internal has it in the center; cycloalkenes are acyclic.",
    c: "Terminal is saturated; internal is branched; cycloalkenes have triple bonds in a ring.",
    d: "Terminal is $sp$ hybridized; internal is $sp^2$; cycloalkenes are $sp^3$ hybridized.",
    correct: "a",
    explanation: "Terminal alkenes have double bonds at the end of the chain. Internal alkenes have substituents on both sides. Cycloalkenes have the double bond in a ring."
  },
  {
    text: "In ethylene, the carbon hybridization, bond angles, and geometry are:",
    a: "$sp^2$; $120^\\circ$; trigonal planar",
    b: "$sp^3$; $109.5^\\circ$; tetrahedral",
    c: "$sp$; $180^\\circ$; linear",
    d: "$sp^2$; $109.5^\\circ$; trigonal pyramidal",
    correct: "a",
    explanation: "Each double-bonded carbon in an alkene is $sp^2$ hybridized, with a trigonal planar geometry and approximate bond angles of $120^\\circ$."
  },
  {
    text: "A carbon-carbon double bond consists of:",
    a: "One $\\sigma$ bond and one $\\pi$ bond",
    b: "Two $\\sigma$ bonds",
    c: "Two $\\pi$ bonds",
    d: "One $\\sigma$ bond and two $\\pi$ bonds",
    correct: "a",
    explanation: "An alkene double bond contains one strong $\\sigma$ (sigma) bond from end-on overlap and one weaker $\\pi$ (pi) bond from side-by-side $p$-orbital overlap."
  },
  {
    text: "Using bond energies of ethane ($C\\text{--}C = 88\\text{ kcal/mol}$) and ethylene ($C\\text{=}C = 152\\text{ kcal/mol}$), what is the estimated strength of the $\\pi$ component?",
    a: "$64\\text{ kcal/mol}$",
    b: "$88\\text{ kcal/mol}$",
    c: "$152\\text{ kcal/mol}$",
    d: "$240\\text{ kcal/mol}$",
    correct: "a",
    explanation: "The $\\pi$ bond strength is calculated by subtracting the single bond strength from the total double bond energy: $152 - 88 = 64\\text{ kcal/mol}$."
  },
  {
    text: "Why do alkenes undergo many addition reactions that alkanes do not?",
    a: "The weak $\\pi$ bond ($64\\text{ kcal/mol}$) is easily broken to form two stronger $\\sigma$ bonds.",
    b: "The alkene $\\sigma$ bond is much weaker than the alkane $\\sigma$ bond.",
    c: "The $sp^2$ hybridized carbons are highly unstable compared to $sp^3$ carbons.",
    d: "The double bond always introduces high ring strain in acyclic systems.",
    correct: "a",
    explanation: "The weak $\\pi$ bond is easily cleaved, making addition reactions thermodynamically favorable as they convert a $\\pi$ bond into two stable $\\sigma$ bonds."
  },
  {
    text: "Geometrical (cis/trans) isomerism in alkenes is primarily caused by:",
    a: "Restricted rotation around the carbon-carbon double bond ($C\\text{=}C$)",
    b: "Varying carbon backbone connectivity",
    c: "The high volatility of cis isomers compared to trans isomers",
    d: "Rapid migration of hydrogen protons (tautomerism)",
    correct: "a",
    explanation: "The $\\pi$ overlap restricts rotation around the $C=C$ double bond; rotating would break the $\\pi$ bond, which requires a large energy input."
  },
  {
    text: "Which of the following alkenes can exist as cis/trans isomers?",
    a: "$R\\text{--}CH\\text{=}CH\\text{--}R$ unit alkenes",
    b: "All terminal alkenes ($R\\text{--}CH\\text{=}CH_2$)",
    c: "All $1,1$-disubstituted alkenes ($R_2C\\text{=}CH_2$)",
    d: "Ethene ($CH_2\\text{=}CH_2$)",
    correct: "a",
    explanation: "Cis/trans isomers require each carbon of the double bond to have two different groups. Terminal and $1,1$-disubstituted alkenes cannot show this."
  },
  {
    text: "In cis/trans isomerism, what is the spatial difference between configurations?",
    a: "Cis: substituents are on the same side; Trans: substituents are on opposite sides.",
    b: "Cis: substituents are on opposite sides; Trans: substituents are on the same side.",
    c: "Cis is always cyclic; Trans is always acyclic.",
    d: "Cis has $sp^3$ carbons; Trans has $sp^2$ carbons.",
    correct: "a",
    explanation: "Cis isomers have groups on the same side of the double bond; trans isomers have groups on opposite sides across the double bond plane."
  },
  {
    text: "In the Cahn-Ingold-Prelog ($E$/$Z$) system, how are configurations designated?",
    a: "$Z$ (same side of double bond); $E$ (opposite sides of double bond)",
    b: "$E$ (same side of double bond); $Z$ (opposite sides of double bond)",
    c: "$Z$ (higher atomic weight on right); $E$ (higher atomic weight on left)",
    d: "Priority is assigned alphabetically by substituent names.",
    correct: "a",
    explanation: "$Z$ comes from *Zusammen* (together / same side), while $E$ comes from *Entgegen* (opposite / opposite sides)."
  },
  {
    text: "Under the $E$/$Z$ system, how is substituent priority determined?",
    a: "The atom with the higher atomic number receives higher priority.",
    b: "The atom with the higher mass number always receives lower priority.",
    c: "The group with the most hydrogen atoms has higher priority.",
    d: "Alkyl groups always override halogens.",
    correct: "a",
    explanation: "Priority is directly proportional to the atomic number of the atom directly attached to the double-bonded carbon."
  },
  {
    text: "Which halogen substituent has the highest priority under Cahn-Ingold-Prelog rules?",
    a: "Iodine ($I$)",
    b: "Bromine ($Br$)",
    c: "Chlorine ($Cl$)",
    d: "Fluorine ($F$)",
    correct: "a",
    explanation: "Iodine has the highest atomic number (53) among the halogens listed, giving it the highest priority."
  },
  {
    text: "Why are trans alkenes generally more stable than cis alkenes?",
    a: "Trans alkenes have less steric strain because bulky groups are on opposite sides.",
    b: "Trans alkenes have higher boiling points.",
    c: "Cis alkenes have dipoles that completely cancel out.",
    d: "Cis alkenes contain weaker covalent $\\sigma$ bonds.",
    correct: "a",
    explanation: "In cis alkenes, bulky substituents are forced on the same side, creating steric crowding. Trans isomers place these groups further apart."
  },
  {
    text: "How does the number of alkyl substituents (R groups) affect alkene stability?",
    a: "Alkene stability increases as the number of alkyl groups on the double bond increases.",
    b: "Stability decreases due to higher molecular weight.",
    c: "Alkyl substitution has no effect on stability.",
    d: "Monosubstituted alkenes are more stable than tetrasubstituted ones.",
    correct: "a",
    explanation: "Alkyl groups release electron density to the $sp^2$ carbons. The stability trend is: Tetrasubstituted > Trisubstituted > Disubstituted > Monosubstituted."
  },
  {
    text: "What two experimental measurements compare the relative stabilities of alkenes?",
    a: "Heat of hydrogenation and heat of combustion",
    b: "Boiling point and vapor pressure",
    c: "Solubility and refractive index",
    d: "Melting point and viscosity",
    correct: "a",
    explanation: "Both heat of hydrogenation and heat of combustion release less energy for more stable, lower-energy alkenes."
  },
  {
    text: "What is Step 1 of naming an acyclic alkene under IUPAC guidelines?",
    a: "Find the longest chain containing both double-bonded carbons and use the suffix '-ene'.",
    b: "Number the chain to give the double bond the highest possible number.",
    c: "Identify the smallest branch and make it position C1.",
    d: "Prioritize naming alkyl substituents before locating the double bond.",
    correct: "a",
    explanation: "The parent chain must be the longest continuous carbon chain containing both carbons of the double bond, with suffix changing to '-ene'."
  },
  {
    text: "In IUPAC nomenclature, how is parent chain numbering prioritized in alkenes?",
    a: "Number from the end that gives the double bond the lower number.",
    b: "Number from the end that gives alkyl substituents the lowest numbers.",
    c: "Number from left to right regardless of groups.",
    d: "Number based on the highest priority halogen.",
    correct: "a",
    explanation: "The double bond has priority over alkyl and halogen groups, so the chain is numbered to give the double bond the lowest possible position."
  },
  {
    text: "How are acyclic compounds with two carbon-carbon double bonds named?",
    a: "Dienes (using suffix '-adiene')",
    b: "Bi-alkenes",
    c: "Alkenylalkynes",
    d: "Polyenes",
    correct: "a",
    explanation: "Compounds with two double bonds are named as dienes by replacing the '-ane' ending with '-adiene'."
  },
  {
    text: "How are cycloalkenes numbered under IUPAC rules?",
    a: "Double bond carbons are assigned C1 and C2, numbering towards the substituent.",
    b: "Double bond carbons are assigned C2 and C3.",
    c: "Numbering starts at the largest substituent.",
    d: "Numbering is alphabetical based on halogens present.",
    correct: "a",
    explanation: "The double bond is automatically C1 and C2. The ring is numbered in the direction that gives any substituents the lowest numbers."
  },
  {
    text: "In naming compounds containing both $C\\text{=}C$ and $\\text{--}OH$ groups, parent numbering prioritizes:",
    a: "The hydroxyl group ($\\text{--}OH$)",
    b: "The double bond ($C\\text{=}C$)",
    c: "The longest alkyl branch",
    d: "Halogen substituents",
    correct: "a",
    explanation: "The hydroxyl group has higher priority in IUPAC rules, so the chain is numbered to give the $-OH$ carbon the lowest possible number."
  },
  {
    text: "What is the IUPAC name for $CH_2\\text{=}CH\\text{--}CH_2\\text{--}OH$?",
    a: "2-propen-1-ol",
    b: "1-propen-3-ol",
    c: "3-hydroxy-1-propene",
    d: "Allyl alcohol",
    correct: "a",
    explanation: "The parent is propene. Numbering from the right gives the $-OH$ group C1 and the double bond C2, yielding 2-propen-1-ol."
  },
  {
    text: "Why is the single bond between an $sp^3$ alkyl carbon and an $sp^2$ alkene carbon slightly polar?",
    a: "The $sp^2$ carbon has more s-character (33%) and is more electronegative than the $sp^3$ carbon (25%).",
    b: "The $sp^3$ carbon has higher s-character and is more electronegative.",
    c: "The alkyl group is highly electronegative because of hydrogen atoms.",
    d: "The double bond shields neighboring single bonds.",
    correct: "a",
    explanation: "More s-character (33% in $sp^2$ vs 25% in $sp^3$) draws electron density closer to the nucleus, making the $sp^2$ carbon more electronegative."
  },
  {
    text: "Why does cis-2-butene have a higher boiling point than trans-2-butene?",
    a: "The cis isomer has a net molecular dipole, while the trans dipole cancels out.",
    b: "The cis isomer has a higher molecular weight.",
    c: "The trans isomer has stronger steric strain.",
    d: "The cis isomer packs more tightly as a linear molecule.",
    correct: "a",
    explanation: "The polar cis isomer has reinforcing dipoles that generate a net dipole, increasing dipole-dipole attractions and the boiling point."
  },
  {
    text: "Which statement about alkene solubility is correct?",
    a: "Alkenes are soluble in organic solvents and insoluble in water.",
    b: "Alkenes are highly soluble in water due to the double bond.",
    c: "Alkenes are insoluble in organic solvents but soluble in water.",
    d: "Alkenes are insoluble in all liquid solvents.",
    correct: "a",
    explanation: "Alkenes are nonpolar hydrocarbons and obey the rule 'like dissolves like', making them organic-soluble and water-insoluble."
  },
  {
    text: "Which simple alkene is polymerized to make film wraps and plastic bags?",
    a: "Ethylene",
    b: "Propylene",
    c: "Butene",
    d: "Isoprene",
    correct: "a",
    explanation: "Ethylene (ethene) is polymerized to form polyethylene, a material widely used for plastic bags, bottles, and wraps."
  },
  {
    text: "Which naturally occurring alkene is the orange pigment in carrots?",
    a: "$\\beta$-carotene",
    b: "Zingiberene",
    c: "Limonene",
    d: "$\\alpha$-farnesene",
    correct: "a",
    explanation: "$\\beta$-carotene is a highly conjugated polyene alkene that absorbs blue light, giving carrots their orange color."
  },
  {
    text: "Which alkene is the primary component of ginger oil?",
    a: "Zingiberene",
    b: "$\\beta$-carotene",
    c: "Limonene",
    d: "$\\alpha$-farnesene",
    correct: "a",
    explanation: "Zingiberene is a cyclic sesquiterpene alkene that provides the characteristic flavor and aroma of ginger."
  },
  {
    text: "Most naturally occurring unsaturated fatty acids have which double bond configuration?",
    a: "$Z$ configuration (cis)",
    b: "$E$ configuration (trans)",
    c: "Alternating $E$ and $Z$ configurations",
    d: "Exclusively trans double bonds",
    correct: "a",
    explanation: "Naturally occurring fatty acids almost exclusively possess cis ($Z$) double bonds, which introduce a kink in the carbon chain."
  },
  {
    text: "How does the melting point of fatty acids change as the number of double bonds increases?",
    a: "Melting point decreases because cis double bonds create kinks that prevent tight molecular packing.",
    b: "Melting point increases due to double bond rigidity.",
    c: "Melting point increases due to higher surface area.",
    d: "Melting point remains constant.",
    correct: "a",
    explanation: "Cis double bonds create chain kinks that disrupt crystalline packing, lowering the van der Waals forces and decreasing the melting point."
  },
  {
    text: "Which of the following 18-carbon fatty acids has the lowest melting point?",
    a: "Linolenic acid (3 double bonds)",
    b: "Stearic acid (0 double bonds)",
    c: "Oleic acid (1 double bond)",
    d: "Linoleic acid (2 double bonds)",
    correct: "a",
    explanation: "Increasing the number of cis double bonds lowers the melting point: stearic is $69^\\circ\\text{C}$, oleic is $4^\\circ\\text{C}$, linoleic is $-5^\\circ\\text{C}$, and linolenic is $-11^\\circ\\text{C}$."
  },
  {
    text: "What are the three common elimination methods used to prepare alkenes?",
    a: "Dehydrohalogenation, dehydration, and dehalogenation",
    b: "Hydrogenation, hydration, and halogenation",
    c: "Ozonolysis, hydroboration, and epoxidation",
    d: "Substitution, addition, and rearrangement",
    correct: "a",
    explanation: "These methods eliminate $HX$, $H_2O$, and $X_2$ respectively to introduce a carbon-carbon double bond."
  },
  {
    text: "What is the reactivity order of alkyl halides toward dehydrohalogenation?",
    a: "Tertiary ($3^\\circ$) > Secondary ($2^\\circ$) > Primary ($1^\\circ$)",
    b: "Primary ($1^\\circ$) > Secondary ($2^\\circ$) > Tertiary ($3^\\circ$)",
    c: "Secondary ($2^\\circ$) > Primary ($1^\\circ$) > Tertiary ($3^\\circ$)",
    d: "All alkyl halides react at the same rate.",
    correct: "a",
    explanation: "Tertiary halides react fastest because they yield more highly substituted, thermodynamically stable alkenes."
  },
  {
    text: "What is the major product when 2-chlorobutane is heated with alcoholic $KOH$?",
    a: "2-Butene",
    b: "1-Butene",
    c: "Butane",
    d: "2-Butanol",
    correct: "a",
    explanation: "According to Zaitsev's rule, elimination favors the more highly substituted, more stable alkene, which is 2-butene."
  },
  {
    text: "What reagents and conditions are used for the dehydration of an alcohol to an alkene?",
    a: "Strong acid catalyst (Conc. $H_2SO_4$ or Conc. $H_3PO_4$) and heat",
    b: "Strong base ($KOH$) in alcohol",
    c: "Hydrogen gas with a nickel catalyst",
    d: "Water and an alkaline buffer",
    correct: "a",
    explanation: "Acid-catalyzed dehydration of alcohols is an elimination reaction requiring a strong acid catalyst and thermal energy."
  },
  {
    text: "What is the major product from the acid-catalyzed dehydration of 2-butanol?",
    a: "*trans*-2-Butene",
    b: "1-Butene",
    c: "*cis*-2-Butene",
    d: "1-Butanol",
    correct: "a",
    explanation: "Dehydration is stereoselective, yielding the more stable *trans*-2-butene with minimal steric strain as the major product."
  },
  {
    text: "Which catalysts are commonly used to add hydrogen ($H_2$) to alkenes to produce alkanes?",
    a: "Finely divided Ni, Pt, or Pd",
    b: "Concentrated $H_2SO_4$",
    c: "Sodium hydroxide ($NaOH$)",
    d: "Anhydrous $AlCl_3$",
    correct: "a",
    explanation: "Transition metal catalysts (Ni, Pt, Pd) adsorb the reactants onto their surface to facilitate syn addition of hydrogen."
  },
  {
    text: "Because the $\\pi$ bond is electron-rich, simple alkenes act as nucleophiles and react with:",
    a: "Electrophiles",
    b: "Nucleophiles",
    c: "Strong bases",
    d: "Anions",
    correct: "a",
    explanation: "The loosely held $\\pi$ electrons are attracted to electron-deficient species (electrophiles) during addition reactions."
  },
  {
    text: "What is the difference between syn addition and anti addition?",
    a: "Syn adds to the same side of the double bond; anti adds to opposite sides.",
    b: "Syn adds to different molecules; anti adds to the same molecule.",
    c: "Syn is base-catalyzed; anti is acid-catalyzed.",
    d: "Syn occurs with terminal alkenes; anti with internal alkenes.",
    correct: "a",
    explanation: "Syn addition delivers both groups to the same face of the alkene; anti addition delivers them to opposite faces."
  },
  {
    text: "What is the product of the reaction between cyclohexene and HBr?",
    a: "Bromocyclohexane",
    b: "1,2-dibromocyclohexane",
    c: "Hexane",
    d: "1-bromocyclohexene",
    correct: "a",
    explanation: "This is a standard electrophilic hydrohalogenation addition, adding H and Br across the double bond to yield bromocyclohexane."
  },
  {
    text: "What does Markovnikov's rule state regarding the addition of HX to an unsymmetrical alkene?",
    a: "The hydrogen atom adds to the double-bonded carbon with more hydrogen atoms.",
    b: "The halogen atom adds to the carbon with more hydrogen atoms.",
    c: "The hydrogen atom adds to the more substituted double-bonded carbon.",
    d: "The reaction is non-selective.",
    correct: "a",
    explanation: "Markovnikov's rule states that the proton adds to the carbon with more hydrogens, placing the positive charge on the more substituted carbon."
  },
  {
    text: "What is the mechanistic basis of Markovnikov's rule?",
    a: "Protonation occurs to form the more stable carbocation intermediate.",
    b: "The halogen is too bulky to fit on the terminal carbon.",
    c: "The less substituted carbocation is more stable.",
    d: "The reaction is a concerted single-step process.",
    correct: "a",
    explanation: "The rate-determining step forms a carbocation. Generating the more highly substituted carbocation ($3^\circ > 2^\circ > 1^\circ$) has a lower activation energy."
  },
  {
    text: "What is the major organic product from the reaction of propene with HCl?",
    a: "2-Chloropropane",
    b: "1-Chloropropane",
    c: "1,2-Dichloropropane",
    d: "2-Chloropropene",
    correct: "a",
    explanation: "Protonation of propene yields a secondary carbocation ($CH_3CH^+CH_3$) which is then attacked by chloride, giving 2-chloropropane."
  },
  {
    text: "Which reaction conditions yield an anti-Markovnikov HBr addition product?",
    a: "HBr in the presence of peroxides",
    b: "HCl in the presence of peroxides",
    c: "HI in the presence of peroxides",
    d: "HBr in a cold, dark environment",
    correct: "a",
    explanation: "Only HBr in the presence of peroxides undergoes radical addition, adding the bromine atom to the less substituted carbon."
  },
  {
    text: "What are the typical reagents and products of an alkene hydration reaction?",
    a: "Water and an acid catalyst; produces an alcohol.",
    b: "Hydrogen gas and nickel; produces an alkane.",
    c: "Methanol and sodium; produces an ether.",
    d: "Cold permanganate; produces an aldehyde.",
    correct: "a",
    explanation: "Alkenes add water in the presence of strong acid catalysts (like $H_2SO_4$) to form Markovnikov alcohols."
  },
  {
    text: "What product is formed from methanol ($CH_3OH$) and 2-methylpropene under acid catalysis?",
    a: "tert-Butyl methyl ether (MTBE)",
    b: "tert-Butyl alcohol",
    c: "Methyl propyl ether",
    d: "Isobutene",
    correct: "a",
    explanation: "Acid-catalyzed addition of alcohols to alkenes yields ethers. Methanol reacts with 2-methylpropene to form the fuel additive MTBE."
  },
  {
    text: "What is a major side reaction during the acid-catalyzed hydration of alkenes?",
    a: "Carbocation rearrangements (hydride or methyl shifts) to form a more stable intermediate.",
    b: "Anti-Markovnikov addition.",
    c: "Strict syn addition.",
    d: "Spontaneous double bond regeneration.",
    correct: "a",
    explanation: "Because hydration forms a carbocation intermediate, it is prone to skeletal rearrangements to form more stable carbocations."
  },
  {
    text: "What is the stereochemistry of halogen ($X_2$) addition to an alkene?",
    a: "Strictly anti addition, yielding a trans-1,2-dihalide.",
    b: "Strictly syn addition, yielding a cis-1,2-dihalide.",
    c: "Non-selective mixture of syn and anti addition.",
    d: "Substitution rather than addition.",
    correct: "a",
    explanation: "Halogenation proceeds via a cyclic halonium ion. The halide nucleophile attacks from the opposite face, giving anti addition."
  },
  {
    text: "What is a halohydrin and how is it prepared from an alkene?",
    a: "A compound with halogen and OH on adjacent carbons; prepared with $X_2$ and water.",
    b: "A hydrated alkane; prepared with alkyl halide and sodium hydroxide.",
    c: "A diol; prepared with cold alkaline $KMnO_4$.",
    d: "A haloalkane; prepared with anhydrous HX.",
    correct: "a",
    explanation: "Halogenation of an alkene in water as a nucleophilic solvent yields a halohydrin, with the $-OH$ adding to the more substituted carbon."
  },
  {
    text: "What is the overall outcome of the two-step Hydroboration-Oxidation of an alkene?",
    a: "Syn addition of H and OH with anti-Markovnikov regiochemistry.",
    b: "Anti addition of H and OH with Markovnikov regiochemistry.",
    c: "Syn addition of H and OH with Markovnikov regiochemistry.",
    d: "Anti addition of H and OH with anti-Markovnikov regiochemistry.",
    correct: "a",
    explanation: "Hydroboration-oxidation adds water across the double bond in a syn fashion, placing the hydroxyl group on the less substituted carbon."
  },
  {
    text: "What does the reaction of an alkene with peroxybenzoic acid ($C_6H_5CO_3H$) yield?",
    a: "An epoxide (three-membered cyclic ether)",
    b: "An alkane",
    c: "An alkyne",
    d: "A chlorohydrin",
    correct: "a",
    explanation: "Peroxy acids transfer an oxygen atom to the alkene double bond in a concerted syn addition, producing an epoxide."
  },
  {
    text: "What is the product of cold, alkaline $KMnO_4$ or $OsO_4$ reaction with an alkene?",
    a: "A vicinal 1,2-diol (glycol) via syn dihydroxylation.",
    b: "An epoxide via anti addition.",
    c: "Aldehydes and ketones via oxidative cleavage.",
    d: "An alkyl halide.",
    correct: "a",
    explanation: "Cold alkaline $KMnO_4$ or $OsO_4$ reacts via a cyclic ester intermediate to perform syn addition of two hydroxyl groups."
  },
  {
    text: "In Baeyer's test for unsaturation, what color change occurs when an alkene reacts with $KMnO_4$?",
    a: "The purple color disappears and a brown precipitate ($MnO_2$) forms.",
    b: "The solution turns yellow-orange.",
    c: "Vigorous bubbling and hydrogen release.",
    d: "The solution turns bright blue.",
    correct: "a",
    explanation: "Reduction of purple permanganate ($MnO_4^-$) by the alkene forms brown, insoluble manganese dioxide ($MnO_2$)."
  },
  {
    text: "What is ozonolysis ($O_3$, then $Zn, H_2O$) primarily used for?",
    a: "Oxidative cleavage of the double bond to identify its position using carbonyl products.",
    b: "Reducing alkenes to alkanes.",
    c: "Halogenation of polymer chains.",
    d: "Converting alcohols to internal alkenes.",
    correct: "a",
    explanation: "Ozonolysis cleaves both the $\\sigma$ and $\\pi$ bonds of the alkene to form carbonyl groups, revealing the location of the original double bond."
  },
  {
    text: "What are the products of vigorous hot $KMnO_4$ oxidation of 2-methyl-2-butene?",
    a: "Acetone (ketone) and acetic acid (carboxylic acid)",
    b: "Two moles of acetic acid",
    c: "Acetone and carbon dioxide ($CO_2$)",
    d: "2,3-butanediol",
    correct: "a",
    explanation: "Vigorous hot $KMnO_4$ cleaves the double bond. The trisubstituted carbon yields acetone, while the monosubstituted carbon yields acetic acid."
  },
  {
    text: "What is the key difference between addition and condensation polymerization?",
    a: "Addition links monomers without atom loss; condensation eliminates small molecules (e.g., $H_2O$).",
    b: "Addition is for natural polymers; condensation is for synthetic plastics.",
    c: "Addition requires water; condensation is anhydrous.",
    d: "Addition yields liquids; condensation yields gases.",
    correct: "a",
    explanation: "Addition polymerization opens alkene double bonds with zero mass loss. Condensation polymerizations release a small byproduct like water."
  }
];

// Helper to shuffle array in-place
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function run() {
  console.log('[INFO] Connecting to MongoDB...');
  await connectDB();

  // Find CHM 102
  console.log('[INFO] Locating Course CHM 102...');
  const course = await Course.findOne({ code: "CHM 102" });
  if (!course) {
    console.error('[ERROR] Course CHM 102 not found in the database. Please verify course seeding.');
    process.exit(1);
  }

  // Create new topic
  const topicName = "Alkenes: Structure, Bonding, Isomerism, Preparation & Reactions";
  console.log(`[INFO] Creating Topic: "${topicName}" for Course CHM 102...`);
  
  // Clean up any existing Alkenes topic to prevent duplicate testing
  const existingTopic = await Topic.findOne({ course_id: course._id, name: topicName });
  if (existingTopic) {
    await Question.deleteMany({ topic_id: existingTopic._id });
    await Topic.deleteOne({ _id: existingTopic._id });
    console.log('[INFO] Cleaned up existing Alkenes topic and questions.');
  }

  const topic = new Topic({
    course_id: course._id,
    name: topicName,
    question_count: 50,
    notes: "Comprehensive study notes covering Alkene structure, bonding, $sp^2$ hybridization, geometrical (E/Z) isomerism, Cahn-Ingold-Prelog priority rules, relative stabilities, physical properties, dehydrohalogenation, alcohol dehydration, electrophilic additions, Markovnikov's rule, peroxides effect, halogenation, halohydrin formation, hydroboration-oxidation, epoxidation, ozonolysis, Baeyer's test, and addition/condensation polymerization."
  });
  await topic.save();

  console.log('[INFO] Seeding 50 high-quality MCQs...');
  const questionsToInsert = [];

  for (let i = 0; i < QUESTIONS_RAW.length; i++) {
    const raw = QUESTIONS_RAW[i];
    
    // Map raw correct option to value
    let correctVal = "";
    if (raw.correct === "a") correctVal = raw.a;
    else if (raw.correct === "b") correctVal = raw.b;
    else if (raw.correct === "c") correctVal = raw.c;
    else if (raw.correct === "d") correctVal = raw.d;

    // Create a list of all options
    const optionList = [
      { text: raw.a, originalKey: "option_a" },
      { text: raw.b, originalKey: "option_b" },
      { text: raw.c, originalKey: "option_c" },
      { text: raw.d, originalKey: "option_d" }
    ];

    // Shuffle options to ensure non-glaring and well-distributed layout
    const shuffledOptions = shuffleArray([...optionList]);

    // Find the index of the correct option in the shuffled array
    const correctIdxInShuffled = shuffledOptions.findIndex(o => o.text === correctVal);
    const keys = ['option_a', 'option_b', 'option_c', 'option_d'];
    const correctOptionKey = keys[correctIdxInShuffled];

    // Append CORRECT_OPTION_MARKER strictly to the correct option text (invisible zero-width)
    shuffledOptions[correctIdxInShuffled].text = shuffledOptions[correctIdxInShuffled].text + CORRECT_OPTION_MARKER;

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
  console.log(`[INFO] Seeded ${questionsToInsert.length} questions successfully!`);

  // Update topic counts and course counts
  const allCourseTopics = await Topic.find({ course_id: course._id });
  let totalCourseQuestions = 0;
  for (const t of allCourseTopics) {
    const count = await Question.countDocuments({ topic_id: t._id });
    t.question_count = count;
    await t.save();
    totalCourseQuestions += count;
  }
  
  console.log(`[INFO] Course CHM 102 now has ${allCourseTopics.length} topics and ${totalCourseQuestions} total questions.`);
  process.exit(0);
}

run().catch(err => {
  console.error('[ERROR] Seeding threw error:', err);
  process.exit(1);
});
