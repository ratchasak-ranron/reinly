import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { EditorialHero } from './editorial-hero';

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <EditorialHero />
    </MemoryRouter>,
  );
}

describe('EditorialHero', () => {
  it('renders eyebrow + h1 + rule + CTA + trust strip in EN locale', () => {
    renderAt('/en');

    // Eyebrow paragraph (uppercase + tracking)
    expect(screen.getByText('Less, on purpose')).toBeInTheDocument();

    // H1 contains both lines.
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Clinic software,');
    expect(heading).toHaveTextContent('distilled.');

    // Decorative accent rule.
    const hr = document.querySelector('hr[aria-hidden="true"]');
    expect(hr).not.toBeNull();

    // CTA — link to /{locale}/pilot, uses translated label.
    const cta = screen.getByRole('link', { name: /Join the pilot/i });
    expect(cta).toHaveAttribute('href', '/en/pilot');

    // Trust strip — 3 list items
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(screen.getByText('PDPA compliant')).toBeInTheDocument();
    expect(screen.getByText('Thai-first')).toBeInTheDocument();
    expect(screen.getByText('No lock-in')).toBeInTheDocument();
  });

  it('renders Thai content when route locale is th', () => {
    renderAt('/th');

    expect(screen.getByText(/เรียบง่ายโดยตั้งใจ/)).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('ซอฟต์แวร์คลินิก');
    expect(heading).toHaveTextContent('เน้นที่จำเป็น');
  });
});
