"use client";

interface ExampleQuestion {
  question: string;
  category: string;
}

const EXAMPLES: ExampleQuestion[] = [
  { question: "Will the Supreme Court overturn Roe v. Wade again?", category: "Legal" },
  { question: "Should the US implement universal basic income?", category: "Political" },
  { question: "Is it ethical to use AI in criminal sentencing?", category: "Ethical" },
  { question: "Will NATO expand to include Ukraine by 2030?", category: "Political" },
  { question: "Should psychedelics be legalized therapeutically?", category: "Ethical" },
  { question: "Will China surpass the US economically by 2040?", category: "Political" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Legal: "text-blue-400 bg-blue-500/10",
  Political: "text-violet-400 bg-violet-500/10",
  Ethical: "text-amber-400 bg-amber-500/10",
};

interface ExampleQuestionsProps {
  onSelect: (question: string) => void;
}

export function ExampleQuestions({ onSelect }: ExampleQuestionsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">
        Example Questions
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example.question}
            onClick={() => onSelect(example.question)}
            className="group flex items-start gap-3 p-3 rounded-lg border border-gray-800 hover:border-gray-600 bg-gray-900/50 hover:bg-gray-900 text-left transition-all"
          >
            <span
              className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                CATEGORY_COLORS[example.category] ?? "text-gray-400 bg-gray-800"
              }`}
            >
              {example.category}
            </span>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors leading-snug">
              {example.question}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
