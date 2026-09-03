# Reference tray implementation

## Source of truth

`assets/tray-reference.jpg` is the supplied image `1000044743.jpg`. It is the only visual source for the new rectangular tray skin.

## Runtime behavior

- `reference-lacquer` is the default tray skin.
- In tray mode the photo is rendered as a full-bleed product surface with a restrained warm overlay.
- The procedural WebGL container is disabled for this skin, so an approximate octagonal tray cannot cover the reference.
- WebGL still renders the selected die and its roll animation above the photo.
- Other tray skins remain available in the collapsed Skin Studio menus.

## Boundary

This is a faithful visual implementation of the supplied camera view, not a claim that a true 3D mesh has been generated. Mesh generation remains a separate step requiring a working to3D/Meshy job and should replace the photo only after visual comparison at the same viewport.
