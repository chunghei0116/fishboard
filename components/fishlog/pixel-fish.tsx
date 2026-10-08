import type { CSSProperties } from "react";
import type { Species } from "@/data/types";
export default function PixelFish({
  species,
  className = "",
}: {
  species: Species;
  className?: string;
}) {
  const transform = `scale(${species.pixelFacing === "right" ? -1 : 1}, ${species.pixelInverted ? -1 : 1})`;
  if (species.sprite !== undefined)
    return (
      <span
        aria-hidden="true"
        className={"fl-pixel fl-sprite " + className}
        style={
          {
            transform,
            "--sprite-x": `${(species.sprite % 3) * 50}%`,
            "--sprite-y": `${Math.floor(species.sprite / 3) * 100}%`,
            backgroundImage: `url(${species.pixelImage})`,
          } as CSSProperties
        }
      />
    );
  return (
    <img
      className={"fl-pixel " + className}
      style={{ transform }}
      src={species.pixelImage}
      alt=""
      draggable={false}
    />
  );
}
