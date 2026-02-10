import React from 'react'

type Props = { children: React.ReactNode }

function ConnectionLayout({ children }: Props) {
    return <section className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {children}
    </section>
}

export default ConnectionLayout