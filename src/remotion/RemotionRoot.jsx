import React from 'react';
import { Composition, registerRoot, useCurrentFrame, useVideoConfig } from 'remotion';
import DynamicFlowScene from '../components/DynamicFlowScene.jsx';
import CascadeFailureScene from '../components/CascadeFailureScene.jsx';

// Import global CSS so Remotion's Webpack bundler includes them in the render
import '@xyflow/react/dist/style.css';
import '../styles/index.css';
import '../styles/App.css';

// Wrapper to inject Remotion frame & video config into the presentation component
const DynamicFlowSceneRemotion = (props) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    return (
        <DynamicFlowScene
            {...props}
            frame={frame}
            width={width}
            height={height}
            isRemotion={true}
        />
    );
};

// Wrapper to inject Remotion frame & video config into the cascade component
const CascadeFailureSceneRemotion = (props) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    return (
        <CascadeFailureScene
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
                id="DynamicFlowScene"
                component={DynamicFlowSceneRemotion}
                durationInFrames={300}
                fps={60}
                width={1080}
                height={1920}
                calculateMetadata={async ({ props }) => {
                    return {
                        width: props?.renderWidth || 1080,
                        height: props?.renderHeight || 1920,
                        durationInFrames: props?.renderDuration || 300,
                        fps: props?.renderFps || 60,
                    };
                }}
                defaultProps={{
                    nodes: [],
                    edges: [],
                    cameraSequence: [],
                }}
            />
            <Composition
                id="CascadeFailureScene"
                component={CascadeFailureSceneRemotion}
                durationInFrames={600}
                fps={60}
                width={1080}
                height={1920}
                calculateMetadata={async ({ props }) => {
                    return {
                        width: props?.renderWidth || 1080,
                        height: props?.renderHeight || 1920,
                        durationInFrames: props?.renderDuration || 600,
                        fps: props?.renderFps || 60,
                    };
                }}
                defaultProps={{
                    nodes: [],
                    edges: [],
                    cameraSequence: [],
                    timelineEvents: [],
                }}
            />
        </>
    );
};

// Register via Remotion entry point
registerRoot(RemotionRoot);
