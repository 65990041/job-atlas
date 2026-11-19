import { describe, expect, it } from 'vitest';
import { getFilteredJobs, getMapGroups } from './jobs.js';

const jobs = [
  { id: 'IL-ESA26-0001', company: 'บริษัท เอ', title: 'PLC Engineer', applicationType: 'recommendation', majorText: 'Mechatronics Engineering', locationText: 'A', salaryBase: 20000 },
  { id: 'IL-ESA26-0002', company: 'Beta', title: 'Software Engineer', applicationType: 'open', majorText: 'Computer Engineering', locationText: 'B', salaryBase: null },
  { id: 'IL-ESA26-0003', company: 'Gamma', title: 'Engineer', applicationType: 'open', majorText: 'Mechatronics Engineering', locationText: 'C', salaryBase: 25000 },
];
const locations = {
  sites: {
    a: { label: 'Site A', province: 'ปทุมธานี', lat: 14, lon: 100.5, precision: 'estate' },
    b: { label: 'Site B', province: 'กรุงเทพมหานคร', lat: 13.7, lon: 100.5, precision: 'district' },
  },
  offerSites: { 'IL-ESA26-0001': ['a'], 'IL-ESA26-0002': ['b'], 'IL-ESA26-0003': ['a', 'b'] },
};

describe('job discovery', () => {
  it('searches Thai company names and English titles without changing source rows', () => {
    expect(getFilteredJobs(jobs, { query: 'บริษัท เอ' }, locations).map(x => x.id)).toEqual(['IL-ESA26-0001']);
    expect(getFilteredJobs(jobs, { query: 'software' }, locations).map(x => x.id)).toEqual(['IL-ESA26-0002']);
    expect(jobs).toHaveLength(3);
  });

  it('matches composed Thai queries against normalized PDF text', () => {
    const normalized = [{ ...jobs[0], company: 'บริษัท เอ จํากัด' }];
    expect(getFilteredJobs(normalized, { query: 'จำกัด' }, locations).map(x => x.id)).toEqual(['IL-ESA26-0001']);
  });

  it('combines type, province, and base salary filters without using total income', () => {
    expect(getFilteredJobs(jobs, { applicationType: 'open', province: 'ปทุมธานี', minSalary: 22000 }, locations).map(x => x.id)).toEqual(['IL-ESA26-0003']);
  });

  it('keeps unknown salaries out of minimum salary results', () => {
    expect(getFilteredJobs(jobs, { minSalary: 10000 }, locations).map(x => x.id)).toEqual(['IL-ESA26-0001', 'IL-ESA26-0003']);
  });

  it('groups the same filtered offers by actual site and retains multiple sites', () => {
    const selected = getFilteredJobs(jobs, { applicationType: 'open' }, locations);
    const groups = getMapGroups(selected, locations);
    expect(groups.map(group => [group.siteId, group.jobs.map(job => job.id)])).toEqual([
      ['b', ['IL-ESA26-0002', 'IL-ESA26-0003']],
      ['a', ['IL-ESA26-0003']],
    ]);
    expect(new Set(groups.flatMap(group => group.jobs.map(job => job.id)))).toEqual(new Set(selected.map(job => job.id)));
  });

  it('shows only pins in the selected province for multi-site offers', () => {
    const selected = getFilteredJobs(jobs, { province: 'ปทุมธานี' }, locations);
    expect(getMapGroups(selected, locations, 'ปทุมธานี').map(group => group.siteId)).toEqual(['a']);
  });

  it('filters browser-local status without putting it into source rows', () => {
    const personal = { 'IL-ESA26-0002': { status: 'applied', note: 'Private' } };
    expect(getFilteredJobs(jobs, { personalStatus: 'applied' }, locations, personal).map(x => x.id)).toEqual(['IL-ESA26-0002']);
    expect(jobs[1]).not.toHaveProperty('status');
    expect(jobs[1]).not.toHaveProperty('note');
  });
});
