import type { CSSProperties } from "react";
import type { Species } from "@/data/types";
export default function PixelFish({
  species,
  className = "",
}: {
  species: Species;
  className?: string;
}) {
  if (species.sprite !== undefined)
    return (
      <span
        aria-hidden="true"
        className={"fl-pixel fl-sprite " + className}
        style={
          {
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
      src={species.pixelImage}
      alt=""
      draggable={false}
    />
  );
}
