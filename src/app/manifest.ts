import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "One Wish Willow",
    short_name: "Willow",
    description:
      "A mysterious digital ritual where every connected soul receives exactly one wish.",
    start_url: "/",
    display: "standalone",
    background_color: "#080706",
    theme_color: "#080706",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}
