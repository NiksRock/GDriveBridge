import React from "react";

type Props = { accordionSummary: React.ReactElement, accordionDetails: React.ReactElement };

function Accordion({ accordionSummary, accordionDetails }: Props) {
    return (
        <details className="h-max">
            <summary className="flex">
                {accordionSummary}
            </summary>
            {accordionDetails}
        </details>
    );
}

export default Accordion;
