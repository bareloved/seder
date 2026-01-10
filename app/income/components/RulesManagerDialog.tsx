"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import {
    type ClassificationRule,
    getUserRules,
    saveUserRules,
    DEFAULT_RULES,
} from "@/lib/classificationRules";

// Translation pairs - when user adds one, we auto-add the other
const TRANSLATIONS: Record<string, string> = {
    // Hebrew → English (display the Hebrew, store both for matching)
    "הופעה": "gig",
    "חתונה": "wedding",
    "חזרה": "rehearsal",
    "שיעור": "lesson",
    "פגישה": "meeting",
    "להקה": "band",
    "רופא": "doctor",
    "שיניים": "dentist",
    "יום הולדת": "birthday",
    "חדר כושר": "gym",
    "ספורט": "sport",
    "משפחה": "family",
    "חופשה": "vacation",
    // English → Hebrew
    "gig": "הופעה",
    "wedding": "חתונה",
    "rehearsal": "חזרה",
    "lesson": "שיעור",
    "meeting": "פגישה",
    "band": "להקה",
    "doctor": "רופא",
    "dentist": "שיניים",
    "birthday": "יום הולדת",
    "gym": "חדר כושר",
    "sport": "ספורט",
    "family": "משפחה",
    "vacation": "חופשה",
};

function getRelatedKeywords(keyword: string): string[] {
    const lower = keyword.toLowerCase();
    const translation = TRANSLATIONS[lower] || TRANSLATIONS[keyword];
    return translation ? [translation] : [];
}

interface RulesManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RulesManagerDialog({ isOpen, onClose }: RulesManagerDialogProps) {
    const [rules, setRules] = React.useState<ClassificationRule[]>([]);
    const [activeTab, setActiveTab] = React.useState<"work" | "personal">("work");
    const [newKeyword, setNewKeyword] = React.useState("");
    const [isExpanded, setIsExpanded] = React.useState(false);

    const VISIBLE_COUNT = 8;

    // Load rules when dialog opens
    React.useEffect(() => {
        if (isOpen) {
            setRules(getUserRules());
            setIsExpanded(false);
            setNewKeyword("");
        }
    }, [isOpen]);

    const currentRule = rules.find((r) => r.type === activeTab && r.matchType === "title");
    const keywords = currentRule?.keywords || [];
    const visibleKeywords = isExpanded ? keywords : keywords.slice(0, VISIBLE_COUNT);
    const hasMore = keywords.length > VISIBLE_COUNT;

    const addKeyword = () => {
        const keyword = newKeyword.trim();
        if (!keyword) return;

        // Get related translations
        const related = getRelatedKeywords(keyword);
        const allKeywords = [keyword, ...related];

        setRules((prev) => {
            return prev.map((rule) => {
                if (rule.type === activeTab && rule.matchType === "title") {
                    const existingSet = new Set(rule.keywords.map(k => k.toLowerCase()));
                    const newOnes = allKeywords.filter(k => !existingSet.has(k.toLowerCase()));
                    if (newOnes.length === 0) return rule;
                    return { ...rule, keywords: [...rule.keywords, ...newOnes] };
                }
                return rule;
            });
        });

        setNewKeyword("");
    };

    const removeKeyword = (keyword: string) => {
        setRules((prev) => {
            return prev.map((rule) => {
                if (rule.type === activeTab && rule.matchType === "title") {
                    return { ...rule, keywords: rule.keywords.filter((k) => k !== keyword) };
                }
                return rule;
            });
        });
    };

    const handleSave = () => {
        saveUserRules(rules);
        onClose();
    };

    const handleReset = () => {
        setRules(DEFAULT_RULES);
    };

    const isHebrew = (text: string) => /[\u0590-\u05FF]/.test(text);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px]" dir="rtl">
                <DialogHeader>
                    <DialogTitle>הגדרות סיווג</DialogTitle>
                    <DialogDescription>
                        הגדר מילות מפתח לזיהוי אוטומטי של סוג האירוע
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                            onClick={() => { setActiveTab("work"); setIsExpanded(false); }}
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === "work"
                                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                }`}
                        >
                            עבודה
                        </button>
                        <button
                            onClick={() => { setActiveTab("personal"); setIsExpanded(false); }}
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === "personal"
                                ? "bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                }`}
                        >
                            אישי
                        </button>
                    </div>

                    {/* Rule Sentence */}
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            סווג כ־
                            <span className={`font-semibold ${activeTab === "work" ? "text-emerald-600" : "text-rose-600"}`}>
                                {activeTab === "work" ? "עבודה" : "אישי"}
                            </span>
                            {" "}אם הכותרת מכילה:
                        </p>

                        {/* Keywords */}
                        <div className={`space-y-2 ${isExpanded ? "max-h-[200px] overflow-y-auto" : ""}`}>
                            <div className="flex flex-wrap gap-1.5">
                                {visibleKeywords.map((keyword) => (
                                    <Badge
                                        key={keyword}
                                        variant="secondary"
                                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 gap-1 px-2 py-1 text-xs"
                                    >
                                        <span className={isHebrew(keyword) ? "" : "font-mono text-[11px]"}>
                                            {keyword}
                                        </span>
                                        <button
                                            onClick={() => removeKeyword(keyword)}
                                            className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 -mr-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>

                            {hasMore && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    {isExpanded ? (
                                        <>
                                            <ChevronUp className="h-3 w-3" />
                                            הסתר
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="h-3 w-3" />
                                            הצג הכל ({keywords.length})
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Add Keyword Input */}
                        <div className="flex gap-2 pt-2">
                            <Input
                                placeholder="הוסף מילה..."
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                                className="flex-1 h-9"
                            />
                            <Button
                                size="sm"
                                onClick={addKeyword}
                                disabled={!newKeyword.trim()}
                                className="h-9 px-3"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <p className="text-[11px] text-slate-400">
                            תרגומים מוספים אוטומטית (חתונה ↔ wedding)
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-slate-500">
                        <RotateCcw className="h-3.5 w-3.5" />
                        איפוס
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button onClick={handleSave}>שמור</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
