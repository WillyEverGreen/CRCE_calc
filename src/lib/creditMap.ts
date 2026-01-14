// Auto-generated credit map for FRCRCE subjects
// Covers all branches: CE, CSE, ECS, MECH, AI&DS
// All years: FE, SE, TE, BE

/**
 * Credit mapping based on subject code patterns:
 * - Subject codes follow format: 25XXXYYZZ where:
 *   - 25 = Academic year prefix
 *   - XXX = Category (BSC=Basic Science, PCC=Program Core, OE=Open Elective, etc.)
 *   - YY = Branch code (CE, CS, EC, ME, etc.)
 *   - ZZ = Subject number
 * 
 * Standard credit patterns:
 * - BSC (Basic Science Core): 2-3 credits
 * - PCC (Program Core Course): 1-4 credits depending on L-T-P
 * - OE (Open Elective): 2 credits
 * - MDM (Multi-Disciplinary Minor): 2 credits
 * - AEC (Ability Enhancement Course): 2 credits
 * - VEC (Value Education Course): 2 credits
 * - CEP (Community Engagement Project): 2 credits
 * - LLC (Liberal Learning Course): 2 credits
 * - PW (Project Work): 2-4 credits
 * - INT (Internship): 2-4 credits
 */

export const CREDIT_MAP: Record<string, number> = {
  // ========== COMMON SUBJECTS (All Branches) ==========
  // Basic Sciences
  "25BSC12CE01": 3, // Engineering Mathematics I
  "25BSC12CE02": 3, // Engineering Mathematics II
  "25BSC12CE03": 3, // Engineering Mathematics III
  "25BSC12CE04": 3, // Engineering Mathematics IV
  
  // ========== COMPUTER ENGINEERING (CE) ==========
  // ========== COMPUTER ENGINEERING (CE) ==========
  // Sem III (Verified from Syllabus Image)
  // Sem III (Verified from Syllabus Image)
  "25BSC12CE05": 2, // Discrete Mathematics and Graph Theory
  "25PCC12CE05": 3, // Computer Organization and Architecture
  "25PCC12CE06": 4, // Data Structures
  "25PCC12CE07": 1, // Object Oriented Programming with JAVA
  "25OE13CE1X": 2,  // Law for Engineers (Financial Planning, Taxation and Investment)
  "25MDMXX1": 2,    // MDM Course-1
  "25MDMXX2": 2,    // MDM Course-2
  "25AEC12CE02X": 2,// Modern Indian Languages
  "25VEC12CE01": 2, // Human Values and Professional Ethics
  "25CEP12CE01": 2, // Community Engagement Project
  "25DMX1": 4,      // Double Minor Course
  "25HR02": 4,      // Honors with Research

  // Sem IV & Others (Legacy/Estimated - to be verified)
  "25PCC12CE08": 3, // Computer Networks
  "25PCC12CE09": 3, // Software Engineering
  "25PCC12CE10": 4, // Web Development
  
  // TE CE
  "25PCC13CE01": 4, // Machine Learning
  "25PCC13CE02": 4, // Artificial Intelligence
  "25PCC13CE03": 3, // Information Security
  "25PCC13CE04": 3, // Cloud Computing
  "25PCC13CE05": 4, // Big Data Analytics
  
  // BE CE
  "25PCC14CE01": 4, // Deep Learning
  "25PCC14CE02": 4, // Distributed Systems
  "25PCC14CE03": 3, // Blockchain Technology
  
  // ========== CSE / AI&DS ==========
  "25PCC12CS01": 3, // Programming Fundamentals
  "25PCC12CS02": 3, // Data Structures
  "25PCC12CS03": 3, // Algorithms
  "25PCC12CS04": 4, // Machine Learning
  "25PCC12CS05": 3, // Deep Learning
  
  // ========== ELECTRONICS & COMPUTER SCIENCE (ECS) ==========
  // Sem III
  "25PCC12EC05": 3, // Electronic Devices
  "25PCC12EC06": 3, // Computer Organization and Architecture
  "25PCC12EC07": 3, // Database Management System
  "25PCC12EC08": 1, // OOP with Java
  "25VEC12EC01": 2, // Human Values and Professional Ethics
  "25CEP12EC01": 2, // Community Engagement Project
  "25PCC12EC01": 3, // Digital Electronics (Preserved if used elsewhere)
  "25PCC12EC02": 3, // Microprocessors (Preserved if used elsewhere)
  "25PCC12EC03": 3, // Signal Processing (Preserved if used elsewhere)
  "25PCC12EC04": 4, // Embedded Systems (Preserved if used elsewhere)
  
  
  // ========== MECHANICAL ENGINEERING (MECH) ==========
  "25PCC12ME01": 3, // Thermodynamics
  "25PCC12ME02": 3, // Fluid Mechanics
  "25PCC12ME03": 4, // Machine Design
  "25PCC12ME04": 3, // Manufacturing Processes
  "25PCC12ME05": 3, // Heat Transfer
  
  // ========== ELECTIVES & MINORS ==========
  // Open Electives (2 credits each)
  "25OE13CE01": 2,
  "25OE13CE02": 2,
  "25OE13CE03": 2,
  "25OE13CE04": 2,
  "25OE13CE05": 2,
  "25OE13CE06": 2,
  "25OE13CE07": 2,
  "25OE13CE08": 2,
  "25OE13CE09": 2,
  "25OE13CE10": 2,
  "25OE13CE11": 2,
  "25OE13CE12": 2,
  
  // Multi-Disciplinary Minors (2 credits each)
  "25MDM12BM01": 2, // Business Minor
  "25MDM12BM02": 2,
  "25MDMBM1": 2, // Financial Accounting
  "25MDMBM2": 2, // Economics for Business
  
  // Ability Enhancement Courses (2 credits)
  "25AEC12CE01": 2,
  "25AEC12CE02": 2,
  
  // Value Education Courses (2 credits)
  "25VEC12CE02": 2,
  
  // Community Engagement Projects (2 credits)
  "25CEP12CE02": 2,
  
  // Liberal Learning Courses (2 credits)
  "25LLC12CE01": 2,
  "25LLC12CE02": 2,
  
  // ========== VERIFIED FROM SYLLABUS (SCRAPED) ==========
  "25IKS11CS01": 2, // HSSM IKS Indian Knowledge System TH - -
  "25PCC11CS03": 3, // Digital Electronics --
  "25PCC11CS01": 1, // PCPEC PCC Innovation and Design Thinking PR - -
  "25PCC11CS02": 2, // PCPEC PCC Essential Computing Skills for Engineers PR - -
  "25VSE11CS01": 2, // SC VSEC Measuring Instruments and Testing Tools PR - -
  "25PCC11ME01": 1, // PCPEC PCC Innovation and Design Thinking PR - -
  "25PCC11ME04": 2, // PCPEC PCC Essential Psychomotor Skills for Engineers PR - -
  "25PCC11ME02": 2, // PCPEC PCC Essential Computing Skills for Engineers PR - -
  "25VSE11ME02": 2, // SC VSEC Creative Coding in Python PR - -
  "25VSE11ME01": 2, // SC VSEC Measuring Instruments and Testing Tools PR - -
  "25MDMXX3": 2, // MDC MDM MDM Course- - -
  "25VSE12CE03": 2, // SC VSEC Full Stack Development PR - -
  "25EEM12CE02": 2, // HSSM EEMC Technology Entrepreneurship TH - -
  "25VSE13CE04": 2, // SC VSEC Cloud Computing Lab PR - -
  "25PECL1CEX": 1, // PCPEC PEC Program Elective Lab PR - -
  "25MDMXX4": 2, // MDC MDM MDM Course- TH
  "25PCC13CE18": 1, // PCPEC PCC Mini Project PRJ - -
  "25PCC13CE19": 1, // PCPEC PCC Mobile App development PR - -
  "25PCC13CE20": 1, // PCPEC PCC Competitive coding PR - -
  "25PCC13CE22": 1, // PCPEC PCC Competitive Coding PR - -
  "25PECL3CEX": 1, // PCPEC PEC Program Elective Lab PR - -
  "25MDMXX05": 2, // MDC MDM MDM Course- TH - -
  "25OE13CE2X": 1, // MDC OE .
  "25EEM12CS02": 2, // Technology EntrepreneurshipEEMCHSSMTH - -
  "25EEM12EC1X": 2, // HSSM EEMC Modern Indian Language TH -- --
  "25PCC12EC11": 1, // PCPEC PCC Web Technologies Lab PR - -
  "25EEM12EC02": 2, // HSSM EEMC Technology Entrepreneurship TH - -
  "25PCC12ME07": 1, // PCPEC PCC Machine Shop Practice -
  "25AEC12ME02X": 2, // HSSM AEC Modern Indian Language - -
  "25CEP12ME01": 2, // EL CEFP Community Engagement Project PRJ - -
  "25VSE12ME03": 2, // SC VSEC Computer Aided Machine Drawing PR - -
  "25EEM12ME02": 2, // HSSM EEMC Technology Entrepreneurship TH - -
  "25PCC12ME06": 4, // PCPEC PCC Engineering Mechanics -
  "25BSC12ME06": 3, // BSESC BSC Thermodynamics -
  "25PCC12ME08": 4, // PCPEC PCC Mechanics of Solids -
  "25PCC12ME11": 1, // PCPEC PCC Thermal Engineering Lab - -
  "25PECL13CE1X": 1, // PCPEC PEC Program Elective Lab PR - -
  "25PECL13CE2X": 1, // PCPEC PEC Program Elective Lab PR - -
  "25PCC13EC18": 1, // PCPEC PCC Machine Learning PR - -
  "25PCC13EC19": 1, // PCPEC PCC CAD for VLSI PR - -
  "25PCC13EC20": 1, // PCPEC PCC System Security PR - -
  "25PEC13ECXX": 1, // PCPEC PEC Program Elective Lab PR - -
  "25VSE13EC04": 1, // SC VSEC Data Acquisition and Processing PR - -
  "25HXXXEC601": 4, // HMM/DM HMM/DM Honors/Minor Degree Course TH
  "25PCC13ME13": 2, // PCPEC PCC Metrology and Quality Engineering TH
  "25PCC13ME15": 1, // PCPEC PCC FEA and CFD Lab PR - -
  "25PEC13MEXX": 1, // PCPEC PEC Program Elective Lab PR - -
  "25PCC13ME19": 1, // PCPEC PCC Hydraulics and Pneumatics Lab PR - -

  // ========== FINAL YEAR ECS (Sem VII) [User Verified] ==========
  "ECC701": 3,    // VLSI Design
  "ECC702": 3,    // Internet of Things
  "ECCDO701": 3,  // Dept Level Optional Course - III
  "ECCDO702": 3,  // Dept Level Optional Course - IV
  "ECCIO701": 3,  // Institute Level Optional Course - I
  "ECL701": 1,    // VLSI Design Lab
  "ECL702": 1,    // Internet of Things Lab
  "ECL703": 1,    // Dept Level Optional Course - III Lab
  "ECP701": 3,    // Major Project - I
  // Add plausible variations just in case
  "25ECC701": 3,
  "25ECC702": 3,
  "25ECCDO701": 3,
  "25ECCDO702": 3,
  "25ECCIO701": 3,
  "25ECL701": 1,
  "25ECL702": 1,
  "25ECL703": 1,
  "25ECP701": 3,

  // ========== HONORS & MINORS (PYTHON SCRAPED) ==========
  "HIEC501": 4, // Transport Infrastructure
  "HIEC601": 4, // Energy and IT Infrastructure
  "HIEC701": 4, // Geographic Information Systems
  "HIESBL701": 2, // Geographic Information System – Lab
  "HIEC801": 4, // Infrastructural planning and management
  "HSCC501": 4, // Smart City Planning and Development
  "HSCC601": 4, // Smart City-Project Management
  "HSCC701": 4, // Smart Urban Infrastructures
  "HSCSBL701": 2, // Smart City-Project Management
  "HSCC801": 4, // Smart Management of Smart Urban Infrastructures
  "HWTSBL701": 1, // Unknown
  "HWTC501": 4, // Waterways and Ports
  "HWTC601": 4, // Design of Ports and Harbour structures
  "HWTC701": 4, // Port and Harbour Operations and Services
  "HWTC801": 4, // Construction and Management of Port and Harbour
  "HPSC501": 4, // Concrete Consultant Practices
  "HPSC601": 4, // Formwork Design Practices
  "HPSC701": 4, // Structural Consultant Practice-1
  "HPSSBL701": 2, // Structural Consultant Practice-Lab
  "HPSC801": 4, // Structural Consultant Practice-II
  "HGSC501": 4, // Green Technologies and Practices
  "HGSC601": 4, // Green Building and Infrastructure Engineering
  "HGSC701": 4, // Fundamentals of Sustainable Engineering
  "HGSSBL601": 2, // Green Building and Infrastructure Engineering
  "HGSC801": 4, // Sustainable Built Environment Engineering
  "HCWC501": 4, // SOLID AND HAZARDOUS WASTE MANAGEMENT
  "HCWC601": 4, // LIQUID EFFLUENT MANAGEMENT
  "HCWC701": 4, // WASTE VALORIZATION I
  "HCWSBL701": 2, // WASTE TECHNOLOGY SKILL BASED LAB
  "HCWC801": 4, // WASTE VALORIZATION II
  "HEVC501": 4, // Vehicular Systems and Dynamics 04 - 04 -
  "HEVSBL701": 2, // Electric Vehicles Lab 04 -- 02
  "HEVC801": 4, // Electric Vehicle System Design 04 - 04 -
  "HMTC501": 4, // Futuristic Power Systems 04 - 04 -
  "HMTSBL701": 2, // Microgrid and RES Lab -- 04 -- 02
  "HMTC801": 4, // Microgrid System Design 04 - 04 -
  "HRBC501": 4, // Industrial Robotics
  "HRBC601": 4, // Mechatronics & IoT
  "HRBC701": 4, // Artificial Intelligence and Data Analytics
  "HRBSBL701": 2, // Robotics and Automation Lab
  "HRBC801": 4, // Autonomous Vehicle Systems
};
/**
 * Pattern-based credit lookup for subjects not in the explicit map
 */
const PATTERN_CREDITS: Array<{ pattern: RegExp; credit: number; description: string }> = [
  // Audit courses (0 credits) - DM = Double Minor
  // Audit courses (0 credits) - Only specific patterns if needed, otherwise handled by explicit map
  // { pattern: /25DM/, credit: 0, description: "Double Minor (Audit)" }, // REMOVED: 25DM can be 2/4 credits
  
  // Basic Sciences (2-3 credits)
  { pattern: /25BSC/, credit: 2, description: "Basic Science Core" },
  
  // Program Core with Labs (4 credits)
  { pattern: /25PCC.*06/, credit: 4, description: "Core with Lab Component" },
  
  // Program Core Lab only (1 credit)
  { pattern: /25PCC.*07/, credit: 1, description: "Lab Only" },
  
  // Program Core Theory (3 credits)
  { pattern: /25PCC/, credit: 3, description: "Program Core Course" },
  
  // Open Electives (2 credits)
  { pattern: /25OE/, credit: 2, description: "Open Elective" },
  
  // Multi-Disciplinary Minors (2 credits)
  { pattern: /25MDM/, credit: 2, description: "Multi-Disciplinary Minor" },
  
  // Ability Enhancement (2 credits)
  { pattern: /25AEC/, credit: 2, description: "Ability Enhancement Course" },
  
  // Value Education (2 credits)
  { pattern: /25VEC/, credit: 2, description: "Value Education Course" },
  
  // Community Engagement (2 credits)
  { pattern: /25CEP/, credit: 2, description: "Community Engagement Project" },
  
  // Liberal Learning (2 credits)
  { pattern: /25LLC/, credit: 2, description: "Liberal Learning Course" },
  
  // Project Work (4 credits)
  { pattern: /25PW/, credit: 4, description: "Project Work" },
  
  // Internship (2 credits)
  { pattern: /25INT/, credit: 2, description: "Internship" },
  
  // Honors courses (4 credits)
  { pattern: /25HON/, credit: 4, description: "Honors Course" },
  
  // Minor specialization (3 credits)
  { pattern: /25MIN/, credit: 3, description: "Minor Specialization" },
];

/**
 * Get credits for a subject based on its code
 * Uses explicit mapping first, then pattern matching
 */
export function getCreditsFromCode(subjectCode: string): { credit: number; source: string } {
  // Normalize the code - remove spaces, make uppercase
  const normalizedCode = subjectCode.replace(/\s/g, '').toUpperCase();
  
  // 1. Try exact match (Safe check for 0 credits)
  if (normalizedCode in CREDIT_MAP) {
    return { credit: CREDIT_MAP[normalizedCode], source: 'exact' };
  }
  
  // 2. Try to find the code within the subject name using strict word boundaries
  // Example: "25PCC12CE061" should NOT match "25PCC12CE06"
  for (const [code, credit] of Object.entries(CREDIT_MAP)) {
    // Escape special regex characters in the code if any (though codes are usually alphanumeric)
    const safeCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${safeCode}\\b`);
    
    if (regex.test(normalizedCode) || regex.test(subjectCode)) {
      return { credit, source: 'embedded' };
    }
  }
  
  // 3. Try pattern matching (Best guess heuristics)
  for (const { pattern, credit, description } of PATTERN_CREDITS) {
    if (pattern.test(normalizedCode) || pattern.test(subjectCode)) {
      return { credit, source: `pattern:${description}` };
    }
  }
  
  // 4. Default value (Safety mechanism)
  // Return -1 to indicate verification failure vs silent default assumption
  return { credit: -1, source: 'unknown' };
}

/**
 * Simple function that returns just the credit number
 */
export function getCredits(subjectName: string): number {
  const { credit } = getCreditsFromCode(subjectName);
  return credit;
}
