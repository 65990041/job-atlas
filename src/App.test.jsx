// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

vi.mock('./components/MapView.jsx', () => ({ default: ({ groups }) => <div data-testid="map-view">{groups.map(group => group.site.label).join(' / ')}</div> }));

afterEach(() => cleanup());

describe('job atlas', () => {
  it('searches the announcement list and opens a sourced detail view', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('searchbox', { name: 'ค้นหาตำแหน่งหรือบริษัท' }), 'Yaskawa');
    expect(screen.getByText('1 ตำแหน่ง')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Service Engineer \(Robotics\)/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Service Engineer \(Robotics\)/ }));
    expect(screen.getByRole('dialog', { name: 'รายละเอียดงาน' })).toBeTruthy();
    expect(screen.getByText(/IL-ESA26-0039_Yaskawa/)).toBeTruthy();
  });

  it('retains a saved status after remount without changing job data', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    const view = render(<App />);
    await user.type(screen.getByRole('searchbox', { name: 'ค้นหาตำแหน่งหรือบริษัท' }), 'Yaskawa');
    await user.click(screen.getByRole('button', { name: /Service Engineer \(Robotics\)/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'สถานะของฉัน' }), 'interested');
    view.unmount();
    render(<App />);
    await user.type(screen.getByRole('searchbox', { name: 'ค้นหาตำแหน่งหรือบริษัท' }), 'Yaskawa');
    await user.click(screen.getByRole('button', { name: /Service Engineer \(Robotics\)/ }));
    expect(screen.getByRole('combobox', { name: 'สถานะของฉัน' }).value).toBe('interested');
  });

  it('keeps note focus while typing and restores card focus when closing', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('searchbox', { name: 'ค้นหาตำแหน่งหรือบริษัท' }), 'Yaskawa');
    const card = screen.getByRole('button', { name: /Service Engineer \(Robotics\)/ });
    await user.click(card);
    const note = screen.getByRole('textbox', { name: 'บันทึกส่วนตัว' });
    await user.type(note, 'abc');
    expect(note.value).toBe('abc');
    expect(document.activeElement).toBe(note);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(card);
  });

  it('opens a job-specific map popup and returns to the detail panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('searchbox', { name: 'ค้นหาตำแหน่งหรือบริษัท' }), 'IL-ESA26-0005');
    await user.click(screen.getByRole('button', { name: /Sale Engineer/ }));
    const opener = screen.getByRole('button', { name: 'ดูบนแผนที่' });
    await user.click(opener);
    const mapDialog = screen.getByRole('dialog', { name: 'แผนที่สถานที่ทำงาน' });
    expect(mapDialog).toBeTruthy();
    expect(screen.getByTestId('map-view').textContent).toContain('ลำลูกกา');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'แผนที่สถานที่ทำงาน' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'รายละเอียดงาน' })).toBeTruthy();
    expect(document.activeElement).toBe(opener);
  });

  it('shows both possible sites and their precision in the map popup', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('searchbox', { name: 'ค้นหาตำแหน่งหรือบริษัท' }), 'IL-ESA26-0040');
    await user.click(screen.getByRole('button', { name: /IL-ESA26-0040/ }));
    await user.click(screen.getByRole('button', { name: 'ดูบนแผนที่' }));
    const mapDialog = screen.getByRole('dialog', { name: 'แผนที่สถานที่ทำงาน' });
    expect(mapDialog.textContent).toContain('นิคมอุตสาหกรรมนวนคร');
    expect(mapDialog.textContent).toContain('จังหวัดพระนครศรีอยุธยา');
    expect(mapDialog.textContent).toContain('ระดับจังหวัด');
  });
});
