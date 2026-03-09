// Classification Rules Engine
// User-configurable keyword rules for work/personal event classification

export interface ClassificationRule {
    id: string;
    type: "work" | "personal";
    matchType: "title" | "calendar";
    keywords: string[];
    enabled: boolean;
}

// Translation pairs for matching (not stored, used during classification)
const TRANSLATIONS: Record<string, string[]> = {
    "הופעה": ["gig", "show", "concert", "performance"],
    "חתונה": ["wedding"],
    "חזרה": ["rehearsal"],
    "שיעור": ["lesson", "class", "teaching"],
    "פגישה": ["meeting"],
    "להקה": ["band"],
    "ישיבה": ["meeting", "session"],
    "פרויקט": ["project"],
    "רופא": ["doctor", "dr"],
    "שיניים": ["dentist", "dental"],
    "יום הולדת": ["birthday", "bday"],
    "חדר כושר": ["gym", "fitness"],
    "ספורט": ["sport", "sports", "workout"],
    "אמא": ["mom", "mother"],
    "אבא": ["dad", "father"],
    "משפחה": ["family"],
    "חופשה": ["vacation", "holiday"],
};

// Default rules — Hebrew only (translations applied automatically during matching)
export const DEFAULT_RULES: ClassificationRule[] = [
    {
        id: "work-default-title",
        type: "work",
        matchType: "title",
        keywords: [
            "הופעה", "חתונה", "חזרה", "שיעור", "להקה", "פגישה", "ישיבה", "פרויקט"
        ],
        enabled: true,
    },
    {
        id: "personal-default-title",
        type: "personal",
        matchType: "title",
        keywords: [
            "רופא", "שיניים", "אמא", "אבא", "ספורט", "חדר כושר", "יום הולדת", "משפחה", "חופשה"
        ],
        enabled: true,
    },
];

export interface RuleClassificationResult {
    eventId: string;
    isWork: boolean;
    confidence: number;
    matchedRule?: string;
    matchedKeyword?: string;
}

// Get all matching variations for a keyword (including translations)
export function getKeywordVariations(keyword: string): string[] {
    const variations = [keyword.toLowerCase()];

    const translations = TRANSLATIONS[keyword];
    if (translations) {
        for (const t of translations) {
            variations.push(t.toLowerCase());
        }
    }

    return variations;
}

// Classify events using the rules engine
export function classifyByRules(
    events: Array<{ id: string; summary: string; calendarId?: string }>,
    rules: ClassificationRule[]
): RuleClassificationResult[] {
    return events.map((event) => {
        const titleLower = event.summary.toLowerCase();

        for (const rule of rules) {
            if (!rule.enabled) continue;

            if (rule.matchType === "title") {
                for (const keyword of rule.keywords) {
                    const variations = getKeywordVariations(keyword);
                    for (const variation of variations) {
                        if (titleLower.includes(variation)) {
                            return {
                                eventId: event.id,
                                isWork: rule.type === "work",
                                confidence: 0.85,
                                matchedRule: rule.id,
                                matchedKeyword: keyword,
                            };
                        }
                    }
                }
            }

            if (rule.matchType === "calendar" && event.calendarId) {
                for (const keyword of rule.keywords) {
                    const variations = getKeywordVariations(keyword);
                    for (const variation of variations) {
                        if (event.calendarId.toLowerCase().includes(variation)) {
                            return {
                                eventId: event.id,
                                isWork: rule.type === "work",
                                confidence: 0.9,
                                matchedRule: rule.id,
                                matchedKeyword: keyword,
                            };
                        }
                    }
                }
            }
        }

        // No rule matched — default to work for import
        return {
            eventId: event.id,
            isWork: true,
            confidence: 0.5,
        };
    });
}
