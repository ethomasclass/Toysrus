// All units are meters. 1 ft = 0.3048 m.
export const FT = 0.3048;

// Huntsville store #8809 occupied the west half of the 1966 Loveman's department-store anchor at
// The Mall (1001 Memorial Pkwy NW, at University Dr). Its floor area is not on record; the corporate
// prototype of the era was 46,000 sq ft (SEC 10-K FY1995), and half of Loveman's lands in the same
// range, so the model uses a 230' x 200' box. Loveman's was framed for a never-built second floor,
// so the shell is unusually tall; the sales floor sits under a 14' lay-in ceiling with the high roof above.
export const STORE = {
  width: 230 * FT,     // x  (left-right when facing the parking-lot entrance)
  depth: 200 * FT,     // z  (front = +z parking lot, back = -z)
  ceiling: 14 * FT,    // drop ceiling height over the sales floor
  roof: 34 * FT,       // exterior parapet height of the Loveman's box
  wallThick: 0.4,
};

// 1986-2007 wordmark letter colors (per Caldor Rainbow / Store Closings wiki, checked against the
// 1998 photo of the Huntsville mall entrance: red T, orange O, yellow Y, red-pink S, outlined red R, green U, blue S).
export const LOGO_LETTERS = [
  ['T', '#e4322b'], ['O', '#f58220'], ['Y', '#ffd200'], ['S', '#ea3d5b'],
  ['R', '#e4322b', true], ['U', '#2fa84f'], ['S', '#1d4f9e'],
];
// Vertical stripe planks on the facade panel (order seen in the 1998 mall-entrance photo).
export const STRIPES = ['#f58220', '#2fa84f', '#1f4fbf', '#ffd200', '#e4322b'];
export const RAINBOW = ['#e4322b', '#f58220', '#ffd200', '#2fa84f', '#1f4fbf', '#7f3f98'];

export const COLORS = {
  blue: '#1f4fbf',         // royal blue used on counters, header panels, wall band
  yellow: '#ffd200',
  red: '#e4322b',
  green: '#2fa84f',
  orange: '#f58220',
  wall: '#f2f0ea',         // white painted block walls
  wallBand: '#1f4fbf',
  exteriorWall: '#cfe3df', // "aquamarine brick" of the Loveman's box, pale in daylight
  exteriorJoint: '#a9c2bd',
  gondola: '#e6e1d6',      // beige enamel steel shelving
  gondolaBase: '#6f6f6f',
  priceChannel: '#f58220',
  floorTile: '#e9e7e1',
  floorTile2: '#dedbd3',
  ceiling: '#f4f4f2',
  carpet: '#2745a8',       // LEGO area carpet
  mallTile: '#7a3b2e',     // The Mall's brick-red quarry tile
  mallSlat: '#8a5a3a',     // copper-tinted slat ceiling
};

export const PLAYER = { eye: 1.65, radius: 0.35, walk: 3.4, run: 6.5 };
