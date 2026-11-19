const normalizeSearch = value => String(value || '').normalize('NFKC').toLocaleLowerCase();

export function getFilteredJobs(jobs, filters = {}, locations = { sites: {}, offerSites: {} }, personal = {}) {
  const query = normalizeSearch((filters.query || '').trim());
  return jobs.filter(job => {
    if (query && ![job.id, job.company, job.title, job.locationText].some(value => normalizeSearch(value).includes(query))) return false;
    if (filters.applicationType && filters.applicationType !== 'all' && job.applicationType !== filters.applicationType) return false;
    if (filters.major && filters.major !== 'all' && !job.majorText.includes(filters.major)) return false;
    if (filters.minSalary && filters.minSalary !== 'all' && (job.salaryBase == null || job.salaryBase < Number(filters.minSalary))) return false;
    if (filters.personalStatus && filters.personalStatus !== 'all' && (personal[job.id]?.status || 'none') !== filters.personalStatus) return false;
    if (filters.province && filters.province !== 'all') {
      const siteIds = locations.offerSites[job.id] || [];
      if (!siteIds.some(id => locations.sites[id]?.province === filters.province)) return false;
    }
    return true;
  });
}

export function getMapGroups(jobs, locations, province = 'all') {
  const groups = new Map();
  for (const job of jobs) {
    for (const siteId of locations.offerSites[job.id] || []) {
      const site = locations.sites[siteId];
      if (!site || (province !== 'all' && site.province !== province) || !Number.isFinite(site.lat) || !Number.isFinite(site.lon)) continue;
      if (!groups.has(siteId)) groups.set(siteId, { siteId, site, jobs: [] });
      groups.get(siteId).jobs.push(job);
    }
  }
  return [...groups.values()];
}
