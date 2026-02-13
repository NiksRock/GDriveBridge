import React from 'react'

type Props = { children: React.ReactNode, showExpanded?: boolean }

const FolderRow = ({ children, showExpanded = true }: Props) => {
    return (
        <>{showExpanded && <span
            className="
           material-symbols-outlined 
           
           !text-[20px] cursor-pointer hover:text-slate-900 dark:hover:text-white
            transition-transform
            group-open:rotate-90  
          "
        >
            arrow_drop_down
        </span>}
            <div className="flex-1">{children}</div></>
    )
}

export default FolderRow