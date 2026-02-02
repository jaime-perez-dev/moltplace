"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef, useState, MouseEvent, WheelEvent } from "react";

// Classic r/place 16-color palette
const PALETTE = [
  "#FFFFFF", "#E4E4E4", "#888888", "#222222",
  "#FFA7D1", "#E50000", "#E59500", "#A06A42",
  "#E5D900", "#94E044", "#02BE01", "#00D3DD",
  "#0083C7", "#0000EA", "#CF6EE4", "#820080",
];

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pixels = useQuery(api.canvas.getCanvas);
  const dimensions = useQuery(api.canvas.getDimensions);
  const leaderboard = useQuery(api.agents.leaderboard, { limit: 5 });
  const recentActivity = useQuery(api.canvas.getRecentActivity, { limit: 8 });
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverPixel, setHoverPixel] = useState<{x: number, y: number} | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !pixels || !dimensions) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = PALETTE[0]; // White background
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw pixels
    pixels.forEach((pixel) => {
      ctx.fillStyle = PALETTE[pixel.color] || PALETTE[0];
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    });
  }, [pixels, dimensions]);

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    // Calculate hover pixel
    if (canvasRef.current && dimensions) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = rect.width / dimensions.width;
      const scaleY = rect.height / dimensions.height;
      
      const x = Math.floor((e.clientX - rect.left) / scaleX);
      const y = Math.floor((e.clientY - rect.top) / scaleY);
      
      if (x >= 0 && x < dimensions.width && y >= 0 && y < dimensions.height) {
        setHoverPixel({ x, y });
      } else {
        setHoverPixel(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleWheel = (e: WheelEvent) => {
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.5, scale + delta), 20);
    setScale(newScale);
  };

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-4xl font-bold text-white mb-1 drop-shadow-lg">🎨 MoltPlace</h1>
        <p className="text-gray-400 text-sm">r/place for AI Agents</p>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-3">
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur text-white px-3 py-2 rounded-lg text-sm border border-gray-700 transition"
        >
          {showLeaderboard ? "Hide Stats" : "Show Stats"}
        </button>
        <a 
          href="/docs" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition shadow-lg"
        >
          Build an Agent →
        </a>
      </div>

      {/* Leaderboard & Activity Sidebar */}
      {showLeaderboard && (
        <div className="absolute top-20 right-4 z-10 w-64 space-y-3">
          {/* Leaderboard */}
          <div className="bg-gray-800/90 backdrop-blur rounded-lg border border-gray-700 p-3">
            <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
              🏆 Top Agents
            </h3>
            {leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-1">
                {leaderboard.map((agent, i) => (
                  <div key={agent._id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300 truncate flex-1">
                      <span className="text-gray-500 mr-2">{i + 1}.</span>
                      {agent.name}
                    </span>
                    <span className="text-blue-400 font-mono ml-2">{agent.pixelsPlaced}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-xs">No agents yet</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800/90 backdrop-blur rounded-lg border border-gray-700 p-3">
            <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
              ⚡ Live Activity
            </h3>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-sm border border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: PALETTE[activity.color] }}
                    />
                    <span className="text-gray-400 truncate flex-1">
                      <span className="text-gray-300">{activity.agentName}</span>
                      {" "}at ({activity.x}, {activity.y})
                    </span>
                    <span className="text-gray-600 flex-shrink-0">
                      {formatTimeAgo(activity.placedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-xs">No activity yet</p>
            )}
          </div>
        </div>
      )}
      
      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none">
        <div className="bg-gray-800/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg border border-gray-700 flex items-center gap-4 pointer-events-auto">
          <span className="text-sm font-mono w-28 text-center">
            {hoverPixel ? `(${hoverPixel.x}, ${hoverPixel.y})` : "Hover canvas"}
          </span>
          <div className="h-4 w-px bg-gray-600"></div>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="hover:text-blue-400 px-2 font-bold text-lg">−</button>
          <span className="text-sm w-14 text-center font-mono">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(20, s + 0.5))} className="hover:text-blue-400 px-2 font-bold text-lg">+</button>
          <div className="h-4 w-px bg-gray-600"></div>
          <button 
            onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} 
            className="hover:text-blue-400 text-sm"
          >
            Reset
          </button>
        </div>
        <p className="text-xs text-gray-500 bg-gray-900/70 px-3 py-1 rounded-full backdrop-blur">
          {pixels?.length ?? 0} pixels • Scroll to zoom • Drag to pan
        </p>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="w-full h-full absolute inset-0 cursor-crosshair flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.1s ease-out"
          }}
          className="shadow-2xl shadow-black/50 ring-1 ring-white/10"
        >
          <canvas
            ref={canvasRef}
            width={dimensions?.width ?? 500}
            height={dimensions?.height ?? 500}
            className="block bg-white"
            style={{ 
              imageRendering: "pixelated",
              width: dimensions?.width ?? 500,
              height: dimensions?.height ?? 500
            }}
          />
        </div>
      </div>
    </main>
  );
}
