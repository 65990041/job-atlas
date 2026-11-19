import { useEffect, useRef } from 'react';
import L from 'leaflet';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function MapView({ groups, selectedSiteId, onSelectSite }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const groupKeyRef = useRef(null);

  useEffect(() => {
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: false }).setView([13.8, 100.7], 7);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(TILE_URL, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 18,
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const bounds = [];
    for (const group of groups) {
      const { site } = group;
      const selected = selectedSiteId === group.siteId;
      const approximate = site.precision === 'province' || site.precision === 'district';
      const marker = L.circleMarker([site.lat, site.lon], {
        radius: Math.min(17, 7 + group.jobs.length * 1.7),
        color: selected ? '#273d31' : '#4d6958',
        weight: selected ? 3 : 2,
        fillColor: approximate ? '#e6ece5' : '#5e7164',
        fillOpacity: selected ? 1 : 0.88,
      });
      marker.bindTooltip(document.createTextNode(`${site.label} · ${group.jobs.length} ตำแหน่ง`));
      marker.on('click', () => onSelectSite(group.siteId));
      marker.addTo(layer);
      bounds.push([site.lat, site.lon]);
    }
    const groupKey = groups.map(group => group.siteId).join('|');
    if (groupKey !== groupKeyRef.current && bounds.length) map.fitBounds(bounds, { padding: [34, 34], maxZoom: 11 });
    groupKeyRef.current = groupKey;
  }, [groups, selectedSiteId, onSelectSite]);

  return <div ref={containerRef} className="map-canvas" aria-label="แผนที่ตำแหน่งงาน" />;
}
