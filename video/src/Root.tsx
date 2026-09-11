import React from "react";
import { Composition } from "remotion";
import "./index.css";
import { ShadcnPromo } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShadcnPromo"
        component={ShadcnPromo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
