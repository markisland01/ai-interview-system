import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Remove [質問X] prefix from question text for display purposes
 * @param text - Question text that may contain [質問X] prefix
 * @returns Clean question text without the prefix
 */
export function cleanQuestionText(text: string): string {
  return text.replace(/^\[質問\d+\]\s*/, '');
}
