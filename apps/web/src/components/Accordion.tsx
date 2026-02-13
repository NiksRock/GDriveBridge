import React, { type ReactNode } from "react";

type AccordionProps = {
    summary: ReactNode;
    children: ReactNode;
    defaultOpen?: boolean;
    className?: string;
};

export default function Accordion({
    summary,
    children,
    defaultOpen = false,
    className = "",
}: AccordionProps) {
    return (
        <details
            open={defaultOpen}
            className={`group w-full ${className}`}
        >
            {/* Summary Row */}
            <summary
                className="
          flex items-center
          list-none cursor-pointer
          rounded-lg
          px-2 py-1
          hover:bg-slate-100 dark:hover:bg-slate-800
        "
            >
                {summary}
            </summary>

            <div className="ml-6 mt-1 space-y-1">
                {children}
            </div>
        </details>
    );
}
