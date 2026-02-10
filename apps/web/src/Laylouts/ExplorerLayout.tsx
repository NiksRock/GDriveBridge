import React from 'react'

type Props = {children: React.ReactNode}

const ExplorerLayout = ({children}: Props) => {
    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[600px] min-h-[500px]"> 
            {children} 
        </div>
    )
}

export default ExplorerLayout