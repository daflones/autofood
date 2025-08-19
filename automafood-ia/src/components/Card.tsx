import React from 'react'

type CardProps = {
  title?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function Card({ title, actions, className = '', children }: CardProps) {
  return (
    <div className={`af-card rounded-xl bg-white shadow-sm ring-1 ring-gray-200/70 hover:shadow-md transition-shadow ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 pt-4">
          {title && <h3 className="af-card-title text-gray-900">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={(title || actions) ? 'p-4 pt-3' : 'p-4'}>{children}</div>
    </div>
  )
}

export default Card
