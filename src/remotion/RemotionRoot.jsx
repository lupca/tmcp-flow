import React from 'react';
import { Composition, registerRoot, useCurrentFrame, useVideoConfig } from 'remotion';
import ArgoK3dFlow from '../components/ArgoK3dFlow';

// Wrapper to provide Remotion context to the presentation component
const ArgoK3dFlowRemotion = (props) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    return (
        <ArgoK3dFlow
            {...props}
            frame={frame}
            width={width}
            height={height}
            isRemotion={true}
        />
    );
};

export const RemotionRoot = () => {
    return (
        <>
            <Composition
                id="ArgoK3dFlow"
                component={ArgoK3dFlowRemotion}
                durationInFrames={300}
                fps={60}
                width={1280}
                height={720}
                calculateMetadata={async ({ props }) => {
                    return {
                        // Allow overriding via inputProps
                        width: props?.renderWidth || 1280,
                        height: props?.renderHeight || 720,
                        durationInFrames: props?.renderDuration || 300,
                        fps: props?.renderFps || 60,
                    };
                }}
            />
        </>
    );
};

// Register via Remotion entry point
registerRoot(RemotionRoot);
