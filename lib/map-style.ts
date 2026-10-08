import type { StyleSpecification } from "maplibre-gl";
/** Retain labels and source attribution, with a restrained water/land palette. */
export function journalMapStyle(
  style: StyleSpecification,
  dark: boolean,
): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const paint = { ...layer.paint };
      if (layer.type === "background")
        return {
          ...layer,
          paint: { ...paint, "background-color": dark ? "#111c28" : "#f7f9fc" },
        } as typeof layer;
      if (layer.type === "fill") {
        const water = layer.id.includes("water");
        return {
          ...layer,
          paint: {
            ...paint,
            "fill-color": water
              ? dark
                ? "#1e3c56"
                : "#cfe9fb"
              : dark
                ? "#1b2937"
                : "#f0f3f7",
          },
        } as typeof layer;
      }
      if (layer.type === "line")
        return {
          ...layer,
          paint: {
            ...paint,
            "line-color": layer.id.includes("water")
              ? dark
                ? "#315577"
                : "#badff7"
              : dark
                ? "#304152"
                : "#ffffff",
          },
        } as typeof layer;
      if (layer.type === "symbol")
        return {
          ...layer,
          paint: {
            ...paint,
            "text-color": dark ? "#a5bacd" : "#7c8d9e",
            "text-halo-color": dark ? "#111c28" : "#ffffff",
          },
        } as typeof layer;
      if (layer.type === "raster")
        return {
          ...layer,
          layout: { ...layer.layout, visibility: "none" },
        } as typeof layer;
      return layer;
    }),
  };
}
