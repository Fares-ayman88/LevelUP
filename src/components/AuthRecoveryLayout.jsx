import { Accordion, AccordionItem } from '@heroui/react';

import MainBottomNav from './MainBottomNav.jsx';

export default function AuthRecoveryLayout({
  pageLabel = 'Account recovery',
  badge = '',
  title = '',
  subtitle = '',
  showcaseEyebrow = '',
  showcaseTitle = '',
  showcaseSubtitle = '',
  showcaseChips = [],
  showcaseMetrics = [],
  showcaseAccordionItems = [],
  children,
}) {
  const defaultExpandedKeys = showcaseAccordionItems.length ? [showcaseAccordionItems[0].key] : [];

  return (
    <div className="app-shell auth-shell">
      <MainBottomNav mode="auth" />
      <div className="screen screen--narrow auth-screen auth-screen--reference">
        <section className="auth-section auth-section--split auth-section--recovery" aria-label={pageLabel}>
          <aside className="auth-showcase auth-showcase--recovery" aria-label={`${pageLabel} highlights`}>
            {showcaseEyebrow ? (
              <span className="auth-showcase__eyebrow">{showcaseEyebrow}</span>
            ) : null}
            {showcaseTitle ? <h2 className="auth-showcase__title">{showcaseTitle}</h2> : null}
            {showcaseSubtitle ? (
              <p className="auth-showcase__subtitle">{showcaseSubtitle}</p>
            ) : null}
            {showcaseChips.length ? (
              <div className="auth-showcase__chips">
                {showcaseChips.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </div>
            ) : null}
            {showcaseMetrics.length ? (
              <div className="auth-showcase__metrics">
                {showcaseMetrics.map((metric) => (
                  <article key={`${metric.value}-${metric.label}`} className="auth-showcase__metric">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </article>
                ))}
              </div>
            ) : null}
            {showcaseAccordionItems.length ? (
              <Accordion
                className="auth-showcase__accordion"
                defaultExpandedKeys={defaultExpandedKeys}
                itemClasses={{
                  base: 'auth-showcase__accordion-item',
                  content: 'auth-showcase__accordion-content',
                  heading: 'auth-showcase__accordion-heading',
                  indicator: 'auth-showcase__accordion-indicator',
                  startContent: 'auth-showcase__accordion-start',
                  subtitle: 'auth-showcase__accordion-subtitle',
                  title: 'auth-showcase__accordion-title',
                  titleWrapper: 'auth-showcase__accordion-titlewrap',
                  trigger: 'auth-showcase__accordion-trigger',
                }}
                selectionMode="multiple"
                showDivider={false}
                variant="light"
              >
                {showcaseAccordionItems.map((item) => (
                  <AccordionItem
                    key={item.key}
                    aria-label={item.title}
                    indicator={<span className="material-icons-round" aria-hidden>expand_more</span>}
                    startContent={item.icon ? (
                      <span className="auth-showcase__accordion-icon material-icons-round" aria-hidden>
                        {item.icon}
                      </span>
                    ) : null}
                    subtitle={item.subtitle}
                    title={item.title}
                  >
                    <div className="auth-showcase__accordion-body">{item.content}</div>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : null}
          </aside>

          <div className="auth-content auth-content--recovery">
            <header className="auth-hero auth-hero--left">
              {badge ? <span className="auth-badge">{badge}</span> : null}
              {title ? <h1 className="auth-title">{title}</h1> : null}
              {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
            </header>

            <div className="auth-card auth-card--reference forgot-reset-panel">
              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
