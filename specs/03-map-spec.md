# Map Spec

Technology: Mapbox GL JS

Map:
- Style: mapbox://styles/mapbox/streets-v12
- Default center: user geolocation or Madrid fallback
- Zoom: 12 default

Pins:
- Visual encoding (v1):
  - Color by type:
    - need = red
    - offer = green
  - Opacity by status:
    - open / assigned / in_transit = 1.0
    - delivered / resolved = 0.6
    - expired = 0.35
    - flagged = 0.35 (and add an outline stroke if easy)
- Filters (v1):
  - type: need | offer | all (default: all)
  - status: show open-ish only (open, assigned, in_transit) toggle (default: on)
  - include resolved toggle (delivered, resolved) (default: off)
  - include expired/flagged toggle (default: off)

Emergency events:
- Pins may have no assigned emergency (`event_id = null`).
- If an emergency is selected, filter pins by:
  - event pins: `event_id = selectedEventId`
  - optionally include unassigned pins (`event_id = null`) via a toggle (default: off)
- If no emergency is selected, show all pins (subject to status/type filters).

Clustering:
- enabled from start
- cluster radius: 50
- clusterMaxZoom: 14
- Click on cluster: zoom in to expand the cluster.

Data loading:
- via bounding box (current viewport)
- bbox format: `minLng,minLat,maxLng,maxLat`
- Refresh triggers (v1):
  - on initial map load
  - on map move end (not every frame)
- Networking (v1):
  - debounce move-end fetch by 400ms
  - cancel in-flight request when a newer fetch starts
  - show a lightweight loading indicator while fetching
- Empty/error states (v1):
  - if 0 results: show "No pins in this area" (non-blocking)
  - if request fails: show a retry action and keep last successful pins rendered

Interaction:
- click pin → open popup
- popup → detail modal
- From detail modal, allow status change actions based on lifecycle spec (if user has permission).
