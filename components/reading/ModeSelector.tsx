"use client";

import React from "react";

interface Props {
  onSelectPassive: () => void;
  onSelectActive: () => void;
  title: string;
}

export function ModeSelector({ onSelectPassive, onSelectActive, title }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 p-6">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Ready to read?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {title}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ModeCard
            icon="🎧"
            title="Listen First"
            description="Hear the document read aloud. Flag sections that catch your attention, then review them actively."
            onClick={onSelectPassive}
            variant="passive"
          />
          <ModeCard
            icon="📖"
            title="Read Actively"
            description="Predict, read, recall. Deep comprehension with AI feedback on every section."
            onClick={onSelectActive}
            variant="active"
          />
        </div>
      </div>
    </div>
  );
}

function ModeCard({ icon, title, description, onClick, variant }: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  variant: "passive" | "active";
}) {
  const border = variant === "passive"
    ? "border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500"
    : "border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400";

  return (
    <button
      onClick={onClick}
      className={`text-left p-6 rounded-xl border-2 transition-all space-y-3 bg-white dark:bg-slate-800 ${border} hover:shadow-md`}
    >
      <span className="text-3xl">{icon}</span>
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  );
}
