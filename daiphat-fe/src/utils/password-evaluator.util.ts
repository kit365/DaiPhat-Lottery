import { PasswordPolicy } from "../admin/pages/authen/types/auth.type";

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | 'amazing';

export interface RequirementStatus {
    id: string;
    description: string;
    isMet: boolean;
}

export interface StrengthResult {
    score: number;
    total: number;
    percentage: number;
    strength: PasswordStrength;
    feedback: string;
    emoji: string;
    requirements: RequirementStatus[];
}

const FEEDBACK_MAP: Record<PasswordStrength, { text: string; emoji: string }> = {
    weak: { text: "Too short or simple 👀", emoji: "👀" },
    fair: { text: "Keep going... 🫡", emoji: "🫡" },
    good: { text: "Almost there! ✨", emoji: "✨" },
    strong: { text: "Strong password! 💪", emoji: "💪" },
    amazing: { text: "Amazing! 🥳", emoji: "🥳" }
};

export const calculatePasswordStrength = (
    password: string, 
    policy?: PasswordPolicy
): StrengthResult => {
    if (!policy) {
        return {
            score: 0, total: 0, percentage: 0,
            strength: 'weak', feedback: "Loading policy...", emoji: "⌛",
            requirements: []
        };
    }

    const requirementsStatus: RequirementStatus[] = policy.requirements.map(req => ({
        id: req.id,
        description: req.description,
        isMet: req.regex ? new RegExp(req.regex).test(password) : (req.id === 'length-min' ? password.length >= policy.minLength : false)
    }));

    const metCount = requirementsStatus.filter(req => req.isMet).length;
    const isLengthOk = password.length >= policy.minLength;
    
    // Add length as a "virtual" requirement if not explicitly in requirements
    const totalCount = requirementsStatus.length;
    const score = metCount;
    const percentage = totalCount > 0 ? (score / totalCount) * 100 : 0;

    let strength: PasswordStrength = 'weak';
    if (percentage === 0) strength = 'weak';
    else if (percentage <= 30) strength = 'fair';
    else if (percentage <= 60) strength = 'good';
    else if (percentage < 100) strength = 'strong';
    else strength = 'amazing';

    return {
        score,
        total: totalCount,
        percentage,
        strength,
        feedback: FEEDBACK_MAP[strength].text,
        emoji: FEEDBACK_MAP[strength].emoji,
        requirements: requirementsStatus
    };
};
