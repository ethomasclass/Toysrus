# Toys "R" Us Huntsville #8809 — a walkable 3D recreation, circa 1996

A first-person, browser-based recreation of the Toys "R" Us that stood at 1001 Memorial Parkway NW in Huntsville, Alabama (the west half of the old Loveman's building at The Mall), stocked the way a Toys "R" Us looked in the mid-1990s.

**Run it:** serve the folder and open `index.html` (no build step, no dependencies to install; three.js is vendored).

```
npx http-server -p 8080 .      # then open http://localhost:8080
```

Or open it on GitHub Pages once the repo is published.

**Controls:** click to enter · `W A S D` / arrows walk · `Shift` run · mouse look · `E` or click to inspect what you're looking at · `M` store map · `1`–`9` teleport (Checkout, Action Figures, Games, LEGO, Barbie, Preschool, Bikes, Babies, R Zone) · `Esc` menu. Touch sticks appear on phones.

## What's in the store
- **Exterior**: the tall windowless Loveman's box, star-in-the-R sign high on the wall (as the 2000s photo shows it), rainbow stripe planks and blue fascia around the glass vestibule, ENTRANCE / EXIT ONLY / WELCOME signs, cart corral, pylon sign, Books-A-Million's half with its concrete canopy.
- **Front end**: 9 checkout lanes with candy rails and lane lights, customer service / layaway counter, Geoffrey floor medallion and statue, the blue **video game pickup booth** with its steel stockroom door.
- **R Zone** (back left): glass-fronted; two ticket walls of game box-fronts under clear flaps with slip pouches, locked console cases (SNES, Genesis, N64, PlayStation, Saturn, Game Boy), four demo kiosks, Tiger/Tamagotchi pegs, Nintendo Power rack.
- **Center grid**: 12 gondola runs in two blocks with loaded end-caps and blue "A1…F12" aisle signs: action figures (peg walls), R/C & Hot Wheels, Nerf/Super Soaker, games, LEGO (on blue carpet with a lit display case), crafts, preschool, plush & Beanie Babies, the pink Barbie aisles.
- **Back wall**: Bikes "R" Us with hung Huffys, Big Wheels and Radio Flyers; seasonal pad with Power Wheels, pools and swing sets.
- **Right side**: Little Tikes floor models (Cozy Coupe, Turtle Sandbox, Party Kitchen, Log Cabin), Babies "R" Us corner with diaper pallets, a crib and juvenile racking.
- ~57,000 individually placed products from a 200-item catalog with 1996 prices; look at any of them and press `E`.

## Research
See `research/` for the three write-ups with sources: the Huntsville store history and photo evidence, the corporate 1990s store format (size, floor plan, signage, ticket system), and the department-by-department product list.

## Assumptions to flag
- Floor area and interior layout of the Huntsville store are not on record; the model uses the 46,000 sq ft corporate prototype and the standard department adjacency of the era.
- The exterior mixes the building's documented 2000s state (whitewashed panels, star logo) with the 1990s stripe treatment seen at its mall entrance; the 1990s street-side facade before whitewashing is unconfirmed.
- Product art is procedurally drawn (brand and title text, box colors) rather than scanned packaging.
