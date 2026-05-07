/**
 * Canonical palette — 8 visually distinct colours.
 * Index is stable as long as the sorted vehicle list doesn't change.
 */
export const ROUTE_COLORS = [
  '#2563EB', // blue
  '#16A34A', // green
  '#DC2626', // red
  '#D97706', // amber
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#DB2777', // pink
  '#65A30D', // lime
];

/** Colour for COMMUTE segments — always grey, never vehicle-coloured */
export const COMMUTE_COLOR = '#8e8e93';

/**
 * Build a stable vehicleId → colour map from a schedule array.
 * Colours are assigned by sorted vehicleId order so they never change
 * between Sidebar / Map / Legend.
 *
 * @param {Array} segments - raw schedule segments from the API
 * @returns {Object} { vehicleId: hexColour }
 */
export function buildVehicleColorMap(segments = []) {
  const ids = [
    ...new Set(
      segments
        .filter(s => s.vehicleId && s.vehicleId !== 'COMMUTE')
        .map(s => s.vehicleId)
    ),
  ].sort();

  const map = {};
  ids.forEach((id, i) => {
    map[id] = ROUTE_COLORS[i % ROUTE_COLORS.length];
  });
  return map;
}

/**
 * Convenience: get colour for a single segment.
 * Returns COMMUTE_COLOR for commute segments.
 */
export function getSegmentColor(seg, vehicleColorMap) {
  if (seg.vehicleId === 'COMMUTE') return COMMUTE_COLOR;
  return vehicleColorMap[seg.vehicleId] ?? COMMUTE_COLOR;
}
