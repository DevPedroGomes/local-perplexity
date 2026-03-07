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
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Related questions
        </h3>
      </div>
      <div className="grid gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            disabled={disabled}
            className="group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border bg-card/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
              {question}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
