'use client';

import { ArrowRight, Lightbulb } from 'lucide-react';

interface FollowUpQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function FollowUpQuestions({ questions, onSelect, disabled = false }: FollowUpQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2.5 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-amber-400/60" />
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Related</h3>
      </div>
      <div className="grid gap-1.5">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            disabled={disabled}
            className="group flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed border-gradient"
          >
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/20 group-hover:text-blue-400 transition-colors" />
            <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              {question}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
