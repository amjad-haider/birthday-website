import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import './App.css'
import CurtainScene from './components/CurtainScene'

function App() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#1a0d2e',
      touchAction: 'none' // Prevent scrolling on mobile
    }}>
      <Canvas
        camera={{ 
          position: [0, 0, 8], 
          fov: window.innerWidth <= 768 ? 85 : 75 // Wider FOV on mobile
        }}
        gl={{ 
          antialias: window.innerWidth > 768, // Disable antialiasing on mobile for performance
          powerPreference: "high-performance"
        }}
        dpr={window.innerWidth <= 768 ? 1 : window.devicePixelRatio} // Lower DPR on mobile
      >
        <Environment preset="sunset" />
        <ambientLight intensity={0.3} color="#9d4edd" />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#c77dff" />
        
        <CurtainScene />
        
        <OrbitControls 
          enablePan={true}        // Enable panning with right mouse or two finger drag
          enableZoom={true}       // Enable zoom with scroll wheel or pinch
          enableRotate={true}     // Enable rotation with left mouse or single finger drag
          minDistance={3}         // Closest zoom level
          maxDistance={15}        // Farthest zoom level
          minPolarAngle={0}       // Minimum vertical rotation
          maxPolarAngle={Math.PI} // Maximum vertical rotation
        />
      </Canvas>
    </div>
  )
}

export default App
