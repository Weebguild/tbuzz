import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types ---

interface Particle {
    x: number;
    y: number;
    originX: number;
    originY: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    angle: number; // For some organic oscillation
}

interface BackgroundParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    phase: number;
}

interface MouseState {
    x: number;
    y: number;
    isActive: boolean;
}

// --- Configuration Constants ---

const PARTICLE_DENSITY = 0.00015; // Particles per pixel squared (adjust for density)
const BG_PARTICLE_DENSITY = 0.00005; // Less dense for background
const MOUSE_RADIUS = 180; // Radius of mouse influence
const RETURN_SPEED = 0.08; // How fast particles fly back to origin (spring constant)
const DAMPING = 0.90; // Friction (velocity decay)
const REPULSION_STRENGTH = 1.2; // Multiplier for mouse push force

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const AntiGravityCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [debugInfo, setDebugInfo] = useState({ count: 0, fps: 0 });

    const particlesRef = useRef<Particle[]>([]);
    const backgroundParticlesRef = useRef<BackgroundParticle[]>([]);
    const mouseRef = useRef<MouseState>({ x: -1000, y: -1000, isActive: false });
    const frameIdRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const initParticles = useCallback((width: number, height: number) => {
        const particleCount = Math.floor(width * height * PARTICLE_DENSITY);
        const newParticles: Particle[] = [];

        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;

            newParticles.push({
                x: x,
                y: y,
                originX: x,
                originY: y,
                vx: 0,
                vy: 0,
                size: randomRange(1, 2.5),
                color: Math.random() > 0.9 ? '#ec4899' : '#ffffff', // Changed to pinkish for app theme
                angle: Math.random() * Math.PI * 2,
            });
        }
        particlesRef.current = newParticles;

        const bgCount = Math.floor(width * height * BG_PARTICLE_DENSITY);
        const newBgParticles: BackgroundParticle[] = [];

        for (let i = 0; i < bgCount; i++) {
            newBgParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                size: randomRange(0.5, 1.5),
                alpha: randomRange(0.1, 0.4),
                phase: Math.random() * Math.PI * 2
            });
        }
        backgroundParticlesRef.current = newBgParticles;

        setDebugInfo(prev => ({ ...prev, count: particleCount + bgCount }));
    }, []);

    const animate = useCallback((time: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const delta = time - lastTimeRef.current;
        lastTimeRef.current = time;
        if (delta > 0 && Math.random() > 0.9) {
            setDebugInfo(prev => ({ ...prev, fps: Math.round(1000 / delta) }));
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Pulsating Radial Glow
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const pulseOpacity = Math.sin(time * 0.0008) * 0.035 + 0.085;

        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, Math.max(canvas.width, canvas.height) * 0.7
        );
        gradient.addColorStop(0, `rgba(124, 58, 237, ${pulseOpacity})`); // Purple glow
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Background Particles
        const bgParticles = backgroundParticlesRef.current;
        ctx.fillStyle = "#ffffff";

        for (let i = 0; i < bgParticles.length; i++) {
            const p = bgParticles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            const twinkle = Math.sin(time * 0.002 + p.phase) * 0.5 + 0.5;
            const currentAlpha = p.alpha * (0.3 + 0.7 * twinkle);

            ctx.globalAlpha = currentAlpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        const particles = particlesRef.current;
        const mouse = mouseRef.current;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (mouse.isActive && distance < MOUSE_RADIUS) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
                const repulsion = force * REPULSION_STRENGTH;
                p.vx -= forceDirectionX * repulsion * 5;
                p.vy -= forceDirectionY * repulsion * 5;
            }

            const springDx = p.originX - p.x;
            const springDy = p.originY - p.y;
            p.vx += springDx * RETURN_SPEED;
            p.vy += springDy * RETURN_SPEED;
        }

        // Resolve Collisions
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distSq = dx * dx + dy * dy;
                const minDist = p1.size + p2.size;
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.01) {
                        const nx = dx / dist; const ny = dy / dist;
                        const overlap = minDist - dist;
                        p1.x -= nx * overlap * 0.5; p1.y -= ny * overlap * 0.5;
                        p2.x += nx * overlap * 0.5; p2.y += ny * overlap * 0.5;
                        const dvx = p1.vx - p2.vx; const dvy = p1.vy - p2.vy;
                        const velocityAlongNormal = dvx * nx + dvy * ny;
                        if (velocityAlongNormal > 0) {
                            const m1 = p1.size; const m2 = p2.size;
                            const restitution = 0.85;
                            const impulseMagnitude = (-(1 + restitution) * velocityAlongNormal) / (1 / m1 + 1 / m2);
                            p1.vx += (impulseMagnitude * nx) / m1; p1.vy += (impulseMagnitude * ny) / m1;
                            p2.vx -= (impulseMagnitude * nx) / m2; p2.vy -= (impulseMagnitude * ny) / m2;
                        }
                    }
                }
            }
        }

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.vx *= DAMPING; p.vy *= DAMPING;
            p.x += p.vx; p.y += p.vy;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            const velocity = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const opacity = Math.min(0.3 + velocity * 0.1, 1);
            ctx.fillStyle = p.color === '#ffffff' ? `rgba(255, 255, 255, ${opacity})` : p.color;
            ctx.fill();
        }
        frameIdRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvasRef.current.width = width * dpr;
                canvasRef.current.height = height * dpr;
                canvasRef.current.style.width = `${width}px`;
                canvasRef.current.style.height = `${height}px`;
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) ctx.scale(dpr, dpr);
                initParticles(width, height);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [initParticles]);

    useEffect(() => {
        frameIdRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameIdRef.current);
    }, [animate]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, isActive: true };
    };

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-0 overflow-hidden bg-black"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { mouseRef.current.isActive = false; }}
        >
            <canvas ref={canvasRef} className="block w-full h-full" />
            <div className="absolute bottom-4 right-4 pointer-events-none text-[10px] text-white/5 font-mono text-right">
                <p>{debugInfo.count} entities</p>
                <p>{debugInfo.fps} FPS</p>
            </div>
        </div>
    );
};
