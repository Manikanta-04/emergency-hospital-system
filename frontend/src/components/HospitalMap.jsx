import { useEffect, useRef } from 'react';

export default function HospitalMap({ hospitals, recommendation, userLocation, showRoute }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);
  const ambulanceMarkerRef = useRef(null);
  const blinkIntervalsRef = useRef([]);

  // ✅ Core blink function — polls DOM until element found, then blinks forever
  const startBlinkWhenReady = (elementId, color1, color2, ms = 500) => {
    let attempts = 0;
    const maxAttempts = 20;
    
    const tryBlink = () => {
      const el = document.getElementById(elementId);
      if (el) {
        // Element found — start blinking
        let isOn = true;
        const interval = setInterval(() => {
          const elem = document.getElementById(elementId);
          if (!elem) { clearInterval(interval); return; }
          elem.style.background = isOn ? color1 : color2;
          elem.style.boxShadow = isOn ? `0 0 16px ${color1}, 0 0 30px ${color1}88` : 'none';
          isOn = !isOn;
        }, ms);
        blinkIntervalsRef.current.push(interval);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryBlink, 100); // retry every 100ms
      }
    };
    tryBlink();
  };

  const startRingWhenReady = (elementId, ms = 600) => {
    let attempts = 0;
    const tryBlink = () => {
      const el = document.getElementById(elementId);
      if (el) {
        let isOn = true;
        const interval = setInterval(() => {
          const elem = document.getElementById(elementId);
          if (!elem) { clearInterval(interval); return; }
          if (isOn) {
            elem.style.opacity = '0.7';
            elem.style.transform = 'translate(-50%,-50%) scale(1)';
          } else {
            elem.style.opacity = '0';
            elem.style.transform = 'translate(-50%,-50%) scale(2.2)';
          }
          isOn = !isOn;
        }, ms);
        blinkIntervalsRef.current.push(interval);
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryBlink, 100);
      }
    };
    tryBlink();
  };

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

  useEffect(() => {
    return () => { blinkIntervalsRef.current.forEach(clearInterval); };
  }, []);

  const updateMarkers = (L, map) => {
    blinkIntervalsRef.current.forEach(clearInterval);
    blinkIntervalsRef.current = [];
    markersRef.current.forEach((m) => map.removeLayer(m));
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
          if (cluster.hospitals.length > 1) m.on('click', () => map.setView([cluster.lat, cluster.lng], zoom + 2));
          m.addTo(map); markersRef.current.push(m);
        }
      });
    } else {
      others.forEach(h => {
        const m = makeMarker(L, h);
        if (m) { m.addTo(map); markersRef.current.push(m); }
      });
    }

    // ── Best hospital blinking marker ──────────────────────────────────────
    if (recHospital) {
      const lat = recHospital.location?.coordinates?.[1] || recHospital.coordinates?.lat;
      const lng = recHospital.location?.coordinates?.[0] || recHospital.coordinates?.lng;
      if (lat && lng) {
        const uid = `h${Date.now()}`;
        const dotId = `dot-${uid}`;
        const ring1Id = `r1-${uid}`;
        const ring2Id = `r2-${uid}`;

        const icon = L.divIcon({
          html: `<div style="position:relative;width:44px;height:44px">
            <div id="${ring1Id}" style="position:absolute;top:50%;left:50%;width:44px;height:44px;background:rgba(217,48,37,0.35);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.5s ease;"></div>
            <div id="${ring2Id}" style="position:absolute;top:50%;left:50%;width:28px;height:28px;background:rgba(217,48,37,0.5);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.5s ease;"></div>
            <div id="${dotId}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;background:#d93025;border-radius:50%;border:3px solid white;transition:all 0.5s ease;"></div>
            <div style="position:absolute;top:-26px;left:50%;transform:translateX(-50%);background:#d93025;color:white;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;white-space:nowrap;font-family:sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.25)">⭐ BEST HOSPITAL</div>
          </div>`,
          className: '', iconSize: [44,44], iconAnchor: [22,22], popupAnchor: [0,-26],
        });

        const icuBeds = recHospital.availableBeds?.icu ?? ((recHospital.beds?.icu?.available||0)-(recHospital.beds?.icu?.reserved||0));
        const m = L.marker([lat, lng], { icon }).addTo(map).bindPopup(`
          <div style="font-family:sans-serif;min-width:210px;line-height:1.8;font-size:13px">
            <div style="font-weight:800;color:#d93025;font-size:14px;margin-bottom:4px">⭐ ${recHospital.name||recHospital.hospitalName}</div>
            <div style="color:#666;font-size:11px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px">${recHospital.location?.city||''}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
              <span>🛏 ICU Beds</span><b style="color:#0f9d58">${icuBeds} available</b>
              <span>👨‍⚕️ On Duty</span><span style="font-size:10px">${(recHospital.availableSpecialists||[]).join(', ')||'General'}</span>
              <span>📍 Distance</span><b>${recHospital.distanceKm||recommendation?.distanceKm||'?'} km</b>
              ${recommendation?.etaMinutes?`<span>⏱ ETA</span><b style="color:#f29900">${recommendation.etaMinutes} mins</b>`:''}
            </div>
          </div>`);

        markersRef.current.push(m);
        setTimeout(() => m.openPopup(), 600);

        // Fit bounds
        if (userLocation) {
          map.fitBounds(L.latLngBounds([userLocation.lat, userLocation.lng], [lat, lng]), { padding: [80,80] });
        }

        // ✅ Start blinking — polls until DOM ready
        startBlinkWhenReady(dotId, '#d93025', 'rgba(217,48,37,0.15)', 500);
        startRingWhenReady(ring1Id, 600);
        startRingWhenReady(ring2Id, 600);
      }
    }

    // ── Patient/user location marker ───────────────────────────────────────
    if (userLocation) {
      const uid2 = `p${Date.now()}`;
      const pdotId = `pdot-${uid2}`;
      const pringId = `pring-${uid2}`;

      const icon = hasResults
        ? L.divIcon({
            html: `<div style="position:relative;width:40px;height:40px">
              <div id="${pringId}" style="position:absolute;top:50%;left:50%;width:38px;height:38px;background:rgba(217,48,37,0.3);border-radius:50%;transform:translate(-50%,-50%);transition:all 0.5s ease;"></div>
              <div id="${pdotId}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:16px;background:#d93025;border-radius:50%;border:3px solid white;transition:all 0.5s ease;"></div>
              <div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);background:#d93025;color:white;font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;white-space:nowrap;font-family:sans-serif;">🚨 PATIENT</div>
            </div>`,
            className: '', iconSize: [40,40], iconAnchor: [20,20],
          })
        : L.divIcon({
            html: `<div style="position:relative;width:18px;height:18px">
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:13px;height:13px;background:#4285F4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5);"></div>
            </div>`,
            className: '', iconSize: [18,18], iconAnchor: [9,9],
          });

      const pm = L.marker([userLocation.lat, userLocation.lng], { icon })
        .addTo(map)
        .bindPopup(`<b style="color:#d93025">${hasResults?'🚨 Patient Location':'📍 Your Location'}</b>`);
      markersRef.current.push(pm);

      if (hasResults) {
        startBlinkWhenReady(pdotId, '#d93025', 'rgba(217,48,37,0.15)', 500);
        startRingWhenReady(pringId, 600);
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
    const bg = cluster.hospitals.some(h => (h.beds?.icu?.available||0) > 0) ? '#1a73e8' : '#d93025';
    const size = count > 50 ? 50 : count > 20 ? 42 : count > 10 ? 36 : 30;
    const icon = L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${bg};border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${count>99?10:12}px;font-family:sans-serif;">${count}</div>`,
      className: '', iconSize: [size,size], iconAnchor: [size/2,size/2],
    });
    return L.marker([cluster.lat, cluster.lng], { icon })
      .bindPopup(`<div style="font-family:sans-serif;font-size:12px"><b style="color:${bg}">${count} hospitals</b><br/><span style="color:#888;font-size:10px">Click to zoom in</span></div>`);
  };

  const makeMarker = (L, h) => {
    const lat = h.location?.coordinates?.[1]; const lng = h.location?.coordinates?.[0];
    if (!lat || !lng) return null;
    const icuBeds = (h.beds?.icu?.available||0)-(h.beds?.icu?.reserved||0);
    const isFull = icuBeds <= 0;
    const color = isFull ? '#d93025' : '#1a73e8';
    const size = 24;
    const icon = L.divIcon({
      html: `<div style="width:${size}px;height:${size*1.3}px"><svg width="${size}" height="${size*1.3}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z" fill="${color}"/><circle cx="20" cy="20" r="10" fill="white" opacity="0.9"/><text x="20" y="25" text-anchor="middle" font-size="13" font-weight="bold" fill="${color}">${isFull?'✕':'+'}</text></svg></div>`,
      className: '', iconSize: [size, size*1.3], iconAnchor: [size/2, size*1.3], popupAnchor: [0,-size],
    });
    return L.marker([lat, lng], { icon }).bindPopup(
      `<div style="font-family:sans-serif;font-size:13px;line-height:1.7">
        <b style="color:${color}">${h.name||'Hospital'}</b><br/>
        <span style="color:#888;font-size:11px">${h.location?.city||''}</span><br/>
        🛏 ICU: <b style="color:${isFull?'#d93025':'#0f9d58'}">${icuBeds} ${isFull?'(Full)':'available'}</b>
      </div>`
    );
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
      if (res.ok) { const data = await res.json(); coords = data.routes[0].geometry.coordinates.map(([lng,lat])=>[lat,lng]); }
    } catch {}
    if (!coords.length) coords = [[userLocation.lat,userLocation.lng],[hLat,hLng]];
    L.polyline(coords,{color:'rgba(0,0,0,0.1)',weight:10,lineCap:'round'}).addTo(map);
    const line = L.polyline(coords,{color:'#1a73e8',weight:6,opacity:0.95,lineCap:'round',lineJoin:'round'}).addTo(map);
    routeLayerRef.current = line;
    map.fitBounds(line.getBounds(),{padding:[90,90]});
    const amb = L.marker(coords[0],{icon:L.divIcon({html:`<div style="background:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,0.3);border:2px solid #1a73e8;">🚑</div>`,className:'',iconSize:[36,36],iconAnchor:[18,18]})}).addTo(map);
    ambulanceMarkerRef.current = amb;
    let step = 0;
    const iv = setInterval(()=>{ if(step>=coords.length-1){clearInterval(iv);return;} amb.setLatLng(coords[++step]); },150);
  };

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" />
    </div>
  );
}