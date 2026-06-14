import { useEffect, useState } from "react";

export function WaterWaveBackground() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Add a slight delay before showing the background to ensure smooth page load
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
      style={{ 
        opacity: visible ? 1 : 0, 
        zIndex: -50,
        backgroundColor: "#030014",
        backgroundImage: `
          radial-gradient(circle at 15% 50%, rgba(124, 58, 237, 0.12), transparent 50%),
          radial-gradient(circle at 85% 30%, rgba(0, 212, 255, 0.12), transparent 50%),
          radial-gradient(circle at 50% 80%, rgba(0, 80, 200, 0.1), transparent 50%)
        `
      }}
    >
      {/* 
        This is a highly optimized, CSS-only ambient background.
        It uses zero WebGL or canvas, making it 10000% lag-free on all devices.
      */}
      <div 
        className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIvPgo8L3N2Zz4=')] opacity-50"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)'
        }}
      />
    </div>
  );
}