import { useEffect, useRef } from 'react';

export default function HospitalMap({ hospitals, recommendation, userLocation, showRoute }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);
  const ambulanceMarkerRef = useRef(null);
  const blinkIntervalsRef = useRef([]); // ✅ Track all blink intervals

  useEffect(() => {
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
      map.on('zoomend', () => import('leaflet').then((L2) => updateMarkers(L2, map)));
    });
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
  }, [userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => updateMarkers(L, mapInstanceRef.current));
  }, [hospitals, recommendation]);

  useEffect(() => {
    if (!showRoute || !recommendation || !userLocation || !mapInstanceRef.current) return;
    import('leaflet').then((L) => drawRoute(L, mapInstanceRef.current));
  }, [showRoute]);

  // ✅ Clear all blink intervals when component unmounts
  useEffect(() => {
    return () => {
      blinkIntervalsRef.current.forEach(clearInterval);
    };
  }, []);

  // ✅ JavaScript-based blinking — reliable, never stops
  const startBlinking = (elementId, onColor, offColor, intervalMs = 500) => {
    let isOn = true;
    const interval = setInterval(() => {
      const el = document.getElementById(elementId);
      if (!el) { clearInterval(interval); return; }
      el.style.background = isOn ? onColor : offColor;
      el.style.boxShadow = isOn ? `0 0 14px ${onColor}` : 'none';
      isOn = !isOn;
    }, intervalMs);
    blinkIntervalsRef.current.push(interval);
    return interval;
  };

  const startRingBlink = (elementId, intervalMs = 500) => {
    let isOn = true;
    const interval = setInterval(() => {
      const el = document.getElementById(elementId);
      if (!el) { clearInterval(interval); return; }
      el.style.opacity = isOn ? '0.6' : '0';
      el.style.transform = isOn ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(2)';
      isOn = !isOn;
    }, intervalMs);
    blinkIntervalsRef.current.push(interval);
    return interval;
  };

  const updateMarkers = (L, map) => {
    // Clear all previous blink intervals
    blinkIntervalsRef.current.forEach(clearInterval);
    blinkIntervalsRef.current = [];

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (!hospitals?.length) return;

    const zoom = map.getZoom();
    const recId = recommendation?.hospitalId;
    const recHospital = hospitals.find(h => recId === h._id || recId === h.hospitalId);
    const others = hospitals.filter(h => recId !== h._id && recId !== h.hospitalId);
    const hasResults = hospitals.length > 0 && recommendation;

    // Cluster non-recommended
    if (zoom < 14) {
      const radiusKm = zoom < 11 ? 8 : zoom < 12 ? 4 : zoom < 13 ? 2 : 1;
      const clusters = clusterHospitals(others, radiusKm);
      clusters.forEach(cluster => {
        const m = cluster.hospitals.length === 1
          ? makeMarker(L, cluster.hospitals[0], false)
          : makeCluster(L, cluster);
        if (m) {
          if (cluster.hospitals.length > 1) m.on('click', () => map.setView([cluster.lat, cluster.lng], zoom + 2));
          m.addTo(map); markersRef.current.push(m);
        }
      });
    } else {
      others.forEach(h => {
        const m = makeMarker(L, h, false);
        if (m) { m.addTo(map); markersRef.current.push(m); }
      });
    }

    // ✅ Best hospital marker with JS blinking
    if (recHospital) {
      const recId2 = `rec-dot-${Date.now()}`;
      const recRing1 = `rec-ring1-${Date.now()}`;
      const recRing2 = `rec-ring2-${Date.now()}`;

      const recLat = recHospital.location?.coordinates?.[1] || recHospital.coordinates?.lat;
      const recLng = recHospital.location?.coordinates?.[0] || recHospital.coordinates?.lng;
      if (recLat && recLng) {
        const icuBeds = recHospital.availableBeds?.icu ?? ((recHospital.beds?.icu?.available||0)-(recHospital.beds?.icu?.reserved||0));
        const etaMin = recommendation?.etaMinutes;

        const icon = L.divIcon({
          html: `
            <div style="position:relative;width:44px;height:44px">
              <div id="${recRing1}" style="position:absolute;top:50%;left:50%;width:44px;height:44px;background:rgba(220,48,37,0.3);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.4s;"></div>
              <div id="${recRing2}" style="position:absolute;top:50%;left:50%;width:30px;height:30px;background:rgba(220,48,37,0.4);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.4s;"></div>
              <div id="${recId2}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:#d93025;border-radius:50%;border:3px solid white;box-shadow:0 0 14px rgba(220,48,37,0.9);transition:all 0.4s;"></div>
              <div style="position:absolute;top:-26px;left:50%;transform:translateX(-50%);background:#d93025;color:white;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;white-space:nowrap;font-family:sans-serif;">⭐ BEST HOSPITAL</div>
            </div>`,
          className: '', iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -26],
        });

        const marker = L.marker([recLat, recLng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:210px;line-height:1.7;font-size:13px">
              <div style="font-weight:700;color:#d93025;font-size:14px;margin-bottom:3px">⭐ ${recHospital.name||recHospital.hospitalName||'Hospital'}</div>
              <div style="color:#666;font-size:11px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px">${recHospital.location?.address||recHospital.location?.city||''}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
                <div>🛏 ICU Beds</div><div><b style="color:#0f9d58">${icuBeds} available</b></div>
                <div>👨‍⚕️ Specialists</div><div style="font-size:10px">${(recHospital.availableSpecialists||[]).join(', ')||'General'}</div>
                <div>📍 Distance</div><div><b>${recHospital.distanceKm||recommendation?.distanceKm||'?'} km</b></div>
                ${etaMin?`<div>⏱ ETA</div><div><b style="color:#f29900">${etaMin} mins</b></div>`:''}
              </div>
            </div>
          `);

        markersRef.current.push(marker);

        // ✅ Start JS blinking AFTER marker is added to DOM
        setTimeout(() => {
          startBlinking(recId2, '#d93025', 'rgba(220,48,37,0.1)', 500);
          startRingBlink(recRing1, 600);
          startRingBlink(recRing2, 600);
        }, 300);

        map.fitBounds(
          userLocation
            ? L.latLngBounds([userLocation.lat, userLocation.lng], [recLat, recLng])
            : [[recLat, recLng], [recLat, recLng]],
          { padding: [80, 80] }
        );
        setTimeout(() => marker.openPopup(), 800);
      }
    }

    // ✅ Patient location with JS blinking
    if (userLocation) {
      const patientId = `patient-dot-${Date.now()}`;
      const patientRing = `patient-ring-${Date.now()}`;

      const icon = hasResults
        ? L.divIcon({
            html: `
              <div style="position:relative;width:40px;height:40px">
                <div id="${patientRing}" style="position:absolute;top:50%;left:50%;width:38px;height:38px;background:rgba(220,48,37,0.3);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.4s;"></div>
                <div id="${patientId}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:16px;background:#d93025;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(220,48,37,0.8);transition:all 0.4s;"></div>
                <div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);background:#d93025;color:white;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;white-space:nowrap;font-family:sans-serif;">🚨 PATIENT</div>
              </div>`,
            className: '', iconSize: [40, 40], iconAnchor: [20, 20],
          })
        : L.divIcon({
            html: `
              <div style="position:relative;width:22px;height:22px">
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:13px;height:13px;background:#4285F4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5);"></div>
              </div>`,
            className: '', iconSize: [22, 22], iconAnchor: [11, 11],
          });

      const patientMarker = L.marker([userLocation.lat, userLocation.lng], { icon })
        .addTo(map)
        .bindPopup(`<b style="color:#d93025">${hasResults ? '🚨 Patient Location' : '📍 Your Location'}</b>`);
      markersRef.current.push(patientMarker);

      // ✅ Start JS blinking for patient
      if (hasResults) {
        setTimeout(() => {
          startBlinking(patientId, '#d93025', 'rgba(220,48,37,0.1)', 500);
          startRingBlink(patientRing, 600);
        }, 300);
      }
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
        const dist = Math.sqrt(Math.pow((lat1-lat2)*111,2)+Math.pow((lng1-lng2)*111*Math.cos(lat1*Math.PI/180),2));
        if (dist < radiusKm) { group.push(h2); visited.add(j); }
      });
      const avgLat = group.reduce((s,h)=>s+(h.location?.coordinates?.[1]||0),0)/group.length;
      const avgLng = group.reduce((s,h)=>s+(h.location?.coordinates?.[0]||0),0)/group.length;
      clusters.push({ hospitals: group, lat: avgLat, lng: avgLng });
    });
    return clusters;
  };

  const makeCluster = (L, cluster) => {
    const count = cluster.hospitals.length;
    const hasAvail = cluster.hospitals.some(h => (h.beds?.icu?.available||0) > 0);
    const bg = hasAvail ? '#1a73e8' : '#d93025';
    const size = count > 50 ? 50 : count > 20 ? 42 : count > 10 ? 36 : 30;
    const icon = L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${bg};border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${count>99?10:count>9?12:14}px;font-family:sans-serif;">${count}</div>`,
      className: '', iconSize: [size,size], iconAnchor: [size/2,size/2],
    });
    const names = cluster.hospitals.slice(0,4).map(h=>h.name||'Hospital').join('<br/>• ');
    return L.marker([cluster.lat, cluster.lng], { icon })
      .bindPopup(`<div style="font-family:sans-serif;font-size:12px;line-height:1.6"><b style="color:${bg}">${count} hospitals here</b><br/><span style="color:#888;font-size:10px">Click to zoom in</span><br/><br/>• ${names}${cluster.hospitals.length>4?`<br/><span style="color:#aaa">+${cluster.hospitals.length-4} more</span>`:''}</div>`);
  };

  const makeMarker = (L, h, isRec, rec) => {
    const lat = h.location?.coordinates?.[1] || h.coordinates?.lat;
    const lng = h.location?.coordinates?.[0] || h.coordinates?.lng;
    if (!lat || !lng) return null;
    const icuBeds = h.availableBeds?.icu ?? ((h.beds?.icu?.available||0)-(h.beds?.icu?.reserved||0));
    const isFull = icuBeds <= 0;
    const etaMin = rec?.etaMinutes || h.etaMinutes;
    const pinColor = isFull ? '#d93025' : '#1a73e8';
    const size = 26;
    const icon = L.divIcon({
      html: `<div style="width:${size}px;height:${size*1.3}px"><svg width="${size}" height="${size*1.3}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z" fill="${pinColor}"/><circle cx="20" cy="20" r="10" fill="white" opacity="0.9"/><text x="20" y="25" text-anchor="middle" font-size="13" font-weight="bold" fill="${pinColor}">${isFull?'✕':'+'}</text></svg></div>`,
      className: '', iconSize: [size, size*1.3], iconAnchor: [size/2, size*1.3], popupAnchor: [0, -size*1.3],
    });
    return L.marker([lat, lng], { icon }).bindPopup(`
      <div style="font-family:sans-serif;min-width:200px;line-height:1.7;font-size:13px">
        <div style="font-weight:700;color:${pinColor};font-size:14px;margin-bottom:3px">${h.name||h.hospitalName||'Hospital'}</div>
        <div style="color:#666;font-size:11px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px">${h.location?.address||h.location?.city||''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
          <div>🛏 ICU</div><div><b style="color:${isFull?'#d93025':'#0f9d58'}">${icuBeds} ${isFull?'(Full)':'available'}</b></div>
          <div>📍 Distance</div><div><b>${h.distanceKm||'?'} km</b></div>
          ${etaMin?`<div>⏱ ETA</div><div><b style="color:#f29900">${etaMin} mins</b></div>`:''}
        </div>
      </div>`);
  };

  const drawRoute = async (L, map) => {
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    if (ambulanceMarkerRef.current) map.removeLayer(ambulanceMarkerRef.current);
    const hLat = recommendation.coordinates?.lat;
    const hLng = recommendation.coordinates?.lng;
    if (!hLat || !hLng) return;
    let coords = [];
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${hLng},${hLat}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(6000) });
      if (res.ok) { const data = await res.json(); coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]); }
    } catch {}
    if (!coords.length) coords = [[userLocation.lat, userLocation.lng], [hLat, hLng]];
    L.polyline(coords, { color: 'rgba(0,0,0,0.1)', weight: 10, lineCap: 'round' }).addTo(map);
    const line = L.polyline(coords, { color: '#1a73e8', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    routeLayerRef.current = line;
    map.fitBounds(line.getBounds(), { padding: [90, 90] });
    const ambIcon = L.divIcon({
      html: `<div style="background:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,0.3);border:2px solid #1a73e8;">🚑</div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    });
    const amb = L.marker(coords[0], { icon: ambIcon }).addTo(map);
    ambulanceMarkerRef.current = amb;
    let step = 0;
    const interval = setInterval(() => {
      if (step >= coords.length - 1) { clearInterval(interval); return; }
      amb.setLatLng(coords[++step]);
    }, 150);
  };

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" />
    </div>
  );
}
