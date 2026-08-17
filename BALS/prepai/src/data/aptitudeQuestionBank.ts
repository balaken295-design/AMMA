import { TopicItem, Question } from '../types';
import { APTITUDE_QUESTION_BANK, APTITUDE_QUESTION_BANK_EXTRA } from './aptitudeQuestionBank';

// Merge both real question-bank sources into one lookup by topicId.
const REAL_QUESTION_BANK: Record<string, Question[]> = {};
for (const src of [APTITUDE_QUESTION_BANK, APTITUDE_QUESTION_BANK_EXTRA]) {
  for (const [topicId, questions] of Object.entries(src)) {
    REAL_QUESTION_BANK[topicId] = [...(REAL_QUESTION_BANK[topicId] || []), ...questions];
  }
}

export const VERBAL_TOPICS: TopicItem[] = [
  {
    id: 'verb_rc',
    title: 'Reading Comprehension',
    category: 'verbal',
    description: 'Master central idea identification, tone analysis, inference extraction, and fast contextual reading.',
    concepts: [
      'Skim the text for tone, central thesis, and main paragraph themes before answering.',
      'Differentiate between explicitly stated facts and logical inferences.',
      'Watch out for extreme keywords (always, never, only) in options.'
    ],
    examples: [
      {
        question: 'Passage excerpt: "Technology has democratized education, but digital disparity threatens equity." What is the author\'s main point?',
        solution: 'While technology expands learning access, unequal digital infrastructure creates new educational inequalities.',
        tip: 'Look for contrast transitions like "but", "however", "yet" to find the author\'s core takeaway.'
      }
    ]
  },
  {
    id: 'verb_errors',
    title: 'Spotting Errors & Grammar',
    category: 'verbal',
    description: 'Identify subject-verb agreement issues, tense mismatches, modifier placements, and prepositions.',
    concepts: [
      'Subject-Verb Agreement: Singular subjects require singular verbs (e.g., "The list of items is ready").',
      'Parallelism: Ensure conjunctions connect similar grammatical structures.',
      'Dangling Modifiers: Ensure the modifier clearly references the adjacent noun.'
    ],
    examples: [
      {
        question: 'Identify error: "Neither of the candidates were selected for the final interview round."',
        solution: 'Error in "were". Correct phrasing: "Neither of the candidates WAS selected".',
        tip: '"Neither", "Either", "Each" take singular verbs when standing as subjects.'
      }
    ]
  },
  {
    id: 'verb_syn_ant',
    title: 'Synonyms and Antonyms',
    category: 'verbal',
    description: 'Build high-frequency vocabulary roots, prefixes, suffixes, and tone contextual connotations.',
    concepts: [
      'Etymology & Roots: Prefix "Bene-" = Good, "Mal-" = Bad, "Chron-" = Time.',
      'Eliminate options with wrong tone (positive vs negative context).'
    ],
    examples: [
      {
        question: 'Find the Synonym of "EPHEMERAL": A) Eternal B) Transient C) Opaque D) Resilient',
        solution: 'Transient (Ephemeral means lasting for a very short time).',
        tip: 'Associate "ephemeral" with fleeting phenomena like morning mist.'
      }
    ]
  },
  {
    id: 'verb_vocab_blanks',
    title: 'Vocabulary & Fill in the Blanks',
    category: 'verbal',
    description: 'Single and double blank sentences testing precise context and vocabulary collocation.',
    concepts: [
      'Analyze sentence clue words indicating similarity (and, moreover) or contrast (despite, although).',
      'Test option pairs together to maintain narrative consistency.'
    ],
    examples: [
      {
        question: 'Despite initial _____ from the board, the CEO proposed a _____ expansion plan.',
        solution: 'skepticism / bold',
        tip: '"Despite" signals a contrast between board reaction and CEO proposal.'
      }
    ]
  },
  {
    id: 'verb_sentence_corr',
    title: 'Sentence Correction & Improvement',
    category: 'verbal',
    description: 'Refine redundant phrases, awkward passive constructions, and incorrect idiom usage.',
    concepts: [
      'Eliminate redundancy (e.g., "revert back", "repeat again").',
      'Maintain tense consistency across clauses.'
    ],
    examples: [
      {
        question: 'Improve phrase: "If he would have worked harder, he would have passed."',
        solution: 'Correct phrasing: "If he HAD worked harder, he would have passed."',
        tip: 'In conditional type 3 sentences, use "If + past perfect ... would have + past participle".'
      }
    ]
  },
  {
    id: 'verb_parajumbles',
    title: 'Para Jumbles & Sentence Ordering',
    category: 'verbal',
    description: 'Logical sequencing using pronouns, transition signals, chronological markers, and mandatory pairs.',
    concepts: [
      'Identify the independent opening sentence (introduces concept without pronouns).',
      'Find mandatory pairs (Noun -> Pronoun, Cause -> Effect).'
    ],
    examples: [
      {
        question: 'Order: A) It revolutionized transport. B) Steam engine was invented. C) Industry boomed.',
        solution: 'B -> A -> C (Introduction -> Pronoun reference "It" -> Result).',
        tip: 'Full names or general nouns always precede pronouns like "it", "he", "they".'
      }
    ]
  },
  {
    id: 'verb_cloze',
    title: 'Cloze Test',
    category: 'verbal',
    description: 'Contextual paragraph gaps testing grammar, vocabulary continuity, and sentence flow.',
    concepts: [
      'Read the complete paragraph first to grasp overall tone before filling individual blanks.',
      'Pay attention to prepositions following the blank.'
    ],
    examples: [
      {
        question: 'Fill blank in: "She was fully aware _____ the risks involved in the investment."',
        solution: 'of ("aware" is followed by preposition "of").',
        tip: 'Memorize fixed verb-preposition combinations.'
      }
    ]
  },
  {
    id: 'verb_idioms',
    title: 'Idioms and Phrases',
    category: 'verbal',
    description: 'Figurative expressions, phrasal verbs, and common corporate idioms.',
    concepts: [
      'Understand non-literal meanings derived from cultural or historic origins.',
      'Identify correct prepositions in phrasal verbs (e.g., "call off", "carry out").'
    ],
    examples: [
      {
        question: 'What does "Burn the midnight oil" mean?',
        solution: 'To study or work late into the night.',
        tip: 'Refers historically to using oil lamps after sunset.'
      }
    ]
  },
  {
    id: 'verb_one_word',
    title: 'One-Word Substitution',
    category: 'verbal',
    description: 'Concise replacement of phrases with precise lexical vocabulary.',
    concepts: [
      'Study thematic word lists (philosophies, government forms, phobias, professional traits).'
    ],
    examples: [
      {
        question: 'One word for: "A person who donates money or time to good causes":',
        solution: 'Philanthropist (Phil = Love, Anthrop = Human).',
        tip: 'Break word roots to decode unfamiliar options.'
      }
    ]
  },
  {
    id: 'verb_crit_reasoning',
    title: 'Critical Reasoning',
    category: 'verbal',
    description: 'Evaluate arguments, identify assumptions, strengthen/weaken claims, and spot fallacies.',
    concepts: [
      'Deconstruct argument: Premise + Assumption = Conclusion.',
      'Weakening an argument requires attacking the unstated assumption, not stating a false premise.'
    ],
    examples: [
      {
        question: 'Argument: "Sales rose after installing solar panels; solar panels caused sales growth." What assumption is made?',
        solution: 'Assumes no other external factor (e.g., marketing campaign) caused the sales rise.',
        tip: 'Correlation does not automatically equal causation.'
      }
    ]
  },
  {
    id: 'extra_spelling_correction',
    title: 'Spelling Correction',
    category: 'verbal',
    description: 'Spot commonly misspelt words and identify the correctly spelled option under time pressure.',
    concepts: [
      'Learn frequently confused spellings (e.g., "Receive" vs "Recieve", "Occurrence" vs "Occurence").',
      'Watch for letter-order swaps and doubled/missing consonants in distractor options.',
      'Read every option fully before choosing — near-miss spellings are designed to trick a quick scan.'
    ],
    examples: [
      {
        question: 'Choose the correctly spelled word (commonly misspelt as \'Recieve\').',
        solution: 'The correct spelling is "Receive" — i before e except after c.',
        tip: 'Memorize the "i before e, except after c" rule for this common error pattern.'
      }
    ]
  },
  {
    id: 'extra_homophones',
    title: 'Homophones',
    category: 'verbal',
    description: 'Distinguish between words that sound alike but differ in spelling and meaning, such as "their/there/they\'re".',
    concepts: [
      'Homophones share pronunciation but not meaning or spelling — context decides the correct choice.',
      'Common sets: their/there/they\'re, its/it\'s, to/too/two, where/wear/we\'re.',
      'Substitute the full meaning into the sentence mentally to check which spelling fits.'
    ],
    examples: [
      {
        question: 'Choose the correctly spelled homophone that means \'possessive form meaning belonging to them\'.',
        solution: '"Their" is the possessive form; "there" indicates place and "they\'re" is a contraction of "they are".',
        tip: 'Expand contractions like "they\'re" to "they are" to quickly test if it fits the sentence.'
      }
    ]
  },
  {
    id: 'extra_analogies',
    title: 'Word Analogies',
    category: 'verbal',
    description: 'Identify the relationship between a given pair of words and apply the same relationship to a new pair.',
    concepts: [
      'First define the exact relationship in the given pair (e.g., function, category, cause-effect).',
      'Apply that same precise relationship to the answer options — surface similarity is not enough.',
      'Common relationship types: object-to-place, part-to-whole, cause-to-effect, worker-to-tool.'
    ],
    examples: [
      {
        question: 'Doctor is to Hospital as Teacher is to ?',
        solution: 'A Doctor works at a Hospital, so a Teacher works at a School.',
        tip: 'State the relationship as a short sentence first: "A [Doctor] works at a [Hospital]."'
      }
    ]
  },
  {
    id: 'extra_active_and_passive_voice',
    title: 'Active and Passive Voice',
    category: 'verbal',
    description: 'Convert sentences correctly between active and passive voice while preserving tense and meaning.',
    concepts: [
      'Passive voice structure: Object + form of "be" + past participle + "by" + Subject.',
      'The tense of the original sentence must be preserved in the converted sentence.',
      'Watch for tense-shift traps in distractor options (e.g., present written as past).'
    ],
    examples: [
      {
        question: 'Choose the correct passive voice of: \'Meena writes the project every day.\'',
        solution: '"The project is written by Meena every day." — present simple tense is kept, subject and object are swapped.',
        tip: 'Identify the tense first, then apply the matching "be" verb form (is/was/has been, etc.) in the passive.'
      }
    ]
  },
  {
    id: 'extra_direct_and_indirect_speech',
    title: 'Direct and Indirect Speech',
    category: 'verbal',
    description: 'Convert quoted speech into reported speech, adjusting pronouns, tenses, and time references correctly.',
    concepts: [
      'Tense generally shifts one step back (present simple → past simple, etc.) in indirect speech.',
      'Pronouns change to match the perspective of the reporter, not the original speaker.',
      'Time and place words shift too: "today" → "that day", "here" → "there", "tomorrow" → "the next day".'
    ],
    examples: [
      {
        question: 'Change into indirect speech: Priya said, "I am playing football."',
        solution: 'Priya said that she was playing football — present continuous shifts to past continuous, and "I" becomes "she".',
        tip: 'Change the tense first, then fix the pronoun to match who is reporting the speech.'
      }
    ]
  }
];

export const LOGICAL_TOPICS: TopicItem[] = [
  {
    id: 'log_seating',
    title: 'Seating Arrangements (Linear & Circular)',
    category: 'logical',
    description: 'Solve complex facing inward/outward arrangements, parallel lines, and multi-variable constraints.',
    concepts: [
      'For circular facing inside: Left is clockwise, Right is anti-clockwise.',
      'Always start with definitive positions before placing relative position clues.'
    ],
    examples: [
      {
        question: '5 people A, B, C, D, E in a row facing North. C is middle, A is left of B, D is right of C. Who is adjacent to C?',
        solution: 'B and D.',
        tip: 'Draw a horizontal line with 5 marked slots and fill fixed anchors first.'
      }
    ]
  },
  {
    id: 'log_puzzles',
    title: 'Puzzles (Floor, Box, Scheduling)',
    category: 'logical',
    description: 'Multi-tiered constraint satisfaction puzzles involving floors, days, colors, and professions.',
    concepts: [
      'Construct a grid table with fixed variables (e.g. Floors 1 to 7) as rows.',
      'Maintain 2 simultaneous candidate cases when clues present branching possibilities.'
    ],
    examples: [
      {
        question: '7 floors (1 to 7). A lives on floor 3. B lives 2 floors above A. What floor is B on?',
        solution: 'Floor 5 (3 + 2 = 5).',
        tip: '"N floors above X" means Floor(X) + N.'
      }
    ]
  },
  {
    id: 'log_blood',
    title: 'Blood Relations',
    category: 'logical',
    description: 'Decode family trees, coded relations (+, -, x, /), and direct statements.',
    concepts: [
      'Use standard notation: Square/Plus for Male, Circle/Minus for Female, Double line for Spouse.',
      'Break coded statements from right to left.'
    ],
    examples: [
      {
        question: 'Pointing to a photo, Rahul said: "She is the daughter of my grandfather\'s only son." Who is she to Rahul?',
        solution: 'Sister (Grandfather\'s only son = Rahul\'s father).',
        tip: 'Work backwards from the speaker\'s perspective.'
      }
    ]
  },
  {
    id: 'log_coding',
    title: 'Coding-Decoding',
    category: 'logical',
    description: 'Pattern matching using letter shifts, reverse positions, numerical matrix coding, and substitution.',
    concepts: [
      'Remember EJOTY (E=5, J=10, O=15, T=20, Y=25) for letter numerical ranks.',
      'Sum of opposite letter positions is always 27 (A+Z = 1+26 = 27).'
    ],
    examples: [
      {
        question: 'If CAT is coded as 3120, how is DOG coded?',
        solution: '4157 (D=4, O=15, G=7).',
        tip: 'Check if code matches letter alphabetical positions directly.'
      }
    ]
  },
  {
    id: 'log_syllogism',
    title: 'Syllogism',
    category: 'logical',
    description: 'Deductive logic with Venn diagrams: All, Some, No, and Possibility conclusions.',
    concepts: [
      'Draw standard Venn diagrams for statements.',
      'If a conclusion holds true in ALL possible Venn diagrams, it is valid.'
    ],
    examples: [
      {
        question: 'Statements: All Dogs are Cats. All Cats are Animals. Conclusion: Are all Dogs Animals?',
        solution: 'Yes (Valid).',
        tip: 'If A is inside B, and B is inside C, then A is inside C.'
      }
    ]
  },
  {
    id: 'log_direction',
    title: 'Direction Sense Test',
    category: 'logical',
    description: 'Navigate cardinal & ordinal turns, Pythagorean distances, and shadow direction problems.',
    concepts: [
      'North is Up, South is Down, East is Right, West is Left.',
      'Use Pythagoras Theorem: Distance = √(x² + y²).'
    ],
    examples: [
      {
        question: 'A walks 3km North, then turns East and walks 4km. Shortest distance from starting point?',
        solution: '5 km (√(3² + 4²) = √25 = 5).',
        tip: '3-4-5 is a standard Pythagorean triplet.'
      }
    ]
  },
  {
    id: 'log_ranking',
    title: 'Order and Ranking',
    category: 'logical',
    description: 'Calculate total people, overlapping ranks, and positions after swapping places.',
    concepts: [
      'Total people in a line = (Rank from Left + Rank from Right) - 1.',
      'When two people swap places, distance between initial and new position gives number of people in between.'
    ],
    examples: [
      {
        question: 'Rohan is 12th from left and 18th from right in a line. Total students?',
        solution: '29 (12 + 18 - 1 = 29).',
        tip: 'Substract 1 because Rohan is counted twice.'
      }
    ]
  },
  {
    id: 'log_series',
    title: 'Series (Number, Alphabet, Alphanumeric)',
    category: 'logical',
    description: 'Recognize arithmetic/geometric progressions, double difference, alternate series, and prime patterns.',
    concepts: [
      'Calculate first and second differences between adjacent terms.',
      'Look for squares (n² ± 1) or cubes (n³ ± 1) series.'
    ],
    examples: [
      {
        question: 'Find next term: 2, 6, 12, 20, 30, ?',
        solution: '42 (Differences are +4, +6, +8, +10, so next is +12 -> 30 + 12 = 42).',
        tip: 'Check differences between consecutive terms first.'
      }
    ]
  },
  {
    id: 'log_clock',
    title: 'Clocks and Calendars',
    category: 'logical',
    description: 'Calculate angle between hands, clock gain/loss, odd days, and day of week calculations.',
    concepts: [
      'Angle between clock hands = |(30 × H) - (5.5 × M)|.',
      'Ordinary year has 1 odd day; Leap year has 2 odd days.'
    ],
    examples: [
      {
        question: 'What is the angle between clock hands at 3:30?',
        solution: '75° (|(30 × 3) - (5.5 × 30)| = |90 - 165| = 75°).',
        tip: 'Apply standard formula |30H - 11M/2|.'
      }
    ]
  },
  {
    id: 'log_sufficiency',
    title: 'Data Sufficiency',
    category: 'logical',
    description: 'Determine if given statements alone or together provide sufficient information to solve a problem.',
    concepts: [
      'Evaluate Statement 1 alone -> Evaluate Statement 2 alone -> Evaluate combined if needed.',
      'Do not solve completely; just verify if a unique answer can be deduced.'
    ],
    examples: [
      {
        question: 'Is x even? St 1: x is multiple of 4. St 2: x is greater than 10.',
        solution: 'Statement 1 alone is sufficient (Multiples of 4 are always even).',
        tip: 'Focus on sufficiency, not finding the exact value of x.'
      }
    ]
  },
  {
    id: 'log_assumptions',
    title: 'Statement & Assumptions / Conclusions',
    category: 'logical',
    description: 'Evaluate implicit assumptions and logical conclusions drawn strictly from statements.',
    concepts: [
      'An assumption is something taken for granted without proof.',
      'Avoid outside general knowledge; rely strictly on statement scope.'
    ],
    examples: [
      {
        question: 'Statement: "Please use cleaner fuel to reduce city pollution." Assumption: Pollution can be reduced.',
        solution: 'Implicit (The request assumes pollution reduction is possible).',
        tip: 'Appeals/notices assume people will comply and action is feasible.'
      }
    ]
  },
  {
    id: 'log_input_output',
    title: 'Input-Output',
    category: 'logical',
    description: 'Analyze step-by-step machine rearrangement patterns for words and numbers.',
    concepts: [
      'Identify sorting rules (e.g. Numbers descending from left, Words ascending from right).',
      'Track number of movements per step.'
    ],
    examples: [
      {
        question: 'Input: 45 12 89 23. Rule: Sort ascending from left. Step 1?',
        solution: '12 45 89 23 (Moves smallest number 12 to front).',
        tip: 'Compare Input with final output to spot the sorting logic instantly.'
      }
    ]
  },
  {
    id: 'log_cubes_dice',
    title: 'Cubes, Dice, and Paper Folding',
    category: 'logical',
    description: 'Spatial reasoning, opposite face detection on dice nets, painted cube cuts, and pattern reflection.',
    concepts: [
      'In a standard die, opposite faces sum to 7.',
      'In a painted cut cube of side N: 3 sides painted = 8 corners, 2 sides = 12(N-2), 1 side = 6(N-2)², 0 side = (N-2)³.'
    ],
    examples: [
      {
        question: 'A cube of 3cm cut into 1cm smaller cubes. How many small cubes have 3 sides painted?',
        solution: '8 (Always the 8 corner cubes).',
        tip: '3-side painted cubes are always equal to 8 regardless of size.'
      }
    ]
  },
  {
    id: 'extra_classification',
    title: 'Classification',
    category: 'logical',
    description: 'Group items by their common underlying property and spot the one item that does not belong.',
    concepts: [
      'Determine the common category (fruit, vegetable, animal, etc.) shared by most items.',
      'The odd one out breaks that shared category, even if it looks superficially similar.',
      'Check multiple possible groupings (by type, function, origin) before finalizing the answer.'
    ],
    examples: [
      {
        question: 'Find the odd one out: Apple, Mango, Banana, Potato',
        solution: 'Potato — the rest are fruits, while Potato is a vegetable.',
        tip: 'Name the shared category out loud first, then test each item against it.'
      }
    ]
  },
  {
    id: 'extra_classification_odd_one_out',
    title: 'Odd One Out',
    category: 'logical',
    description: 'Identify the item in a group that does not share the defining characteristic of the others.',
    concepts: [
      'Look beyond surface similarity — group by function, category, or origin, not just topic.',
      'Proper nouns can be a trap: a place name mixed with river names, for instance.',
      'Eliminate items you are confident belong to the group first, narrowing down the outlier.'
    ],
    examples: [
      {
        question: 'Find the odd one out: Ganges, Yamuna, Brahmaputra, Himalayas',
        solution: 'Himalayas — the rest are rivers, while Himalayas is a mountain range.',
        tip: 'Watch for one item from a related but different category (e.g., a mountain among rivers).'
      }
    ]
  },
  {
    id: 'extra_logical_analogy',
    title: 'Logical Analogy',
    category: 'logical',
    description: 'Identify the underlying logical or functional relationship between a pair of terms and extend it to a new pair.',
    concepts: [
      'Define the relationship precisely: measurement-to-unit, container-to-contents, cause-to-effect.',
      'Logical analogies often test measurement units, classifications, or functional pairings.',
      'Reject options that share only a topic with the term but not the same relationship type.'
    ],
    examples: [
      {
        question: 'Kilogram : Weight :: Metre : ?',
        solution: 'Length — a Kilogram measures Weight, and a Metre measures Length.',
        tip: 'Express the relationship as "[Unit] measures [Quantity]" and apply it to the second pair.'
      }
    ]
  },
  {
    id: 'extra_logical_sequence_of_words',
    title: 'Logical Sequence of Words',
    category: 'logical',
    description: 'Arrange a set of words into their correct logical order based on size, rank, process, or hierarchy.',
    concepts: [
      'Identify the ordering principle first: smallest-to-largest, chronological, or hierarchical.',
      'Common sequences include units of measurement, stages of a process, or organizational rank.',
      'Eliminate options that violate the ordering principle at even one position.'
    ],
    examples: [
      {
        question: 'Arrange the following in the correct logical order (Units of writing, smallest to largest): Sentence, Word, Chapter, Paragraph',
        solution: 'Word, Sentence, Paragraph, Chapter — building from the smallest writing unit to the largest.',
        tip: 'For writing units, always start from the single word and build upward.'
      }
    ]
  },
  {
    id: 'extra_venn_diagrams',
    title: 'Venn Diagrams',
    category: 'logical',
    description: 'Represent the logical relationship between three given classes using overlapping or separate circles.',
    concepts: [
      'Determine whether each pair of classes overlaps, is fully contained, or is entirely separate.',
      'Three intersecting circles represent classes that can all overlap with one another.',
      'A class fully inside another (e.g., Doctors inside Professionals) is shown as a smaller circle within a larger one.'
    ],
    examples: [
      {
        question: 'Which diagram best represents the relationship between the classes: Teachers, Musicians, Women?',
        solution: 'Three intersecting circles — a person can belong to any combination of these three groups at once.',
        tip: 'Ask: can any single item belong to all three classes simultaneously? If yes, the circles must intersect.'
      }
    ]
  }
];

export const QUANTS_TOPICS: TopicItem[] = [
  {
    id: 'quant_number_sys',
    title: 'Number System & HCF/LCM',
    category: 'quants',
    description: 'Divisibility rules, unit digits, prime factorization, remainders, and HCF × LCM = Product of numbers.',
    concepts: [
      'Product of two numbers = HCF × LCM.',
      'Unit digit repeats in cycles of 4 (cyclicity).'
    ],
    keyFormulas: ['HCF(a, b) × LCM(a, b) = a × b', 'Remainder Theorem: Dividend = Divisor × Quotient + Remainder'],
    examples: [
      {
        question: 'Find HCF of 24 and 36.',
        solution: '12 (24 = 2³ × 3, 36 = 2² × 3² -> HCF = 2² × 3 = 12).',
        tip: 'HCF is the product of lowest powers of common prime factors.'
      }
    ]
  },
  {
    id: 'quant_percentages',
    title: 'Percentages',
    category: 'quants',
    description: 'Percentage change, successive percentages, fraction-to-percentage conversions, and population growth.',
    concepts: [
      'Fraction Equivalents: 1/2 = 50%, 1/3 = 33.33%, 1/4 = 25%, 1/6 = 16.66%, 1/8 = 12.5%.',
      'Net Successive % Change = A + B + (AB / 100).'
    ],
    keyFormulas: ['Percentage = (Value / Total) × 100', 'Successive Change = A + B + (A×B)/100'],
    examples: [
      {
        question: 'Price increases by 20% then decreases by 20%. Net percentage change?',
        solution: '4% decrease (20 - 20 - (20×20)/100 = -4%).',
        tip: 'Equal % rise and fall always yields a net loss of (x/10)²%.'
      }
    ]
  },
  {
    id: 'quant_ratio_prop',
    title: 'Ratio, Proportion, and Partnership',
    category: 'quants',
    description: 'Direct/indirect proportion, mean proportional, component-dividendo, and profit sharing in partnership.',
    concepts: [
      'Profit Share Ratio = Capital invested × Time duration.',
      'If A:B = 2:3 and B:C = 4:5, combine by making B equal (8:12:15).'
    ],
    keyFormulas: ['Profit Ratio = C1×T1 : C2×T2', 'Mean Proportional between a and b = √(a × b)'],
    examples: [
      {
        question: 'A invests $2000 for 12 months, B invests $3000 for 6 months. Ratio of profit share?',
        solution: '4:3 (A = 2000×12 = 24000; B = 3000×6 = 18000 -> 24:18 = 4:3).',
        tip: 'Always multiply capital by investment period.'
      }
    ]
  },
  {
    id: 'quant_profit_loss',
    title: 'Profit, Loss, and Discount',
    category: 'quants',
    description: 'Cost Price, Selling Price, Marked Price, Margin %, Dishonest dealer tricks, and successive discounts.',
    concepts: [
      'Profit % is ALWAYS calculated on Cost Price (CP) unless stated otherwise.',
      'Discount % is ALWAYS calculated on Marked Price (MP).'
    ],
    keyFormulas: ['Profit % = (SP - CP)/CP × 100', 'SP = MP × (100 - Discount%)/100'],
    examples: [
      {
        question: 'CP = $80, SP = $100. Find Profit %.',
        solution: '25% ((100 - 80)/80 × 100 = 20/80 × 100 = 25%).',
        tip: 'Simplify fraction 20/80 = 1/4 = 25% instantly.'
      }
    ]
  },
  {
    id: 'quant_averages',
    title: 'Averages and Mixtures',
    category: 'quants',
    description: 'Weighted averages, replacement problems, and Alligation rule for mixing two ingredients.',
    concepts: [
      'Average = Total Sum / Total Count.',
      'Alligation Rule: Cheaper Quantity / Dearer Quantity = (Dearer Price - Mean) / (Mean - Cheaper Price).'
    ],
    keyFormulas: ['Average Speed = 2xy / (x + y) for equal distances'],
    examples: [
      {
        question: 'Average of 5 numbers is 20. If one number 30 is removed, new average?',
        solution: '17.5 (Sum = 100; New Sum = 70; New Avg = 70/4 = 17.5).',
        tip: 'Track total sum before and after changes.'
      }
    ]
  },
  {
    id: 'quant_interest',
    title: 'Simple and Compound Interest',
    category: 'quants',
    description: 'SI = (P×R×T)/100, CI = P(1 + R/100)^T - P, compounding half-yearly/quarterly, difference CI - SI.',
    concepts: [
      'Difference between CI and SI for 2 years = P × (R / 100)².',
      'Compounding half-yearly means Rate becomes R/2 and Time becomes 2T.'
    ],
    keyFormulas: ['SI = (P × R × T) / 100', 'Amount CI = P(1 + R/100)^n', 'Difference (2 yrs) = P(R/100)²'],
    examples: [
      {
        question: 'Find SI on $1000 at 10% per annum for 2 years.',
        solution: '$200 (1000 × 10 × 2 / 100 = $200).',
        tip: '10% per year for 2 years = 20% total SI.'
      }
    ]
  },
  {
    id: 'quant_time_work',
    title: 'Time and Work',
    category: 'quants',
    description: 'Work efficiency, alternate day work, pipes and cisterns (filling vs draining).',
    concepts: [
      'If A completes work in X days, 1 day work = 1/X.',
      'Total Work = LCM of individual completion days.'
    ],
    keyFormulas: ['M1 × D1 × H1 / W1 = M2 × D2 × H2 / W2'],
    examples: [
      {
        question: 'A can do work in 10 days, B in 15 days. Together in how many days?',
        solution: '6 days (1/10 + 1/15 = 5/30 = 1/6 -> 6 days).',
        tip: 'Shortcut for 2 people: (A × B) / (A + B) = (10 × 15) / 25 = 6.'
      }
    ]
  },
  {
    id: 'quant_speed_dist',
    title: 'Time, Speed, and Distance (Boats, Trains, Races)',
    category: 'quants',
    description: 'Relative speed, train crossing poles/platforms, upstream/downstream boat speed, circular races.',
    concepts: [
      'Convert km/h to m/s: Multiply by 5/18.',
      'Relative Speed: Same direction = (S1 - S2); Opposite direction = (S1 + S2).',
      'Boat Downstream = Speed + Current; Upstream = Speed - Current.'
    ],
    keyFormulas: ['Distance = Speed × Time', '1 km/h = 5/18 m/s'],
    examples: [
      {
        question: 'Train of length 100m at 72 km/h crosses a pole in how many seconds?',
        solution: '5 seconds (72 km/h = 72 × 5/18 = 20 m/s -> Time = 100/20 = 5s).',
        tip: 'Always convert speed to m/s when length is in meters.'
      }
    ]
  },
  {
    id: 'quant_algebra',
    title: 'Algebra',
    category: 'quants',
    description: 'Linear & quadratic equations, algebraic identities (a+b)³, roots nature, inequalities.',
    concepts: [
      'Quadratic roots formula: x = (-b ± √(b² - 4ac)) / 2a.',
      'Sum of roots = -b/a, Product of roots = c/a.'
    ],
    keyFormulas: ['(a + b)² = a² + 2ab + b²', 'a³ + b³ = (a + b)(a² - ab + b²)'],
    examples: [
      {
        question: 'If x + 1/x = 4, find x² + 1/x².',
        solution: '14 ((x + 1/x)² - 2 = 16 - 2 = 14).',
        tip: 'Identity: x² + 1/x² = k² - 2 where k = x + 1/x.'
      }
    ]
  },
  {
    id: 'quant_progressions',
    title: 'Progressions (AP, GP, HP)',
    category: 'quants',
    description: 'Arithmetic Progression nth term & sum, Geometric Progression sum to infinity, Harmonic mean.',
    concepts: [
      'AP nth term Tn = a + (n-1)d; Sum Sn = n/2 [2a + (n-1)d].',
      'GP infinite sum S∞ = a / (1 - r) when |r| < 1.'
    ],
    keyFormulas: ['AP Sn = n/2 (a + l)', 'GP Infinite Sum = a / (1 - r)'],
    examples: [
      {
        question: 'Find 10th term of AP: 2, 5, 8, 11...',
        solution: '29 (a = 2, d = 3 -> T10 = 2 + 9×3 = 29).',
        tip: 'Identify common difference d = T2 - T1.'
      }
    ]
  },
  {
    id: 'quant_mensuration',
    title: 'Mensuration (2D and 3D)',
    category: 'quants',
    description: 'Areas & perimeters of circle, triangle, rectangle; Volumes & surface areas of sphere, cylinder, cone, cube.',
    concepts: [
      'Cylinder Volume = πr²h; Cone Volume = (1/3)πr²h.',
      'Sphere Volume = (4/3)πr³; Surface Area = 4πr².'
    ],
    keyFormulas: ['Sphere Vol = (4/3)πr³', 'Cylinder Vol = πr²h', 'Cone Vol = (1/3)πr²h'],
    examples: [
      {
        question: 'Radius of a circle is 7 cm. Find its area.',
        solution: '154 cm² (22/7 × 7 × 7 = 154).',
        tip: 'Use π = 22/7 when radius is a multiple of 7.'
      }
    ]
  },
  {
    id: 'quant_geometry',
    title: 'Geometry',
    category: 'quants',
    description: 'Triangle similarity & congruence, circle theorems (tangent, chord), quadrilaterals, parallel lines angles.',
    concepts: [
      'Angle subtended by an arc at the center is double the angle at the circumference.',
      'In similar triangles, ratio of areas = square of ratio of corresponding sides.'
    ],
    keyFormulas: ['Sum of interior angles of n-polygon = (n - 2) × 180°'],
    examples: [
      {
        question: 'Sum of interior angles of a hexagon (6 sides)?',
        solution: '720° ((6 - 2) × 180° = 4 × 180° = 720°).',
        tip: 'Formula is (n - 2) × 180°.'
      }
    ]
  },
  {
    id: 'quant_trigonometry',
    title: 'Trigonometry',
    category: 'quants',
    description: 'Trigonometric ratios (sin, cos, tan), standard values (0°, 30°, 45°, 60°, 90°), heights & distances.',
    concepts: [
      'sin²θ + cos²θ = 1; 1 + tan²θ = sec²θ.',
      'In height & distance: tan(30°) = 1/√3, tan(45°) = 1, tan(60°) = √3.'
    ],
    keyFormulas: ['sin²θ + cos²θ = 1', 'tanθ = Opposite / Adjacent'],
    examples: [
      {
        question: 'If angle of elevation to a 10m tower is 45°, distance from base?',
        solution: '10 meters (tan 45° = 10 / dist -> 1 = 10 / dist -> dist = 10m).',
        tip: 'At 45° elevation, height equals base distance.'
      }
    ]
  },
  {
    id: 'quant_permutation',
    title: 'Permutation, Combination, and Probability',
    category: 'quants',
    description: 'nPr arrangement vs nCr selection, circular permutations, card/dice/coin probability calculations.',
    concepts: [
      'Permutation (Order matters): nPr = n! / (n - r)!.',
      'Combination (Group selection): nCr = n! / [r!(n - r)!].',
      'Probability P(E) = Favorable Outcomes / Total Outcomes.'
    ],
    keyFormulas: ['nCr = n! / (r! × (n-r)!)', 'P(A or B) = P(A) + P(B) - P(A and B)'],
    examples: [
      {
        question: 'In how many ways can 3 students be selected out of 5?',
        solution: '10 ways (5C3 = (5×4×3)/(3×2×1) = 10).',
        tip: '5C3 is equal to 5C2 = (5×4)/2 = 10.'
      }
    ]
  },
  {
    id: 'quant_di',
    title: 'Data Interpretation (Tables, Bar Charts, Pie Charts, Caselet)',
    category: 'quants',
    description: 'Rapid quantitative reasoning from data tables, stacked bar charts, multi-layer pie charts, and narrative caselets.',
    concepts: [
      'Pie chart angle = (Value / Total) × 360°.',
      'Focus on approximation techniques when options are far apart.'
    ],
    keyFormulas: ['% Share = (Component / Total) × 100', 'Degree in Pie Chart = % Share × 3.6'],
    examples: [
      {
        question: 'A pie chart shows Sales slice at 90°. What percentage of total sales does it represent?',
        solution: '25% (90° / 360° = 1/4 = 25%).',
        tip: '90° is always 1/4 (25%) of the 360° circle.'
      }
    ]
  }
];

export const SAMPLE_QUESTIONS: Record<string, Question[]> = {
  verb_rc: [
    {
      id: 'rc_1',
      topicId: 'verb_rc',
      question: 'Which strategy is most effective for answering main idea questions in Reading Comprehension?',
      options: [
        'Read only the last sentence of the passage',
        'Synthesize the author\'s core thesis from paragraph topic sentences and overall tone',
        'Pick the option with the most technical terminology',
        'Focus on minor details and isolated statistical figures'
      ],
      correctAnswer: 1,
      explanation: 'Main idea questions require synthesizing the overall purpose and central thesis rather than focusing on isolated minor facts.'
    },
    {
      id: 'rc_2',
      topicId: 'verb_rc',
      question: 'What does an "inference" question require you to do?',
      options: [
        'Copy a line directly verbatim from the text',
        'Deduce an unstated logical point that must be true based strictly on facts given',
        'State your personal subjective opinion on the topic',
        'Contradict the main theme of the passage'
      ],
      correctAnswer: 1,
      explanation: 'An inference is an unstated logical consequence that is guaranteed to be true based on the provided premises.'
    },
    {
      id: 'rc_3',
      topicId: 'verb_rc',
      question: 'How should a candidate handle questions asking about the "author\'s tone"?',
      options: [
        'Count the total number of adverbs in the passage',
        'Analyze descriptive adjectives, transition words, and overall emotional posture (e.g., skeptical, optimistic, pragmatic)',
        'Assume all academic passages are critical',
        'Choose the longest option available'
      ],
      correctAnswer: 1,
      explanation: 'Tone reflects the author\'s attitude toward the subject matter, conveyed through word choice, modifiers, and perspective.'
    },
    {
      id: 'rc_4',
      topicId: 'verb_rc',
      question: 'When a passage contains contrast indicators like "however", "nonetheless", or "on the contrary", what do they signal?',
      options: [
        'A continuation of the previous paragraph\'s argument',
        'A shift or nuance in the author\'s core thesis or argument trajectory',
        'The conclusion of the entire passage',
        'A list of supporting examples'
      ],
      correctAnswer: 1,
      explanation: 'Contrast transitions mark a pivotal change in argument direction, counterarguments, or important qualifications.'
    },
    {
      id: 'rc_5',
      topicId: 'verb_rc',
      question: 'What is the "trap of extreme words" in Reading Comprehension multiple-choice options?',
      options: [
        'Options containing neutral words like "may" or "suggests"',
        'Options using absolute terms like "always", "never", "entirely", or "impossible" when the text is qualified',
        'Options that quote the text directly',
        'Options that are shorter than 5 words'
      ],
      correctAnswer: 1,
      explanation: 'Passages usually present nuanced views; options with extreme words ("always", "never") are frequently incorrect unless explicitly supported.'
    },
    {
      id: 'rc_6',
      topicId: 'verb_rc',
      question: 'In vocabulary-in-context questions, how should you determine the meaning of a highlighted word?',
      options: [
        'Use the standard dictionary definition regardless of context',
        'Replace the word in the sentence with each option to test which preserves contextual sense',
        'Select the most complex word in the choices',
        'Assume it always means the opposite of its literal definition'
      ],
      correctAnswer: 1,
      explanation: 'Words often have multiple meanings; testing substitution in context guarantees the meaning intended by the author.'
    },
    {
      id: 'rc_7',
      topicId: 'verb_rc',
      question: 'What is the primary function of a paragraph\'s concluding sentence in a structured passage?',
      options: [
        'Introduce a completely new unrelated subtopic',
        'Summarize the key point of that paragraph or transition smoothly to the next point',
        'Provide raw statistical data without context',
        'Repeat the opening sentence of the entire article'
      ],
      correctAnswer: 1,
      explanation: 'Concluding sentences wrap up the paragraph\'s focal argument and lay the logical bridge to the next supporting point.'
    },
    {
      id: 'rc_8',
      topicId: 'verb_rc',
      question: 'When asked to identify the "structure of an argument", what are you evaluating?',
      options: [
        'The font size and formatting of the text',
        'The logical progression from premise to evidence, counterargument, and conclusion',
        'The total word count per paragraph',
        'The grammar rules used in the second sentence'
      ],
      correctAnswer: 1,
      explanation: 'Argument structure maps out how claims, supporting evidence, counterpoints, and conclusions are sequentially organized.'
    },
    {
      id: 'rc_9',
      topicId: 'verb_rc',
      question: 'What is the difference between a "premise" and a "conclusion" in critical passage reading?',
      options: [
        'A premise is the main claim, while a conclusion is supporting evidence',
        'A premise is a supporting reason or fact, while a conclusion is the central claim inferred from premises',
        'There is no difference between them',
        'Premises only appear in poetry'
      ],
      correctAnswer: 1,
      explanation: 'Premises provide the foundational facts or evidence that logically support and justify the overarching conclusion.'
    },
    {
      id: 'rc_10',
      topicId: 'verb_rc',
      question: 'Which skimming technique helps rapidly locate specific facts or data points in long passages?',
      options: [
        'Reading every word aloud',
        'Scanning key nouns, proper names, dates, and capital letters without reading full sentences',
        'Memorizing the entire passage first',
        'Closing your eyes and picking at random'
      ],
      correctAnswer: 1,
      explanation: 'Scanning utilizes visual markers (capital letters, digits, key terminology) to pinpoint specific factual details efficiently.'
    }
  ],
  verb_errors: [
    {
      id: 'err_1',
      topicId: 'verb_errors',
      question: 'Identify the correct sentence regarding Subject-Verb Agreement:',
      options: [
        'The list of items are on the desk.',
        'Neither of the candidates were selected for the role.',
        'Each of the delegates was presented with an award.',
        'The team of researchers have published their results.'
      ],
      correctAnswer: 2,
      explanation: '"Each" is an indefinite singular pronoun and strictly requires the singular verb "was".'
    },
    {
      id: 'err_2',
      topicId: 'verb_errors',
      question: 'Identify the sentence with a dangling modifier error:',
      options: [
        'Walking down the street, the trees were beautiful.',
        'While walking down the street, she noticed the beautiful trees.',
        'She walked down the street and admired the trees.',
        'The trees looked beautiful as she walked down the street.'
      ],
      correctAnswer: 0,
      explanation: 'In option A, "Walking down the street" modifies "the trees", implying the trees were walking down the street.'
    },
    {
      id: 'err_3',
      topicId: 'verb_errors',
      question: 'Which of the following maintains correct parallel structure?',
      options: [
        'He likes swimming, running, and to ride a bicycle.',
        'She enjoys reading books, writing stories, and painting landscapes.',
        'The manager asked us to work quickly, carefully, and with precision.',
        'They decided to study hard, taking notes, and pass the exam.'
      ],
      correctAnswer: 1,
      explanation: 'Parallelism requires matching grammatical forms: gerunds "reading", "writing", and "painting" are aligned.'
    },
    {
      id: 'err_4',
      topicId: 'verb_errors',
      question: 'Choose the sentence with correct conditional tense usage:',
      options: [
        'If he would have studied harder, he would have passed.',
        'If he had studied harder, he would have passed.',
        'If he studied harder, he will pass.',
        'If he has studied harder, he would pass.'
      ],
      correctAnswer: 1,
      explanation: 'Third conditional structure: "If + past perfect (had studied), ... would have + past participle (would have passed)".'
    },
    {
      id: 'err_5',
      topicId: 'verb_errors',
      question: 'Which phrase contains a redundant expression?',
      options: [
        'Revert back to the original plan',
        'Return to the original plan',
        'Revisit the original plan',
        'Review the original plan'
      ],
      correctAnswer: 0,
      explanation: '"Revert" already means to return to a previous state, so adding "back" is redundant.'
    },
    {
      id: 'err_6',
      topicId: 'verb_errors',
      question: 'Select the grammatically accurate sentence using "between / among":',
      options: [
        'Divide the property among the two brothers.',
        'Distribute the prizes between the five winners.',
        'Choose between option A and option B.',
        'The secret was kept between all members of the club.'
      ],
      correctAnswer: 2,
      explanation: '"Between" is used for distinct individual items (typically two), whereas "among" is used for group distributions of three or more.'
    },
    {
      id: 'err_7',
      topicId: 'verb_errors',
      question: 'Which sentence correctly uses "fewer" vs "less"?',
      options: [
        'There were less people in attendance today than yesterday.',
        'There was fewer water remaining in the reservoir.',
        'There were fewer complaints submitted this quarter.',
        'He has less assignments than his peer.'
      ],
      correctAnswer: 2,
      explanation: '"Fewer" is used with countable plural nouns ("complaints"), while "less" is used with uncountable quantities ("water").'
    },
    {
      id: 'err_8',
      topicId: 'verb_errors',
      question: 'Identify the sentence with correct pronoun case:',
      options: [
        'Him and I went to the conference.',
        'The award was presented to she and her mentor.',
        'Between you and me, the project is nearly complete.',
        'Us students decided to organize the webinar.'
      ],
      correctAnswer: 2,
      explanation: '"Between" is a preposition requiring object pronouns ("you and me", not "you and I").'
    },
    {
      id: 'err_9',
      topicId: 'verb_errors',
      question: 'Which sentence correctly demonstrates subjunctive mood?',
      options: [
        'If I was you, I would accept the offer.',
        'The director recommended that the report be submitted immediately.',
        'I wish I was able to attend the gala.',
        'It is vital that he attends the meeting on time.'
      ],
      correctAnswer: 1,
      explanation: 'Subjunctive mood following recommendations requires the base verb form ("be submitted" or "he attend").'
    },
    {
      id: 'err_10',
      topicId: 'verb_errors',
      question: 'Find the sentence free from punctuation or semicolon errors:',
      options: [
        'The experiment succeeded, however, further tests are required.',
        'The experiment succeeded; however, further tests are required.',
        'The experiment succeeded; however further tests are required.',
        'The experiment succeeded, however further tests are required.'
      ],
      correctAnswer: 1,
      explanation: 'When joining two independent clauses with a conjunctive adverb ("however"), use a semicolon before and a comma after.'
    }
  ]
};

// Fallback dynamic generator to ensure EVERY topic ID produces at least 20 to 30 high-quality deep gaming questions for MBA Professionals
export const getTopicQuestions = (topicId: string, topicTitle: string = 'Aptitude Practice', count: number = 30, domain?: string): Question[] => {
  // Prefer the real, curated question bank over sample/AI-generated filler.
  const realBank = REAL_QUESTION_BANK[topicId];
  if (realBank && realBank.length >= count) {
    return realBank.slice(0, count);
  }

  const existing = realBank && realBank.length > 0 ? realBank : SAMPLE_QUESTIONS[topicId];
  if (existing && existing.length >= count) {
    return existing.slice(0, count);
  }

  // Generate structured, deep-learning MBA professional questions specifically tailored to topicTitle & domain
  const baseQuestions: Question[] = existing ? [...existing] : [];
  const targetCount = Math.max(20, count);
  const needed = targetCount - baseQuestions.length;

  const currentDomain = domain || (
    topicId.includes('fin') || topicId.includes('profit') ? 'Finance' :
    topicId.includes('hr') || topicId.includes('org') ? 'HR' :
    topicId.includes('mkt') || topicId.includes('brand') ? 'Marketing' :
    topicId.includes('data') || topicId.includes('stat') ? 'Business Analytics' :
    'General Management'
  );

  // Rotating scenario contexts so templates that don't already embed a
  // qNum-derived number still read as distinct questions across a run,
  // instead of the exact same sentence repeating every time that branch
  // of the domain builder gets picked.
  const SCENARIO_TAGS = [
    'a Series B fintech startup', 'a Fortune 500 retailer', 'a regional logistics firm',
    'an e-commerce unicorn', 'a healthcare SaaS company', 'a global manufacturing conglomerate',
    'a D2C consumer brand', 'a private equity portfolio company',
  ];
  const scenarioFor = (qNum: number) => SCENARIO_TAGS[qNum % SCENARIO_TAGS.length];
  // For sentence-initial use, since SCENARIO_TAGS are lowercase (they read
  // naturally mid-sentence, e.g. "...campaign at a regional logistics firm").
  const Scenario = (qNum: number) => { const s = scenarioFor(qNum); return s.charAt(0).toUpperCase() + s.slice(1); };

  type Built = { question: string; options: string[]; correctIndex: number; explanation: string };
  const buildFinance = (qNum: number): Built => {
    const variant = qNum % 3;
    if (variant === 0) {
      const revenue = (qNum * 50) + 120; const opex = Math.round(revenue * 0.58);
      const ebitda = revenue - opex; const margin = Math.round((ebitda / revenue) * 100);
      return {
        question: `${Scenario(qNum)} reports Gross Revenue of $${revenue}M with Operating Expenses of $${opex}M. Calculate the implied EBITDA margin percentage for this fiscal quarter:`,
        options: [`${margin - 12}%`, `${margin}%`, `${margin + 8}%`, `${margin + 15}%`],
        correctIndex: 1,
        explanation: `EBITDA = Revenue ($${revenue}M) - OPEX ($${opex}M) = $${ebitda}M. EBITDA Margin = $${ebitda}M / $${revenue}M = ${margin}%. Critical for LBO & DCF valuation models.`,
      };
    } else if (variant === 1) {
      const debt = (qNum * 8) + 30; const equity = (qNum * 6) + 55; const ratio = (debt / equity).toFixed(2);
      return {
        question: `${Scenario(qNum)} carries $${debt}M in total debt and $${equity}M in shareholder equity. What is its Debt-to-Equity ratio?`,
        options: [`${(Number(ratio) - 0.3).toFixed(2)}`, `${ratio}`, `${(Number(ratio) + 0.2).toFixed(2)}`, `${(Number(ratio) + 0.5).toFixed(2)}`],
        correctIndex: 1,
        explanation: `Debt-to-Equity = Total Debt / Shareholder Equity = $${debt}M / $${equity}M = ${ratio}.`,
      };
    }
    return {
      question: `The CFO of ${scenarioFor(qNum)} is deciding between debt and equity financing for expansion related to ${topicTitle}. Which factor most directly favors debt financing?`,
      options: ['The company wants to avoid all fixed obligations', 'Interest payments are tax-deductible, lowering the after-tax cost of capital', 'Debt never needs to be repaid', 'Equity holders demand no return'],
      correctIndex: 1,
      explanation: `Interest is tax-deductible (the "tax shield"), lowering the effective cost of debt versus equity, though it adds fixed repayment risk.`,
    };
  };
  const buildMarketing = (qNum: number): Built => {
    const variant = qNum % 2;
    if (variant === 0) {
      const spend = qNum * 25000; const customers = qNum * 625; const cac = Math.round(spend / customers);
      return {
        question: `A performance marketing campaign at ${scenarioFor(qNum)} spent $${spend.toLocaleString()} and acquired ${customers.toLocaleString()} subscribers. What is the Customer Acquisition Cost (CAC)?`,
        options: [`$${cac - 12}`, `$${cac}`, `$${cac + 18}`, `$${cac * 2}`],
        correctIndex: 1,
        explanation: `CAC = Total Spend ($${spend.toLocaleString()}) / New Subscribers (${customers.toLocaleString()}) = $${cac}. Compare against LTV for payback velocity.`,
      };
    }
    return {
      question: `${Scenario(qNum)} sees rising impressions but falling click-through rate (CTR) over a quarter for its ${topicTitle} campaign. What is the most likely explanation?`,
      options: ['Ad creative fatigue among a saturated audience', 'The product price decreased', 'CTR is unaffected by creative or audience factors', 'Impressions and CTR always move together'],
      correctIndex: 0,
      explanation: `Rising impressions with falling CTR classically signals creative fatigue — the same audience seeing the same ad too often.`,
    };
  };
  const buildHR = (qNum: number): Built => {
    const variant = qNum % 4;
    if (variant === 0) {
      return {
        question: `In evaluating organizational talent retention at ${scenarioFor(qNum)} for ${topicTitle}, which analytics metric yields the highest predictive accuracy for key-employee flight risk?`,
        options: ['Gross employee headcount at fiscal year end', 'Voluntary turnover rate segmented by high-performer tenure cohorts and eNPS scores', 'Total annual office supply overhead costs', 'Average employee age distribution'],
        correctIndex: 1,
        explanation: `Segmented voluntary turnover correlated with eNPS isolates talent leakage among critical executive talent pools.`,
      };
    } else if (variant === 1) {
      return {
        question: `${Scenario(qNum)}'s engagement survey shows high satisfaction but high attrition among top performers regarding ${topicTitle}. What does this combination most likely suggest?`,
        options: ['The survey itself is flawed and should be discarded', 'Top performers are leaving for growth or compensation reasons unrelated to daily satisfaction', 'Attrition data is always noise', 'Nothing — the two metrics are unrelated'],
        correctIndex: 1,
        explanation: `Satisfaction surveys often miss career-growth and compensation drivers, which disproportionately affect high performers' exit decisions.`,
      };
    } else if (variant === 2) {
      const headcount = (qNum * 12) + 180; const openRoles = Math.round(headcount * 0.06);
      return {
        question: `${Scenario(qNum)} has ${headcount} employees and ${openRoles} open requisitions tied to ${topicTitle}. What metric best captures recruiting funnel health here?`,
        options: ['Total employee headcount alone', 'Time-to-fill segmented by role seniority and offer-acceptance rate', 'Number of job boards posted to', 'Average employee commute distance'],
        correctIndex: 1,
        explanation: `Time-to-fill combined with offer-acceptance rate reveals both pipeline speed and candidate-side friction — headcount alone hides both.`,
      };
    }
    return {
      question: `A restructuring at ${scenarioFor(qNum)} affects ${topicTitle}. What should HR prioritize first to protect execution risk?`,
      options: ['Announcing changes with no transition plan', 'Clear role mapping and retention plans for critical talent before the announcement', 'Waiting for attrition to reveal problem areas', 'Freezing all internal communication'],
      correctIndex: 1,
      explanation: `Pre-identifying critical talent and securing retention commitments before a restructuring announcement reduces flight risk during the most vulnerable window.`,
    };
  };
  const buildAnalytics = (qNum: number): Built => {
    if (qNum % 2 === 0) {
      const rsq = 70 + (qNum % 20);
      return {
        question: `In a predictive analytics model for ${topicTitle} at ${scenarioFor(qNum)}, a regression equation yields an R-squared of 0.${rsq}. How should executive leaders interpret this result?`,
        options: [`${rsq}% of the model predictions are inaccurate`, `${rsq}% of the variance in the target business metric is explained by the model features`, `The absolute error margin is ${rsq} units`, `Only ${100 - rsq}% of data points were sampled`],
        correctIndex: 1,
        explanation: `R-squared measures the proportion of variance in the dependent business metric explained by independent variables.`,
      };
    }
    const lift = 1 + (qNum % 5); const pval = (0.04 + (qNum % 6) * 0.02).toFixed(2);
    return {
      question: `An A/B test at ${scenarioFor(qNum)} related to ${topicTitle} shows a ${lift}% lift with a p-value of ${pval}. What is the most statistically sound conclusion?`,
      options: ['The result is definitively significant and should be rolled out immediately regardless of p-value', `The result should be judged against the conventional 0.05 significance threshold before rolling out`, 'p-values do not matter for A/B testing', 'A lift is always meaningful regardless of significance'],
      correctIndex: 1,
      explanation: `Whether a result clears the conventional 5% significance threshold determines if the observed lift is likely real or plausibly noise.`,
    };
  };
  const buildGeneral = (qNum: number): Built => {
    const variant = qNum % 4;
    if (variant === 0) {
      return {
        question: `Which strategic framework guarantees maximum decision rigor when addressing "${topicTitle}" at ${scenarioFor(qNum)}?`,
        options: ['Making unverified assumptions without financial sensitivity testing', 'Applying MECE (Mutually Exclusive, Collectively Exhaustive) structuring, risk modeling, and ROI calculation', 'Relying solely on historic gut instinct without market benchmark data', 'Deferring decision making indefinitely'],
        correctIndex: 1,
        explanation: `Executive boardroom rigor demands MECE decomposition, financial benchmarking, and risk mitigation frameworks.`,
      };
    } else if (variant === 1) {
      return {
        question: `A cross-functional team at ${scenarioFor(qNum)} disagrees on how to prioritize "${topicTitle}." What is the most effective first step?`,
        options: ['Escalate immediately without discussion', 'Align on shared success metrics before debating specific tactics', 'Let the loudest voice in the room decide', 'Postpone the decision until next fiscal year'],
        correctIndex: 1,
        explanation: `Aligning on shared, measurable success criteria first prevents tactical debates from masking a deeper goal disagreement.`,
      };
    } else if (variant === 2) {
      return {
        question: `${Scenario(qNum)} must choose between two competing initiatives tied to "${topicTitle}" with similar projected ROI. What should break the tie?`,
        options: ['Whichever initiative launched first', 'Comparative risk-adjusted return and strategic fit with core capabilities', 'Whichever team is more senior', 'Coin flip, since ROI is equal'],
        correctIndex: 1,
        explanation: `When headline ROI is similar, risk-adjusted return and fit with existing capabilities are the decisive factors, not seniority or timing.`,
      };
    }
    return {
      question: `Leadership at ${scenarioFor(qNum)} wants a status update on "${topicTitle}" for the board. What makes an update board-ready?`,
      options: ['A long narrative with no metrics', 'Clear metrics, risks, and a specific ask, in that order', 'Only good news, omitting risks', 'Raw data with no synthesis'],
      correctIndex: 1,
      explanation: `Board updates land best structured as metrics → risks → a specific ask — it respects the board's time and enables a real decision.`,
    };
  };

  const usedTexts = new Set(baseQuestions.map(q => q.question));

  for (let i = 1; i <= needed; i++) {
    const qNum = baseQuestions.length + 1;
    // Level progression designation for gaming model
    const levelTier = qNum <= 8 ? "LVL 1 - Intern Quest" : qNum <= 16 ? "LVL 2 - Associate Sprint" : qNum <= 24 ? "LVL 3 - VP Strategy" : "LVL 4 - MD Boss Battle";

    let built: Built;
    if (currentDomain === 'Finance' || topicId.startsWith('quant_') || topicId.includes('fin')) {
      built = buildFinance(qNum);
    } else if (currentDomain === 'Marketing' || topicId.includes('mkt')) {
      built = buildMarketing(qNum);
    } else if (currentDomain === 'HR' || topicId.includes('hr')) {
      built = buildHR(qNum);
    } else if (currentDomain === 'Business Analytics' || topicId.startsWith('log_')) {
      built = buildAnalytics(qNum);
    } else {
      built = buildGeneral(qNum);
    }

    // Safety net: even with the scenario variety above, a small variant
    // count can still coincide for two question numbers. If this exact
    // question text has already been used in this set, force it to be
    // distinct rather than silently duplicating.
    if (usedTexts.has(built.question)) {
      built = { ...built, question: `${built.question} (Case reference #${qNum})` };
    }
    usedTexts.add(built.question);

    // Shuffle option order (and the correct index along with it) so the
    // answer isn't always sitting in the same slot across every question.
    const optionOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const shuffledOptions = optionOrder.map(idx => built.options[idx]);
    const newCorrectIndex = optionOrder.indexOf(built.correctIndex);

    baseQuestions.push({
      id: `${topicId}_gen_${qNum}`,
      topicId: topicId,
      question: `[🎮 ${levelTier} | Q${qNum}/30] ${built.question}`,
      options: shuffledOptions,
      correctAnswer: newCorrectIndex,
      explanation: `${built.explanation} (+50 XP)`
    });
  }

  return baseQuestions.slice(0, targetCount);
};

export const ALL_TOPICS: TopicItem[] = [...VERBAL_TOPICS, ...LOGICAL_TOPICS, ...QUANTS_TOPICS];

