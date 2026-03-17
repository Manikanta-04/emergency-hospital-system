import { useEffect, useRef } from 'react';

// Global blink loop
let globalBlinkInterval = null;
let blinkState = true;

function startGlobalBlink() {
  if (globalBlinkInterval) return;
  globalBlinkInterval = setInterval(() => {
    blinkState = !blinkState;
    document.querySelectorAll('.blink-dot').forEach(el => {
      el.style.background = blinkState ? '#d93025' : 'rgba(217,48,37,0.1)';
      el.style.boxShadow = blinkState ? '0 0 18px #d93025, 0 0 32px rgba(217,48,37,0.6)' : 'none';
    });
    document.querySelectorAll('.blink-ring').forEach(el => {
      el.style.opacity = blinkState ? '0.6' : '0';
      el.style.transform = blinkState ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(2.5)';
    });
  }, 500);
}

export default function HospitalMap({ hospitals, recommendation, userLocation, showRoute, ambulanceLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);
  // ✅ Fix: Separate ref for ambulance marker — never mixed with hospital markers
  const ambulanceMarkerRef = useRef(null);
  // ✅ Fix: Store hospital marker separately so it never moves
  const hospitalMarkerRef = useRef(null);

  useEffect(() => {
    startGlobalBlink();
    if (mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const lat = userLocation?.lat || 16.5193;
      const lng = userLocation?.lng || 80.6305;
      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
      updateMarkers(L, map);
      map.on('zoomend', () => import('leaflet').then(L2 => updateMarkers(L2, map)));
    });
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
  }, [userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then(L => updateMarkers(L, mapInstanceRef.current));
  }, [hospitals, recommendation]);

  useEffect(() => {
    if (!showRoute || !recommendation || !userLocation || !mapInstanceRef.current) return;
    import('leaflet').then(L => drawRoute(L, mapInstanceRef.current));
  }, [showRoute]);

  // ✅ Fix 1 & 2 & 3: Update ONLY ambulance marker when ambulanceLocation changes
  // Hospital marker stays fixed — we never touch it here
  useEffect(() => {
    if (!ambulanceLocation || !mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      const { lat, lng } = ambulanceLocation;

      if (ambulanceMarkerRef.current) {
        // ✅ Fix 4: Smooth movement — just update latlng, Leaflet animates it
        ambulanceMarkerRef.current.setLatLng([lat, lng]);
      } else {
        // First time — create ambulance marker at DRIVER location
        const ambIcon = L.divIcon({
          html: `
            <div style="position:relative">
              <div style="
                background:white;border-radius:50%;
                width:40px;height:40px;
                display:flex;align-items:center;justify-content:center;
                font-size:22px;
                box-shadow:0 3px 12px rgba(0,0,0,0.35);
                border:2.5px solid #1a73e8;
              ">🚑</div>
              <div style="
                position:absolute;top:-18px;left:50%;transform:translateX(-50%);
                background:#1a73e8;color:white;
                font-size:8px;font-weight:800;
                padding:2px 6px;border-radius:8px;
                white-space:nowrap;font-family:sans-serif;
              ">● LIVE</div>
            </div>`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        // ✅ Fix 1: Place at driver's GPS location (lat/lng from socket)
        ambulanceMarkerRef.current = L.marker([lat, lng], { icon: ambIcon })
          .addTo(map)
          .bindPopup(`<b style="color:#1a73e8">🚑 Live Ambulance</b><br/><span style="font-size:11px;color:#666">Speed: ${ambulanceLocation.speed || 0} km/h</span>`);
      }
    });
  }, [ambulanceLocation]);

  // Clean up ambulance marker when tracking stops
  useEffect(() => {
    if (ambulanceLocation === null && ambulanceMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(ambulanceMarkerRef.current);
      ambulanceMarkerRef.current = null;
    }
  }, [ambulanceLocation]);

  const updateMarkers = (L, map) => {
    // Clear only hospital markers — NOT the ambulance marker
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (!hospitals?.length) return;

    const zoom = map.getZoom();
    const recId = recommendation?.hospitalId;
    const recHospital = hospitals.find(h => recId === h._id || recId === h.hospitalId);
    const others = hospitals.filter(h => recId !== h._id && recId !== h.hospitalId);
    const hasResults = !!(hospitals.length > 0 && recommendation);

    // Cluster others
    if (zoom < 14) {
      const radiusKm = zoom < 11 ? 8 : zoom < 12 ? 4 : zoom < 13 ? 2 : 1;
      clusterHospitals(others, radiusKm).forEach(cluster => {
        const m = cluster.hospitals.length === 1
          ? makeMarker(L, cluster.hospitals[0])
          : makeCluster(L, cluster);
        if (m) {
          if (cluster.hospitals.length > 1)
            m.on('click', () => map.setView([cluster.lat, cluster.lng], zoom + 2));
          m.addTo(map);
          markersRef.current.push(m);
        }
      });
    } else {
      others.forEach(h => {
        const m = makeMarker(L, h);
        if (m) { m.addTo(map); markersRef.current.push(m); }
      });
    }

    // ✅ Fix 5: Best hospital marker — FIXED position, never moves
    if (recHospital) {
      const lat = recHospital.location?.coordinates?.[1] || recHospital.coordinates?.lat;
      const lng = recHospital.location?.coordinates?.[0] || recHospital.coordinates?.lng;
      if (lat && lng) {
        const icuBeds = recHospital.availableBeds?.icu ??
          ((recHospital.beds?.icu?.available || 0) - (recHospital.beds?.icu?.reserved || 0));

        const icon = L.divIcon({
          html: `
            <div style="position:relative;width:48px;height:48px">
              <div class="blink-ring" style="position:absolute;top:50%;left:50%;width:48px;height:48px;background:rgba(217,48,37,0.35);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.45s ease;"></div>
              <div class="blink-ring" style="position:absolute;top:50%;left:50%;width:32px;height:32px;background:rgba(217,48,37,0.5);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.45s ease;"></div>
              <div class="blink-dot" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:#d93025;border-radius:50%;border:3px solid white;transition:all 0.45s ease;"></div>
              <div style="position:absolute;top:-26px;left:50%;transform:translateX(-50%);background:#d93025;color:white;font-size:9px;font-weight:800;padding:2px 9px;border-radius:10px;white-space:nowrap;font-family:sans-serif;">⭐ BEST HOSPITAL</div>
            </div>`,
          className: '', iconSize: [48, 48], iconAnchor: [24, 24], popupAnchor: [0, -28],
        });

        // ✅ Store hospital marker in separate ref
        if (hospitalMarkerRef.current) map.removeLayer(hospitalMarkerRef.current);
        hospitalMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map).bindPopup(`
          <div style="font-family:sans-serif;min-width:210px;line-height:1.8;font-size:13px">
            <div style="font-weight:800;color:#d93025;font-size:14px;margin-bottom:4px">
              ⭐ ${recHospital.name || recHospital.hospitalName}
            </div>
            <div style="color:#666;font-size:11px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px">
              ${recHospital.location?.city || ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
              <span>🛏 ICU Beds</span><b style="color:#0f9d58">${icuBeds} available</b>
              <span>👨‍⚕️ On Duty</span><span style="font-size:10px">${(recHospital.availableSpecialists || []).join(', ') || 'General'}</span>
              <span>📍 Distance</span><b>${recHospital.distanceKm || recommendation?.distanceKm || '?'} km</b>
              ${recommendation?.etaMinutes ? `<span>⏱ ETA</span><b style="color:#f29900">${recommendation.etaMinutes} mins</b>` : ''}
            </div>
          </div>`);

        // Fit both patient + hospital in view
        if (userLocation) {
          map.fitBounds(
            L.latLngBounds([userLocation.lat, userLocation.lng], [lat, lng]),
            { padding: [80, 80] }
          );
        }
        setTimeout(() => hospitalMarkerRef.current?.openPopup(), 700);
      }
    }

    // Patient location marker
    if (userLocation) {
      const icon = hasResults
        ? L.divIcon({
            html: `
              <div style="position:relative;width:40px;height:40px">
                <div class="blink-ring" style="position:absolute;top:50%;left:50%;width:40px;height:40px;background:rgba(217,48,37,0.3);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.45s ease;"></div>
                <div class="blink-dot" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:16px;background:#d93025;border-radius:50%;border:3px solid white;transition:all 0.45s ease;"></div>
                <div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);background:#d93025;color:white;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;white-space:nowrap;font-family:sans-serif;">🚨 PATIENT</div>
              </div>`,
            className: '', iconSize: [40, 40], iconAnchor: [20, 20],
          })
        : L.divIcon({
            html: `<div style="position:relative;width:18px;height:18px"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:13px;height:13px;background:#4285F4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5);"></div></div>`,
            className: '', iconSize: [18, 18], iconAnchor: [9, 9],
          });

      const pm = L.marker([userLocation.lat, userLocation.lng], { icon })
        .addTo(map)
        .bindPopup(`<b style="color:#d93025">${hasResults ? '🚨 Patient Location' : '📍 Your Location'}</b>`);
      markersRef.current.push(pm);
    }
  };

  const clusterHospitals = (list, radiusKm) => {
    const visited = new Set(); const clusters = [];
    list.forEach((h, i) => {
      if (visited.has(i)) return;
      const lat1 = h.location?.coordinates?.[1]; const lng1 = h.location?.coordinates?.[0];
      if (!lat1 || !lng1) return;
      const group = [h]; visited.add(i);
      list.forEach((h2, j) => {
        if (visited.has(j)) return;
        const lat2 = h2.location?.coordinates?.[1]; const lng2 = h2.location?.coordinates?.[0];
        if (!lat2 || !lng2) return;
        const dist = Math.sqrt(Math.pow((lat1 - lat2) * 111, 2) + Math.pow((lng1 - lng2) * 111 * Math.cos(lat1 * Math.PI / 180), 2));
        if (dist < radiusKm) { group.push(h2); visited.add(j); }
      });
      const avgLat = group.reduce((s, h) => s + (h.location?.coordinates?.[1] || 0), 0) / group.length;
      const avgLng = group.reduce((s, h) => s + (h.location?.coordinates?.[0] || 0), 0) / group.length;
      clusters.push({ hospitals: group, lat: avgLat, lng: avgLng });
    });
    return clusters;
  };

  const makeCluster = (L, cluster) => {
    const count = cluster.hospitals.length;
    const bg = cluster.hospitals.some(h => (h.beds?.icu?.available || 0) > 0) ? '#1a73e8' : '#d93025';
    const size = count > 50 ? 50 : count > 20 ? 42 : count > 10 ? 36 : 30;
    const icon = L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${bg};border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${count > 99 ? 10 : 12}px;font-family:sans-serif;">${count}</div>`,
      className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    });
    return L.marker([cluster.lat, cluster.lng], { icon })
      .bindPopup(`<div style="font-family:sans-serif;font-size:12px"><b style="color:${bg}">${count} hospitals</b><br/><span style="color:#888;font-size:10px">Click to zoom in</span></div>`);
  };

  const makeMarker = (L, h) => {
    const lat = h.location?.coordinates?.[1]; const lng = h.location?.coordinates?.[0];
    if (!lat || !lng) return null;
    const icuBeds = (h.beds?.icu?.available || 0) - (h.beds?.icu?.reserved || 0);
    const isFull = icuBeds <= 0;
    const color = isFull ? '#d93025' : '#1a73e8';
    const size = 24;
    const icon = L.divIcon({
      html: `<div style="width:${size}px;height:${size * 1.3}px"><svg width="${size}" height="${size * 1.3}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z" fill="${color}"/><circle cx="20" cy="20" r="10" fill="white" opacity="0.9"/><text x="20" y="25" text-anchor="middle" font-size="13" font-weight="bold" fill="${color}">${isFull ? '✕' : '+'}</text></svg></div>`,
      className: '', iconSize: [size, size * 1.3], iconAnchor: [size / 2, size * 1.3], popupAnchor: [0, -size],
    });
    return L.marker([lat, lng], { icon }).bindPopup(
      `<div style="font-family:sans-serif;font-size:13px;line-height:1.7"><b style="color:${color}">${h.name || 'Hospital'}</b><br/><span style="color:#888;font-size:11px">${h.location?.city || ''}</span><br/>🛏 ICU: <b style="color:${isFull ? '#d93025' : '#0f9d58'}">${icuBeds} ${isFull ? '(Full)' : 'available'}</b></div>`
    );
  };

  const drawRoute = async (L, map) => {
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);

    const hLat = recommendation.coordinates?.lat;
    const hLng = recommendation.coordinates?.lng;
    if (!hLat || !hLng) return;

    let coords = [];
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${hLng},${hLat}?overview=full&geometries=geojson`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      }
    } catch {}

    if (!coords.length) coords = [[userLocation.lat, userLocation.lng], [hLat, hLng]];

    // Draw route line only — no animated ambulance here
    // ✅ Fix: Ambulance is now controlled by Socket.io location, not route animation
    L.polyline(coords, { color: 'rgba(0,0,0,0.1)', weight: 10, lineCap: 'round' }).addTo(map);
    const line = L.polyline(coords, {
      color: '#1a73e8', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round'
    }).addTo(map);
    routeLayerRef.current = line;
    map.fitBounds(line.getBounds(), { padding: [90, 90] });

    // ✅ Fix: Place ambulance at PATIENT location initially (source)
    // It will move to driver's real GPS once they scan QR
    if (!ambulanceMarkerRef.current && userLocation) {
      const ambIcon = L.divIcon({
        html: `
          <div style="position:relative">
            <div style="background:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 3px 12px rgba(0,0,0,0.35);border:2.5px solid #1a73e8;">🚑</div>
            <div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:#1a73e8;color:white;font-size:8px;font-weight:800;padding:2px 6px;border-radius:8px;white-space:nowrap;font-family:sans-serif;">WAITING</div>
          </div>`,
        className: '', iconSize: [40, 40], iconAnchor: [20, 20],
      });
      ambulanceMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: ambIcon })
        .addTo(map)
        .bindPopup('<b style="color:#1a73e8">🚑 Ambulance (scan QR to track live)</b>');
    }
  };

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" />
    </div>
  );
}
