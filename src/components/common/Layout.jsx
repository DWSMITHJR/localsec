// src/components/common/Layout.jsx
import React from 'react';

export const Container = ({ children, fluid = false, className = '' }) => (
  <div className={`container ${fluid ? 'container-fluid' : ''} ${className}`}>
    {children}
  </div>
);

export const Row = ({ children, gutter = 16, className = '' }) => (
  <div className={`row row-gutter-${gutter} ${className}`}>
    {children}
  </div>
);

export const Col = ({ children, span = 12, offset = 0, className = '' }) => (
  <div className={`col col-${span} col-offset-${offset} ${className}`}>
    {children}
  </div>
);

export const Grid = ({ children, cols = 3, gap = 16, className = '' }) => (
  <div className={`grid grid-${cols} grid-gap-${gap} ${className}`}>
    {children}
  </div>
);

export const Flex = ({ children, direction = 'row', align = 'center', justify = 'flex-start', wrap = 'nowrap', className = '' }) => (
  <div className={`flex flex-${direction} flex-align-${align} flex-justify-${justify} flex-wrap-${wrap} ${className}`}>
    {children}
  </div>
);

export const Stack = ({ children, spacing = 16, direction = 'vertical', className = '' }) => (
  <div className={`stack stack-${direction} stack-spacing-${spacing} ${className}`}>
    {children}
  </div>
);

export const Panel = ({ title, children, collapsible = false, defaultExpanded = true, className = '' }) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header" onClick={() => collapsible && setIsExpanded(!isExpanded)}>
        <h4>{title}</h4>
        {collapsible && (
          <button className="panel-toggle">
            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} />
          </button>
        )}
      </div>
      {(!collapsible || isExpanded) && (
        <div className="panel-body">{children}</div>
      )}
    </div>
  );
};

export const Sidebar = ({ children, width = 300, position = 'left', className = '' }) => (
  <div className={`sidebar sidebar-${position} sidebar-width-${width} ${className}`}>
    {children}
  </div>
);

export const Header = ({ children, sticky = false, className = '' }) => (
  <header className={`header ${sticky ? 'header-sticky' : ''} ${className}`}>
    {children}
  </header>
);

export const Footer = ({ children, className = '' }) => (
  <footer className={`footer ${className}`}>
    {children}
  </footer>
);

export const Main = ({ children, className = '' }) => (
  <main className={`main ${className}`}>
    {children}
  </main>
);

export const Section = ({ children, title, subtitle, className = '' }) => (
  <section className={`section ${className}`}>
    {(title || subtitle) && (
      <div className="section-header">
        {title && <h2>{title}</h2>}
        {subtitle && <p>{subtitle}</p>}
      </div>
    )}
    <div className="section-body">{children}</div>
  </section>
);

export const Divider = ({ orientation = 'horizontal', className = '' }) => (
  <div className={`divider divider-${orientation} ${className}`} />
);

export const Spacer = ({ size = 16, className = '' }) => (
  <div className={`spacer spacer-${size} ${className}`} />
);

export const Center = ({ children, className = '' }) => (
  <div className={`center ${className}`}>
    {children}
  </div>
);
