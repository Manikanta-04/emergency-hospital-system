import { useEffect, useRef } from 'react';

export default function HospitalMap({ hospitals, recommendation, userLocation, showRoute }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);
  const ambulanceMarkerRef = useRef(null);

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

  const updateMarkers = (L, map) => {
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (!hospitals?.length) return;

    const zoom = map.getZoom();
    const recId = recommendation?.hospitalId;
    const recHospital = hospitals.find(h => recId === h._id || recId === h.hospitalId);
    const others = hospitals.filter(h => recId !== h._id && recId !== h.hospitalId);

    // Cluster non-recommended hospitals
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

    // ✅ Best hospital — blinking red
    if (recHospital) {
      const m = makeMarker(L, recHospital, true, recommendation);
      if (m) {
        m.addTo(map); markersRef.current.push(m);
        const lat = recHospital.location?.coordinates?.[1] || recHospital.coordinates?.lat;
        const lng = recHospital.location?.coordinates?.[0] || recHospital.coordinates?.lng;
        if (lat && lng) {
          // Fit map to show BOTH patient and hospital
          if (userLocation) {
            const bounds = L.latLngBounds(
              [userLocation.lat, userLocation.lng],
              [lat, lng]
            );
            map.fitBounds(bounds, { padding: [80, 80] });
          } else {
            map.setView([lat, lng], Math.max(zoom, 14));
          }
          setTimeout(() => m.openPopup(), 600);
        }
      }
    }

    // ✅ Patient location — blinking red dot
    if (userLocation) {
      const isResultsView = hospitals.length > 0 && recommendation;

      const icon = L.divIcon({
        html: isResultsView ? `
          <!-- Blinking red patient location -->
          <div style="position:relative;width:36px;height:36px">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;background:rgba(220,48,37,0.2);border-radius:50%;animation:blink-ring 1s infinite 0.3s"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;background:rgba(220,48,37,0.4);border-radius:50%;animation:blink-ring 1s infinite 0.15s"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#d93025;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(220,48,37,0.6);animation:blink-dot 1s infinite"></div>
            <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#d93025;color:white;font-size:8px;font-weight:800;padding:2px 6px;border-radius:8px;white-space:nowrap;font-family:sans-serif">🚨 PATIENT</div>
          </div>
        ` : `
          <!-- Normal blue dot before search -->
          <div style="position:relative;width:22px;height:22px">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;background:rgba(66,133,244,0.25);border-radius:50%;animation:ripple 1.8s infinite"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:13px;height:13px;background:#4285F4;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5)"></div>
          </div>
        `,
        className: '',
        iconSize: isResultsView ? [36, 36] : [22, 22],
        iconAnchor: isResultsView ? [18, 18] : [11, 11],
      });

      markersRef.current.push(
        L.marker([userLocation.lat, userLocation.lng], { icon }).addTo(map)
          .bindPopup(`<b style="color:#d93025;font-size:13px">${isResultsView ? '🚨 Patient Location' : '📍 Your Location'}</b>`)
      );
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
      html: `<div style="width:${size}px;height:${size}px;background:${bg};border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${count>99?10:count>9?12:14}px;font-family:sans-serif;cursor:pointer">${count}</div>`,
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

    let markerHtml;
    if (isRec) {
      // ✅ Best hospital — big blinking red marker
      markerHtml = `
        <div style="position:relative;width:44px;height:44px">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;background:rgba(220,48,37,0.2);border-radius:50%;animation:blink-ring 1s infinite 0.3s"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:30px;height:30px;background:rgba(220,48,37,0.4);border-radius:50%;animation:blink-ring 1s infinite 0.15s"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:#d93025;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(220,48,37,0.8);animation:blink-dot 1s infinite"></div>
          <div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#d93025;color:white;font-size:8px;font-weight:800;padding:2px 7px;border-radius:10px;white-space:nowrap;font-family:sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.2)">⭐ BEST HOSPITAL</div>
        </div>`;
    } else {
      const pinColor = isFull ? '#d93025' : '#1a73e8';
      const size = 26;
      markerHtml = `
        <div style="width:${size}px;height:${size*1.3}px">
          <svg width="${size}" height="${size*1.3}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z" fill="${pinColor}"/>
            <circle cx="20" cy="20" r="10" fill="white" opacity="0.9"/>
            <text x="20" y="25" text-anchor="middle" font-size="13" font-weight="bold" fill="${pinColor}">${isFull ? '✕' : '+'}</text>
          </svg>
        </div>`;
    }

    const icon = L.divIcon({
      html: markerHtml,
      className: '',
      iconSize: isRec ? [44, 44] : [26, 34],
      iconAnchor: isRec ? [22, 22] : [13, 34],
      popupAnchor: isRec ? [0, -26] : [0, -34],
    });

    const pinColor = isRec ? '#d93025' : isFull ? '#d93025' : '#1a73e8';
    return L.marker([lat, lng], { icon }).bindPopup(`
      <div style="font-family:sans-serif;min-width:210px;line-height:1.7;font-size:13px">
        <div style="font-weight:700;color:${pinColor};font-size:14px;margin-bottom:3px">${isRec ? '⭐ ' : ''}${h.name||h.hospitalName||'Hospital'}</div>
        <div style="color:#666;font-size:11px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px">${h.location?.address||h.address||''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
          <div>🛏 ICU Beds</div><div><b style="color:${isFull?'#d93025':'#0f9d58'}">${icuBeds} ${isFull?'(Full)':'available'}</b></div>
          <div>👨‍⚕️ Specialists</div><div style="font-size:10px">${(h.availableSpecialists||[]).join(', ')||'General'}</div>
          <div>📍 Distance</div><div><b>${h.distanceKm||'?'} km</b></div>
          ${etaMin?`<div>⏱ ETA</div><div><b style="color:#f29900">${etaMin} mins</b></div>`:''}
        </div>
      </div>
    `);
  };

  const drawRoute = async (L, map) => {
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    if (ambulanceMarkerRef.current) map.removeLayer(ambulanceMarkerRef.current);

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

    L.polyline(coords, { color: 'rgba(0,0,0,0.1)', weight: 10, lineCap: 'round' }).addTo(map);
    const line = L.polyline(coords, { color: '#1a73e8', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    routeLayerRef.current = line;
    map.fitBounds(line.getBounds(), { padding: [90, 90] });

    const ambIcon = L.divIcon({
      html: `<div style="background:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,0.3);border:2px solid #1a73e8">🚑</div>`,
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
      <style>{`
        @keyframes blink-dot {
          0%,100% { opacity:1; }
          50% { opacity:0.2; }
        }
        @keyframes blink-ring {
          0%,100% { opacity:0.5; transform:translate(-50%,-50%) scale(1); }
          50% { opacity:0; transform:translate(-50%,-50%) scale(1.6); }
        }
        @keyframes ripple {
          0% { transform:translate(-50%,-50%) scale(1); opacity:0.5; }
          100% { transform:translate(-50%,-50%) scale(3); opacity:0; }
        }
        .leaflet-popup-content-wrapper { border-radius:12px!important; box-shadow:0 4px 20px rgba(0,0,0,0.15)!important; }
        .leaflet-popup-content { margin:12px 16px!important; }
      `}</style>
      <div ref={mapRef} className="map-container" />
    </div>
  );
}
