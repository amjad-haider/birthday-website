import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, PositionalAudio } from '@react-three/drei'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'

// Purple color palette
const PURPLE_COLORS = {
  dark: '#240046',
  medium: '#5a189a',
  light: '#c77dff',
  accent: '#e0aaff'
}

// Candle component with blowing animation
function AnimatedCandle({ position, index, isBlown, onBlow }) {
  const flameRef = useRef()
  const candleRef = useRef()
  
  useFrame((state) => {
    if (flameRef.current && !isBlown) {
      // Flickering flame animation
      const flicker = Math.sin(state.clock.elapsedTime * 8 + index * 2) * 0.1 + 1
      flameRef.current.scale.setScalar(flicker)
      flameRef.current.position.y = 0.2 + Math.sin(state.clock.elapsedTime * 4 + index) * 0.02
    }
    
    if (candleRef.current && isBlown) {
      // Smoke effect after blowing
      candleRef.current.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.01
    }
  })
  
  return (
    <group ref={candleRef} position={position} onClick={(e) => {
      e.stopPropagation()
      onBlow(index)
    }}>
      {/* Candle stick */}
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial color="#fff5cd" />
      </mesh>
      
      {/* Flame - only visible if not blown */}
      {!isBlown && (
        <mesh ref={flameRef} position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#ff6b35" />
        </mesh>
      )}
      
      {/* Flame glow effect */}
      {!isBlown && (
        <pointLight 
          position={[0, 0.2, 0]} 
          color="#FFA500" 
          intensity={0.5} 
          distance={2} 
        />
      )}
      
      {/* Smoke particles after blowing */}
      {isBlown && (
        <mesh position={[0, 0.25, 0]}>
          <sphereGeometry args={[0.02]} />
          <meshBasicMaterial color="#cccccc" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  )
}

// Background audio component
function BackgroundMusic() {
  const [audioContext, setAudioContext] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    // Create audio context on first user interaction
    const createAudioContext = () => {
      if (!audioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        setAudioContext(ctx)
      }
    }

    // Create audio context after a delay (curtains opening)
    const timer = setTimeout(createAudioContext, 3000)
    return () => clearTimeout(timer)
  }, [audioContext])

  const playBirthdayTune = () => {
    if (!audioContext || isPlaying) return

    setIsPlaying(true)

    // Simple Happy Birthday melody frequencies
    const melody = [
      { freq: 261.63, duration: 0.5 }, // C4 - Hap-
      { freq: 261.63, duration: 0.5 }, // C4 - py
      { freq: 293.66, duration: 1.0 }, // D4 - Birth-
      { freq: 261.63, duration: 1.0 }, // C4 - day
      { freq: 349.23, duration: 1.0 }, // F4 - to
      { freq: 329.63, duration: 2.0 }, // E4 - you
    ]

    let currentTime = audioContext.currentTime

    melody.forEach((note) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(note.freq, currentTime)
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0, currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, currentTime + 0.1)
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + note.duration)

      currentTime += note.duration
    })

    // Reset playing state after melody finishes
    setTimeout(() => {
      setIsPlaying(false)
    }, currentTime * 1000)
  }

  useEffect(() => {
    if (audioContext) {
      const timer = setTimeout(() => {
        playBirthdayTune()
        // Repeat every 10 seconds
        const interval = setInterval(playBirthdayTune, 10000)
        return () => clearInterval(interval)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [audioContext])

  return null
}


function FabricCurtain({ side, isOpen, shouldRemove, world }) {
  const meshRef = useRef()
  const { viewport } = useThree()
  
  // Curtain dimensions
  const curtainWidth = viewport.width / 2.5
  const curtainHeight = viewport.height * 1.2
  const segments = 20
  
  // Physics bodies for cloth simulation
  const [clothBodies, setClothBodies] = useState([])
  const [clothConstraints, setClothConstraints] = useState([])
  
  // Create cloth physics
  const cloth = useMemo(() => {
    const positions = new Float32Array((segments + 1) * (segments + 1) * 3)
    const bodies = []
    const constraints = []
    
    const mass = 0.1
    const restDistance = curtainWidth / segments
    
    // Create particle grid
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const index = i * (segments + 1) + j
        
        // Position particles
        const x = (side === 'left' ? -curtainWidth : 0) + (j / segments) * curtainWidth
        const y = curtainHeight / 2 - (i / segments) * curtainHeight
        const z = 0
        
        positions[index * 3] = x
        positions[index * 3 + 1] = y
        positions[index * 3 + 2] = z
        
        // Create physics body for each particle
        const body = new CANNON.Body({
          mass: i === 0 ? 0 : mass, // Top row is fixed (mass = 0)
          position: new CANNON.Vec3(x, y, z),
          shape: new CANNON.Sphere(0.02)
        })
        
        world.addBody(body)
        bodies.push(body)
        
        // Add distance constraints between adjacent particles
        if (j > 0) {
          // Horizontal constraint
          const constraint = new CANNON.DistanceConstraint(
            bodies[index - 1],
            body,
            restDistance
          )
          world.addConstraint(constraint)
          constraints.push(constraint)
        }
        
        if (i > 0) {
          // Vertical constraint
          const constraint = new CANNON.DistanceConstraint(
            bodies[index - (segments + 1)],
            body,
            restDistance
          )
          world.addConstraint(constraint)
          constraints.push(constraint)
        }
      }
    }
    
    setClothBodies(bodies)
    setClothConstraints(constraints)
    
    return {
      geometry: new THREE.PlaneGeometry(curtainWidth, curtainHeight, segments, segments),
      positions,
      bodies
    }
  }, [side, curtainWidth, curtainHeight, segments, world])
  
  // Wind effect and removal animation
  useFrame((state) => {
    if (clothBodies.length === 0) return
    
    const time = state.clock.getElapsedTime()
    
    // Update geometry from physics bodies
    const positions = cloth.geometry.attributes.position.array
    
    clothBodies.forEach((body, index) => {
      // Apply wind force
      const windStrength = isOpen ? 2 : 0.5
      const windX = Math.sin(time * 2 + index * 0.1) * windStrength
      const windZ = Math.cos(time * 1.5 + index * 0.05) * windStrength * 0.5
      
      body.force.x += windX
      body.force.z += windZ
      
      // Removal effect - make curtains fly away
      if (shouldRemove) {
        const removalForceX = side === 'left' ? -15 : 15
        const removalForceY = 10 // Upward force
        const removalForceZ = -5 // Away from camera
        
        body.force.x += removalForceX
        body.force.y += removalForceY
        body.force.z += removalForceZ
      }
      
      // Update geometry positions
      positions[index * 3] = body.position.x
      positions[index * 3 + 1] = body.position.y
      positions[index * 3 + 2] = body.position.z
    })
    
    cloth.geometry.attributes.position.needsUpdate = true
    cloth.geometry.computeVertexNormals()
    
    // Curtain opening effect - apply horizontal force
    if (isOpen && !shouldRemove && clothBodies.length > 0) {
      const forceDirection = side === 'left' ? -1 : 1
      
      // Apply opening force to edges
      for (let j = 0; j <= segments; j++) {
        const edgeIndex = j * (segments + 1) + (side === 'left' ? 0 : segments)
        if (clothBodies[edgeIndex]) {
          clothBodies[edgeIndex].force.x += forceDirection * 5
        }
      }
    }
  })
  
  // Clean up physics bodies when removing
  useEffect(() => {
    if (shouldRemove) {
      // Remove bodies and constraints from physics world after animation
      setTimeout(() => {
        clothBodies.forEach(body => {
          world.removeBody(body)
        })
        clothConstraints.forEach(constraint => {
          world.removeConstraint(constraint)
        })
      }, 3000) // Wait 3 seconds for removal animation
    }
  }, [shouldRemove, clothBodies, clothConstraints, world])
  
  // Fade out during removal
  const opacity = shouldRemove ? 0.1 : 0.95
  
  return (
    <mesh ref={meshRef} geometry={cloth.geometry} visible={!shouldRemove || opacity > 0}>
      <meshStandardMaterial
        color={PURPLE_COLORS.medium}
        roughness={0.9}
        metalness={0.1}
        side={THREE.DoubleSide}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}

function BirthdayContent({ visible, removeCurtains }) {
  const cakeRef = useRef()
  const [blownCandles, setBlownCandles] = useState([])
  const [allCandlesBlown, setAllCandlesBlown] = useState(false)
  const [showWishText, setShowWishText] = useState(false)
  
  const totalCandles = 5
  
  useFrame((state) => {
    if (cakeRef.current && visible) {
      // Gentle rotation for the cake
      cakeRef.current.rotation.y += 0.005
    }
  })
  
  const handleCandleBlow = (candleIndex) => {
    if (!blownCandles.includes(candleIndex)) {
      const newBlownCandles = [...blownCandles, candleIndex]
      setBlownCandles(newBlownCandles)
      
      // Check if all candles are blown
      if (newBlownCandles.length === totalCandles) {
        setAllCandlesBlown(true)
        setTimeout(() => {
          setShowWishText(true)
        }, 1000)
      }
    }
  }
  
  useEffect(() => {
    if (removeCurtains) {
      // Show make a wish instruction after curtains are removed
      const timer = setTimeout(() => {
        setShowWishText(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [removeCurtains])
  
  return (
    <group visible={visible}>
      <BackgroundMusic />
      
      <Text
        position={[0, 1, -1]}
        fontSize={1}
        color={PURPLE_COLORS.accent}
        anchorX="center"
        anchorY="middle"
      >
        🎉 SURPRISE! 🎉
      </Text>
      
      <Text
        position={[0, 0, -1]}
        fontSize={0.5}
        color={PURPLE_COLORS.light}
        anchorX="center"
        anchorY="middle"
      >
        Happy Birthday!
      </Text>
      
      {/* Birthday cake - center piece with gentle rotation */}
      <mesh ref={cakeRef} position={[0, -1.5, -1]}>
        <cylinderGeometry args={[0.8, 1, 0.6, 16]} />
        <meshStandardMaterial color={PURPLE_COLORS.accent} />
      </mesh>
      
      {/* Interactive candles */}
      {[...Array(totalCandles)].map((_, i) => (
        <AnimatedCandle
          key={i}
          position={[Math.cos(i * 0.8) * 0.6, -0.9, Math.sin(i * 0.8) * 0.6 - 1]}
          index={i}
          isBlown={blownCandles.includes(i)}
          onBlow={handleCandleBlow}
        />
      ))}
      
      {/* Make a wish instruction */}
      {showWishText && !allCandlesBlown && (
        <Text
          position={[0, -2.5, -1]}
          fontSize={0.3}
          color={PURPLE_COLORS.accent}
          anchorX="center"
          anchorY="middle"
        >
          🕯️ Click to Make a Wish! 🕯️
        </Text>
      )}
      
      {/* All candles blown celebration */}
      {allCandlesBlown && (
        <group>
          <Text
            position={[0, -0.7, -1]}
            fontSize={0.4}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
          >
            ✨ Wish Made! ✨
          </Text>
          
          <Text
            position={[0, -1.1, -1]}
            fontSize={0.2}
            color={PURPLE_COLORS.light}
            anchorX="center"
            anchorY="middle"
          >
            May all your dreams come true! 🌟
          </Text>
        </group>
      )}
      
      {/* Orbit controls instruction after curtains are removed */}
      {removeCurtains && (
        <Text
          position={[0, -3, 0]}
          fontSize={0.2}
          color={PURPLE_COLORS.light}
          anchorX="center"
          anchorY="middle"
        >
          🖱️ Drag to rotate • Scroll to zoom • Right-click to pan
        </Text>
      )}
    </group>
  )
}

export default function CurtainScene() {
  const [curtainsOpen, setCurtainsOpen] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [removeCurtains, setRemoveCurtains] = useState(false)
  const [world] = useState(() => {
    const world = new CANNON.World()
    world.gravity.set(0, -9.82, 0)
    world.broadphase = new CANNON.NaiveBroadphase()
    return world
  })
  
  useFrame((state, delta) => {
    // Step physics simulation
    world.step(delta)
  })

  const handleClick = () => {
    if (!curtainsOpen) {
      console.log('Opening curtains!')
      setCurtainsOpen(true)
      
      // Show content after curtains start opening
      setTimeout(() => {
        setShowContent(true)
        console.log('Content revealed!')
        
        // Remove curtains completely after cake is revealed
        setTimeout(() => {
          setRemoveCurtains(true)
          console.log('Removing curtains!')
        }, 2000) // Remove curtains 2 seconds after content shows
        
      }, 2000)
    }
  }

  return (
    <group onClick={handleClick} style={{ cursor: 'pointer' }}>
      {/* Curtains - will be removed after cake reveal */}
      {!removeCurtains && (
        <>
          <FabricCurtain side="left" isOpen={curtainsOpen} shouldRemove={removeCurtains} world={world} />
          <FabricCurtain side="right" isOpen={curtainsOpen} shouldRemove={removeCurtains} world={world} />
        </>
      )}
      
      {/* Birthday content */}
      <BirthdayContent visible={showContent} removeCurtains={removeCurtains} />
      
      {/* Click instruction */}
      {!curtainsOpen && (
        <Text
          position={[0, -2, 2]}
          fontSize={0.4}
          color={PURPLE_COLORS.accent}
          anchorX="center"
          anchorY="middle"
        >
          🎭 Click Anywhere to Open! 🎭
        </Text>
      )}
      
      {!curtainsOpen && (
        <Text
          position={[0, -2.7, 2]}
          fontSize={0.2}
          color={PURPLE_COLORS.light}
          anchorX="center"
          anchorY="middle"
        >
          Tap to reveal !
        </Text>
      )}
    </group>
  )
}
