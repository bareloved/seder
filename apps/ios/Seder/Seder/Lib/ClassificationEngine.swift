import Foundation

enum ClassificationEngine {
    // Hebrew -> English translation pairs (matching web app)
    static let translations: [String: [String]] = [
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
    ]

    static let defaultRules: [ClassificationRule] = [
        ClassificationRule(
            id: "work-default-title",
            type: "work",
            matchType: "title",
            keywords: ["הופעה", "חתונה", "חזרה", "שיעור", "להקה", "פגישה", "ישיבה", "פרויקט"],
            enabled: true
        ),
        ClassificationRule(
            id: "personal-default-title",
            type: "personal",
            matchType: "title",
            keywords: ["רופא", "שיניים", "אמא", "אבא", "ספורט", "חדר כושר", "יום הולדת", "משפחה", "חופשה"],
            enabled: true
        ),
    ]

    static func classify(events: [CalendarEvent], rules: [ClassificationRule]) -> [ClassifiedEvent] {
        events.map { event in
            let result = classifyEvent(event, rules: rules)
            let autoSelect = !event.alreadyImported && result.isWork && result.confidence >= 0.7
            return ClassifiedEvent(
                event: event,
                isWork: result.isWork,
                confidence: result.confidence,
                selected: autoSelect
            )
        }
    }

    private static func classifyEvent(_ event: CalendarEvent, rules: [ClassificationRule]) -> ClassificationResult {
        let titleLower = event.summary.lowercased()

        for rule in rules where rule.enabled {
            if rule.matchType == "title" {
                for keyword in rule.keywords {
                    let variations = getKeywordVariations(keyword)
                    for variation in variations {
                        if titleLower.contains(variation) {
                            return ClassificationResult(
                                eventId: event.id,
                                isWork: rule.type == "work",
                                confidence: 0.85,
                                matchedRule: rule.id,
                                matchedKeyword: keyword
                            )
                        }
                    }
                }
            }

            if rule.matchType == "calendar" {
                let calLower = event.calendarId.lowercased()
                for keyword in rule.keywords {
                    let variations = getKeywordVariations(keyword)
                    for variation in variations {
                        if calLower.contains(variation) {
                            return ClassificationResult(
                                eventId: event.id,
                                isWork: rule.type == "work",
                                confidence: 0.9,
                                matchedRule: rule.id,
                                matchedKeyword: keyword
                            )
                        }
                    }
                }
            }
        }

        // No match — default to work with low confidence
        return ClassificationResult(
            eventId: event.id, isWork: true, confidence: 0.5,
            matchedRule: nil, matchedKeyword: nil
        )
    }

    private static func getKeywordVariations(_ keyword: String) -> [String] {
        var variations = [keyword.lowercased()]
        if let translated = translations[keyword] {
            variations.append(contentsOf: translated.map { $0.lowercased() })
        }
        return variations
    }
}
